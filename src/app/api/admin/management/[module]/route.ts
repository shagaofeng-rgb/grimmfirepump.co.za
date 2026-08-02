import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getDatabase, hasDatabase } from "@/lib/database";

const modules = ["categories", "media", "forms", "pages", "downloads", "analytics", "accounts", "logs", "settings", "automation"] as const;
type Module = typeof modules[number];
function valid(value: string): value is Module { return modules.includes(value as Module); }

export async function GET(_: NextRequest, context: { params: Promise<{ module: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resource = (await context.params).module;
  if (!valid(resource) || !hasDatabase()) return NextResponse.json({ data: [] });
  const sql = getDatabase();
  const queries = {
    categories: () => sql`SELECT id, name, slug, description, enabled, sort_order, updated_at FROM product_categories WHERE deleted_at IS NULL ORDER BY sort_order, name`,
    media: () => sql`SELECT id, title, asset_url, alt_text, asset_type, created_at FROM media_assets ORDER BY created_at DESC LIMIT 100`,
    forms: () => sql`SELECT id, name, target_email, enabled, updated_at FROM form_definitions ORDER BY name`,
    pages: () => sql`SELECT id, path, label, seo_title, seo_description, enabled, updated_at FROM page_definitions ORDER BY path`,
    downloads: () => sql`SELECT id, title, asset_url, description, enabled, created_at FROM download_assets ORDER BY created_at DESC`,
    analytics: () => sql`SELECT path, count(*)::int AS views FROM site_events WHERE event_type = 'page_view' AND created_at >= now() - interval '30 days' GROUP BY path ORDER BY views DESC LIMIT 20`,
    accounts: () => sql`SELECT u.id, u.email, u.display_name, u.active, array_remove(array_agg(ur.role_id), NULL) AS roles FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id WHERE u.deleted_at IS NULL GROUP BY u.id ORDER BY u.created_at DESC`,
    logs: () => sql`SELECT action, module, entity_type, entity_id, succeeded, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 100`,
    settings: () => sql`SELECT key, value, updated_at FROM system_settings ORDER BY key`,
    automation: () => sql`SELECT audit_date, target_count, published_count, missing_count, status, checked_at, last_error FROM news_publication_audits ORDER BY audit_date DESC LIMIT 30`,
  } satisfies Record<Module, () => Promise<unknown>>;
  return NextResponse.json({ data: await queries[resource]() }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, context: { params: Promise<{ module: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resource = (await context.params).module;
  if (!valid(resource) || !hasDatabase()) return NextResponse.json({ error: "Database is not available." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const text = (key: string) => typeof body?.[key] === "string" ? body[key].trim() : "";
  const sql = getDatabase();
  try {
    if (resource === "categories") { const name = text("name"); const slug = text("slug"); if (!name || !slug) throw new Error(); await sql`INSERT INTO product_categories (name, slug, description) VALUES (${name}, ${slug}, ${text("description")})`; }
    if (resource === "media") { const title = text("title"); const url = text("url"); if (!title || !/^https?:\/\//.test(url)) throw new Error(); await sql`INSERT INTO media_assets (title, asset_url, alt_text, asset_type) VALUES (${title}, ${url}, ${text("alt")}, ${text("type") || 'image'})`; }
    if (resource === "forms") { const name = text("name"); const email = text("email"); if (!name || !email.includes("@")) throw new Error(); await sql`INSERT INTO form_definitions (name, target_email) VALUES (${name}, ${email})`; }
    if (resource === "pages") { const path = text("path"); const label = text("label"); if (!path.startsWith("/") || !label) throw new Error(); await sql`INSERT INTO page_definitions (path, label, seo_title, seo_description) VALUES (${path}, ${label}, ${text("title") || null}, ${text("description") || null}) ON CONFLICT (path) DO UPDATE SET label = EXCLUDED.label, seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, updated_at = now()`; }
    if (resource === "downloads") { const title = text("title"); const url = text("url"); if (!title || !/^https?:\/\//.test(url)) throw new Error(); await sql`INSERT INTO download_assets (title, asset_url, description) VALUES (${title}, ${url}, ${text("description")})`; }
    if (resource === "settings") { const key = text("key"); const value = text("value"); if (!key) throw new Error(); await sql`INSERT INTO system_settings (key, value) VALUES (${key}, ${JSON.stringify(value)}::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`; }
    if (resource === "accounts") { const email = text("email"); const name = text("name"); if (!email.includes("@") || !name) throw new Error(); const hash = randomUUID(); const user = await sql`INSERT INTO users (email, display_name, password_hash) VALUES (${email}, ${name}, ${hash}) RETURNING id`; const id = (user as unknown as { id: string }[])[0]?.id; if (!id) throw new Error(); await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${id}, ${text("role") || 'viewer'})`; }
    await sql`INSERT INTO audit_logs (action, module, entity_type, succeeded) VALUES ('create', ${resource}, ${resource}, true)`;
    return NextResponse.json({ success: true }, { status: 201 });
  } catch { return NextResponse.json({ error: "请检查必填字段、网址或邮箱格式；重复名称也无法保存。" }, { status: 400 }); }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ module: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resource = (await context.params).module;
  if (!valid(resource) || !hasDatabase()) return NextResponse.json({ error: "数据库不可用。" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id || ["analytics", "logs", "automation"].includes(resource)) return NextResponse.json({ error: "该记录不能删除。" }, { status: 400 });
  const sql = getDatabase();
  const remove = { categories: () => sql`UPDATE product_categories SET deleted_at=now() WHERE id=${id}`, media: () => sql`DELETE FROM media_assets WHERE id=${id}`, forms: () => sql`DELETE FROM form_definitions WHERE id=${id}`, pages: () => sql`DELETE FROM page_definitions WHERE id=${id}`, downloads: () => sql`DELETE FROM download_assets WHERE id=${id}`, accounts: () => sql`UPDATE users SET deleted_at=now(), active=false WHERE id=${id}`, settings: () => sql`DELETE FROM system_settings WHERE key=${id}` } as const;
  const action = remove[resource as keyof typeof remove]; if (!action) return NextResponse.json({ error: "该模块不支持删除。" }, { status: 400 });
  await action(); await sql`INSERT INTO audit_logs (action, module, entity_type, entity_id) VALUES ('delete', ${resource}, ${resource}, ${id})`;
  return NextResponse.json({ success: true });
}
