
# Principles

## For humans

Alumna aims to give simplicity back to front-end work. “For humans” here means the product is easy to understand and to use. It does not mean “not for AI.”

For many years, front-end work grew a long list of extra steps, tools, and concepts. Those ideas are now mature enough to **automate**. We do not have to go back to an old, weaker stack just to feel simple again. We can keep the progress - bundling, tree-shaking, minify, code splitting, lazy loading, live reload, SPA, SSG, hydration - and hide the machinery.

Alumna is that path: **one opinionated executable**. Authors do not collect a dozen libraries and CLIs. They run one binary that does the work. The opinions are taken with care, with attention to detail, and with efficiency and performance first, not last.

[Alumna](https://github.com/alumna/alumna) is that golden path for the front end. [Alumna Backend](https://github.com/alumna/backend) follows the same idea for the server. The two projects are independent. They are complementary.

## Why a route file, not a folder tree

The idea that still defines Alumna was stated in 2018 as Altiva, in [sveltejs/svelte#1267](https://github.com/sveltejs/svelte/issues/1267):

```js
app.areas = [ 'menu', 'submenu', 'breadcrumb', 'content', 'footer' ];

app.route[ '/' ] = {
	menu: 'MainMenu',
	content: 'Feed',
	footer: 'Footer'
};
```

Three consequences, still true:

1. **The app structure is known up front.** Alumna can build a shell that already knows every area and every route. No directory walk is required to discover routes.
2. **The same component can occupy the same area on many routes without remounting.** If `/` and `/feed` both say `menu: 'MainMenu'`, `MainMenu` stays mounted.
3. **A route only loads what it needs.** First navigation is small, selectively loading just the needed components for the route. Later navigations fetch the difference (only the components not cached yet). After everything has been seen, navigation is instant.

SvelteKit solved “shared chrome” with nested layouts, **still from the filesystem**. Alumna’s differentiator remains: **a route definition file, not a directory tree.**

Alumna is not a SvelteKit competitor on completeness. It is a different product: a human-friendly compiler and runtime that produces Svelte apps.

| | SvelteKit | Alumna |
| --- | --- | --- |
| Router | Filesystem (`src/routes`) | `src/app.js` with areas, routes, and named layouts |
| Audience | Full-stack, adapters, many concepts | Authors who want Svelte, not a second framework |
| Bundler | Vite, visible and configurable | Hidden. Alumna picks and runs it |
| Rendering | SSR by default | SPA first, then SSG + hydration. No SSR server in production for v1 |
| Nested chrome | `+layout.svelte` trees | Areas + one-level named layouts |

---

## Locked product choices

4.0 is a new project, inspired by 2.0/3.0, not a port.

**Language and runtime**

- This repo root is Alumna 4.0. Alumna itself is JavaScript. Components are `.svelte` only, runes-first. Cheap `<script lang="ts">` is welcome (Svelte 5 + OXC strip types; no `tsc`). Drop it if the graph gets messy.
- `src/app.js` runs in a VM sandbox. Vocabulary: `app.areas`, `app.route`, `app.group`, comma aliases `'/, /home'`, `:id`, one-level named layouts, snippets as layout areas, sequential default.
- Reserved route keys: `layout`, `middleware`, `redirect`, `data`, `ssg`, `prerender`.
- Omit an area → nothing mounted there.
- Native ESM `import()`, import maps, parallel `deps`. No `eval`, no IIFE, no `Alumna.lib`, no `window.app` / `globalVar`. Public API is `import { goto, route, start } from 'alumna'`. `start({ target })` is for tests and embed; auto-start when the boot script is `/_alumna/runtime.js`.
- Navigation API + History fallback. HTTPS origins. Capacitor-friendly ordinary SPA. No Cordova, no PhoneGap, no `file://` loader.
- Prefetch on hover for known routes.
- CSS: injected in `alumna dev`; external files in `alumna build`; SSG puts links in `<head>`.
- Middlewares: `export default` in `src/middlewares/*.js`, async, `middleware: ['name']` only, run before load. No 2.0 array form. Global `app.middleware` exists.

**Build and config**

- Zero config. Optional `alumna.hjson` only (`port`, `base`, `out`, `title`, `sourcemap`, `ssg`). No `.ts` config.
- `src/static` is copied as-is.
- Pure apps have no `package.json`. `alumna add` creates one. That file is Alumna’s lockfile for **app** libraries. The browser loads hashed `/_alumna/vendor/` chunks, not npm. Vendor is built from **imports in used components**, not from every name in `package.json`. Unused installed packages stay on disk; they are not written under `/_alumna/vendor/`.
- No built-in store. Optional `src/store.svelte.js` with `$state`. Do not generate the file.
- No `alumna.api`. See **`alumna-manifest.json`** below. `alumna rebuild` is the selective SSG primitive (`--route`, `--id`, `--listen`).
- CLI: `new`, `dev`, `build`, `rebuild`, `preview`, `add`, `setup`.

**`alumna-manifest.json`**

This file is written next to the built HTML (`build/alumna-manifest.json` by default). The browser does not load it. It is a snapshot of **that build**, so later tools can update HTML without guessing.

`src/app.js` is the author’s source. The manifest is the compiled truth of what that build actually produced: which routes exist, which URLs received HTML, which components each route needs, and how to find a page again from a content id.

Fields:

- `version` — Alumna version that wrote the build.
- `base` — URL prefix from config.
- `ssg` — whether this build ran the SSG switch.
- `prerender` — concrete URLs that received HTML in this build.
- `lookup` — keys (route pattern and/or concrete path) to the URLs that belong to them. `alumna rebuild --id` uses this. Architect (later, a separate app) can say “this content changed” without listing every URL.
- `areas`, `routes`, `deps` — the compiled route map and the component graph per path, so rebuild can re-render the same pages.

`alumna rebuild` reads this file. It does not walk `src/` to discover which HTML exists. If the file is missing, rebuild asks for `alumna build --ssg` first.

**SSG**

Master switch: `alumna build --ssg` or `alumna.hjson` `ssg: true`. Route fields apply only when that switch is on. A SPA `alumna build` ignores them.

Eligibility (should this pattern ever become HTML?) and expansion (which concrete URLs for a param pattern?) are two jobs. They are not one boolean. No second include/exclude map.

When `--ssg` is on:

| Route | Default |
| --- | --- |
| Static, no **route** `middleware`, not a redirect | SSG |
| Static, has route `middleware: [...]` | SPA only |
| `ssg: false` | SPA only |
| `ssg: true` | SSG even if there is route middleware |
| Param / `*` | SPA only |
| Param + `prerender: [...]` | those concrete pages |
| Redirect | never |

Extra notes:

- `ssg: false` wins over `prerender`.
- `ssg: true` on a param route **without** `prerender` is an error (“say which URLs”).
- Route `middleware` skips SSG unless `ssg: true`. That is the protected `/dash` case: the author already lists `middleware: ['auth']`; Alumna must not emit public HTML for a logged-out shell.
- Global `app.middleware` does **not** skip SSG (analytics and similar).
- Redirects and `/*` never SSG.
- `prerender` is an array of param objects (`{ slug: 'hello' }`), not full paths. It may also be an async function that returns that array (`fetch` in the `app.js` VM, not `fs`).
- Empty `prerender: []` means “this pattern can SSG, but this build writes no pages for it.”
- Output is `{path}/index.html` (for example `/about/index.html`). The client hydrates, then the router takes over (SPA after first paint).
- Route `data()` runs on the server (Node) at build time. JSON becomes the `data` prop and `#alumna-data`. After the first SSG page, `/_alumna/ssg-data.js`.
- `alumna rebuild` updates selected HTML from the manifest (`--route`, `--id`, `--listen`). It does not rewrite JS unless compiled files changed.

**Distribution**

- Authors install **one binary**. npm is not the way to install Alumna anymore. Authors need no Node, Bun, or npm on `PATH` - including for `alumna add`.
- Pipeline: Rolldown-bundle Alumna (Oxc minify inside Rolldown) → `bun build --compile`. Rolldown’s native binding is a first-need cache (`alumna setup` can prefetch). No separate Oxc CLI. `alumna add` spawns the same executable with `BUN_BE_BUN=1` and `add --ignore-scripts`.
- Public files: GitHub Release archives (`.tar.gz` Unix, `.zip` Windows) + `SHA256SUMS`. Install: `curl -fsSL https://alumna.dev/install | bash` and `powershell -c "irm alumna.dev/install.ps1|iex"`. Tag `v*` opens a **draft**; a human publishes. Until stable 4.0.0, do not mark alpha Releases as pre-release.
- npm `@alumna/alumna` was only considered a contingency if bun-compile could not ship, but now it is shipping and working. scriptc or Porffor for AoT compiling the Alumna binary is an optimization planned for later.
- Contributors use **Bun** (`bun install`, `bunx`, `bun src/cli.js`). Node is test-only (Jest) until Jest runs on Bun at 100% four-metric.

**MIT.** Package name is still registered at npm as `@alumna/alumna`, but not used anymore. Maybe we can update it with just a postinstall script to always use the updated official install script. The CLI is `alumna`.

---

## Load-bearing rejections

- No directory router. No author-facing Vite.
- No nested layouts in 4.0.0 (probably never). No cross-layout persistent instances in v1.
- No automated migrator from 2.0/3.0.
- No `alumna install user/repo` marketplace. `alumna add` is registry libraries only.
- Do not revive liven/pulsa as packages; the ideas live inside Alumna’s dev server.
- Do not embed arborist or Orogene. Do not download a second installer.
- Do not treat npm as the Alumna install channel.
- Architect (CMS) is a separate app built *with* Alumna, not inside this binary.
- No Unitflow (as we did in Alumna 3.0).

---

## Docs

| File | Who it is for |
| --- | --- |
| [README.md](README.md) | Authors. Complete product docs. Index at the top. No internals. |
| [CONTRIBUTING.md](CONTRIBUTING.md) | People who work on this repository. |
| [ROADMAP.md](ROADMAP.md) | What is not done yet. |
| This file | Why we still do it this way. |
| [CHANGELOG.md](CHANGELOG.md) | What shipped. |
