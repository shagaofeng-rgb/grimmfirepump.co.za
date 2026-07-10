# GRIMM PUMP Africa — independent local site

This is a separate Next.js application for the Africa market. It does not replace or deploy into the existing `grimmfirepump.com` site.

## Included locally

- Public product, product-detail, applications, contact, about and news pages.
- Server-side inquiry validation, honeypot check, local rate limit and persistent local lead storage.
- Chinese local admin at `/admin` for leads, simple product creation and manual news entries.
- Sitemap, robots and JSON-LD for articles.

## Run locally

1. Copy `.env.example` to `.env.local`, set a unique local password and secret.
2. Use the supplied portable Node runtime from the parent directory:

```powershell
$env:Path = "..\.tools\node-v24.17.0-win-x64;$env:Path"
npm run dev -- --port 4175
```

3. Open `http://127.0.0.1:4175` and `http://127.0.0.1:4175/admin`.

Local content is stored in `data/local-site-data.json`. This is suitable for local acceptance only. Before internet deployment, migrate the store to PostgreSQL/object storage, configure email delivery, use production secrets, and implement approved news-source/API credentials.
