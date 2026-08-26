# Alumna changelog

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
