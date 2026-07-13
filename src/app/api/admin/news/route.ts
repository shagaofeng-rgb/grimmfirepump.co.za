import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAdmin } from "@/lib/admin-auth";
import { addNews, getPublishedNews } from "@/lib/content-store";
import { newsSchema } from "@/lib/validation";
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
export async function GET() { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ data: await getPublishedNews() }); }
export async function POST(request: NextRequest) { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const input = newsSchema.parse(await request.json()); await addNews({ id: randomUUID(), slug: `${slugify(input.title)}-${randomUUID().slice(0, 6)}`, title: input.title, excerpt: input.excerpt, content: [input.excerpt], category: input.category, status: "draft", publishedAt: new Date().toISOString(), relatedProductIds: [] }); return NextResponse.json({ success: true, data: { status: "draft" } }, { status: 201 }); } catch { return NextResponse.json({ error: "Check the article fields." }, { status: 400 }); } }
