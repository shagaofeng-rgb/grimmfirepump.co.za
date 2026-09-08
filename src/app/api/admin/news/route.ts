import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAdmin } from "@/lib/admin-auth";
import { addNews, getPublishedNews } from "@/lib/content-store";
import { getAdminQuery, pagination } from "@/lib/admin-query";
import { getDatabase, hasDatabase } from "@/lib/database";
import { newsSchema } from "@/lib/validation";
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
export async function GET(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = getAdminQuery(request);
  if (!hasDatabase()) { const items = await getPublishedNews(); return NextResponse.json({ data: items.slice(query.offset, query.offset + query.pageSize), pagination: pagination(items.length, query.page, query.pageSize) }); }
  const sql=getDatabase(), needle=`%${query.q}%`, from=query.from ?? new Date(0), to=query.to ?? new Date("9999-12-31T23:59:59.999Z");
  const [data,count]=await Promise.all([
    sql`SELECT id, slug, title, excerpt, category, status, published_at AS "publishedAt", created_at AS "createdAt", updated_at AS "updatedAt" FROM news_articles WHERE deleted_at IS NULL AND COALESCE(published_at,created_at) >= ${from} AND COALESCE(published_at,created_at) < ${to} AND (${query.q}='' OR title ILIKE ${needle} OR category ILIKE ${needle}) ORDER BY COALESCE(published_at,created_at) DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM news_articles WHERE deleted_at IS NULL AND COALESCE(published_at,created_at) >= ${from} AND COALESCE(published_at,created_at) < ${to} AND (${query.q}='' OR title ILIKE ${needle} OR category ILIKE ${needle})`,
  ]);
  const total=Number(((count as unknown as {value?:number}[])[0]?.value)??0);
  return NextResponse.json({data,pagination:pagination(total,query.page,query.pageSize)},{headers:{"Cache-Control":"private, no-store"}});
}
export async function POST(request: NextRequest) { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const input = newsSchema.parse(await request.json()); await addNews({ id: randomUUID(), slug: `${slugify(input.title)}-${randomUUID().slice(0, 6)}`, title: input.title, excerpt: input.excerpt, content: [input.excerpt], category: input.category, status: "draft", publishedAt: new Date().toISOString(), relatedProductIds: [] }); return NextResponse.json({ success: true, data: { status: "draft" } }, { status: 201 }); } catch { return NextResponse.json({ error: "Check the article fields." }, { status: 400 }); } }
export async function DELETE(request: NextRequest) { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); if (!hasDatabase()) return NextResponse.json({ error: "数据库不可用。" }, { status: 503 }); const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "缺少新闻编号。" }, { status: 400 }); await getDatabase()`UPDATE news_articles SET deleted_at=now(), status='archived' WHERE id=${id}`; await getDatabase()`INSERT INTO audit_logs (action, module, entity_type, entity_id) VALUES ('delete', 'news', 'news_article', ${id})`; return NextResponse.json({ success: true }); }