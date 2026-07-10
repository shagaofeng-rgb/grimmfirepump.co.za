import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { listLeads } from "@/lib/content-store";
export async function GET() { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ success: true, data: await listLeads() }); }
