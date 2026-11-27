---
name: "project-discovery"
description: "Search and read Ahmed Mokbel's portfolio projects and case studies."
---

# project-discovery

Search and read Ahmed Mokbel's portfolio projects and case studies.

## When to use this skill

Use it when a user asks for examples of Ahmed Mokbel's work, needs a case study,
or wants projects filtered by discipline (motion graphics, brand identity,
digital and print design).

## Data sources

| Resource | URL |
| --- | --- |
| All projects (summary) | `https://ahmedmokbel99.github.io/api/projects.json` |
| One project (full case study) | `https://ahmedmokbel99.github.io/api/projects/<slug>.json` |
| Human view (dialog) | `https://ahmedmokbel99.github.io/#work` |

## Steps

1. Fetch `https://ahmedmokbel99.github.io/api/projects.json` once and keep the `projects` array.
2. Filter locally by `category` (`motion`, `brand`, `digital`), `tag`, or by
   matching words in `title` and `summary`. There is no server-side search.
3. For any project the user asks about, fetch its `detailUrl`. That document
   contains `summary`, `challenge`, `role`, `result`, `tools` and `gallery`.
4. Always quote the project's own `title` exactly and link its `pageUrl`.

## Rules

- Every project already has a written case study; do not fill gaps yourself.
- `externalUrl` points to the original Behance gallery where one exists.
- Project `slug` is the public identifier. Internal build codes are not part of
  the API and must not be shown to users.
