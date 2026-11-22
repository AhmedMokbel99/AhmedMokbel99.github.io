# Contact endpoint Worker

Free-plan Cloudflare Worker for the portfolio contact form. It verifies Cloudflare Turnstile server-side, applies a per-IP limit (5/minute, 20/hour), rejects spam, and sends one Telegram notification (up to 3 attempts). It fails closed: no secret or no successful Telegram delivery means no success response.

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

`index.compact.js` is a size-optimized copy of `index.js` with identical behavior, for the Cloudflare Quick Edit 10 KB limit. Deploy it explicitly with `npx wrangler deploy index.compact.js --name ahmed-contact-endpoint` when that copy is needed.

Or paste `index.compact.js` into the Cloudflare Worker editor, add the `RATE_LIMITER` Durable Object binding with SQLite backend, then add the secrets above.

## Contract

- `POST /` only; `OPTIONS` allowed for the exact Origin `https://ahmedmokbel99.github.io`.
- JSON body up to 8 KB.
- Returns `{ "ok": true, "reference": "AM-YYYYMMDD-XXXX" }` on success.
- Honeypot submissions receive the same success shape but never notify Telegram.
- Missing or empty required secrets return `503` with `{ "ok": false }` before any validation.
- Telegram is attempted up to 3 times (network errors, `429`, `5xx`). If it never succeeds, the Worker returns `503` with `{ "ok": false }` — never `ok: true`.
- Rejected requests return generic `error` codes; logs contain reason codes only, never IP or form content.
