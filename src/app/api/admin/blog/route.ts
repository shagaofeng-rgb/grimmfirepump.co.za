import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getDatabase, hasDatabase } from "@/lib/database";

function text(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72) || "blog-post"; }
function fingerprint(classId: string, title: string, content: string, authorId: string) { return createHash("sha256").update([classId, title, content, authorId].join("\u0000")).digest("hex"); }

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "Database is not available." }, { status: 503 });
  const data = await getDatabase()`SELECT id, slug, class_id AS "classId", title, content, author_id AS "authorId", image_url AS "imageUrl", status, published_at AS "publishedAt", created_at AS "createdAt" FROM blog_posts WHERE deleted_at IS NULL ORDER BY published_at DESC`;
  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "Database is not available." }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const title = text(body?.title, 180); const content = text(body?.content, 50_000); const classId = text(body?.classId, 120) || "blog"; const authorId = text(body?.authorId, 120) || "admin"; const imageUrl = text(body?.imageUrl, 2048); const status = text(body?.status, 20) === "draft" ? "draft" : "published";
  if (title.length < 3 || content.length < 10 || (imageUrl && !/^https?:\/\//.test(imageUrl))) return NextResponse.json({ error: "Check title, content, and cover image URL." }, { status: 400 });
  const sql = getDatabase(); const id = randomUUID(); const hash = fingerprint(classId, title, content, authorId); const slug = `${slugify(title)}-${id.slice(0, 8)}`;
  try {
    const data = await sql`INSERT INTO blog_posts (id, slug, class_id, title, content, author_id, image_url, source_fingerprint, status) VALUES (${id}, ${slug}, ${classId}, ${title}, ${content}, ${authorId}, ${imageUrl || null}, ${hash}, ${status}) RETURNING id, slug, status`;
    await sql`INSERT INTO audit_logs (action, module, entity_type, entity_id) VALUES ('create', 'blog', 'blog_post', ${id})`;
    return NextResponse.json({ success: true, data: (data as unknown as { id: string; slug: string; status: string }[])[0] }, { status: 201 });
  } catch { return NextResponse.json({ error: "A matching article already exists." }, { status: 409 }); }
}

export async function DELETE(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "Database is not available." }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Missing article id." }, { status: 400 });
  const sql = getDatabase();
  await sql`UPDATE blog_posts SET deleted_at=now(), status='archived', updated_at=now() WHERE id=${id} AND deleted_at IS NULL`;
  await sql`INSERT INTO audit_logs (action, module, entity_type, entity_id) VALUES ('delete', 'blog', 'blog_post', ${id})`;
  return NextResponse.json({ success: true });
}
