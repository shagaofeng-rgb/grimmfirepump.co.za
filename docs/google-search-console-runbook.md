# Google Search Console sitemap submission runbook

## Purpose

The production cron at `/api/cron/google-seo` submits only the canonical sitemap:

`https://grimmfirepump.co.za/sitemap.xml`

The Vercel schedule is `0 2 */3 * *` (02:00 UTC every third day). It is a sitemap notification, not an indexing guarantee and must not be used to repeatedly request indexing of ordinary pages.

## Required production configuration

Keep these values only in Vercel production environment variables:

- `CRON_SECRET`: a high-entropy secret used by Vercel Cron.
- `GOOGLE_SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON`: a valid service-account JSON document.
- `GOOGLE_SEARCH_CONSOLE_SITE_URL`: exactly one verified Search Console property. Use either the URL-prefix property `https://grimmfirepump.co.za/` or the domain property `sc-domain:grimmfirepump.co.za`.
- `NEXT_PUBLIC_SITE_URL=https://grimmfirepump.co.za`
- `DATABASE_URL`: required for auditable run records and duplicate protection.

Do not commit any of these values to Git.

## Search Console access

In Search Console, add the service account email from the configured JSON as an owner or full user of the exact property used in `GOOGLE_SEARCH_CONSOLE_SITE_URL`. A `www` URL-prefix property, a non-`www` URL-prefix property, and a domain property are separate access scopes unless the service account has been added to each relevant property.

## Verifying the next run

1. Open the authenticated admin SEO screen or request its API.
2. Read the latest `sitemapSyncRuns` entry.
3. A successful run has `status=succeeded`, `records_synced=1`, and HTTP status 200 in its details.
4. A failure records a safe `errorCode`, for example `credentials_missing`, `property_access_denied`, or `property_not_found`.
5. Repeated requests on the same scheduled UTC day return `skipped=true`; this prevents duplicate submission.

The admin manual submit action is intentionally separate from the cron and is for a controlled diagnostic check only.

## Indexation governance

The sitemap contains only canonical, intended-to-index routes. Legal-policy pages are deliberately not included. Source-led external News remains excluded until it meets the site’s original-content and editorial-review policy; changing a page to indexable must follow content-quality review, not be used to inflate indexed-page totals.
