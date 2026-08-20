# GRIMM PUMP Africa News automation implementation baseline

- Site ID: `grimm-africa-za`
- Backup branch: `backup/pre-daily-news-automation-20260820`
- Timezone: `Africa/Johannesburg`
- Schedules: ingest 08:10 local; publish 09:45 local; Google sitemap submission every 3 days.
- News and Blog: separate tables, routes and APIs. Blog automation is not permitted.
- Safety gate: production publication requires `NEWS_AUTO_PUBLISH=true`; otherwise the publish worker returns a non-publishing disabled result.
- Content gate still required before activation: a fully verified source catalog, source rights record, fact lock, humanizer/fact regression, similarity check, and browser-visible delivery check.
- Historical News and Blog records have not been deleted or migrated.

## Source-catalog import state
The user-provided 300-source directory is retained as an input record to be imported before enabling publication. It must not be treated as validated: each source needs domain, robots/feed availability, tier, restriction and provenance validation. No unverified or copyright-unclear source may publish.

## Rollback
Redeploy commit `0feeb4ddc1b2cc38b3a26a116790f449a025c308` or reset Vercel to the previous production deployment. Database schema is unchanged in this baseline.
