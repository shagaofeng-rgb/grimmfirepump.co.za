import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAdmin } from "@/lib/admin-auth";
import { addProduct, getPublishedProducts } from "@/lib/content-store";
import { getAdminQuery, pagination } from "@/lib/admin-query";
import { getDatabase, hasDatabase } from "@/lib/database";
import { productSchema } from "@/lib/validation";
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
export async function GET(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = getAdminQuery(request);
  if (!hasDatabase()) { const items = await getPublishedProducts(); return NextResponse.json({ data: items.slice(query.offset, query.offset + query.pageSize), pagination: pagination(items.length, query.page, query.pageSize) }); }
  const sql = getDatabase(), needle = `%${query.q}%`, from = query.from ?? new Date(0), to = query.to ?? new Date("9999-12-31T23:59:59.999Z");
  const [data, count] = await Promise.all([
    sql`SELECT id, slug, name, category, summary, status, published, image, created_at AS "createdAt", updated_at AS "updatedAt" FROM products WHERE deleted_at IS NULL AND updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR name ILIKE ${needle} OR category ILIKE ${needle} OR slug ILIKE ${needle}) ORDER BY updated_at DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM products WHERE deleted_at IS NULL AND updated_at >= ${from} AND updated_at < ${to} AND (${query.q}='' OR name ILIKE ${needle} OR category ILIKE ${needle} OR slug ILIKE ${needle})`,
  ]);
  const total = Number(((count as unknown as { value?: number }[])[0]?.value) ?? 0);
  return NextResponse.json({ data, pagination: pagination(total, query.page, query.pageSize) }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: NextRequest) { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const input = productSchema.parse(await request.json()); const slug = `${slugify(input.name)}-${randomUUID().slice(0, 6)}`; await addProduct({ id: randomUUID(), slug, name: input.name, category: input.category, summary: input.summary, applications: [], highlights: ["Added in local admin"], specifications: [], image: "https://www.grimmfirepump.com/_next/image?url=%2Fassets%2Fsynced%2Fproducts%2Fedj-fire-pump-set.jpg&w=1200&q=80", published: true }); return NextResponse.json({ success: true }, { status: 201 }); } catch { return NextResponse.json({ error: "Check the product fields." }, { status: 400 }); } }
export async function DELETE(request: NextRequest) { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); if (!hasDatabase()) return NextResponse.json({ error: "数据库不可用。" }, { status: 503 }); const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "缺少产品编号。" }, { status: 400 }); await getDatabase()`UPDATE products SET deleted_at=now(), updated_at=now(), published=false, status='archived' WHERE id=${id}`; await getDatabase()`INSERT INTO audit_logs (action, module, entity_type, entity_id) VALUES ('delete', 'products', 'product', ${id})`; return NextResponse.json({ success: true }); }