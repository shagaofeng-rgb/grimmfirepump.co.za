import { NextRequest, NextResponse } from "next/server";
import { runNewsPublish } from "@/lib/news-pipeline";
import { automaticNewsPublicationEnabled } from "@/lib/news-publication-safety";

function allowed(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!automaticNewsPublicationEnabled()) {
    return NextResponse.json({ success: true, result: { skipped: true, reason: "publication_disabled_pending_verified_catalog" } }, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    return NextResponse.json({ success: true, result: await runNewsPublish() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ success: false, error: "News publication failed; inspect the run audit." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}