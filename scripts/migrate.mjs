import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

function loadLocalEnvironment() {
  const file = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const separator = line.indexOf("=");
    if (separator < 1 || line.startsWith("#")) continue;
    const key = line.slice(0, separator);
    const value = line.slice(separator + 1).replace(/^"|"$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnvironment();
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to run migrations.");
const sql = neon(process.env.DATABASE_URL);

const statements = [
  "CREATE EXTENSION IF NOT EXISTS pgcrypto",
  `CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, display_name text NOT NULL, password_hash text NOT NULL, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz)`,
  `CREATE TABLE IF NOT EXISTS roles (id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS user_roles (user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, role_id text NOT NULL REFERENCES roles(id) ON DELETE CASCADE, PRIMARY KEY (user_id, role_id))`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, session_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), last_seen_at timestamptz NOT NULL DEFAULT now(), ip_hash text, user_agent text)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (id bigserial PRIMARY KEY, email text, ip_hash text, succeeded boolean NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS product_categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE, parent_id uuid REFERENCES product_categories(id) ON DELETE RESTRICT, description text NOT NULL DEFAULT '', enabled boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0, seo_title text, seo_description text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz)`,
  `CREATE TABLE IF NOT EXISTS products (id text PRIMARY KEY, slug text NOT NULL UNIQUE, name text NOT NULL, category text NOT NULL, summary text NOT NULL, applications jsonb NOT NULL DEFAULT '[]'::jsonb, highlights jsonb NOT NULL DEFAULT '[]'::jsonb, specifications jsonb NOT NULL DEFAULT '[]'::jsonb, image text NOT NULL, status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','pending','published','scheduled','unpublished','archived')), published boolean NOT NULL DEFAULT false, seo_title text, seo_description text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz)`,
  `CREATE TABLE IF NOT EXISTS news_articles (id text PRIMARY KEY, slug text NOT NULL UNIQUE, title text NOT NULL, excerpt text NOT NULL, content jsonb NOT NULL DEFAULT '[]'::jsonb, category text NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','published','scheduled','unpublished','archived')), published_at timestamptz, source_name text, source_url text, related_product_ids jsonb NOT NULL DEFAULT '[]'::jsonb, seo_title text, seo_description text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz)`,
  `ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS updated_published_at timestamptz, ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en', ADD COLUMN IF NOT EXISTS source_title text, ADD COLUMN IF NOT EXISTS source_author text, ADD COLUMN IF NOT EXISTS source_publisher text, ADD COLUMN IF NOT EXISTS canonical_source_url text, ADD COLUMN IF NOT EXISTS source_published_at timestamptz, ADD COLUMN IF NOT EXISTS source_fetched_at timestamptz, ADD COLUMN IF NOT EXISTS source_timezone text, ADD COLUMN IF NOT EXISTS source_fingerprint text, ADD COLUMN IF NOT EXISTS event_fingerprint text, ADD COLUMN IF NOT EXISTS content_hash text, ADD COLUMN IF NOT EXISTS relevance_score numeric, ADD COLUMN IF NOT EXISTS credibility_score numeric, ADD COLUMN IF NOT EXISTS geo_summary text, ADD COLUMN IF NOT EXISTS key_takeaways jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS generation_model text, ADD COLUMN IF NOT EXISTS generation_prompt_version text`,
  `ALTER TABLE news_articles DROP CONSTRAINT IF EXISTS news_articles_status_check`,
  `ALTER TABLE news_articles ADD CONSTRAINT news_articles_status_check CHECK (status IN ('discovered','fetched','rejected','duplicate','analyzing','draft','review_required','scheduled','publishing','published','failed','archived','pending','unpublished'))`,
  `CREATE TABLE IF NOT EXISTS news_sources (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), domain text NOT NULL UNIQUE, publisher_name text NOT NULL, source_type text NOT NULL DEFAULT 'rss', rss_url text NOT NULL, language text NOT NULL DEFAULT 'en', country text, credibility_score numeric NOT NULL DEFAULT 0.7, enabled boolean NOT NULL DEFAULT true, allowed_for_auto_publish boolean NOT NULL DEFAULT false, last_fetched_at timestamptz, failure_count integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS news_candidates (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source_id uuid REFERENCES news_sources(id) ON DELETE SET NULL, source_title text NOT NULL, normalized_title text NOT NULL, source_author text, source_publisher text NOT NULL, source_url text NOT NULL, canonical_source_url text NOT NULL, source_language text NOT NULL DEFAULT 'en', source_published_at timestamptz, source_fetched_at timestamptz NOT NULL DEFAULT now(), source_timezone text, source_fingerprint text NOT NULL, event_fingerprint text NOT NULL, content_summary text, credibility_score numeric NOT NULL DEFAULT 0, relevance_score numeric, status text NOT NULL DEFAULT 'discovered', rejection_reason text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(canonical_source_url), UNIQUE(source_fingerprint))`,
  `CREATE TABLE IF NOT EXISTS news_product_relations (news_id text NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE, product_id text NOT NULL REFERENCES products(id) ON DELETE RESTRICT, relevance_score numeric NOT NULL, relationship_reason text NOT NULL, display_order integer NOT NULL DEFAULT 0, seo_anchor_text text NOT NULL, geo_relation_summary text NOT NULL, product_help_summary text NOT NULL, display_on_product_page boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (news_id, product_id))`,
  `CREATE TABLE IF NOT EXISTS news_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), job_type text NOT NULL, status text NOT NULL, idempotency_key text NOT NULL UNIQUE, scheduled_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, completed_at timestamptz, retry_count integer NOT NULL DEFAULT 0, error_message text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS news_publication_audits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), audit_date date NOT NULL, timezone text NOT NULL, target_count integer NOT NULL, published_count integer NOT NULL, missing_count integer NOT NULL, status text NOT NULL, checked_at timestamptz NOT NULL DEFAULT now(), last_error text, details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(audit_date, timezone))`,
  `CREATE TABLE IF NOT EXISTS leads (id text PRIMARY KEY, form_type text NOT NULL DEFAULT 'contact', name text NOT NULL, company text NOT NULL, email text NOT NULL, phone text, country text NOT NULL, product_interest text NOT NULL, message text NOT NULL, status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','quoted','closed','spam','archived')), owner_id uuid REFERENCES users(id) ON DELETE SET NULL, internal_note text, source_page text, utm jsonb NOT NULL DEFAULT '{}'::jsonb, consent_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz)`,
  `CREATE TABLE IF NOT EXISTS seo_sync_runs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), source text NOT NULL, status text NOT NULL CHECK (status IN ('running','succeeded','failed')), started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, records_synced integer NOT NULL DEFAULT 0, error_code text, error_message text, details jsonb NOT NULL DEFAULT '{}'::jsonb)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id bigserial PRIMARY KEY, user_id uuid REFERENCES users(id) ON DELETE SET NULL, action text NOT NULL, module text NOT NULL, entity_type text, entity_id text, before_summary jsonb, after_summary jsonb, ip_hash text, user_agent text, succeeded boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS system_settings (key text PRIMARY KEY, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`,
  "CREATE INDEX IF NOT EXISTS products_status_published_idx ON products(status, published, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS news_status_published_idx ON news_articles(status, published_at DESC)",
  "CREATE INDEX IF NOT EXISTS news_source_fingerprint_idx ON news_articles(source_fingerprint, source_published_at DESC)",
  "CREATE INDEX IF NOT EXISTS news_source_url_idx ON news_articles(canonical_source_url, source_published_at DESC)",
  "CREATE INDEX IF NOT EXISTS news_candidates_status_idx ON news_candidates(status, source_published_at DESC)",
  "CREATE INDEX IF NOT EXISTS news_product_relations_product_idx ON news_product_relations(product_id, relevance_score DESC)",
  "CREATE INDEX IF NOT EXISTS news_jobs_status_idx ON news_jobs(status, started_at DESC)",
  "CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads(status, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email)",
  "CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at DESC)",
  "CREATE INDEX IF NOT EXISTS seo_sync_runs_source_idx ON seo_sync_runs(source, started_at DESC)",
  "INSERT INTO roles (id, name, description) VALUES ('super_admin','超级管理员','完整系统权限'),('admin','管理员','后台运营权限'),('editor','内容编辑','内容编辑与草稿权限'),('marketing','市场人员','营销、SEO与同步查看权限'),('sales','销售人员','询盘跟进权限'),('analyst','数据分析人员','数据查看权限'),('viewer','只读用户','只读权限') ON CONFLICT (id) DO NOTHING",
];

for (const statement of statements) await sql.query(statement);
console.log(JSON.stringify({ success: true, statements: statements.length }));
