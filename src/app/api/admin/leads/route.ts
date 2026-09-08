import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getAdminQuery, pagination } from "@/lib/admin-query";
import { listLeads } from "@/lib/content-store";
import { getDatabase, hasDatabase } from "@/lib/database";
import { ensureVisitorAnalyticsSchema } from "@/lib/visitor-analytics";

export async function GET(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = getAdminQuery(request);
  if (!hasDatabase()) {
    const all = await listLeads();
    const data = all.filter((lead) => !query.q || [lead.name, lead.company, lead.email, lead.country].join(" ").toLowerCase().includes(query.q.toLowerCase())).slice(query.offset, query.offset + query.pageSize);
    return NextResponse.json({ success: true, data, pagination: pagination(all.length, query.page, query.pageSize) });
  }

  await ensureVisitorAnalyticsSchema();
  const params = new URL(request.url).searchParams;
  const status = (params.get("status") ?? "").slice(0, 24);
  const priority = (params.get("priority") ?? "").slice(0, 12);
  const owner = (params.get("owner") ?? "").slice(0, 120);
  const country = (params.get("country") ?? "").slice(0, 100);
  const source = (params.get("source") ?? "").slice(0, 300);
  const needle = `%${query.q}%`;
  const rangeStart = query.from ?? new Date(0);
  const rangeEnd = query.to ?? new Date("9999-12-31T23:59:59.999Z");
  const sql = getDatabase();
  const [data, count] = await Promise.all([
    sql`SELECT id, name, company, email, phone, country, product_interest AS "productInterest", message, status, sales_owner AS "salesOwner", priority, internal_note AS "internalNote", source_page AS "sourcePage", utm, visitor_id AS "visitorId", session_id AS "sessionId", created_at AS "createdAt", updated_at AS "updatedAt"
      FROM leads WHERE deleted_at IS NULL AND created_at >= ${rangeStart} AND created_at < ${rangeEnd}
      AND (${query.q} = '' OR name ILIKE ${needle} OR company ILIKE ${needle} OR email ILIKE ${needle} OR country ILIKE ${needle} OR product_interest ILIKE ${needle})
      AND (${status} = '' OR status = ${status}) AND (${priority} = '' OR priority = ${priority})
      AND (${owner} = '' OR COALESCE(sales_owner,'') = ${owner}) AND (${country} = '' OR country = ${country})
      AND (${source} = '' OR COALESCE(source_page,'') = ${source})
      ORDER BY created_at DESC LIMIT ${query.pageSize} OFFSET ${query.offset}`,
    sql`SELECT count(*)::int AS value FROM leads WHERE deleted_at IS NULL AND created_at >= ${rangeStart} AND created_at < ${rangeEnd}
      AND (${query.q} = '' OR name ILIKE ${needle} OR company ILIKE ${needle} OR email ILIKE ${needle} OR country ILIKE ${needle} OR product_interest ILIKE ${needle})
      AND (${status} = '' OR status = ${status}) AND (${priority} = '' OR priority = ${priority})
      AND (${owner} = '' OR COALESCE(sales_owner,'') = ${owner}) AND (${country} = '' OR country = ${country})
      AND (${source} = '' OR COALESCE(source_page,'') = ${source})`,
  ]);
  const total = Number(((count as unknown as { value?: number }[])[0]?.value) ?? 0);
  return NextResponse.json({ success: true, data, pagination: pagination(total, query.page, query.pageSize) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "本地预览模式暂不支持保存跟进。" }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const priority = typeof body?.priority === "string" ? body.priority : "unrated";
  const salesOwner = typeof body?.salesOwner === "string" ? body.salesOwner.trim().slice(0, 120) : "";
  const internalNote = typeof body?.internalNote === "string" ? body.internalNote.trim().slice(0, 4000) : "";
  const permitted = ["new", "contacted", "qualified", "quoted", "closed", "spam", "archived"];
  if (!id || !permitted.includes(status) || !["A", "B", "C", "unrated"].includes(priority)) return NextResponse.json({ error: "跟进字段不正确。" }, { status: 400 });
  await getDatabase()`UPDATE leads SET status=${status}, priority=${priority}, sales_owner=${salesOwner || null}, internal_note=${internalNote || null}, updated_at=now() WHERE id=${id} AND deleted_at IS NULL`;
  await getDatabase()`INSERT INTO audit_logs (action, module, entity_type, entity_id) VALUES ('update', 'leads', 'lead', ${id})`;
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "数据库不可用。" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "缺少线索编号。" }, { status: 400 });
  await getDatabase()`UPDATE leads SET deleted_at=now(), updated_at=now() WHERE id=${id} AND deleted_at IS NULL`;
  await getDatabase()`INSERT INTO audit_logs (action, module, entity_type, entity_id) VALUES ('delete', 'leads', 'lead', ${id})`;
  return NextResponse.json({ success: true });
}
