import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDatabase, hasDatabase } from "@/lib/database";
import { submitSitemapToSearchConsole } from "@/lib/google-search-console";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET ?? "";
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(expected && actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected)));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!hasDatabase()) return NextResponse.json({ success: false, error: "Database is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const sql = getDatabase();
  const started = await sql`INSERT INTO seo_sync_runs (source, status, details) VALUES ('google_search_console_sitemap', 'running', '{}'::jsonb) RETURNING id` as unknown as { id: string }[];
  const runId = started[0]?.id;
  try {
    const result = await submitSitemapToSearchConsole();
    await sql`UPDATE seo_sync_runs SET status='succeeded', finished_at=now(), records_synced=1, details=${JSON.stringify(result)}::jsonb WHERE id=${runId}`;
    return NextResponse.json({ success: true, data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Google sitemap submission failed.";
    await sql`UPDATE seo_sync_runs SET status='failed', finished_at=now(), error_message=${message} WHERE id=${runId}`;
    return NextResponse.json({ success: false, error: "Google sitemap submission failed." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
