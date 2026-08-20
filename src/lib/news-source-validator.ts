import "server-only";

export type SourceValidation = {
  domain: string;
  validationStatus: "valid" | "invalid" | "restricted";
  discoveryMethod: Array<"rss" | "sitemap" | "public-page">;
  robotsAllowed: boolean | null;
  checkedAt: string;
  reason?: string;
};

function host(url: string) { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); }
function sameHost(a: string, b: string) { return host(a) === host(b); }

/** Validates only public endpoints and never bypasses robots, paywalls or access controls. */
export async function validatePublicNewsSource(url: string): Promise<SourceValidation> {
  const checkedAt = new Date().toISOString();
  let base: URL;
  try { base = new URL(url); } catch { return { domain: url, validationStatus: "invalid", discoveryMethod: [], robotsAllowed: null, checkedAt, reason: "invalid_url" }; }
  const domain = host(url);
  try {
    const robots = await fetch(new URL("/robots.txt", base), { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8_000) });
    const robotsText = robots.ok ? await robots.text() : "";
    const blocked = /User-agent:\s*\*[^]*?Disallow:\s*\//i.test(robotsText);
    if (blocked) return { domain, validationStatus: "restricted", discoveryMethod: [], robotsAllowed: false, checkedAt, reason: "robots_disallow_all" };
    const response = await fetch(base, { cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10_000), headers: { Accept: "text/html,application/xml;q=0.9" } });
    if (!response.ok) return { domain, validationStatus: "invalid", discoveryMethod: [], robotsAllowed: robots.ok ? true : null, checkedAt, reason: `http_${response.status}` };
    const html = (await response.text()).slice(0, 300_000);
    const methods: SourceValidation["discoveryMethod"] = ["public-page"];
    const feed = /(?:application\/(?:rss|atom)\+xml|\/feed\/?["'< ]|\/rss\.?xml["'< ])/i.test(html);
    const sitemap = /sitemap(?:_index)?\.xml/i.test(html) || robotsText.includes("Sitemap:");
    if (feed) methods.push("rss");
    if (sitemap) methods.push("sitemap");
    return { domain, validationStatus: "valid", discoveryMethod: methods, robotsAllowed: robots.ok ? true : null, checkedAt };
  } catch (error) {
    return { domain, validationStatus: "restricted", discoveryMethod: [], robotsAllowed: null, checkedAt, reason: error instanceof Error ? error.name : "network_error" };
  }
}

export function deduplicateSourceUrls(urls: string[]) {
  const seen = new Set<string>();
  return urls.filter((url) => { try { const key = host(url); if (seen.has(key)) return false; seen.add(key); return true; } catch { return true; } });
}

export function belongsToSourceDomain(sourceUrl: string, candidateUrl: string) {
  try { return sameHost(sourceUrl, candidateUrl); } catch { return false; }
}