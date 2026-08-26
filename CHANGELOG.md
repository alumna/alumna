# Alumna changelog

## 4.0.0-alpha.4 — 2026-08-26

- SSG follows the Q44 table. Static routes with no route middleware get HTML. Route `middleware` skips SSG unless `ssg: true`. Global `app.middleware` does not skip. `ssg: false` is always SPA. Param routes need `prerender: [{ param: value }, ...]`. Redirects and `/*` never get HTML. Empty `prerender: []` writes no pages for that pattern.
- `alumna rebuild --route <path>` and `--id <contentId>` rebuild one or more SSG pages from an existing `build/`. `--listen` starts a localhost `/notify` endpoint. Manifest `lookup` maps content keys (route paths in this alpha) to URLs. HTML writes are atomic. JS is rewritten only when compiled files changed.
- Hydrate sets `route` (including params) before the first client paint so param pages match the SSG HTML.
- Chromium e2e covers Hello, SSG click-through, param prerender, middleware skip, and rebuild of an extra path.
- Jest 100% four-metric (353 tests).

## 4.0.0-alpha.3 — 2026-08-26

- `alumna build --ssg` and `alumna.hjson` `ssg: true` prerender static routes (no `:param`, no `*`, no redirects). Output is `build/index.html` for `/` and `build/about/index.html` for `/about`, plus `build/_alumna/spa.html` for unknown paths. The first paint hydrates, then the app is a SPA.
- The vendor import map always includes `svelte` (`mount` and `hydrate`) so the browser can boot the runtime.
- Chromium e2e covers Hello (`alumna dev`) and SSG hydrate then a click to `/about`.
- `alumna dev` recompiles only the changed used `.svelte` file. It also compiles new child components and removes unused ones. Route deps update when the child list changes. Vendor chunks rebuild only when library or Svelte imports change.
- Tests must cover unit tests and integration / real-browser tests. Contributors need Playwright Chromium for the full suite: `bun install`, then `bunx playwright install --with-deps chromium`.
- Alumna development uses Bun only. Commit `bun.lock`. Rolldown is a contributor devDependency (authors get it on first run later).
- Plan (not in this alpha yet): which routes SSG. Route middleware skips SSG unless `ssg: true`. Param routes need `prerender: [{ param: value }, ...]`. Optional `ssg: false` / `ssg: true`.

## 4.0.0-alpha.2 — 2026-08-26

Production-quality SPA slice (Phase 3).

- `alumna add` installs app libraries. Alumna owns `package.json` and bundles used packages into hashed `/_alumna/vendor/` chunks (Rolldown).
- Tree-shaken Svelte client runtime via used exports. Bun is no longer required to vendor Svelte.
- Production minify of runtime, match helper, and vendor chunks.
- Optional `alumna.hjson`: `port`, `base`, `out`, `title`, `sourcemap`, `ssg`.
- Configurable `base` for subfolder / Capacitor hosts.
- Source maps in `alumna dev`; optional in `alumna build` (`sourcemap: true`).
- Build CSS is fetched before mount so routes do not flash unstyled.
- README is the full author documentation (index, binary install, no npm as the Alumna install channel). Catch-all `/*`, live-reload overlay, hjson output aliases, and the manifest are documented there.
- Distribution plan: authors need no Node/Bun/npm on `PATH`, including for `alumna add`. Alumna itself is Rolldown-bundled and minified (Oxc inside Rolldown), then bun-compiled. `alumna add` uses Bun’s installer in that same binary (`BUN_BE_BUN=1`). Rolldown downloads on first `dev`/`build`. No separate Oxc CLI.
- Contributors use Bun (`bun install`, `bun src/cli.js`). Node remains for the Jest suite only.

## 4.0.0-alpha.1 — 2026-08-26

First 4.0 slice, rebuilt from scratch on Svelte 5.

- `alumna new` / `dev` / `build` / `preview`
- `src/app.js` route language: areas, routes, groups, comma aliases, `:id`, redirects
- Named one-level layouts (snippet areas) and sequential default
- Front-end middlewares (`export default`, async, before load)
- Native ESM on-demand loading with a per-route deps graph
- Navigation API with History API fallback
- In-memory dev server, selective watch, compile error overlay
- Production SPA emit plus `alumna-manifest.json`
- `.svelte` components, runes-first
- README is the author documentation (short). Install for authors first; a Developers section for clone and tests.
