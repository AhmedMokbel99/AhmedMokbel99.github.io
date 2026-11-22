# Analytics Worker

Separate Cloudflare Worker for lightweight visit and project-open counters.
It is unrelated to the contact form, which opens WhatsApp directly from the
visitor's browser and makes no contact request.

- Deployed name: `ahmed-analytics`
- Config: `wrangler.analytics.jsonc`
- Source: `analytics.js`
- Allowed Origin: `https://ahmedmokbel99.github.io` only
- Endpoints: `POST /event`, `GET /summary`
- Storage: Durable Object `ANALYTICS` (`site-v1`) with SQLite backend
- Privacy: no name, email, phone or message is stored. A daily HMAC of the IP
  is used only to count unique visits and is rotated/expired automatically.

The `ANALYTICS_SECRET` value is a Cloudflare Worker Secret; never commit it or
place it in `content/site.json`, `js/data.js` or any generated page.

## Deploy

```sh
cd worker
npx wrangler deploy -c wrangler.analytics.jsonc
```

The former contact endpoint Worker (`ahmed-contact-endpoint`) and its
Telegram/Turnstile source files were removed after owner approval.
