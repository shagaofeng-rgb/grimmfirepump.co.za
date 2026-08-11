import fs from "node:fs";
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

const base = process.env.E2E_BASE_URL ?? "http://127.0.0.1:4177";
const sign = process.env.E2E_WEBHOOK_SIGN ?? process.env.WEBHOOK_ARTICLE_SIGN ?? process.env.BLOG_WEBHOOK_SECRET;
if (!process.env.DATABASE_URL || !sign) throw new Error("Database or webhook credentials are unavailable.");
const sql = neon(process.env.DATABASE_URL);
const title = `AUTOMATED TEST — Blog webhook ${new Date().toISOString()}`;
const body = new URLSearchParams({ sign, class_id: "blog", title, content: "This is a controlled end-to-end publication test. It verifies the authenticated Blog webhook, database write, front-end read, sitemap inclusion, and duplicate protection.", author_id: "audit-runner" });
const request = () => fetch(`${base}/`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
try {
  const first = await request();
  const firstPayload = await first.json();
  const second = await request();
  const secondPayload = await second.json();
  const rows = await sql`SELECT id, slug, status FROM blog_posts WHERE title=${title} AND deleted_at IS NULL`;
  if (first.status !== 200 || firstPayload.code !== 1 || second.status !== 200 || secondPayload.code !== 1 || rows.length !== 1) throw new Error(`Webhook publish or idempotency verification failed: first=${first.status}/${firstPayload.code}; second=${second.status}/${secondPayload.code}; rows=${rows.length}`);
  const post = rows[0];
  const article = await fetch(`${base}/blog/${post.slug}`);
  const sitemap = await fetch(`${base}/sitemap.xml`);
  const sitemapText = await sitemap.text();
  const deliveries = await sql`SELECT outcome, count(*)::int AS count FROM blog_webhook_deliveries WHERE created_at >= now() - interval '5 minutes' GROUP BY outcome ORDER BY outcome`;
  if (!article.ok || !sitemap.ok || !sitemapText.includes(`/blog/${post.slug}`)) throw new Error("Front-end or sitemap verification failed.");
  await sql`UPDATE blog_posts SET status='archived', deleted_at=now(), updated_at=now() WHERE id=${post.id}`;
  console.log(JSON.stringify({ first: { status: first.status, code: firstPayload.code }, second: { status: second.status, code: secondPayload.code }, database: { rows: rows.length, status: post.status }, frontend: article.status, sitemap: sitemap.status, deliveryOutcomes: deliveries, cleanup: "archived" }));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Webhook E2E test failed.");
  process.exit(1);
}
