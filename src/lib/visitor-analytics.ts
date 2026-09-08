import "server-only";
import { getDatabase, hasDatabase } from "@/lib/database";

let schemaReady: Promise<void> | null = null;

export function ensureVisitorAnalyticsSchema() {
  if (!hasDatabase()) return Promise.resolve();
  if (!schemaReady) schemaReady = (async () => {
    const sql = getDatabase();
    await sql`CREATE TABLE IF NOT EXISTS visitor_profiles (
      id text PRIMARY KEY,
      first_seen_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      first_path text,
      last_path text,
      first_referrer text,
      last_referrer text,
      first_utm jsonb NOT NULL DEFAULT '{}'::jsonb,
      last_utm jsonb NOT NULL DEFAULT '{}'::jsonb
    )`);
    await sql`CREATE TABLE IF NOT EXISTS visit_sessions (
      id text PRIMARY KEY,
      visitor_id text NOT NULL REFERENCES visitor_profiles(id) ON DELETE CASCADE,
      started_at timestamptz NOT NULL DEFAULT now(),
      last_seen_at timestamptz NOT NULL DEFAULT now(),
      ended_at timestamptz,
      entry_path text NOT NULL,
      exit_path text NOT NULL,
      referrer text,
      utm jsonb NOT NULL DEFAULT '{}'::jsonb
    )`);
    await sql.query("ALTER TABLE site_events ADD COLUMN IF NOT EXISTS visitor_id text, ADD COLUMN IF NOT EXISTS session_id text, ADD COLUMN IF NOT EXISTS referrer text, ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb");
    await sql.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS visitor_id text, ADD COLUMN IF NOT EXISTS session_id text");
    await sql.query("CREATE INDEX IF NOT EXISTS site_events_visitor_created_idx ON site_events(visitor_id, created_at DESC)");
    await sql.query("CREATE INDEX IF NOT EXISTS site_events_session_created_idx ON site_events(session_id, created_at ASC)");
    await sql.query("CREATE INDEX IF NOT EXISTS visit_sessions_visitor_started_idx ON visit_sessions(visitor_id, started_at DESC)");
    await sql.query("CREATE INDEX IF NOT EXISTS leads_visitor_created_idx ON leads(visitor_id, created_at DESC)");
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export function sanitizeReferrer(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`.slice(0, 500);
  } catch {
    return null;
  }
}

export function sanitizeUtm(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const allowed = ["source", "medium", "campaign", "term", "content"];
  const input = value as Record<string, unknown>;
  return Object.fromEntries(allowed.flatMap((key) => {
    const current = input[key];
    return typeof current === "string" && current.trim() ? [[key, current.trim().slice(0, 160)]] : [];
  }));
}
