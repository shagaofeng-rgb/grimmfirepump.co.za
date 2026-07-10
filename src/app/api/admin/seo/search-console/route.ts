import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSearchConsoleReport } from "@/lib/google-search-console";

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
