import "server-only";

export type NewsSiteConfig = {
  siteId: string;
  enabled: boolean;
  brandName: string;
  siteUrl: string;
  industry: string;
  industryScope: string[];
  targetMarkets: string[];
  publicationLanguage: string;
  locale: string;
  timezone: string;
  news: { listRoute: string; detailRoutePattern: string; rssRoute: string; sitemapRoute: string; ingestIntervalHours: number; publishIntervalHours: number; candidateMaxAgeHours: number; fallbackCandidateMaxAgeDays: number; minScore: number; maxInternalProductLinks: number; defaultAuthorType: string };
  blog: { enabled: boolean; listRoute: string; detailRoutePattern: string; sitemapRoute: string; allowNewsAutomation: false };
};

/**
 * One configuration object per deployed site. Workers receive this object and
 * never derive a target site from a hostname, product or source URL.
 */
export const newsSiteConfig: NewsSiteConfig = {
  siteId: "grimm-africa-za",
  enabled: true,
  brandName: "GRIMM PUMP Africa",
  siteUrl: "https://grimmfirepump.co.za",
  industry: "Fire pump and water-system engineering",
  industryScope: ["fire-pump systems", "water supply", "dewatering", "industrial pumping", "project specifications", "water and fire-water regulations"],
  targetMarkets: ["Africa"],
  publicationLanguage: "en",
  locale: "en-ZA",
  timezone: "Africa/Johannesburg",
  news: { listRoute: "/news", detailRoutePattern: "/news/[slug]", rssRoute: "/rss.xml", sitemapRoute: "/news-sitemap.xml", ingestIntervalHours: 12, publishIntervalHours: 48, candidateMaxAgeHours: 72, fallbackCandidateMaxAgeDays: 7, minScore: 70, maxInternalProductLinks: 1, defaultAuthorType: "Editorial Team" },
  blog: { enabled: true, listRoute: "/blog", detailRoutePattern: "/blog/[slug]", sitemapRoute: "/blog-sitemap.xml", allowNewsAutomation: false },
};

export function assertSiteConfig(config: NewsSiteConfig = newsSiteConfig) {
  const required = [config.siteId, config.siteUrl, config.industry, config.publicationLanguage, config.timezone, config.news.listRoute, config.news.detailRoutePattern, config.news.sitemapRoute];
  if (required.some((value) => !value)) throw new Error("News site configuration is incomplete.");
  if (config.blog.allowNewsAutomation) throw new Error("News automation must not target Blog.");
  return config;
}
