import { NextRequest, NextResponse } from "next/server";
import { getDatabase, hasDatabase } from "@/lib/database";
import { safePath, validTrackingId } from "@/lib/admin-query";
import { ensureVisitorAnalyticsSchema, sanitizeReferrer, sanitizeUtm } from "@/lib/visitor-analytics";

const allowedEvents = new Set(["page_view", "product_view", "generate_lead", "whatsapp_click", "email_click", "catalog_download"]);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const path = safePath(body?.path);
  const eventType = typeof body?.eventType === "string" && allowedEvents.has(body.eventType) ? body.eventType : "page_view";
  const visitorId = validTrackingId(body?.visitorId);
  const sessionId = validTrackingId(body?.sessionId);
  const referrer = sanitizeReferrer(body?.referrer ?? request.headers.get("referer"));
  const utm = sanitizeUtm(body?.utm);

  if (!path || !hasDatabase()) return NextResponse.json({ success: true });
  if (!visitorId || !sessionId) {
    // Preserve the existing aggregate counter for older browsers without first-party storage.
    await getDatabase()`INSERT INTO site_events (path, event_type) VALUES (${path}, ${eventType})`;
    return NextResponse.json({ success: true, attributed: false });
  }

  try {
    await ensureVisitorAnalyticsSchema();
    const sql = getDatabase();
    const json = JSON.stringify(utm);
    await sql`INSERT INTO visitor_profiles (id, first_path, last_path, first_referrer, last_referrer, first_utm, last_utm)
      VALUES (${visitorId}, ${path}, ${path}, ${referrer}, ${referrer}, ${json}::jsonb, ${json}::jsonb)
      ON CONFLICT (id) DO UPDATE SET last_seen_at=now(), last_path=EXCLUDED.last_path, last_referrer=COALESCE(EXCLUDED.last_referrer, visitor_profiles.last_referrer), last_utm=CASE WHEN EXCLUDED.last_utm <> '{}'::jsonb THEN EXCLUDED.last_utm ELSE visitor_profiles.last_utm END`;
    await sql`INSERT INTO visit_sessions (id, visitor_id, entry_path, exit_path, referrer, utm)
      VALUES (${sessionId}, ${visitorId}, ${path}, ${path}, ${referrer}, ${json}::jsonb)
      ON CONFLICT (id) DO UPDATE SET last_seen_at=now(), exit_path=EXCLUDED.exit_path`;
    await sql`INSERT INTO site_events (path, event_type, visitor_id, session_id, referrer, metadata)
      VALUES (${path}, ${eventType}, ${visitorId}, ${sessionId}, ${referrer}, ${json}::jsonb)`;
    return NextResponse.json({ success: true, attributed: true });
  } catch {
    return NextResponse.json({ success: true, attributed: false });
  }
}
