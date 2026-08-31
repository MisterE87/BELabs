# B&E Labs

A lightweight static site for **B&E Labs** — Erwin van Wingerden's hobby project studio (apps and sites built for fun, friends, and occasional wider release).

Built with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com). Uses the **B&E Labs brand** palette (blue-to-green gradient from the site icon).

**Live URL:** [https://belabs.nl](https://belabs.nl)

## Local development

Requires **Node.js 24+** (see `.nvmrc`).

```bash
npm install
npm run dev
```

Open **http://localhost:4322/** — local dev uses `/` as base path (same as production).

```bash
npm run build
npm run preview
```

Preview serves the production build at **http://localhost:4323/**.

## Site structure

The main site is an **Astro-style one-pager** with anchor sections:

| Section | Anchor | Content |
|---------|--------|---------|
| Hero | `#top` | Dark gradient hero with headline, CTAs, and lab-shelf showcase panel |
| Features | — | Centered "Why B&E Labs" 3-column card grid |
| About | `#about` | Centered intro + day job / evenings / Benjamin cards |
| Projects | `#projects` | Centered heading + 3-column project card grids by status |
| Contact | `#contact` | Dark bottom CTA with email button |
| Footer | — | Multi-column dark footer with explore + legal links |

**Sub-pages** (linked from project cards or legal links, not in main nav):

| Route | Purpose |
|-------|---------|
| `/projects/[slug]/` | Project detail page |
| `/privacy/farm-academy/` | Farm Academy privacy policy (NL) |

Legacy routes `/about/`, `/contact/`, and `/projects/` redirect to the matching homepage anchors.

## Project layout

| Path | Purpose |
|------|---------|
| `src/content/projects/` | One Markdown file per hobby project |
| `src/content/legal/` | Legal pages (Farm Academy privacy, NL) |
| `src/pages/` | Home one-pager, project detail, privacy |
| `src/components/` | Astro-style sections, header, footer, project cards |
| `src/styles/theme.css` | Theme entry + imports |
| `src/styles/themes/` | Electric Kiwi, Mountain Mist, and Alchemical Reaction overrides |
| `src/lib/site.ts` | Site name, contact email, shared copy |
| `src/lib/projectAssets.ts` | Build-time checks for captured project images |
| `scripts/capture-project-assets.mjs` | Fetches icons + screenshots from live `projectUrl` values |
| `scripts/optimize-project-assets.mjs` | Normalizes manual screenshot/icon drops to site specs |

## Project images

Each project can have assets in `public/images/projects/{slug}/`:

| File | Spec | Purpose |
|------|------|---------|
| `screenshot.webp` | 1280×800 (16:10), WebP ~85% | Card thumbnails, hero bento, detail page |
| `icon.png` | 256×256 PNG | Hero badge overlay, icon fallbacks |

### Manual workflow (recommended for family/offline projects)

1. Create the folder: `public/images/projects/{slug}/`
2. Drop your curated files at **any size** — e.g. `screenshot.png`, `Screenshot_1.png`, or `Icon.png` (png, jpg, webp, or heic all work; names are matched case-insensitively)
3. Run `npm run dev` or `npm run build` — assets are normalized automatically before the site starts

The optimizer produces standardized `screenshot.webp` (1280×800, cropped from top) and `icon.png` (256×256). Exact dimensions are not required when you drop files.

You can also run it manually:

```bash
npm run assets:optimize
```

Or place final `screenshot.webp` and `icon.png` directly at the correct sizes — no script needed.

**Offline projects** (e.g. Bachelor Party) should not set `projectUrl` in frontmatter. Add manual screenshots instead.

**Placeholder screenshots** — projects without a `projectUrl` and without manual files get a generated gradient image (emoji + title) when you run `npm run assets:capture`. These are fine as a fallback but real screenshots look much better.

### Auto-capture (optional for live sites)

Projects with a `projectUrl` can get icons and screenshots automatically:

```bash
npx playwright install chromium
npm run assets:capture
```

This writes files to `public/images/projects/{slug}/`:

- `icon.png` — site/app icon (from favicon / apple-touch-icon)
- `screenshot.webp` — viewport screenshot (Playwright; falls back to og:image)

Set `captureUrl` in project frontmatter when the homepage is not the best preview (e.g. games catalog or dashboard). For login-protected pages, add credentials to `.env`:

```bash
CAPTURE_AUTH_board_stats=username:password
```

For Boardgamestats, you can capture the local dashboard against real data:

```bash
# terminal 1 — from boardgamer repo
PHP_CLI_SERVER_WORKERS=4 php -S 127.0.0.1:3000 -t .

# terminal 2 — BELabs repo
CAPTURE_AUTH_board_stats=user:pass \
CAPTURE_URL_board_stats=http://127.0.0.1:3000/dashboard.php \
CAPTURE_LOGIN_URL_board_stats=http://127.0.0.1:3000/index.php \
npm run assets:capture
```

Projects without a `projectUrl` get a generated gradient placeholder screenshot (emoji + title) when you run `npm run assets:capture` — unless you already added manual files.

Commit `public/images/projects/` after adding or capturing assets so GitHub Pages builds stay fast.

**Projects without a public URL** (Farm Academy, Aquarium, Bachelor Party, etc.) — add files manually:

```
public/images/projects/farm-academy/screenshot.png   # then run npm run assets:optimize
public/images/projects/farm-academy/icon.png
```

Or place final optimized files directly:

```
public/images/projects/farm-academy/screenshot.webp
public/images/projects/farm-academy/icon.png
```

On WSL/Linux, Playwright may need `libasound2t64` installed for Chromium.

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

Add `projectUrl` when the project has a live site — then run `npm run assets:capture` to pull its icon and screenshot. The emoji `icon` field is kept as a fallback when no image files exist.

Body markdown appears on the project detail page.

### Showcase mode (richer detail pages)

Set `showcase: true` in frontmatter to enable a richer layout with facts, highlight cards, and a screenshot gallery. Farm Academy uses this template.

```yaml
showcase: true
heroOrientation: portrait   # optional — wraps hero screenshot in a phone frame
facts:
  - label: Platform
    value: Android
highlights:
  - title: Learn by playing
    description: Short selling point.
    icon: "🐔"
gallery:
  - file: barn-hub.png
    alt: Barnyard hub screen
    caption: Optional caption below the image.
    orientation: portrait   # portrait | landscape
```

Drop gallery source images in `public/images/projects/{slug}/gallery/` (png, jpg, webp, or heic), then run `npm run assets:optimize`. The script outputs `gallery/{name}.webp` — portrait images are resized to max 720px wide; landscape images to max 1280px wide (aspect ratio preserved).

**Showcase checklist** (keep this pattern for new projects):

1. **Folder name = project slug** — e.g. `dm-tools`, not `DmTools` (paths are `public/images/projects/{slug}/`).
2. **Primary image** — `screenshot.png` at the project root becomes `screenshot.webp` (project cards, hero bento, detail hero).
3. **Detail gallery** — extra screens in `gallery/`, listed in frontmatter `gallery:` with `file`, `title`, `alt`, `caption`, and `orientation`.
4. **When a numbered shot should be primary** — rename that file to `screenshot.png`; move the alternate screen into `gallery/`.
5. **Frontmatter** — `showcase: true`, optional `facts`, and one gallery entry per extra screen (see `board-stats.md`, `inpaklijst.md`, `dm-tools.md`).
6. **Optimize before commit** — `npm run assets:optimize` (also runs on `dev` / `build`).

## Farm Academy privacy

Canonical policy: `/privacy/farm-academy/` (Dutch content migrated from [farm-academy-privacy](https://github.com/MisterE87/farm-academy-privacy)).

Edit `src/content/legal/farm-academy-privacy.md` to update legal text.

## Deploy

1. Push changes to `main` on GitHub.
2. GitHub → **Actions** → **Manual workflow** → **Run workflow**.
3. The workflow runs `npm ci && npm run build`, then uploads `./dist/` to `/belabs.nl/` on IFastNet.

### Before first deploy

Confirm the IFastNet document root matches `server-dir` in [`.github/workflows/manual.yml`](.github/workflows/manual.yml). Adjust `/belabs.nl/` if the hosting folder path differs.

### GitHub Actions secrets

FTP deploy uses the premium account secrets:

- `FTP_SERVER_PREMIUM`
- `FTP_USERNAME_PREMIUM`
- `FTP_PASSWORD_PREMIUM`

These are shared with other IFastNet-hosted projects in the same GitHub account.

## Contact email

General contact and Farm Academy privacy both use `erwin@belabs.nl` (`site.contactEmail` in `src/lib/site.ts` and legal frontmatter).

## License

Personal hobby site — project-specific licenses may apply to linked apps separately.
