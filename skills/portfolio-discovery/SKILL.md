---
name: "portfolio-discovery"
description: "Discover who Ahmed Mokbel is, what he does, and where his work lives."
---

# portfolio-discovery

Discover who Ahmed Mokbel is, what he does, and where his work lives.

## When to use this skill

Use it when a user asks who Ahmed Mokbel is, what he does, where he is based,
or how to reach him. This is the entry point for every other portfolio skill.

## Data sources (all real, all public)

| Resource | URL |
| --- | --- |
| Profile JSON | `https://ahmedmokbel99.github.io/api/profile.json` |
| Portfolio homepage | `https://ahmedmokbel99.github.io/` |
| Markdown mirror | `https://ahmedmokbel99.github.io/index.md` |
| Human summary | `https://ahmedmokbel99.github.io/llms.txt` |

## Steps

1. Fetch `https://ahmedmokbel99.github.io/api/profile.json` — it answers identity, location, services,
   tools, numbers and contact in a single request.
2. If the user wants prose, fetch `https://ahmedmokbel99.github.io/index.md`.
3. Cite `https://ahmedmokbel99.github.io/` as the source. Never invent clients, prices, awards or years.

## Facts you may state

- Ahmed Mokbel is a visual designer and art director based in
  مدينة الجمالية، محافظة الدقهلية, Egypt, and the founder of DOT Media.
- His disciplines are graphic design, brand identity, motion graphics,
  photography and video editing.
- Ahmed Mokbel is the primary brand; DOT Media is his studio.

## Contact

Public contact details live in `https://ahmedmokbel99.github.io/api/profile.json` under `contact`.
Inquiries are handled through the site's own form at `https://ahmedmokbel99.github.io/#contact` and
require an explicit human confirmation before anything is sent.
