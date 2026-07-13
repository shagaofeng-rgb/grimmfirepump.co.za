import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getDatabase, hasDatabase } from "@/lib/database";
import { seedStore, type Lead, type NewsArticle, type Product, type SiteStore } from "@/lib/site-data";

const storePath = path.join(process.cwd(), "data", "local-site-data.json");

type ProductRow = Omit<Product, "applications" | "highlights" | "specifications"> & { applications: unknown; highlights: unknown; specifications: unknown; status: string };
type NewsRow = Omit<NewsArticle, "content" | "relatedProductIds" | "publishedAt"> & { content: unknown; related_product_ids: unknown; published_at: string; source_name: string | null; source_url: string | null; source_published_at?: string | null; source_author?: string | null; updated_published_at?: string | null; key_takeaways?: unknown; geo_summary?: string | null };
type LeadRow = Omit<Lead, "productInterest" | "createdAt" | "consentAt"> & { product_interest: string; created_at: string; consent_at: string };

function cloneSeed(): SiteStore { return JSON.parse(JSON.stringify(seedStore)) as SiteStore; }
function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

async function readLocalStore(): Promise<SiteStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const stored = JSON.parse(raw) as SiteStore;
    return { products: stored.products.length ? stored.products : cloneSeed().products, news: stored.news.length ? stored.news : cloneSeed().news, leads: stored.leads ?? [] };
  } catch { return cloneSeed(); }
}

async function writeLocalStore(store: SiteStore): Promise<void> {
  await mkdir(path.dirname(storePath), { recursive: true });
  const temp = `${storePath}.tmp`;
  await writeFile(temp, JSON.stringify(store, null, 2), "utf8");
  await rename(temp, storePath);
}

async function ensureSeedCatalog(): Promise<void> {
  const sql = getDatabase();
  for (const product of seedStore.products) {
    await sql`INSERT INTO products (id, slug, name, category, summary, applications, highlights, specifications, image, status, published)
      VALUES (${product.id}, ${product.slug}, ${product.name}, ${product.category}, ${product.summary}, ${JSON.stringify(product.applications)}::jsonb, ${JSON.stringify(product.highlights)}::jsonb, ${JSON.stringify(product.specifications)}::jsonb, ${product.image}, 'published', ${product.published})
      ON CONFLICT (id) DO NOTHING`;
  }
  for (const article of seedStore.news) {
    await sql`INSERT INTO news_articles (id, slug, title, excerpt, content, category, status, published_at, source_name, source_url, related_product_ids)
      VALUES (${article.id}, ${article.slug}, ${article.title}, ${article.excerpt}, ${JSON.stringify(article.content)}::jsonb, ${article.category}, ${article.status}, ${article.publishedAt}, ${article.sourceName ?? null}, ${article.sourceUrl ?? null}, ${JSON.stringify(article.relatedProductIds)}::jsonb)
      ON CONFLICT (id) DO NOTHING`;
  }
}

function mapProduct(row: ProductRow): Product {
  return { id: row.id, slug: row.slug, name: row.name, category: row.category as Product["category"], summary: row.summary, applications: parseJson<string[]>(row.applications, []), highlights: parseJson<string[]>(row.highlights, []), specifications: parseJson<Product["specifications"]>(row.specifications, []), image: row.image, published: row.published };
}
function mapNews(row: NewsRow): NewsArticle {
  return { id: row.id, slug: row.slug, title: row.title, excerpt: row.excerpt, content: parseJson<string[]>(row.content, []), category: row.category, status: row.status as NewsArticle["status"], publishedAt: row.published_at, sourceName: row.source_name ?? undefined, sourceUrl: row.source_url ?? undefined, sourcePublishedAt: row.source_published_at ?? undefined, sourceAuthor: row.source_author ?? undefined, updatedAt: row.updated_published_at ?? undefined, keyTakeaways: parseJson<string[]>(row.key_takeaways, []), geoSummary: row.geo_summary ?? undefined, relatedProductIds: parseJson<string[]>(row.related_product_ids, []) };
}
function mapLead(row: LeadRow): Lead {
  return { id: row.id, name: row.name, company: row.company, email: row.email, phone: row.phone ?? undefined, country: row.country, productInterest: row.product_interest, message: row.message, status: row.status as Lead["status"], createdAt: row.created_at, consentAt: row.consent_at };
}

export async function readStore(): Promise<SiteStore> {
  if (!hasDatabase()) return readLocalStore();
  const [products, news, leads] = await Promise.all([getPublishedProducts(), getPublishedNews(), listLeads()]);
  return { products, news, leads };
}

export async function getPublishedProducts(): Promise<Product[]> {
  if (!hasDatabase()) return (await readLocalStore()).products.filter((product) => product.published);
  await ensureSeedCatalog();
  const rows = await getDatabase()`SELECT id, slug, name, category, summary, applications, highlights, specifications, image, published, status FROM products WHERE published = true AND status = 'published' AND deleted_at IS NULL ORDER BY created_at DESC`;
  return (rows as unknown as ProductRow[]).map(mapProduct);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  if (!hasDatabase()) return (await getPublishedProducts()).find((product) => product.slug === slug);
  await ensureSeedCatalog();
  const rows = await getDatabase()`SELECT id, slug, name, category, summary, applications, highlights, specifications, image, published, status FROM products WHERE slug = ${slug} AND published = true AND status = 'published' AND deleted_at IS NULL LIMIT 1`;
  const row = (rows as unknown as ProductRow[])[0];
  return row ? mapProduct(row) : undefined;
}

export async function getPublishedNews(): Promise<NewsArticle[]> {
  if (!hasDatabase()) return (await readLocalStore()).news.filter((article) => article.status === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  await ensureSeedCatalog();
  const rows = await getDatabase()`SELECT id, slug, title, excerpt, content, category, status, published_at, source_name, source_url, source_published_at, source_author, updated_published_at, key_takeaways, geo_summary, related_product_ids FROM news_articles WHERE status = 'published' AND deleted_at IS NULL ORDER BY published_at DESC`;
  return (rows as unknown as NewsRow[]).map(mapNews);
}

export async function getNewsArticle(slug: string): Promise<NewsArticle | undefined> {
  if (!hasDatabase()) return (await getPublishedNews()).find((article) => article.slug === slug);
  await ensureSeedCatalog();
  const rows = await getDatabase()`SELECT id, slug, title, excerpt, content, category, status, published_at, source_name, source_url, source_published_at, source_author, updated_published_at, key_takeaways, geo_summary, related_product_ids FROM news_articles WHERE slug = ${slug} AND status = 'published' AND deleted_at IS NULL LIMIT 1`;
  const row = (rows as unknown as NewsRow[])[0];
  return row ? mapNews(row) : undefined;
}

export async function addLead(lead: Lead): Promise<void> {
  if (!hasDatabase()) { const store = await readLocalStore(); store.leads.unshift(lead); await writeLocalStore(store); return; }
  await getDatabase()`INSERT INTO leads (id, name, company, email, phone, country, product_interest, message, status, consent_at, created_at) VALUES (${lead.id}, ${lead.name}, ${lead.company}, ${lead.email}, ${lead.phone ?? null}, ${lead.country}, ${lead.productInterest}, ${lead.message}, ${lead.status}, ${lead.consentAt}, ${lead.createdAt})`;
}

export async function listLeads(): Promise<Lead[]> {
  if (!hasDatabase()) return (await readLocalStore()).leads;
  const rows = await getDatabase()`SELECT id, name, company, email, phone, country, product_interest, message, status, created_at, consent_at FROM leads WHERE deleted_at IS NULL ORDER BY created_at DESC`;
  return (rows as unknown as LeadRow[]).map(mapLead);
}

export async function addProduct(product: Product): Promise<void> {
  if (!hasDatabase()) { const store = await readLocalStore(); store.products.unshift(product); await writeLocalStore(store); return; }
  await getDatabase()`INSERT INTO products (id, slug, name, category, summary, applications, highlights, specifications, image, status, published) VALUES (${product.id}, ${product.slug}, ${product.name}, ${product.category}, ${product.summary}, ${JSON.stringify(product.applications)}::jsonb, ${JSON.stringify(product.highlights)}::jsonb, ${JSON.stringify(product.specifications)}::jsonb, ${product.image}, ${product.published ? 'published' : 'draft'}, ${product.published})`;
}

export async function addNews(article: NewsArticle): Promise<void> {
  if (!hasDatabase()) { const store = await readLocalStore(); store.news.unshift(article); await writeLocalStore(store); return; }
  await getDatabase()`INSERT INTO news_articles (id, slug, title, excerpt, content, category, status, published_at, source_name, source_url, related_product_ids) VALUES (${article.id}, ${article.slug}, ${article.title}, ${article.excerpt}, ${JSON.stringify(article.content)}::jsonb, ${article.category}, ${article.status}, ${article.publishedAt}, ${article.sourceName ?? null}, ${article.sourceUrl ?? null}, ${JSON.stringify(article.relatedProductIds)}::jsonb)`;
}

export async function getRelatedNewsForProduct(productId: string): Promise<(NewsArticle & { relationshipReason: string })[]> {
  if (!hasDatabase()) return (await getPublishedNews()).filter((article) => article.relatedProductIds.includes(productId)).map((article) => ({ ...article, relationshipReason: "Related published industry guidance." }));
  const rows = await getDatabase()`SELECT n.id, n.slug, n.title, n.excerpt, n.content, n.category, n.status, n.published_at, n.source_name, n.source_url, n.source_published_at, n.source_author, n.updated_published_at, n.key_takeaways, n.geo_summary, n.related_product_ids, r.relationship_reason FROM news_product_relations r JOIN news_articles n ON n.id = r.news_id WHERE r.product_id = ${productId} AND r.display_on_product_page = true AND n.status = 'published' AND n.deleted_at IS NULL ORDER BY r.relevance_score DESC, n.published_at DESC LIMIT 6`;
  return (rows as unknown as (NewsRow & { relationship_reason: string })[]).map((row) => ({ ...mapNews(row), relationshipReason: row.relationship_reason }));
}
