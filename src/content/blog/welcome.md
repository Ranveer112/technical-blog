---
title: "Setting Up This Blog"
description: "How this site is built: Astro, Markdown content collections, GitHub, and Cloudflare Pages — and how to write your next post."
date: 2026-07-10
category: "Notes"
tags:
  - meta
  - astro
draft: false
---

## The stack

This blog is a static site with a Git-based workflow:

- **Astro** renders Markdown/MDX to fast, mostly-zero-JS HTML.
- **Content collections** validate every post's frontmatter at build time.
- **GitHub** stores the source.
- **Cloudflare Pages** builds and deploys on every push.

## Writing a post

Create a Markdown file in `src/content/blog/`. The filename becomes the URL
slug. Every post needs this frontmatter:

```md
---
title: "Your Title"
description: "One or two sentences for SEO and previews."
date: 2026-07-11
category: "Systems"   # one of the categories in src/consts.ts
tags:
  - backend
  - performance
draft: false           # set true to hide from the site
---

## Your first heading

Write here.
```

If the `category` isn't one of the allowed values in `src/consts.ts`, the build
**fails** — that's intentional. It keeps your information architecture clean.

## Publishing

```bash
git add .
git commit -m "post: your title"
git push
```

Cloudflare Pages picks up the push, runs `npm run build`, and your article is
live in about a minute.
