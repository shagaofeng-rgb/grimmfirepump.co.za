import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { publishWebhookBlogPost, recordBlogWebhookDelivery, webhookFingerprint } from "@/lib/blog-store";

export const dynamic = "force-dynamic";

function reply(code: 0 | 1, msg: string, status = 200) {
  return NextResponse.json({ code, msg }, { status, headers: { "Cache-Control": "no-store" } });
}
function safeText(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function validImage(value: string) { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }
function equal(left: string, right: string) { return Boolean(left && left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right))); }
function validSign(sign: string) { return equal(sign, process.env.WEBHOOK_ARTICLE_SIGN ?? process.env.BLOG_WEBHOOK_SECRET ?? ""); }

export async function GET(request: NextRequest) {
  const ok = validSign(safeText(request.nextUrl.searchParams.get("sign"), 512));
  return ok ? reply(1, "Verification successful") : reply(0, "Invalid API key", 401);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const input = contentType.includes("application/json") ? await request.json().catch(() => ({})) : Object.fromEntries(await request.formData().catch(() => new FormData()));
  const sign = safeText(input.sign, 512);
  if (!validSign(sign)) return reply(0, "Invalid API key", 401);
  const classId = safeText(input.class_id, 120) || "blog";
  const title = safeText(input.title, 180);
  const content = safeText(input.content, 50_000);
  const authorId = safeText(input.author_id, 120) || "plugin";
  const imageUrl = safeText(input.image_url, 2048);
  if (title.length < 3 || content.length < 10) {
    await recordBlogWebhookDelivery({ classId, outcome: "validated", httpStatus: 200, detail: "Signed validation request" });
    return reply(1, "Verification successful");
  }
  const fingerprint = webhookFingerprint({ classId, title, content, authorId });
  if (imageUrl && !validImage(imageUrl)) {
    await recordBlogWebhookDelivery({ classId, fingerprint, outcome: "rejected", httpStatus: 400, detail: "Invalid cover image URL" });
    return reply(0, "Cover image URL must use HTTP or HTTPS", 400);
  }
  try {
    const result = await publishWebhookBlogPost({ classId, title, content, authorId, imageUrl: imageUrl || undefined });
    await recordBlogWebhookDelivery({ classId, fingerprint, outcome: result.duplicate ? "duplicate" : "published", httpStatus: 200, detail: result.duplicate ? "Duplicate request ignored" : `Published ${result.post.slug}` });
    return reply(1, result.duplicate ? "Published successfully (duplicate request ignored)" : "Published successfully");
  } catch {
    await recordBlogWebhookDelivery({ classId, fingerprint, outcome: "failed", httpStatus: 500, detail: "Database write failed" });
    return reply(0, "Publication failed. Please retry.", 500);
  }
}
