import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { publishWebhookBlogPost } from "@/lib/blog-store";

export const dynamic = "force-dynamic";
function reply(code: 0 | 1, msg: string, status = 200) { return NextResponse.json({ code, msg }, { status, headers: { "Cache-Control": "no-store" } }); }
function safeText(value: unknown, max: number) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function validImage(value: string) { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } }
function equal(left: string, right: string) { if (!left || left.length !== right.length) return false; return timingSafeEqual(Buffer.from(left), Buffer.from(right)); }
export async function POST(request: NextRequest) {
  const secret = process.env.BLOG_WEBHOOK_SECRET ?? "";
  const contentType = request.headers.get("content-type") ?? "";
  const input = contentType.includes("application/json") ? await request.json().catch(() => ({})) : Object.fromEntries(await request.formData().catch(() => new FormData()));
  const sign = safeText(input.sign, 512); if (!secret || !equal(sign, secret)) return reply(0, "秘钥错误", 401);
  const classId = safeText(input.class_id, 120) || "blog"; const title = safeText(input.title, 180); const content = safeText(input.content, 50_000); const authorId = safeText(input.author_id, 120) || "plugin"; const imageUrl = safeText(input.image_url, 2048);
  if (title.length < 3 || content.length < 10) return reply(0, "文章标题或正文不符合要求", 400);
  if (imageUrl && !validImage(imageUrl)) return reply(0, "封面图地址必须是 http 或 https URL", 400);
  try { const result = await publishWebhookBlogPost({ classId, title, content, authorId, imageUrl: imageUrl || undefined }); return reply(1, result.duplicate ? "发布成功（重复请求已安全忽略）" : "发布成功"); }
  catch { return reply(0, "数据录入失败，请重试", 500); }
}
