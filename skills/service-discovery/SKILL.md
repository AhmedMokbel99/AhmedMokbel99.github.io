---
name: "service-discovery"
description: "Explain Ahmed Mokbel's design, motion, photography and consulting services."
---

# service-discovery

Explain Ahmed Mokbel's design, motion, photography and consulting services.

## When to use this skill

Use it when a user asks what Ahmed Mokbel offers, what a service includes, who
it is for, or how a project starts.

## Data sources

| Resource | URL |
| --- | --- |
| Services JSON | `https://ahmedmokbel99.github.io/api/services.json` |
| Motion graphics page | `https://ahmedmokbel99.github.io/motion-graphics.html` |
| Brand identity page | `https://ahmedmokbel99.github.io/brand-identity.html` |
| Digital and print page | `https://ahmedmokbel99.github.io/digital-print.html` |
| Photo production page | `https://ahmedmokbel99.github.io/photo-production.html` |
| Social media ads page | `https://ahmedmokbel99.github.io/social-media-ads.html` |
| Brand consulting page | `https://ahmedmokbel99.github.io/brand-consulting.html` |

## Steps

1. Fetch `https://ahmedmokbel99.github.io/api/services.json` for the canonical list, deliverables and
   audience for each service.
2. For detail, fetch the matching service page or its `markdownUrl`.
3. If the user wants to start a project, point them to `https://ahmedmokbel99.github.io/#contact` and ask
   them to confirm the message themselves.

## Rules

- No prices are published. Do not estimate one.
- No turnaround times or guarantees are published. Do not invent them.
