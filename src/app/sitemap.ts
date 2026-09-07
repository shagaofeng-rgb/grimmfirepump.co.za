import type { MetadataRoute } from "next";
import { getPublishedNews, getPublishedProducts } from "@/lib/content-store";
import { getPublishedBlogPosts } from "@/lib/blog-store";
import { indexableResources } from "@/lib/resource-policy";

export const dynamic = "force-dynamic";

const corePages = [
  { path: "", changeFrequency: "weekly" as const, priority: 1 },
  { path: "products", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "fire-pump-systems", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "water-supply-booster-systems", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "mobile-water-transfer-dewatering", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "applications", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "about", changeFrequency: "yearly" as const, priority: 0.5 },
  { path: "contact", changeFrequency: "yearly" as const, priority: 0.5 },
  { path: "news", changeFrequency: "daily" as const, priority: 0.7 },
  { path: "blog", changeFrequency: "weekly" as const, priority: 0.7 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://grimmfirepump.co.za").replace(/\/$/, "");
  const [products, news, blog] = await Promise.all([
    getPublishedProducts(),
    getPublishedNews(),
    getPublishedBlogPosts(),
  ]);

  return [
    ...corePages.map((page) => ({
      url: base + "/" + page.path,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...products.map((product) => ({
      url: base + "/products/" + product.slug,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...indexableResources(news).map((article) => ({
      url: base + "/news/" + article.slug,
      lastModified: article.updatedAt ?? article.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...blog.map((post) => ({
      url: base + "/blog/" + post.slug,
      lastModified: post.publishedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
