# B&E Labs

A lightweight static site for **B&E Labs** — Erwin van Wingerden's hobby project studio (apps and sites built for fun, friends, and occasional wider release).

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com). Structure inspired by the [JoostDeKruijff](https://github.com/MisterE87/JoostDeKruijff) portfolio site.

**Draft URL:** [https://mistere87.github.io/BELabs/](https://mistere87.github.io/BELabs/) (GitHub Pages)

**Planned domain:** `belabs.nl` (when ready)

## Local development

Requires **Node.js 22+** (see `.nvmrc`).

```bash
npm install
npm run dev
```

Open **http://localhost:4321/BELabs/** (base path matches GitHub Pages).

```bash
npm run build
npm run preview
```

## Project layout

| Path | Purpose |
|------|---------|
| `src/content/projects/` | One Markdown file per hobby project |
| `src/content/legal/` | Legal pages (Farm Academy privacy, NL) |
| `src/pages/` | Routes: home, about, projects, contact, privacy |
| `src/components/` | Header, footer, hero, project cards |
| `src/lib/site.ts` | Site name, contact email, shared copy |

## Adding a project

Create `src/content/projects/your-slug.md`:

```yaml
---
title: "Your Project"
status: "Live"
hook: "One-line description."
featured: true
icon: "🧪"
projectUrl: "https://example.com"
---
```

Body markdown appears on the project detail page.

## Farm Academy privacy

Canonical policy: `/privacy/farm-academy/` (Dutch content migrated from [farm-academy-privacy](https://github.com/MisterE87/farm-academy-privacy)).

Edit `src/content/legal/farm-academy-privacy.md` to update legal text.

## Deploy

1. Push to `main` on GitHub.
2. Enable **GitHub Pages** → Source: **GitHub Actions**.
3. The `Deploy GitHub Pages` workflow publishes `./dist/`.

When moving to a custom domain, update `site` and `base` in `astro.config.mjs`.

## Contact email

General contact uses `site.contactEmail` in `src/lib/site.ts` (temporary personal address).

Farm Academy privacy uses its own contact email in legal frontmatter until `hello@belabs.nl` is configured.

## License

Personal hobby site — project-specific licenses may apply to linked apps separately.
