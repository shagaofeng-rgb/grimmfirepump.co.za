import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPost } from "@/lib/blog-store";
import { sanitizeBlogToParagraphs } from "@/lib/blog-content";
import { absoluteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const post = await getBlogPost((await params).slug); const path = `/blog/${post?.slug ?? ""}`; return { title: post?.title ?? "Blog article", description: post ? sanitizeBlogToParagraphs(post.content).join(" ").slice(0, 155) : undefined, alternates: { canonical: absoluteUrl(path) }, robots: { index: false, follow: true } }; }
export default async function BlogDetail({ params }: { params: Promise<{ slug: string }> }) { const post = await getBlogPost((await params).slug); if (!post) notFound(); const paragraphs = sanitizeBlogToParagraphs(post.content); return <article className="wrap article"><Link href="/blog" className="breadcrumb">← Blog</Link><p className="notice">This legacy article is awaiting technical and editorial review and is excluded from search indexing.</p><h1>{post.title}</h1><time dateTime={post.publishedAt}>Published {new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(post.publishedAt))}</time><div className="article-content">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></article>; }
