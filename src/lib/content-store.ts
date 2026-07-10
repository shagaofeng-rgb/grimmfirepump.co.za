import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { seedStore, type Lead, type NewsArticle, type Product, type SiteStore } from "@/lib/site-data";

const storePath = path.join(process.cwd(), "data", "local-site-data.json");

function cloneSeed(): SiteStore { return JSON.parse(JSON.stringify(seedStore)) as SiteStore; }

export async function readStore(): Promise<SiteStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const stored = JSON.parse(raw) as SiteStore;
    return { products: stored.products.length ? stored.products : cloneSeed().products, news: stored.news.length ? stored.news : cloneSeed().news, leads: stored.leads ?? [] };
  } catch { return cloneSeed(); }
}

async function writeStore(store: SiteStore): Promise<void> {
  await mkdir(path.dirname(storePath), { recursive: true });
  const temp = `${storePath}.tmp`;
  await writeFile(temp, JSON.stringify(store, null, 2), "utf8");
  await rename(temp, storePath);
}

export async function getPublishedProducts(): Promise<Product[]> { return (await readStore()).products.filter((product) => product.published); }
export async function getProduct(slug: string): Promise<Product | undefined> { return (await getPublishedProducts()).find((product) => product.slug === slug); }
export async function getPublishedNews(): Promise<NewsArticle[]> { return (await readStore()).news.filter((article) => article.status === "published").sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)); }
export async function getNewsArticle(slug: string): Promise<NewsArticle | undefined> { return (await getPublishedNews()).find((article) => article.slug === slug); }
export async function addLead(lead: Lead): Promise<void> { const store = await readStore(); store.leads.unshift(lead); await writeStore(store); }
export async function listLeads(): Promise<Lead[]> { return (await readStore()).leads; }
export async function addProduct(product: Product): Promise<void> { const store = await readStore(); store.products.unshift(product); await writeStore(store); }
export async function addNews(article: NewsArticle): Promise<void> { const store = await readStore(); store.news.unshift(article); await writeStore(store); }
