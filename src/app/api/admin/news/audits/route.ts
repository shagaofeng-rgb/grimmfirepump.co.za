import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getDatabase, hasDatabase } from "@/lib/database";
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ success: true, data: [] });
  const data = await getDatabase()`SELECT audit_date, timezone, target_count, published_count, missing_count, status, checked_at, last_error FROM news_publication_audits ORDER BY audit_date DESC LIMIT 30`;
  return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
}
