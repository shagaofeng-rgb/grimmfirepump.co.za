import { z } from "zod";

const trackingId = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/).optional();

export const inquirySchema = z.object({
  name: z.string().trim().min(2).max(100), company: z.string().trim().min(2).max(160), email: z.string().trim().email().max(160),
  phone: z.string().trim().max(60).optional(), country: z.string().trim().min(2).max(100), productInterest: z.string().trim().min(2).max(160),
  message: z.string().trim().min(20).max(3000), consent: z.literal(true), honeypot: z.string().max(0).optional(),
  visitorId: trackingId, sessionId: trackingId, sourcePage: z.string().startsWith("/").max(300).optional(),
});
export const productSchema = z.object({ name: z.string().trim().min(3).max(160), category: z.enum(["Fire pump systems", "Water supply", "Mobile pumping", "Drainage"]), summary: z.string().trim().min(20).max(500) });
export const newsSchema = z.object({ title: z.string().trim().min(10).max(180), excerpt: z.string().trim().min(30).max(500), category: z.string().trim().min(2).max(80), status: z.enum(["draft", "published"]) });
