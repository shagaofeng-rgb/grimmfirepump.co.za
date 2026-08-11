# Current architecture — grimm-africa-za

- Site: `grimm-africa-za`, `https://grimmfirepump.co.za`, English, `Africa/Johannesburg`.
- Framework: Next.js App Router; database: Neon PostgreSQL; deployment: Vercel.
- News is stored in `news_articles`, candidates in `news_candidates`, job logs in `news_jobs`; Blog is stored separately in `blog_posts`.
- Existing `/api/cron/news` and `/api/admin/news/run` deliberately return HTTP 410. The former worker mixed RSS fetching, copy generation, product linking and optional publication in one code path, so it is not compliant with the required 12h ingest / 48h publish separation.
- Existing public routes: `/news`, `/news/[slug]`, `/news-sitemap.xml`, `/rss.xml`; Blog routes are `/blog`, `/blog/[slug]`.
- Existing production configuration had no News cron entry. This change introduces two separate Vercel schedules; activation remains subject to source and production credential validation.
