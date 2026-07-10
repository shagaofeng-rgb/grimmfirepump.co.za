import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAdmin } from "@/lib/admin-auth";
import { addProduct, getPublishedProducts } from "@/lib/content-store";
import { productSchema } from "@/lib/validation";
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
export async function GET() { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); return NextResponse.json({ data: await getPublishedProducts() }); }
export async function POST(request: NextRequest) { if (!await isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { const input = productSchema.parse(await request.json()); const slug = `${slugify(input.name)}-${randomUUID().slice(0, 6)}`; await addProduct({ id: randomUUID(), slug, name: input.name, category: input.category, summary: input.summary, applications: [], highlights: ["Added in local admin"], specifications: [], image: "https://www.grimmfirepump.com/_next/image?url=%2Fassets%2Fsynced%2Fproducts%2Fedj-fire-pump-set.jpg&w=1200&q=80", published: true }); return NextResponse.json({ success: true }, { status: 201 }); } catch { return NextResponse.json({ error: "Check the product fields." }, { status: 400 }); } }
