# Schedules and trigger chain

| Task | Route | Schedule | Time zone | Write target | Publication capability | Status before change |
| --- | --- | --- | --- | --- | --- | --- |
| Legacy News cron | `/api/cron/news` | none configured | n/a | none | no, HTTP 410 | disabled |
| Legacy admin run | `/api/admin/news/run` | manual | n/a | none | no, HTTP 410 | disabled |
| News ingest | `/api/cron/news-ingest` | `0 */12 * * *` | UTC trigger; site calculations use Africa/Johannesburg | candidate/run records only | prohibited | added |
| News publish | `/api/cron/news-publish` | `0 2 */2 * *` | UTC trigger; site calculations use Africa/Johannesburg | publication/run/delivery records | required after frontend verification | added |

All cron routes require the Vercel `CRON_SECRET` authorization header. No route may target Blog.
