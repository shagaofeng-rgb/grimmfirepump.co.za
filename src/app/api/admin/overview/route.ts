import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getDatabase, hasDatabase } from "@/lib/database";

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ data: { products: 0, categories: 0, news: 0, leads: 0, views: 0, downloads: 0 } });
  const sql = getDatabase();
  const [products, categories, news, leads, views, downloads] = await Promise.all([
    sql`SELECT count(*)::int AS value FROM products WHERE deleted_at IS NULL`, sql`SELECT count(*)::int AS value FROM product_categories WHERE deleted_at IS NULL`, sql`SELECT count(*)::int AS value FROM news_articles WHERE deleted_at IS NULL`, sql`SELECT count(*)::int AS value FROM leads WHERE deleted_at IS NULL`, sql`SELECT count(*)::int AS value FROM site_events WHERE event_type = 'page_view' AND created_at >= now() - interval '30 days'`, sql`SELECT count(*)::int AS value FROM download_assets WHERE enabled = true`,
  ]);
  const count = (rows: unknown) => Number(((rows as { value?: number }[])[0]?.value) ?? 0);
  return NextResponse.json({ data: { products: count(products), categories: count(categories), news: count(news), leads: count(leads), views: count(views), downloads: count(downloads) } }, { headers: { "Cache-Control": "private, no-store" } });
}
