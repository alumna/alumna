# Alumna changelog

## Unreleased

- SSG: map `svelte/*` to files from `svelte/package.json` `exports` instead of `require.resolve`, to fix SSG mode.

## 4.0.0-alpha.10 — 2026-08-31

- SSG: `ensure_svelte_root` now correctly extracts the full Svelte tree into the cache, so `alumna build --ssg` doesn't fail with `Cannot resolve "svelte/internal/server"`. 

## 4.0.0-alpha.9 — 2026-08-29

- `route` is reactive in Svelte: reading `route.path` (and the other fields) in a template or `$derived` updates after navigation, so a layout nav that stays mounted can highlight the current page.
- Docs: [LIBRARIES.md](LIBRARIES.md) for `alumna add` beyond the npm registry (versions, aliases, git, tarballs, local folders). README links to it.
- Linux install: choose glibc vs musl from the system libc (`getconf GNU_LIBC_VERSION`), not from whether a `musl` package is installed. Ubuntu/Debian with `musl` next to glibc now get the glibc binary.

## 4.0.0-alpha.8 — 2026-08-27

- Public GitHub compressed binaries for Linux (glibc and musl, x64 and arm64), macOS (x64 and arm64), and Windows (x64 and arm64).
- Install scripts.
- A git tag `v*` starts a draft GitHub Release (eight archives + `SHA256SUMS`).
- Jest 100% four-metric (456 tests).

## 4.0.0-alpha.7 — 2026-08-27

- `alumna dev`: a change to `src/index.html` (title and other shell HTML) shows in the browser without a restart.
- Vendor import map includes SRI (`integrity`) hashes. The runtime URL is hashed too.
- GitHub Actions CI **verified** on PRs: Node 24, Bun 1.4.0, Jest 100% four-metric (439 tests), Codecov coverage and JUnit Test Analytics.
- SSG temp dir includes `"type":"module"` so Node 22–24 can load the server files (GitHub Actions Node 24).
- Jest 100% four-metric (439 tests).

## 4.0.0-alpha.6 — 2026-08-27

- Compiled `alumna` Rolldown cache: relative `@rolldown/pluginutils` imports; native `.node` in `rolldown/dist` and `rolldown/dist/shared`; `.ok` marker `layout-2`.
- Svelte vendor stubs `esm-env`. Svelte-root includes `clsx`.
- Jest 100% four-metric (432 tests).

## 4.0.0-alpha.5 — 2026-08-26

- Route `data()` on the server at build time and in `alumna dev`. JSON result: `data` prop and `#alumna-data`. After the first SSG page, `/_alumna/ssg-data.js`.
- `prerender` may be an async function that returns the param list.
- Author binary: Rolldown-bundle Alumna, then `bun build --compile` (`bun run build:binary` → `dist/alumna`). Scaffold and `svelte/compiler` in the binary. Rolldown on first `dev` / `build`, or `alumna setup`.
- Compiled `alumna add`: `BUN_BE_BUN=1`, `--ignore-scripts`.
- Chromium e2e: `data()` hydrate then a click. Jest 100% four-metric (424 tests).

## 4.0.0-alpha.4 — 2026-08-26

- SSG (Q44): static route, no route middleware → HTML. Route `middleware` → SPA unless `ssg: true`. Global `app.middleware` does not skip. `ssg: false` → SPA. Param routes: `prerender: [{ param: value }, ...]`. Redirects and `/*`: no HTML. `prerender: []`: no pages for that pattern.
- `alumna rebuild --route <path>` / `--id <contentId>` from an existing `build/`. `--listen`: localhost `/notify`. Manifest `lookup` (route paths → URLs). Atomic HTML writes. JS rewrite only when compiled files changed.
- Hydrate sets `route` (including params) before first client paint.
- Chromium e2e: Hello, SSG click-through, param prerender, middleware skip, rebuild extra path.
- Jest 100% four-metric (353 tests).

## 4.0.0-alpha.3 — 2026-08-26

- `alumna build --ssg` and `alumna.hjson` `ssg: true`: prerender static routes (no `:param`, no `*`, no redirects). `build/index.html` (`/`), `build/about/index.html` (`/about`), `build/_alumna/spa.html` (unknown paths). First paint hydrates, then SPA.
- Vendor import map always includes `svelte` (`mount`, `hydrate`).
- `alumna dev`: recompile only the changed used `.svelte` file; compile new children; drop unused; update route `deps` when the child list changes; rebuild vendor only when library or Svelte imports change.
- Chromium e2e: Hello (`alumna dev`); SSG hydrate then click `/about`.
- Tests: unit + integration + Chromium e2e. Contributors: Bun only (`bun.lock`); Playwright Chromium; Rolldown is a contributor `devDependency`.

## 4.0.0-alpha.2 — 2026-08-26

Production-quality SPA slice (Phase 3).

- `alumna add` installs app libraries. Alumna owns `package.json`. Used packages → hashed `/_alumna/vendor/` chunks (Rolldown).
- Tree-shaken Svelte client runtime from used exports.
- Production minify: runtime, match helper, vendor chunks.
- Optional `alumna.hjson`: `port`, `base`, `out`, `title`, `sourcemap`, `ssg`.
- Configurable `base` (subfolder / Capacitor).
- Source maps in `alumna dev`; optional in `alumna build` (`sourcemap: true`).
- Build CSS fetched before mount.
- README: index; binary install; no npm as the Alumna install channel; `/*`; live-reload overlay; hjson output aliases; manifest.
- Distribution (plan): no Node/Bun/npm on `PATH` for authors; Rolldown-bundle + Oxc minify, then bun-compile; `alumna add` via `BUN_BE_BUN=1`; Rolldown on first `dev`/`build`; no separate Oxc CLI.
- Contributors: Bun (`bun install`, `bun src/cli.js`). Node: Jest only.

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
- README: author docs (install first); Developers: clone and tests.
