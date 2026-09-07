import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDatabase, hasDatabase } from "@/lib/database";
import {
  asGoogleSearchConsoleError,
  submitSitemapToSearchConsole,
} from "@/lib/google-search-console";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET ?? "";
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return Boolean(expected && actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected)));
}

function runKey(date = new Date()) {
  return `google-search-console-sitemap:${date.toISOString().slice(0, 10)}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ success: false, error: "Database is unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const sql = getDatabase();
  const idempotencyKey = runKey();
  const lock = await sql`
    INSERT INTO news_jobs (job_type, status, idempotency_key, started_at, metadata)
    VALUES ('google_search_console_sitemap', 'running', ${idempotencyKey}, now(), ${JSON.stringify({ source: "vercel_cron" })}::jsonb)
    ON CONFLICT (idempotency_key) DO NOTHING
    RETURNING id
  ` as unknown as { id: string }[];

  if (!lock[0]?.id) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "A sitemap submission for this scheduled UTC day has already been started.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const jobId = lock[0].id;
  const started = await sql`
    INSERT INTO seo_sync_runs (source, status, details)
    VALUES ('google_search_console_sitemap', 'running', ${JSON.stringify({ idempotencyKey })}::jsonb)
    RETURNING id
  ` as unknown as { id: string }[];
  const runId = started[0]?.id;

  try {
    const result = await submitSitemapToSearchConsole();
    await Promise.all([
      sql`UPDATE seo_sync_runs SET status='succeeded', finished_at=now(), records_synced=1, details=${JSON.stringify({ ...result, idempotencyKey })}::jsonb WHERE id=${runId}`,
      sql`UPDATE news_jobs SET status='succeeded', completed_at=now(), metadata=${JSON.stringify({ source: "vercel_cron", result })}::jsonb WHERE id=${jobId}`,
    ]);
    return NextResponse.json({ success: true, data: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = asGoogleSearchConsoleError(error);
    await Promise.all([
      sql`UPDATE seo_sync_runs SET status='failed', finished_at=now(), error_code=${failure.code}, error_message=${failure.message}, details=${JSON.stringify({ idempotencyKey, httpStatus: failure.httpStatus ?? null })}::jsonb WHERE id=${runId}`,
      sql`UPDATE news_jobs SET status='failed', completed_at=now(), error_message=${failure.message}, metadata=${JSON.stringify({ source: "vercel_cron", errorCode: failure.code, httpStatus: failure.httpStatus ?? null })}::jsonb WHERE id=${jobId}`,
    ]);
    return NextResponse.json({
      success: false,
      error: failure.message,
      errorCode: failure.code,
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
