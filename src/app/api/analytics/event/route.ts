import { NextRequest, NextResponse } from "next/server";
import { getDatabase, hasDatabase } from "@/lib/database";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { path?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path.slice(0, 300) : "";
  if (!path || !path.startsWith("/") || !hasDatabase()) return NextResponse.json({ success: true });
  await getDatabase()`INSERT INTO site_events (path, event_type) VALUES (${path}, 'page_view')`;
  return NextResponse.json({ success: true });
}
