import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminQuery, pagination } from "@/lib/admin-query";
import { getDatabase, hasDatabase } from "@/lib/database";

const modules = ["categories", "media", "forms", "pages", "downloads", "analytics", "accounts", "logs", "settings", "automation"] as const;
type Module = typeof modules[number];
function valid(value: string): value is Module { return modules.includes(value as Module); }
function total(rows: unknown) { return Number(((rows as { value?: number }[])[0]?.value) ?? 0); }

export async function GET(request: NextRequest, context: { params: Promise<{ module: string }> }) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resource = (await context.params).module;
  if (!valid(resource) || !hasDatabase()) return NextResponse.json({ data: [], pagination: pagination(0, 1, 20) });
  const query = getAdminQuery(request);
  const sql = getDatabase();
  const needle = `%${query.q}%`;
  const from = query.from ?? new Date(0);
  const to = query.to ?? new Date("9999-12-31T23:59:59.999Z");
  let data: unknown = [];
  let count: unknown = [];

  if (resource === "categories") [data, count] = await Promise.all([
    sql`SELECT id, name, slug, description, enabled, sort_order AS "sortOrder", updated_at AS "updatedAt" FROM product_categories WHERE deleted_at IS NULL AND updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR name ILIKE ${needle} OR slug ILIKE ${needle}) ORDER BY sort_order, name LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM product_categories WHERE deleted_at IS NULL AND updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR name ILIKE ${needle} OR slug ILIKE ${needle})`,
  ]);
  if (resource === "media") [data, count] = await Promise.all([
    sql`SELECT id, title, asset_url AS "assetUrl", alt_text AS "altText", asset_type AS "assetType", created_at AS "createdAt" FROM media_assets WHERE created_at >= ${from} AND created_at < ${to} AND (${query.q}='' OR title ILIKE ${needle} OR asset_url ILIKE ${needle}) ORDER BY created_at DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM media_assets WHERE created_at >= ${from} AND created_at < ${to} AND (${query.q}='' OR title ILIKE ${needle} OR asset_url ILIKE ${needle})`,
  ]);
  if (resource === "forms") [data, count] = await Promise.all([
    sql`SELECT id, name, target_email AS "targetEmail", enabled, updated_at AS "updatedAt" FROM form_definitions WHERE updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR name ILIKE ${needle} OR target_email ILIKE ${needle}) ORDER BY updated_at DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM form_definitions WHERE updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR name ILIKE ${needle} OR target_email ILIKE ${needle})`,
  ]);
  if (resource === "pages") [data, count] = await Promise.all([
    sql`SELECT id, path, label, seo_title AS "seoTitle", seo_description AS "seoDescription", enabled, updated_at AS "updatedAt" FROM page_definitions WHERE updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR path ILIKE ${needle} OR label ILIKE ${needle}) ORDER BY path LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM page_definitions WHERE updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR path ILIKE ${needle} OR label ILIKE ${needle})`,
  ]);
  if (resource === "downloads") [data, count] = await Promise.all([
    sql`SELECT id, title, asset_url AS "assetUrl", description, enabled, created_at AS "createdAt" FROM download_assets WHERE created_at >= ${from} AND created_at < ${to} AND (${query.q}='' OR title ILIKE ${needle} OR asset_url ILIKE ${needle}) ORDER BY created_at DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM download_assets WHERE created_at >= ${from} AND created_at < ${to} AND (${query.q}='' OR title ILIKE ${needle} OR asset_url ILIKE ${needle})`,
  ]);
  if (resource === "analytics") [data, count] = await Promise.all([
    sql`SELECT path, count(*)::int AS views FROM site_events WHERE event_type='page_view' AND created_at >= ${from} AND created_at < ${to} AND (${query.q}='' OR path ILIKE ${needle}) GROUP BY path ORDER BY views DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM (SELECT path FROM site_events WHERE event_type='page_view' AND created_at >= ${from} AND created_at < ${to} AND (${query.q}='' OR path ILIKE ${needle}) GROUP BY path) grouped`,
  ]);
  if (resource === "accounts") [data, count] = await Promise.all([
    sql`SELECT u.id, u.email, u.display_name AS "displayName", u.active, array_remove(array_agg(ur.role_id), NULL) AS roles, u.created_at AS "createdAt" FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id WHERE u.deleted_at IS NULL AND u.created_at >= ${from} AND u.created_at < ${to} AND (${query.q}='' OR u.email ILIKE ${needle} OR u.display_name ILIKE ${needle}) GROUP BY u.id ORDER BY u.created_at DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM users u WHERE u.deleted_at IS NULL AND u.created_at >= ${from} AND u.created_at < ${to} AND (${query.q}='' OR u.email ILIKE ${needle} OR u.display_name ILIKE ${needle})`,
  ]);
  if (resource === "logs") [data, count] = await Promise.all([
    sql`SELECT id, action, module, entity_type AS "entityType", entity_id AS "entityId", succeeded, created_at AS "createdAt" FROM audit_logs WHERE created_at >= ${from} AND created_at < ${to} AND (${query.q}='' OR action ILIKE ${needle} OR module ILIKE ${needle} OR COALESCE(entity_id,'') ILIKE ${needle}) ORDER BY created_at DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM audit_logs WHERE created_at >= ${from} AND created_at < ${to} AND (${query.q}='' OR action ILIKE ${needle} OR module ILIKE ${needle} OR COALESCE(entity_id,'') ILIKE ${needle})`,
  ]);
  if (resource === "settings") [data, count] = await Promise.all([
    sql`SELECT key, value, updated_at AS "updatedAt" FROM system_settings WHERE updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR key ILIKE ${needle}) ORDER BY key LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM system_settings WHERE updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR key ILIKE ${needle})`,
  ]);
  if (resource === "automation") [data, count] = await Promise.all([
    sql`SELECT audit_date AS "auditDate", target_count AS "targetCount", published_count AS "publishedCount", missing_count AS "missingCount", status, checked_at AS "checkedAt", last_error AS "lastError" FROM news_publication_audits WHERE checked_at >= ${from} AND checked_at < ${to} AND (${query.q}='' OR status ILIKE ${needle} OR COALESCE(last_error,'') ILIKE ${needle}) ORDER BY audit_date DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM news_publication_audits WHERE checked_at >= ${from} AND checked_at < ${to} AND (${query.q}='' OR status ILIKE ${needle} OR COALESCE(last_error,'') ILIKE ${needle})`,
  ]);
  return NextResponse.json({ data, pagination: pagination(total(count), query.page, query.pageSize) }, { headers: { "Cache-Control": "private, no-store" } });
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
    if (resource === "media") { const title = text("title"); const url = text("url"); if (!title || !/^https?:\/\//.test(url)) throw new Error(); await sql`INSERT INTO media_assets (title, asset_url, alt_text, asset_type) VALUES (${title}, ${url}, ${text("alt")}, ${text("type") || "image"})`; }
    if (resource === "forms") { const name = text("name"); const email = text("email"); if (!name || !email.includes("@")) throw new Error(); await sql`INSERT INTO form_definitions (name, target_email) VALUES (${name}, ${email})`; }
    if (resource === "pages") { const path = text("path"); const label = text("label"); if (!path.startsWith("/") || !label) throw new Error(); await sql`INSERT INTO page_definitions (path, label, seo_title, seo_description) VALUES (${path}, ${label}, ${text("title") || null}, ${text("description") || null}) ON CONFLICT (path) DO UPDATE SET label=EXCLUDED.label, seo_title=EXCLUDED.seo_title, seo_description=EXCLUDED.seo_description, updated_at=now()`; }
    if (resource === "downloads") { const title = text("title"); const url = text("url"); if (!title || !/^https?:\/\//.test(url)) throw new Error(); await sql`INSERT INTO download_assets (title, asset_url, description) VALUES (${title}, ${url}, ${text("description")})`; }
    if (resource === "settings") { const key = text("key"); const value = text("value"); if (!key) throw new Error(); await sql`INSERT INTO system_settings (key, value) VALUES (${key}, ${JSON.stringify(value)}::jsonb) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()`; }
    if (resource === "accounts") { const email = text("email"); const name = text("name"); if (!email.includes("@") || !name) throw new Error(); const hash = randomUUID(); const user = await sql`INSERT INTO users (email, display_name, password_hash) VALUES (${email}, ${name}, ${hash}) RETURNING id`; const id = (user as unknown as { id: string }[])[0]?.id; if (!id) throw new Error(); await sql`INSERT INTO user_roles (user_id, role_id) VALUES (${id}, ${text("role") || "viewer"})`; }
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
