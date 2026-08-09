import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ success: false, error: "News automation is disabled by editorial policy." }, { status: 410, headers: { "Cache-Control": "no-store" } }); }
