import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminQuery, pagination, validTrackingId } from "@/lib/admin-query";
import { getDatabase, hasDatabase } from "@/lib/database";
import { ensureVisitorAnalyticsSchema } from "@/lib/visitor-analytics";

export async function GET(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ data: [], pagination: pagination(0, 1, 25) });

  await ensureVisitorAnalyticsSchema();
  const sql = getDatabase();
  const id = validTrackingId(new URL(request.url).searchParams.get("id"));

  if (id) {
    const [profile, sessions, events, leads] = await Promise.all([
      sql`SELECT id, first_seen_at AS "firstSeenAt", last_seen_at AS "lastSeenAt", first_path AS "firstPath", last_path AS "lastPath", first_referrer AS "firstReferrer", last_referrer AS "lastReferrer", first_utm AS "firstUtm", last_utm AS "lastUtm" FROM visitor_profiles WHERE id=${id}`,
      sql`SELECT id, started_at AS "startedAt", last_seen_at AS "lastSeenAt", ended_at AS "endedAt", entry_path AS "entryPath", exit_path AS "exitPath", referrer, utm FROM visit_sessions WHERE visitor_id=${id} ORDER BY started_at DESC`,
      sql`SELECT id, path, event_type AS "eventType", created_at AS "createdAt", referrer, metadata FROM site_events WHERE visitor_id=${id} ORDER BY created_at ASC LIMIT 1000`,
      sql`SELECT id, name, company, email, status, product_interest AS "productInterest", created_at AS "createdAt" FROM leads WHERE visitor_id=${id} AND deleted_at IS NULL ORDER BY created_at DESC`,
    ]);
    return NextResponse.json({ data: { profile: (profile as unknown[])[0] ?? null, sessions, events, leads } }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const query = getAdminQuery(request);
  const needle = `%${query.q}%`;
  const rangeStart = query.from ?? new Date(0);
  const rangeEnd = query.to ?? new Date("9999-12-31T23:59:59.999Z");
  const [rows, count] = await Promise.all([
    sql`SELECT v.id, v.first_seen_at AS "firstSeenAt", v.last_seen_at AS "lastSeenAt", v.first_path AS "firstPath", v.last_path AS "lastPath", v.last_referrer AS "lastReferrer",
      count(DISTINCT s.id)::int AS sessions, count(e.id)::int AS events,
      max(l.created_at) AS "lastLeadAt"
      FROM visitor_profiles v
      LEFT JOIN visit_sessions s ON s.visitor_id=v.id
      LEFT JOIN site_events e ON e.visitor_id=v.id
      LEFT JOIN leads l ON l.visitor_id=v.id AND l.deleted_at IS NULL
      WHERE v.last_seen_at >= ${rangeStart} AND v.last_seen_at < ${rangeEnd}
      AND (${query.q} = '' OR v.id ILIKE ${needle} OR COALESCE(v.last_path,'') ILIKE ${needle} OR COALESCE(v.last_referrer,'') ILIKE ${needle})
      GROUP BY v.id
      ORDER BY v.last_seen_at DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM visitor_profiles v WHERE v.last_seen_at >= ${rangeStart} AND v.last_seen_at < ${rangeEnd}
      AND (${query.q} = '' OR v.id ILIKE ${needle} OR COALESCE(v.last_path,'') ILIKE ${needle} OR COALESCE(v.last_referrer,'') ILIKE ${needle})`,
  ]);
  const total = Number(((count as unknown as { value?: number }[])[0]?.value) ?? 0);
  return NextResponse.json({ data: rows, pagination: pagination(total, query.page, query.pageSize) }, { headers: { "Cache-Control": "private, no-store" } });
}
