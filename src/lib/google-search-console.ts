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

type SearchConsoleResponse = { rows?: SearchConsoleRow[]; error?: { message?: string } };

function getServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("Google Search Console credentials are not configured.");

  try {
    const account = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!account.client_email || !account.private_key) throw new Error("Missing service-account fields.");
    return account as ServiceAccount;
  } catch {
    throw new Error("Google Search Console credentials are invalid.");
  }
}

function toBase64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = [
    toBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    toBase64Url(JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })),
  ].join(".");

  const signature = createSign("RSA-SHA256").update(unsignedToken).end().sign(account.private_key, "base64url");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedToken}.${signature}`,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Google OAuth authentication failed.");
  const payload = await response.json() as { access_token?: string };
  if (!payload.access_token) throw new Error("Google OAuth returned no access token.");
  return payload.access_token;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getSearchConsoleReport(requestedDays: number) {
  const days = Math.min(Math.max(Math.floor(requestedDays), 7), 90);
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const property = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ?? "https://grimmfirepump.co.za/";
  const token = await getAccessToken(getServiceAccount());

  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: isoDate(start),
        endDate: isoDate(end),
        dimensions: ["query", "page"],
        rowLimit: 100,
        dataState: "final",
      }),
      cache: "no-store",
    },
  );

  const payload = await response.json() as SearchConsoleResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Google Search Console query failed.");
  }

  return {
    source: "Google Search Console",
    property,
    startDate: isoDate(start),
    endDate: isoDate(end),
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
}
