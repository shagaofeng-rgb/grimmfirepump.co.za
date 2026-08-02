import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { listLeads } from "@/lib/content-store";
import { getDatabase, hasDatabase } from "@/lib/database";

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ success: true, data: await listLeads() });
  const data = await getDatabase()`SELECT id, name, company, email, phone, country, product_interest AS "productInterest", message, status, sales_owner AS "salesOwner", priority, internal_note AS "internalNote", source_page AS "sourcePage", created_at AS "createdAt" FROM leads WHERE deleted_at IS NULL ORDER BY created_at DESC`;
  return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: NextRequest) {
  if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "本地预览模式暂不支持保存跟进。" }, { status: 503 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const priority = typeof body?.priority === "string" ? body.priority : "unrated";
  const salesOwner = typeof body?.salesOwner === "string" ? body.salesOwner.trim() : "";
  const internalNote = typeof body?.internalNote === "string" ? body.internalNote.trim() : "";
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
