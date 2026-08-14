import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

for (const file of [".env.production.local", ".env.local"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator < 1 || line.startsWith("#")) continue;
    const key = line.slice(0, separator);
    if (!process.env[key]) process.env[key] = line.slice(separator + 1).replace(/^"|"$/g, "");
  }
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = neon(process.env.DATABASE_URL);
const tables = ["products", "product_categories", "blog_posts", "blog_categories", "news_articles", "news_sources", "news_candidates", "news_ingest_runs", "news_publication_runs", "news_delivery_checks", "leads", "seo_sync_runs", "news_jobs", "news_publication_audits", "audit_logs", "system_settings", "media_assets", "download_assets", "form_definitions", "page_definitions", "site_events"];
const counts = {};
for (const table of tables) {
  const rows = await sql.query(`SELECT count(*)::int AS count FROM ${table}`);
  counts[table] = rows[0].count;
}
const schema = await sql.query("SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position");
const checks = {
  duplicates: {
    productSlugs: await sql.query("SELECT slug, count(*)::int AS count FROM products WHERE deleted_at IS NULL GROUP BY slug HAVING count(*) > 1"),
    blogFingerprints: await sql.query("SELECT source_fingerprint, count(*)::int AS count FROM blog_posts WHERE deleted_at IS NULL GROUP BY source_fingerprint HAVING count(*) > 1"),
    blogSlugs: await sql.query("SELECT slug, count(*)::int AS count FROM blog_posts WHERE deleted_at IS NULL GROUP BY slug HAVING count(*) > 1"),
  },
  statuses: {
    products: await sql.query("SELECT status, published, count(*)::int AS count FROM products WHERE deleted_at IS NULL GROUP BY status, published ORDER BY status"),
    blog: await sql.query("SELECT status, count(*)::int AS count FROM blog_posts WHERE deleted_at IS NULL GROUP BY status ORDER BY status"),
    news: await sql.query("SELECT status, count(*)::int AS count FROM news_articles WHERE deleted_at IS NULL GROUP BY status ORDER BY status"),
    jobs: await sql.query("SELECT status, count(*)::int AS count FROM news_jobs GROUP BY status ORDER BY status"),
  },
  recentJobs: await sql.query("SELECT job_type, status, retry_count, started_at, completed_at, left(error_message, 160) AS error_message FROM news_jobs ORDER BY created_at DESC LIMIT 10"),
  recentIngestRuns: await sql.query("SELECT status, started_at, completed_at, discovered_count, candidate_count, rejected_count, left(error_message, 160) AS error_message FROM news_ingest_runs ORDER BY started_at DESC LIMIT 10"),
  recentPublicationRuns: await sql.query("SELECT status, started_at, completed_at, left(error_message, 160) AS error_message, details FROM news_publication_runs ORDER BY started_at DESC LIMIT 10"),
  candidateStatuses: await sql.query("SELECT status, count(*)::int AS count FROM news_candidates GROUP BY status ORDER BY status"),
  sources: await sql.query("SELECT publisher_name, rss_url, enabled, site_id, last_fetched_at, failure_count FROM news_sources ORDER BY publisher_name"),
  indexes: await sql.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname"),
};
const backup = { createdAt: new Date().toISOString(), purpose: "Pre-audit database structure and count snapshot", counts, schema, checks };
const output = path.join(".audit", "pre-audit-db-snapshot-2026-08-11.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(backup, null, 2));
console.log(JSON.stringify({ output, counts, columns: schema.length, checks }));
