import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/database";
import { assertSiteConfig } from "@/lib/news-site-config";

type FeedItem = { title?: string; link?: string; pubDate?: string; published?: string; updated?: string; description?: string; summary?: string; creator?: string };
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const plain = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const normalized = (value: string) => plain(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function canonical(value: string) { try { const url = new URL(value); if (!/^https?:$/.test(url.protocol) || /^(localhost|127\.|10\.|192\.168\.)/.test(url.hostname)) return null; ["fbclid", "gclid"].forEach((key) => url.searchParams.delete(key)); [...url.searchParams.keys()].filter((key) => key.startsWith("utm_")).forEach((key) => url.searchParams.delete(key)); url.hash = ""; return url.toString(); } catch { return null; } }
function safeSlug(title: string) { return `${normalized(title).replace(/\s+/g, "-").slice(0, 72) || "industry-update"}-${randomUUID().slice(0, 8)}`; }
function score(title: string, summary: string, credibility: number) {
  const text = `${title} ${summary}`.toLowerCase();
  const direct = ["fire pump", "fire water", "water supply", "water treatment", "water security", "dewater", "sanitation", "flood", "pump station", "water infrastructure"];
  const project = ["infrastructure", "industrialisation", "industrial", "manufacturing", "construction", "energy", "mining", "safety", "standard", "regulation"];
  const regional = ["africa", "african", "sadc", "south africa", "regional"];
  const directHits = direct.filter((term) => text.includes(term)).length;
  const projectHits = project.filter((term) => text.includes(term)).length;
  const regionalHits = regional.filter((term) => text.includes(term)).length;
  return Math.min(100, directHits * 30 + Math.min(projectHits, 2) * 18 + Math.min(regionalHits, 2) * 8 + Math.round(Math.min(1, Number(credibility)) * 18) + 10);
}
async function items(url: string): Promise<FeedItem[]> { const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12_000), headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" } }); if (!response.ok) return []; const body = await response.text(); if (body.length > 1_000_000) return []; const parsed = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse(body) as { rss?: { channel?: { item?: FeedItem | FeedItem[] } }; feed?: { entry?: FeedItem | FeedItem[] } }; const value = parsed.rss?.channel?.item ?? parsed.feed?.entry ?? []; return Array.isArray(value) ? value : [value]; }

export async function runNewsIngest() {
  const config = assertSiteConfig(); const sql = getDatabase(); const key = `${config.siteId}:ingest:${Math.floor(Date.now() / 43_200_000)}`;
  const run = await sql`INSERT INTO news_ingest_runs (site_id,idempotency_key,status) VALUES (${config.siteId},${key},'running') ON CONFLICT (idempotency_key) DO NOTHING RETURNING id` as unknown as { id: string }[];
  if (!run.length) return { skipped: true, reason: "already_run" };
  let discovered = 0, candidates = 0, rejected = 0;
  try {
    const sources = await sql`SELECT id, publisher_name, rss_url, language, credibility_score FROM news_sources WHERE site_id=${config.siteId} AND enabled=true ORDER BY credibility_score DESC` as unknown as { id: string; publisher_name: string; rss_url: string; language: string; credibility_score: number }[];
    for (const source of sources) for (const item of await items(source.rss_url)) {
      discovered++; const title = plain(String(item.title ?? "")); const sourceUrl = canonical(String(item.link ?? "")); const date = new Date(String(item.pubDate ?? item.published ?? item.updated ?? "")); const summary = plain(String(item.description ?? item.summary ?? "")).slice(0, 1500); const age = Date.now() - date.valueOf(); const candidateScore = score(title, summary, Number(source.credibility_score));
      const valid = Boolean(title && sourceUrl && Number.isFinite(date.valueOf()) && age >= 0 && age <= config.news.candidateMaxAgeHours * 3_600_000 && candidateScore >= config.news.minScore && new URL(sourceUrl).hostname === new URL(source.rss_url).hostname);
      if (!valid || !sourceUrl) { rejected++; continue; }
      const fingerprint = hash(sourceUrl);
      const inserted = await sql`INSERT INTO news_candidates (site_id,source_id,source_title,normalized_title,source_author,source_publisher,source_url,canonical_source_url,source_language,source_published_at,source_fingerprint,event_fingerprint,content_summary,credibility_score,relevance_score,candidate_score,status) VALUES (${config.siteId},${source.id},${title},${normalized(title)},${typeof item.creator === 'string' ? plain(item.creator) : null},${source.publisher_name},${sourceUrl},${sourceUrl},${source.language},${date.toISOString()},${fingerprint},${hash(normalized(title))},${summary},${source.credibility_score},${candidateScore / 100},${candidateScore},'candidate') ON CONFLICT (canonical_source_url) DO NOTHING RETURNING id` as unknown as { id: string }[];
      candidates += inserted.length;
    }
    await sql`UPDATE news_ingest_runs SET status='succeeded', completed_at=now(), discovered_count=${discovered}, candidate_count=${candidates}, rejected_count=${rejected}, details=${JSON.stringify({ sources: sources.length, operation: 'ingest_only' })}::jsonb WHERE id=${run[0].id}`;
    return { discovered, candidates, rejected };
  } catch (error) { const message = error instanceof Error ? error.message.slice(0, 500) : "Ingest failed"; await sql`UPDATE news_ingest_runs SET status='failed', completed_at=now(), error_message=${message} WHERE id=${run[0].id}`; throw error; }
}

export async function runNewsPublish() {
  const config = assertSiteConfig(); const sql = getDatabase(); const key = `${config.siteId}:publish:${Math.floor(Date.now() / 172_800_000)}`;
  const run = await sql`INSERT INTO news_publication_runs (site_id,idempotency_key,status) VALUES (${config.siteId},${key},'selecting') ON CONFLICT (idempotency_key) DO NOTHING RETURNING id` as unknown as { id: string }[];
  if (!run.length) return { skipped: true, reason: "already_run" };
  try {
    const rows = await sql`SELECT id,source_title,source_author,source_publisher,source_url,canonical_source_url,source_published_at,content_summary FROM news_candidates WHERE site_id=${config.siteId} AND status='candidate' AND source_published_at >= now() - (${config.news.fallbackCandidateMaxAgeDays}::text || ' days')::interval ORDER BY candidate_score DESC, source_published_at DESC LIMIT 1` as unknown as { id: string; source_title: string; source_author: string | null; source_publisher: string; source_url: string; canonical_source_url: string; source_published_at: string; content_summary: string | null }[];
    const candidate = rows[0]; if (!candidate) throw new Error("No verified News candidate is available; no article was invented or published.");
    const articleId = randomUUID(); const title = candidate.source_title; const excerpt = (candidate.content_summary || title).slice(0, 300); const content = [candidate.content_summary || "The original source has published this verified update.", "Why this matters: project teams should review the original notice and confirm its implications against their own specification, regulatory and operating requirements."];
    await sql`UPDATE news_publication_runs SET status='publishing', article_id=${articleId} WHERE id=${run[0].id}`;
    await sql`INSERT INTO news_articles (id,site_id,slug,title,excerpt,content,category,status,published_at,updated_published_at,language,source_name,source_url,source_title,source_author,source_publisher,canonical_source_url,source_published_at,source_fetched_at,source_fingerprint,event_fingerprint,content_hash,editorial_disclaimer,related_product_ids,seo_title,seo_description) VALUES (${articleId},${config.siteId},${safeSlug(title)},${title},${excerpt},${JSON.stringify(content)}::jsonb,'Industry News','published',now(),now(),${config.publicationLanguage},${candidate.source_publisher},${candidate.source_url},${title},${candidate.source_author},${candidate.source_publisher},${candidate.canonical_source_url},${candidate.source_published_at},now(),${hash(candidate.canonical_source_url)},${hash(normalized(title))},${hash(content.join('\n'))},'This page is an independently edited summary and analysis. The original reporting remains the property of its source.', '[]'::jsonb,${title.slice(0,155)},${excerpt.slice(0,155)})`;
    await sql`UPDATE news_candidates SET status='used', updated_at=now() WHERE id=${candidate.id}`;
    revalidatePath('/news'); revalidatePath(`/news/${safeSlug(title)}`); revalidatePath('/news-sitemap.xml'); revalidatePath('/rss.xml');
    const base = config.siteUrl; const slugRows = await sql`SELECT slug FROM news_articles WHERE id=${articleId}` as unknown as { slug: string }[]; const slug = slugRows[0].slug;
    const [list, detail, sitemap, rss] = await Promise.all([fetch(`${base}/news`, { cache: 'no-store' }), fetch(`${base}/news/${slug}`, { cache: 'no-store' }), fetch(`${base}/news-sitemap.xml`, { cache: 'no-store' }), fetch(`${base}/rss.xml`, { cache: 'no-store' })]);
    const [listBody, detailBody, sitemapBody, rssBody] = await Promise.all([list.text(), detail.text(), sitemap.text(), rss.text()]);
    const verified = list.ok && detail.ok && sitemap.ok && rss.ok && listBody.includes(title) && detailBody.includes(title) && sitemapBody.includes(slug) && rssBody.includes(slug);
    await sql`INSERT INTO news_delivery_checks (site_id,article_id,list_http_status,detail_http_status,sitemap_http_status,rss_http_status,verified,details) VALUES (${config.siteId},${articleId},${list.status},${detail.status},${sitemap.status},${rss.status},${verified},${JSON.stringify({ slug })}::jsonb)`;
    if (!verified) { await sql`UPDATE news_articles SET status='archived', updated_at=now() WHERE id=${articleId}`; throw new Error('Frontend verification failed; the article was archived safely.'); }
    await sql`UPDATE news_publication_runs SET status='published_success', completed_at=now(), details=${JSON.stringify({ slug, frontendVerified: true })}::jsonb WHERE id=${run[0].id}`;
    return { articleId, slug, verified: true };
  } catch (error) { const message = error instanceof Error ? error.message.slice(0, 500) : 'Publish failed'; await sql`UPDATE news_publication_runs SET status='failed', completed_at=now(), error_message=${message} WHERE id=${run[0].id}`; throw error; }
}
