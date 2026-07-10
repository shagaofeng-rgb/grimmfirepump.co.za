import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { addLead } from "@/lib/content-store";
import { inquirySchema } from "@/lib/validation";
const attempts = new Map<string, number>();
export async function POST(request: NextRequest) { try { const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local"; const last = attempts.get(ip) ?? 0; if (Date.now() - last < 20_000) return NextResponse.json({ error: "Please wait a moment before submitting again." }, { status: 429 }); const input = inquirySchema.parse(await request.json()); attempts.set(ip, Date.now()); await addLead({ id: randomUUID(), name: input.name, company: input.company, email: input.email, phone: input.phone, country: input.country, productInterest: input.productInterest, message: input.message, status: "new", createdAt: new Date().toISOString(), consentAt: new Date().toISOString() }); return NextResponse.json({ message: "Thank you. Your enquiry has been recorded. The GRIMM PUMP team will review it." }, { status: 201 }); } catch { return NextResponse.json({ error: "Please complete all required fields with valid information." }, { status: 400 }); } }
