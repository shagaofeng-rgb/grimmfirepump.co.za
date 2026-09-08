import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminQuery } from "@/lib/admin-query";
import { getDatabase, hasDatabase } from "@/lib/database";
import { ensureVisitorAnalyticsSchema } from "@/lib/visitor-analytics";

export async function GET(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ data: { products: 0, categories: 0, news: 0, leads: 0, views: 0, visitors: 0, sessions: 0, conversions: 0, downloads: 0 } });
  await ensureVisitorAnalyticsSchema();
  const query = getAdminQuery(request);
  const from = query.from ?? new Date(0);
  const to = query.to ?? new Date("9999-12-31T23:59:59.999Z");
  const sql = getDatabase();
  const [products, categories, news, leads, views, visitors, sessions, downloads, conversions] = await Promise.all([
    sql`SELECT count(*)::int AS value FROM products WHERE deleted_at IS NULL`,
    sql`SELECT count(*)::int AS value FROM product_categories WHERE deleted_at IS NULL`,
    sql`SELECT count(*)::int AS value FROM news_articles WHERE deleted_at IS NULL`,
    sql`SELECT count(*)::int AS value FROM leads WHERE deleted_at IS NULL AND created_at >= ${from} AND created_at < ${to}`,
    sql`SELECT count(*)::int AS value FROM site_events WHERE event_type = 'page_view' AND created_at >= ${from} AND created_at < ${to}`,
    sql`SELECT count(*)::int AS value FROM visitor_profiles WHERE last_seen_at >= ${from} AND last_seen_at < ${to}`,
    sql`SELECT count(*)::int AS value FROM visit_sessions WHERE started_at >= ${from} AND started_at < ${to}`,
    sql`SELECT count(*)::int AS value FROM download_assets WHERE enabled = true`,
    sql`SELECT count(*)::int AS value FROM site_events WHERE event_type = 'generate_lead' AND created_at >= ${from} AND created_at < ${to}`,
  ]);
  const count = (rows: unknown) => Number(((rows as { value?: number }[])[0]?.value) ?? 0);
  return NextResponse.json({ data: { products: count(products), categories: count(categories), news: count(news), leads: count(leads), views: count(views), visitors: count(visitors), sessions: count(sessions), conversions: count(conversions), downloads: count(downloads) }, appliedRange: query }, { headers: { "Cache-Control": "private, no-store" } });
}
