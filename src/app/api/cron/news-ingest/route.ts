import { NextRequest, NextResponse } from "next/server";
import { runNewsIngest } from "@/lib/news-pipeline";
function allowed(request: NextRequest) { const secret = process.env.CRON_SECRET; return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`); }
export async function GET(request: NextRequest) { if (!allowed(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { return NextResponse.json({ success: true, result: await runNewsIngest() }, { headers: { "Cache-Control": "no-store" } }); } catch { return NextResponse.json({ success: false, error: "News ingestion failed; inspect the run audit." }, { status: 500, headers: { "Cache-Control": "no-store" } }); } }
