import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getDatabase, hasDatabase } from "@/lib/database";
import { getSearchConsoleReport, submitSitemapToSearchConsole } from "@/lib/google-search-console";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const value = Number(request.nextUrl.searchParams.get("days") ?? "28");
  const days = Number.isFinite(value) ? value : 28;

  try {
    return NextResponse.json({ success: true, data: await getSearchConsoleReport(days) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Search Console sync failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });
  const sql = getDatabase();
  const started = await sql`INSERT INTO seo_sync_runs (source, status, details) VALUES ('google_search_console_sitemap_manual', 'running', '{}'::jsonb) RETURNING id` as unknown as { id: string }[];
  const runId = started[0]?.id;
  try {
    const data = await submitSitemapToSearchConsole();
    await sql`UPDATE seo_sync_runs SET status='succeeded', finished_at=now(), records_synced=1, details=${JSON.stringify(data)}::jsonb WHERE id=${runId}`;
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Google sitemap submission failed.";
    await sql`UPDATE seo_sync_runs SET status='failed', finished_at=now(), error_message=${message} WHERE id=${runId}`;
    return NextResponse.json({ error: "Google sitemap submission failed." }, { status: 502 });
  }
}
