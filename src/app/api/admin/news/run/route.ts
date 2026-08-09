import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
export async function POST() { if (!await isAdmin()) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ success: false, error: "News automation is disabled by editorial policy." }, { status: 410, headers: { "Cache-Control": "no-store" } }); }
