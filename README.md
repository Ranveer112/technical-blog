# technical-blog

A fast, Git-based technical blog built with **Astro** and deployed on
**Cloudflare Pages**. Ownership, low cost, speed, and a professional
engineering footprint.

```
You → write Markdown → GitHub → Cloudflare Pages → yourdomain.com
```

## Stack

| Layer          | Choice                    | Cost         |
| -------------- | ------------------------- | ------------ |
| Blog engine    | Astro 5                   | $0           |
| Content        | Markdown / MDX in Git     | $0           |
| Version control| GitHub                    | $0           |
| Hosting/CI     | Cloudflare Pages          | $0           |
| Domain         | Cloudflare Registrar      | ~$10–20/yr   |

## Local development

Requirements: Node.js LTS, Git, VS Code.

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # production build to ./dist
npm run preview    # preview the production build
```

## Project structure

```
src/
├── consts.ts                 # ← EDIT THIS: name, bio, socials, categories, nav
├── content.config.ts         # content collection schemas (frontmatter validation)
├── content/
│   ├── blog/                 # your articles (.md / .mdx)
│   └── projects/             # your projects (.md / .mdx)
├── components/               # Header, Footer, PostCard, BaseHead (SEO), ...
├── layouts/                  # BaseLayout, BlogPost
├── pages/                    # routes: /, /blog, /projects, /about, tags, categories
│   ├── rss.xml.js            # RSS feed
│   └── robots.txt.ts         # robots.txt
public/                       # static assets: favicon, avatar, OG image, _headers
```

## Make it yours

1. **Identity** — edit `src/consts.ts` (name, positioning statement, bio,
   social links, categories).
2. **Domain** — set `site` in `astro.config.mjs` to your real URL.
3. **Avatar / OG image** — replace `public/avatar.svg` and `public/og-default.svg`.
4. **About page** — rewrite `src/pages/about.astro` with your real background.
5. **Projects** — add files to `src/content/projects/`.

## Writing an article

Create `src/content/blog/my-post.md`:

```md
---
title: "Building a Distributed Rate Limiter"
description: "Design decisions behind..."
date: 2026-07-11
category: "Systems"        # must match a category in src/consts.ts
tags:
  - systems
  - backend
draft: false               # true = hidden from the site
---

## Problem
...
## Design
...
## Tradeoffs
...
## Lessons Learned
...
```

The filename is the URL slug. Frontmatter is validated at build time — an
invalid `category` fails the build on purpose.

## Deploy

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial blog"
git branch -M main
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
```

### 2. Connect Cloudflare Pages

Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
**Connect to Git** → select your repo.

Build settings:

| Setting            | Value           |
| ------------------ | --------------- |
| Framework preset   | Astro           |
| Build command      | `npm run build` |
| Build output dir   | `dist`          |

Deploy. You get `something.pages.dev`. Every `git push` to `main`
auto-deploys.

### 3. Custom domain

Cloudflare Pages → your project → **Custom domains** → **Set up a domain** →
enter `yourdomain.com`. If the domain is on Cloudflare Registrar, DNS is
configured automatically. Then update `site` in `astro.config.mjs` and push.

## SEO — included out of the box

- `sitemap-index.xml` via `@astrojs/sitemap`
- `rss.xml` feed
- `robots.txt`
- Per-page canonical URLs, Open Graph + Twitter cards (`BaseHead.astro`)

## Analytics (optional)

Privacy-friendly options:

- **Cloudflare Web Analytics** — free, no cookies. Enable in the Cloudflare
  dashboard; no code changes needed for Pages sites.
- **Plausible** — add the script tag to `BaseHead.astro`.

## Publishing cadence

- **Month 1:** 4 foundational articles ("How I built X", "Understanding Y
  internals", "Benchmarking A vs B", "Lessons from Z").
- **Months 2–3:** 2 deep articles/month. Tutorials 1500–3000 words,
  architecture posts 2500–5000 words.

For each article: publish here (source of truth) → summarize on LinkedIn →
cross-post to Dev.to/Hashnode → link the GitHub code.
