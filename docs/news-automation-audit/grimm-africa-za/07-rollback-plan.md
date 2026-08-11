# Rollback plan

1. In Vercel, roll back to deployment `dpl_B4vU84yfzKtBEM9z2vJZDGKci3Hr` or the previous Ready deployment.
2. Remove the two News cron entries only after the rollback deployment is active.
3. Additive database records and indexes are backward compatible. Do not delete historical `news_articles`, `blog_posts`, candidates or job logs.
4. Pre-change database count/schema snapshot: `.audit/pre-audit-db-snapshot-2026-08-11.json`.
