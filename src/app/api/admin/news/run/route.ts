import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { runNewsAutomation } from "@/lib/news-automation";
export async function POST() {
  if (!await isAdmin()) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ success: true, data: await runNewsAutomation("admin") }); }
  catch { return NextResponse.json({ success: false, error: "News automation failed safely. Check the job audit." }, { status: 500 }); }
}
