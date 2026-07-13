import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { revalidatePath, revalidateTag } from "next/cache";
import { getDatabase } from "@/lib/database";
import { getPublishedProducts } from "@/lib/content-store";
import type { Product } from "@/lib/site-data";

export type NewsFeedConfig = { name: string; url: string; credibility?: number; language?: string; country?: string; autoPublish?: boolean };
type FeedItem = { title?: string; link?: string; pubDate?: string; published?: string; updated?: string; description?: string; summary?: string; creator?: string };
type Candidate = { title: string; url: string; publishedAt: Date; summary: string; author?: string; source: NewsFeedConfig; score: number; product: Product };

const MAX_RESPONSE_BYTES = 1_000_000;
const TRACKING = /^(utm_[^=]+|fbclid|gclid|mc_[^=]+)$/i;

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function canonicalizeSourceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || /^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return null;
    for (const key of [...url.searchParams.keys()]) if (TRACKING.test(key)) url.searchParams.delete(key);
    url.hash = "";
    return url.toString();
  } catch { return null; }
}
export function isFreshSourceDate(value: string | undefined, now = new Date(), lookbackHours = Number(process.env.NEWS_LOOKBACK_HOURS ?? 72)): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf()) || date > now || now.valueOf() - date.valueOf() > lookbackHours * 3_600_000) return null;
  return date;
}
function plain(value: string) { return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function normaliseTitle(value: string) { return plain(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function configuredFeeds(): NewsFeedConfig[] {
  try {
    const feeds = JSON.parse(process.env.NEWS_SOURCE_FEEDS ?? "[]") as NewsFeedConfig[];
    return feeds.filter((feed) => feed.name && feed.url && canonicalizeSourceUrl(feed.url));
  } catch { return []; }
}
function relevance(text: string, product: Product) {
  const words = new Set(`${product.name} ${product.category} ${product.summary} ${product.applications.join(" ")} ${product.highlights.join(" ")}`.toLowerCase().match(/[a-z]{3,}/g) ?? []);
  const matches = (text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter((word) => words.has(word)).length;
  return Math.min(1, matches / 7);
}
async function readFeed(feed: NewsFeedConfig): Promise<FeedItem[]> {
  const url = canonicalizeSourceUrl(feed.url);
  if (!url) return [];
  const response = await fetch(url, { signal: AbortSignal.timeout(12_000), redirect: "error", headers: { Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" }, cache: "no-store" });
  if (!response.ok || Number(response.headers.get("content-length") ?? 0) > MAX_RESPONSE_BYTES) return [];
  const body = await response.text();
  if (body.length > MAX_RESPONSE_BYTES) return [];
  const parsed = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse(body) as { rss?: { channel?: { item?: FeedItem | FeedItem[] } }; feed?: { entry?: FeedItem | FeedItem[] } };
  const items = parsed.rss?.channel?.item ?? parsed.feed?.entry ?? [];
  return Array.isArray(items) ? items : [items];
}
async function wasUsedRecently(url: string, fingerprint: string): Promise<boolean> {
  const days = Number(process.env.NEWS_DEDUP_DAYS ?? 7);
  const rows = await getDatabase()`SELECT 1 FROM news_articles WHERE (canonical_source_url = ${url} OR source_fingerprint = ${fingerprint}) AND published_at >= now() - (${days}::text || ' days')::interval LIMIT 1` as unknown as unknown[];
  return rows.length > 0;
}
function safeSlug(title: string) { return `${normaliseTitle(title).replace(/\s+/g, "-").slice(0, 72) || "industry-update"}-${randomUUID().slice(0, 8)}`; }
function draftContent(candidate: Candidate) {
  const facts = candidate.summary || "The source item provides a headline and publication timestamp but no reusable public summary.";
  return [
    `Source facts: ${facts}`,
    `Editorial context: This update may matter to project teams evaluating ${candidate.product.name} for water, fire-water, or temporary pumping requirements. The source does not verify equipment selection, so project specifications remain decisive.`,
    `How GRIMM PUMP can help: Review the published information for ${candidate.product.name} and discuss the project duty point, water source, installation environment, power availability and documentation needs with the GRIMM PUMP team.`,
  ];
}
async function createDraft(candidate: Candidate) {
  const sql = getDatabase();
  const canonical = candidate.url;
  const sourceFingerprint = hash(canonical);
  const articleId = randomUUID();
  const status = process.env.NEWS_AUTO_PUBLISH === "true" && candidate.source.autoPublish === true ? "published" : "review_required";
  const title = `${candidate.title} — project implications for African pumping systems`;
  const content = draftContent(candidate);
  await sql`INSERT INTO news_articles (id, slug, title, excerpt, content, category, status, published_at, updated_published_at, language, source_name, source_url, source_title, source_author, source_publisher, canonical_source_url, source_published_at, source_fetched_at, source_fingerprint, event_fingerprint, content_hash, relevance_score, credibility_score, geo_summary, key_takeaways, related_product_ids, seo_title, seo_description, generation_model, generation_prompt_version)
    VALUES (${articleId}, ${safeSlug(candidate.title)}, ${title}, ${candidate.summary || candidate.title}, ${JSON.stringify(content)}::jsonb, 'Industry update', ${status}, ${status === "published" ? new Date().toISOString() : null}, ${status === "published" ? new Date().toISOString() : null}, ${candidate.source.language ?? "en"}, ${candidate.source.name}, ${canonical}, ${candidate.title}, ${candidate.author ?? null}, ${candidate.source.name}, ${canonical}, ${candidate.publishedAt.toISOString()}, ${new Date().toISOString()}, ${sourceFingerprint}, ${hash(normaliseTitle(candidate.title))}, ${hash(content.join("\n"))}, ${candidate.score}, ${candidate.source.credibility ?? 0.7}, ${`Verified source update from ${candidate.source.name}; editorial project context links to ${candidate.product.name}.`}, ${JSON.stringify([`Published source: ${candidate.source.name}`, `Source date: ${candidate.publishedAt.toISOString()}`, `Related product: ${candidate.product.name}`])}::jsonb, ${JSON.stringify([candidate.product.id])}::jsonb, ${title.slice(0, 155)}, ${candidate.summary.slice(0, 155)}, ${"template-review"}, ${"news-v1"})`;
  await sql`INSERT INTO news_product_relations (news_id, product_id, relevance_score, relationship_reason, seo_anchor_text, geo_relation_summary, product_help_summary)
    VALUES (${articleId}, ${candidate.product.id}, ${candidate.score}, ${`Source topic shares operational keywords with ${candidate.product.name}; requires editorial verification before publication.`}, ${candidate.product.name}, ${`This article is linked to ${candidate.product.name} using a verified source and a measured keyword relevance score.`}, ${`GRIMM PUMP can review whether ${candidate.product.name} suits the project conditions.`})`;
  return { articleId, status };
}
async function recordAudit(timezone: string, published: number, target: number, lastError: string | null, details: Record<string, unknown>) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  await getDatabase()`INSERT INTO news_publication_audits (audit_date, timezone, target_count, published_count, missing_count, status, last_error, details)
    VALUES (${date}, ${timezone}, ${target}, ${published}, ${Math.max(0, target - published)}, ${published >= target ? "succeeded" : lastError ? "attention_required" : "pending"}, ${lastError}, ${JSON.stringify(details)}::jsonb)
    ON CONFLICT (audit_date, timezone) DO UPDATE SET published_count = EXCLUDED.published_count, missing_count = EXCLUDED.missing_count, status = EXCLUDED.status, last_error = EXCLUDED.last_error, details = EXCLUDED.details, checked_at = now(), updated_at = now()`;
}
export async function runNewsAutomation(trigger: "cron" | "admin" = "cron") {
  const sql = getDatabase();
  const timezone = process.env.NEWS_TIMEZONE ?? "Africa/Johannesburg";
  const target = Math.max(1, Number(process.env.NEWS_DAILY_TARGET ?? 4));
  const hour = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", hourCycle: "h23" }).format(new Date());
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date());
  const idempotencyKey = `news:${date}:${hour}`;
  const lock = await sql`INSERT INTO news_jobs (job_type, status, idempotency_key, started_at, metadata) VALUES ('automation', 'running', ${idempotencyKey}, now(), ${JSON.stringify({ trigger })}::jsonb) ON CONFLICT (idempotency_key) DO NOTHING RETURNING id` as unknown as { id: string }[];
  if (!lock.length) return { skipped: true, reason: "already_running_or_completed" };
  const jobId = lock[0].id;
  try {
    const publishedRows = await sql`SELECT count(*)::int AS count FROM news_articles WHERE status = 'published' AND (published_at AT TIME ZONE ${timezone})::date = ${date}::date` as unknown as { count: number }[];
    const published = Number(publishedRows[0]?.count ?? 0);
    if (published >= target) { await recordAudit(timezone, published, target, null, { trigger, result: "target_met" }); await sql`UPDATE news_jobs SET status='succeeded', completed_at=now() WHERE id=${jobId}`; return { skipped: true, reason: "daily_target_met", published }; }
    const products = await getPublishedProducts();
    const feeds = configuredFeeds();
    if (!feeds.length) { const message = "No approved RSS sources configured."; await recordAudit(timezone, published, target, message, { trigger }); await sql`UPDATE news_jobs SET status='failed', error_message=${message}, completed_at=now() WHERE id=${jobId}`; return { published, created: 0, error: message }; }
    const threshold = Number(process.env.NEWS_RELEVANCE_THRESHOLD ?? 0.2);
    const candidates: Candidate[] = [];
    for (const source of feeds) for (const item of await readFeed(source)) {
      const url = canonicalizeSourceUrl(typeof item.link === "string" ? item.link : "");
      const title = plain(String(item.title ?? ""));
      const publishedAt = isFreshSourceDate(String(item.pubDate ?? item.published ?? item.updated ?? ""));
      if (!url || !title || !publishedAt) continue;
      if (new URL(url).hostname !== new URL(source.url).hostname) continue;
      const fingerprint = hash(url);
      if (await wasUsedRecently(url, fingerprint)) continue;
      const summary = plain(String(item.description ?? item.summary ?? "")).slice(0, 1200);
      const ranked = products.map((product) => ({ product, score: relevance(`${title} ${summary}`, product) })).sort((a, b) => b.score - a.score)[0];
      if (ranked && ranked.score >= threshold) candidates.push({ title, url, publishedAt, summary, author: typeof item.creator === "string" ? plain(item.creator) : undefined, source, product: ranked.product, score: ranked.score });
    }
    const selected = candidates.sort((a, b) => b.score - a.score).slice(0, Math.max(0, target - published));
    const saved = [] as { articleId: string; status: string }[];
    for (const candidate of selected) saved.push(await createDraft(candidate));
    const nowPublished = published + saved.filter((item) => item.status === "published").length;
    const message = saved.length ? null : "No fresh, relevant, non-duplicate source items passed the quality gates.";
    await recordAudit(timezone, nowPublished, target, message, { trigger, feeds: feeds.length, candidates: candidates.length, created: saved.length, reviewRequired: saved.filter((item) => item.status === "review_required").length });
    await sql`UPDATE news_jobs SET status='succeeded', completed_at=now(), metadata=${JSON.stringify({ trigger, candidates: candidates.length, created: saved.length })}::jsonb WHERE id=${jobId}`;
    if (saved.some((item) => item.status === "published")) { revalidatePath("/news"); revalidatePath("/sitemap.xml"); revalidatePath("/news-sitemap.xml"); revalidatePath("/rss.xml"); revalidateTag("news", "max"); }
    return { published: nowPublished, created: saved.length, reviewRequired: saved.filter((item) => item.status === "review_required").length };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "News automation failed.";
    await recordAudit(timezone, 0, target, message, { trigger });
    await sql`UPDATE news_jobs SET status='failed', error_message=${message}, completed_at=now() WHERE id=${jobId}`;
    throw new Error("News automation failed safely; details are recorded in the job audit.");
  }
}
