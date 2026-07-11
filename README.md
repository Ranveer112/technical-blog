# technical-blog

A fast, Git-based technical blog built with **Astro 7** and deployed on **Cloudflare Pages**.

```
Markdown → GitHub → Cloudflare Pages → yourdomain.com
```

## Architecture

- **Astro** generates static HTML from Markdown and components.
- **Content collections** validate post frontmatter at build time.
- **GitHub** stores the source and triggers deployments.
- **Cloudflare Pages** builds the site on every push and serves it.

## Write a blog post

Create `src/content/blog/my-post.md`:

```md
---
title: "Your Post Title"
description: "One or two sentences for SEO and preview cards."
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

The filename becomes the URL slug. Invalid frontmatter fails the build.

## Publish

```bash
npm run build     # optional: check locally
npm run dev       # optional: preview at http://localhost:4321

git add .
git commit -m "post: your title"
git push
```

Cloudflare Pages auto-deploys on every push to `main`.

## Configuration

- **Identity:** `src/consts.ts` (name, bio, social links, categories, nav).
- **Domain:** `astro.config.mjs` (update `site` when you connect a custom domain).
- **Avatar:** `public/avatar.svg` (replace with your photo).

## Repo status

Already initialized and pushed to `https://github.com/Ranveer112/technical-blog.git`.

## Useful commands

```bash
npm install
npm run dev         # local dev server
npm run build       # production build
npm run audit       # npm audit --audit-level=moderate
```