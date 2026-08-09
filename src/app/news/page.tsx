import Link from "next/link";
import { getPublishedNews } from "@/lib/content-store";
import { indexableResources } from "@/lib/resource-policy";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata("Technical Resources", "Original procurement and technical resources for fire-pump project discussions.", "/news");
export default async function NewsPage() { const resources = indexableResources(await getPublishedNews()); return <div className="wrap page"><h1>Technical Resources</h1><p className="page-lead">Original procurement guidance for fire-pump project discussions. Source-led or unreviewed industry updates are not listed here.</p><div className="news-list">{resources.length ? resources.map((article) => <article key={article.id}><span>{article.category} · {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(article.publishedAt))}</span><h2><Link href={`/news/${article.slug}`}>{article.title}</Link></h2><p>{article.excerpt}</p><Link className="inline-link" href={`/news/${article.slug}`}>Read resource →</Link></article>) : <p>No reviewed technical resources are published yet.</p>}</div></div>; }
