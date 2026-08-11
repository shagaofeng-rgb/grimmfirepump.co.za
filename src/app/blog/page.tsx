import Link from "next/link";
import { getPublishedBlogPosts } from "@/lib/blog-store";
import { sanitizeBlogToParagraphs } from "@/lib/blog-content";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata("Blog", "Technical articles and project guidance from GRIMM PUMP Africa.", "/blog");

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();
  return <div className="wrap page"><h1>Blog</h1><p className="page-lead">Technical articles and practical project guidance for fire-pump and water-system buyers.</p><div className="news-list">{posts.length ? posts.map((post) => {
    const excerpt = sanitizeBlogToParagraphs(post.content).join(" ").slice(0, 240);
    return <article key={post.id}><span>{post.classId} · {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(post.publishedAt))}</span><h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2><p>{excerpt}{excerpt.length === 240 ? "…" : ""}</p><Link className="inline-link" href={`/blog/${post.slug}`}>Read article →</Link></article>;
  }) : <p>No blog posts are published yet.</p>}</div></div>;
}
