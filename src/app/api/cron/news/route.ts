import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runNewsAutomation } from "@/lib/news-automation";

export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET ?? process.env.NEWS_CRON_SECRET;
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected || expected.length !== received.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(received))) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ success: true, data: await runNewsAutomation("cron") }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ success: false, error: "News automation failed safely. Check the private job audit." }, { status: 500 }); }
}
