# Contact endpoint Worker

Free-plan Cloudflare Worker for the portfolio contact form. It verifies Cloudflare Turnstile server-side, applies a per-IP limit (5/minute, 20/hour), rejects spam, and sends one Telegram notification.

## Secrets (never commit)

Set these as Worker Secrets in the Cloudflare dashboard or with `wrangler secret put`:

- `TURNSTILE_SECRET_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `CONTACT_EMAIL`
- `IP_HASH_SECRET` (random 32-byte value; used only to hash IPs before Durable Object routing)

## Binding

- `RATE_LIMITER`: Durable Object binding to class `RateLimiter`, SQLite storage backend.
- Migration: `new_sqlite_classes: ["RateLimiter"]`.

## Deploy

With Wrangler:

```sh
cd worker
npx wrangler deploy
```

Or paste `index.js` into the Cloudflare Worker editor, add the `RATE_LIMITER` Durable Object binding with SQLite backend, then add the secrets above.

## Contract

- `POST /` only; `OPTIONS` allowed for the exact Origin `https://ahmedmokbel99.github.io`.
- JSON body up to 8 KB.
- Returns `{ "ok": true, "reference": "AM-YYYYMMDD-XXXX" }` on success.
- Honeypot submissions receive the same success shape but never notify Telegram.
- Rejected requests return generic `error` codes; logs contain reason codes only, never IP or form content.
