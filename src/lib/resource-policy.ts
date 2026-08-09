import type { NewsArticle } from "@/lib/site-data";

/** Only original, engineering-focused resources are eligible for indexing. */
export function isIndexableResource(article: NewsArticle) {
  return !article.sourceUrl && ["Procurement guide", "Technical guide"].includes(article.category);
}

export function indexableResources(articles: NewsArticle[]) {
  return articles.filter(isIndexableResource);
}
