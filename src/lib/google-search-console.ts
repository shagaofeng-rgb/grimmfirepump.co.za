import "server-only";
import { createSign } from "node:crypto";

type ServiceAccount = {
  client_email: string;
  private_key: string;
};

type SearchConsoleRow = {
  keys?: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

type SearchConsoleResponse = { rows?: SearchConsoleRow[] };

export type GoogleSearchConsoleFailureCode =
  | "credentials_missing"
  | "credentials_invalid"
  | "oauth_failed"
  | "property_access_denied"
  | "property_not_found"
  | "sitemap_rejected"
  | "rate_limited"
  | "google_service_unavailable"
  | "network_failed"
  | "unknown_failure";

export class GoogleSearchConsoleError extends Error {
  readonly code: GoogleSearchConsoleFailureCode;
  readonly httpStatus?: number;

  constructor(code: GoogleSearchConsoleFailureCode, message: string, httpStatus?: number) {
    super(message);
    this.name = "GoogleSearchConsoleError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

function getServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new GoogleSearchConsoleError(
      "credentials_missing",
      "Google Search Console service-account credentials are not configured.",
    );
  }

  try {
    const account = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!account.client_email || !account.private_key) throw new Error("missing service-account fields");
    return account as ServiceAccount;
  } catch {
    throw new GoogleSearchConsoleError(
      "credentials_invalid",
      "Google Search Console service-account credentials are invalid.",
    );
  }
}

function toBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function errorForGoogleResponse(status: number, context: "oauth" | "sitemap" | "report") {
  if (status === 401 || status === 403) {
    return new GoogleSearchConsoleError(
      "property_access_denied",
      "The Google service account does not have access to the configured Search Console property.",
      status,
    );
  }
  if (status === 404) {
    return new GoogleSearchConsoleError(
      "property_not_found",
      "The configured Search Console property or sitemap could not be found.",
      status,
    );
  }
  if (status === 429) {
    return new GoogleSearchConsoleError(
      "rate_limited",
      "Google temporarily rate-limited the Search Console request.",
      status,
    );
  }
  if (status >= 500) {
    return new GoogleSearchConsoleError(
      "google_service_unavailable",
      "Google Search Console is temporarily unavailable.",
      status,
    );
  }
  if (context === "oauth") {
    return new GoogleSearchConsoleError(
      "oauth_failed",
      "Google OAuth authentication failed for the service account.",
      status,
    );
  }
  return new GoogleSearchConsoleError(
    "sitemap_rejected",
    "Google rejected the Search Console request.",
    status,
  );
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    toBase64Url(JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/webmasters",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })),
  ].join(".");

  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(unsignedToken).end().sign(account.private_key, "base64url");
  } catch {
    throw new GoogleSearchConsoleError(
      "credentials_invalid",
      "Google Search Console service-account credentials are invalid.",
    );
  }

  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: unsignedToken + "." + signature,
      }),
      cache: "no-store",
    });
  } catch {
    throw new GoogleSearchConsoleError(
      "network_failed",
      "The Google OAuth endpoint could not be reached.",
    );
  }

  if (!response.ok) throw errorForGoogleResponse(response.status, "oauth");
  const payload = await response.json().catch(() => ({})) as { access_token?: string };
  if (!payload.access_token) {
    throw new GoogleSearchConsoleError(
      "oauth_failed",
      "Google OAuth returned no access token.",
      response.status,
    );
  }
  return payload.access_token;
}

function searchConsoleProperty(): string {
  const value = (process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ?? "https://grimmfirepump.co.za/").trim();
  if (value.startsWith("sc-domain:")) return value;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname) throw new Error("invalid property");
    return url.toString();
  } catch {
    throw new GoogleSearchConsoleError(
      "credentials_invalid",
      "GOOGLE_SEARCH_CONSOLE_SITE_URL must be an HTTPS URL-prefix property or an sc-domain property.",
    );
  }
}

function sitemapUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://grimmfirepump.co.za").trim();
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || !url.hostname) throw new Error("invalid site URL");
    return new URL("/sitemap.xml", url).toString();
  } catch {
    throw new GoogleSearchConsoleError(
      "credentials_invalid",
      "NEXT_PUBLIC_SITE_URL must be a valid HTTPS site URL.",
    );
  }
}

function propertyCandidates() {
  const configured = searchConsoleProperty();
  const canonicalUrl = new URL(sitemapUrl()).origin + "/";
  const domainProperty = "sc-domain:" + new URL(sitemapUrl()).hostname;
  return [...new Set([configured, domainProperty, canonicalUrl])];
}

function canFallback(error: GoogleSearchConsoleError) {
  return error.code === "property_access_denied" || error.code === "property_not_found";
}

export function asGoogleSearchConsoleError(error: unknown): GoogleSearchConsoleError {
  if (error instanceof GoogleSearchConsoleError) return error;
  return new GoogleSearchConsoleError(
    "unknown_failure",
    "Google Search Console sitemap submission failed unexpectedly.",
  );
}

async function submitSitemapForProperty(property: string, sitemap: string, token: string) {
  let response: Response;
  try {
    response = await fetch(
      "https://searchconsole.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(property) + "/sitemaps/" + encodeURIComponent(sitemap),
      { method: "PUT", headers: { Authorization: "Bearer " + token }, cache: "no-store" },
    );
  } catch {
    throw new GoogleSearchConsoleError(
      "network_failed",
      "The Google Search Console sitemap endpoint could not be reached.",
    );
  }
  if (!response.ok) throw errorForGoogleResponse(response.status, "sitemap");
  return response.status;
}

export async function submitSitemapToSearchConsole() {
  const configuredProperty = searchConsoleProperty();
  const sitemap = sitemapUrl();
  const token = await getAccessToken(getServiceAccount());
  let lastFailure: GoogleSearchConsoleError | undefined;

  for (const property of propertyCandidates()) {
    try {
      const status = await submitSitemapForProperty(property, sitemap, token);
      return {
        property,
        configuredProperty,
        fallbackUsed: property !== configuredProperty,
        sitemap,
        submittedAt: new Date().toISOString(),
        status,
      };
    } catch (error) {
      const failure = asGoogleSearchConsoleError(error);
      if (!canFallback(failure)) throw failure;
      lastFailure = failure;
    }
  }

  throw lastFailure ?? new GoogleSearchConsoleError(
    "property_not_found",
    "No configured Search Console property accepted the sitemap submission.",
  );
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function requestSearchConsoleReport(property: string, token: string, startDate: string, endDate: string) {
  let response: Response;
  try {
    response = await fetch(
      "https://searchconsole.googleapis.com/webmasters/v3/sites/" + encodeURIComponent(property) + "/searchAnalytics/query",
      {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ["query", "page"],
          rowLimit: 100,
          dataState: "final",
        }),
        cache: "no-store",
      },
    );
  } catch {
    throw new GoogleSearchConsoleError(
      "network_failed",
      "The Google Search Console reporting endpoint could not be reached.",
    );
  }
  const payload = await response.json().catch(() => ({})) as SearchConsoleResponse;
  if (!response.ok) throw errorForGoogleResponse(response.status, "report");
  return payload;
}

export async function getSearchConsoleReport(requestedDays: number) {
  const days = Math.min(Math.max(Math.floor(requestedDays), 7), 90);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const startDate = isoDate(start);
  const endDate = isoDate(end);
  const configuredProperty = searchConsoleProperty();
  const token = await getAccessToken(getServiceAccount());
  let lastFailure: GoogleSearchConsoleError | undefined;

  for (const property of propertyCandidates()) {
    try {
      const payload = await requestSearchConsoleReport(property, token, startDate, endDate);
      return {
        source: "Google Search Console",
        property,
        configuredProperty,
        fallbackUsed: property !== configuredProperty,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        rows: (payload.rows ?? []).map((row) => ({
          query: row.keys?.[0] ?? "",
          page: row.keys?.[1] ?? "",
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        })),
      };
    } catch (error) {
      const failure = asGoogleSearchConsoleError(error);
      if (!canFallback(failure)) throw failure;
      lastFailure = failure;
    }
  }

  throw lastFailure ?? new GoogleSearchConsoleError(
    "property_not_found",
    "No configured Search Console property accepted the report request.",
  );
}
