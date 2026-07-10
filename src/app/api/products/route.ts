import { NextResponse } from "next/server";
import { getPublishedProducts } from "@/lib/content-store";
export async function GET() { return NextResponse.json({ success: true, data: await getPublishedProducts() }); }
