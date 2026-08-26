# Alumna changelog

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
