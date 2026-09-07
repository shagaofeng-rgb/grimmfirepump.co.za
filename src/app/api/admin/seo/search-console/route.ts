import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getDatabase, hasDatabase } from "@/lib/database";
import {
  asGoogleSearchConsoleError,
  getSearchConsoleReport,
  submitSitemapToSearchConsole,
} from "@/lib/google-search-console";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const value = Number(request.nextUrl.searchParams.get("days") ?? "28");
  const days = Number.isFinite(value) ? value : 28;

  try {
    const report = await getSearchConsoleReport(days);
    const syncRuns = hasDatabase()
      ? await getDatabase()`SELECT source, status, started_at, finished_at, error_code, error_message, records_synced FROM seo_sync_runs WHERE source LIKE 'google_search_console_sitemap%' ORDER BY started_at DESC LIMIT 10`
      : [];
    return NextResponse.json({ success: true, data: report, sitemapSyncRuns: syncRuns }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const failure = asGoogleSearchConsoleError(error);
    return NextResponse.json({
      error: failure.message,
      errorCode: failure.code,
    }, { status: 502, headers: { "Cache-Control": "private, no-store" } });
  }
}

export async function POST() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "Database is unavailable." }, { status: 503 });

  const sql = getDatabase();
  const started = await sql`
    INSERT INTO seo_sync_runs (source, status, details)
    VALUES ('google_search_console_sitemap_manual', 'running', ${JSON.stringify({ source: "admin_manual" })}::jsonb)
    RETURNING id
  ` as unknown as { id: string }[];
  const runId = started[0]?.id;

  try {
    const data = await submitSitemapToSearchConsole();
    await sql`UPDATE seo_sync_runs SET status='succeeded', finished_at=now(), records_synced=1, details=${JSON.stringify(data)}::jsonb WHERE id=${runId}`;
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const failure = asGoogleSearchConsoleError(error);
    await sql`UPDATE seo_sync_runs SET status='failed', finished_at=now(), error_code=${failure.code}, error_message=${failure.message}, details=${JSON.stringify({ httpStatus: failure.httpStatus ?? null })}::jsonb WHERE id=${runId}`;
    return NextResponse.json({
      error: failure.message,
      errorCode: failure.code,
    }, { status: 502 });
  }
}
