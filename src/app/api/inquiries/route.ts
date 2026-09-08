import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { addLead } from "@/lib/content-store";
import { getDatabase, hasDatabase } from "@/lib/database";
import { inquirySchema } from "@/lib/validation";
import { ensureVisitorAnalyticsSchema } from "@/lib/visitor-analytics";

const attempts = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    const last = attempts.get(ip) ?? 0;
    if (Date.now() - last < 20_000) return NextResponse.json({ error: "Please wait a moment before submitting again." }, { status: 429 });
    const input = inquirySchema.parse(await request.json());
    attempts.set(ip, Date.now());
    const id = randomUUID();
    const now = new Date().toISOString();

    if (hasDatabase() && input.visitorId && input.sessionId) {
      await ensureVisitorAnalyticsSchema();
      const sql = getDatabase();
      await sql`INSERT INTO leads (id, name, company, email, phone, country, product_interest, message, status, consent_at, created_at, source_page, visitor_id, session_id)
        VALUES (${id}, ${input.name}, ${input.company}, ${input.email}, ${input.phone || null}, ${input.country}, ${input.productInterest}, ${input.message}, 'new', ${now}, ${now}, ${input.sourcePage ?? '/contact'}, ${input.visitorId}, ${input.sessionId})`;
      await sql`INSERT INTO site_events (path, event_type, visitor_id, session_id)
        VALUES (${input.sourcePage ?? '/contact'}, 'generate_lead', ${input.visitorId}, ${input.sessionId})`;
    } else {
      await addLead({ id, name: input.name, company: input.company, email: input.email, phone: input.phone, country: input.country, productInterest: input.productInterest, message: input.message, status: "new", createdAt: now, consentAt: now });
    }

    return NextResponse.json({ message: "Thank you. Your enquiry has been recorded. The GRIMM PUMP team will review it." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Please complete all required fields with valid information." }, { status: 400 });
  }
}
