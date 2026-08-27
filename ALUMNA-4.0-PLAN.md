# Alumna 4.0 — Living Plan

> **Status:** draft 1.19 — 2026-08-27. Decisions locked. **4.0.0-alpha.7** is the current slice. Next conversation: public GitHub binary download URL (CI + Codecov are in). Jest four-metric coverage stays **100%** on `src/**`. Tests cover unit, integration, and Chromium e2e. Contributors use **Bun only**. Docs rules are in §0.5. Coding and text rules are in §0.4.
>
> **Purpose of this file:** source of truth for Alumna 4.0. Implementation follows this file, not chat history. This file also coordinates work across phases until a contributor guide exists.
>
> **How to continue in a new conversation:** *“Read `ALUMNA-4.0-PLAN.md` draft 1.19. Start from §0 (delivery + tests + next work). Follow §0.2 (unit + integration + Chromium e2e), §0.4 coding rules, and §0.5 docs rules. Do not re-litigate the Decision Log unless I ask.”*

Legend used throughout:

| Tag | Meaning |
| --- | --- |
| `[HISTORICAL]` | What previous Alumna versions actually did (verified in source) |
| `[DECIDED]` | Locked (was `[PROPOSED]` / `[RECOMMENDED DEFAULT]` / an answered `[OPEN]`) |
| `[SHIPPED]` | In `4.0.0-alpha.7` on disk, with the caveats listed in §0.1 |
| `[ALTERNATIVE]` | A path we considered and rejected, kept so we do not re-litigate it |
| `[DEFERRED]` | Intentionally not in the first 4.0.0 slice |
| `[OPEN]` | None. All product questions in §12/§15 are answered. |

---

## 0. How this document is supposed to be used

Alumna 4.0 is a from-scratch rebuild, **inspired by** 2.0/3.0, not a port. Every feature is re-decided (Q40). We will not “upgrade 3.0 in place.”

**Repo layout `[SHIPPED Q39]`:** this directory **is** Alumna 4.0.0. There is no `alumna-4.0/` subfolder. The archaeology trees (`alumna-2.0/`, `alumna-3.0/`, `alumna-3.0-feature-build/`) were deleted on 2026-08-26. Historical detail lives in §2 of this file and on GitHub.

**Environment this alpha was built on:** Ubuntu 26.04 LXC, Bun **1.4.0**, Node.js **26.7.0** (Jest). Alumna source is JS. `svelte@5.56.10`. Rolldown **1.2.5** vendors Svelte and app libraries (contributor **devDependency**; authors get a first-need download). Contributors use **Bun only** (`bun install`, `bunx`, `bun src/cli.js`). Commit `bun.lock`. Node is still required to run Jest. **The full suite also needs Playwright Chromium** (`bunx playwright install --with-deps chromium` after `bun install`). See §0.2.

Any later change to product or process must edit this file and append the Decision Log or the revision log. At session end also follow §0.5.

### 0.1 What 4.0.0-alpha.7 already delivered `[SHIPPED]`

Package: `@alumna/alumna@4.0.0-alpha.7`. CLI for contributors: `bun src/cli.js` (bin `alumna`). Authors will install a **single binary**; npm is not the author install channel (README). `bun run build:binary` writes `dist/alumna`.

**Alpha.7:** `alumna dev` re-reads `src/index.html` on a `reload` watch (title and other shell HTML) and then SSE-reloads. Vendor import map includes SRI `integrity` (sha384) for mapped vendor URLs; the served runtime bytes are hashed too. GitHub Actions runs Jest, uploads coverage to Codecov, and uploads JUnit for Test Analytics (`CODECOV_TOKEN`). SSG writes `"type":"module"` in its temp dir so Node 22–24 can `import()` the server files. Public binary URL still waits.

**Alpha.6 cache fix:** a compiled Bun binary cannot resolve npm package names (`@rolldown/pluginutils`, `@rolldown/binding-*`) from Rolldown files on disk. `ensure_rolldown` rewrites those pluginutils imports to relative paths and copies the native `.node` into `rolldown/dist` and `rolldown/dist/shared`. Cache marker `layout-2` in `.ok` so `alumna setup` rebuilds an alpha.5 cache that only had `dist/index.mjs`. The Svelte vendor pass stubs `esm-env`; `clsx` is written next to the cached Svelte files. Authors need a new `dist/alumna`; the alpha.5 binary cannot repair this.

**Commands that run:** `new`, `add`, `setup`, `dev [--port]`, `build`, `build --ssg`, `rebuild --route` / `--id` / `--listen`, `preview`, `--help`, `--version`. `alumna.hjson` `ssg: true` is the same as `--ssg`.

**Author project (scaffold in `scaffold/`):**

```
src/app.js
src/index.html
src/components/Hello.svelte
src/static/
```

**Route language that works today:** `app.areas`, `app.route`, `app.group` (prefix and `group:name`), comma aliases `'/, /home'`, params `:id`, `redirect`, **named layouts** (`app.layout.name = { component, areas }`, `layout: 'name'` on a route), **middlewares** (`export default` in `src/middlewares/*.js`, `middleware: ['auth']`, `app.middleware` global, async, before load). Array middleware form is rejected (Q30). VM sandbox + JSON clone out of the sandbox (Node 26 `deepEqual` is realm-strict).

**Compiler:** route graph from `app.js` → only reachable `.svelte` files → `svelte/compiler` `generate:'client'` (and `generate:'server'` for SSG) → Acorn rewrite of import/export specifiers → per-route `deps` → generated App shell with keyed `$state` areas, PascalCase dynamic tags, snippet props for named layouts, and `$props`/`$derived` so SSG can hydrate then `show()` owns identity. `show({ layout, areas })` only writes changed constructors. Dev CSS **injected**; build CSS **external** (fetched before mount; skipped when a `<link rel="stylesheet">` is already in the page). Unused components are not compiled. Middleware files are copied as ESM to `/middlewares/*.js`. Bare npm imports require `alumna add`; Rolldown emits hashed `/_alumna/vendor/` chunks. Svelte internals are tree-shaken from used `$` / named exports. The vendor import map **always** includes `svelte` (`mount` / `hydrate`) because the runtime imports them; compiled components alone only pull `svelte/internal/client`. Import-map `integrity` is sha384 SRI for those vendor URLs and for the served runtime.

**Runtime (`src/runtime/browser.js`):** `import()` + in-memory constructor cache, `Promise.all` of `deps[pattern]`, Navigation API with History fallback, `<a>` intercept, hover prefetch (`mouseover`), `goto` / `redirect` / `prefetch` / `route` object (`path`, `pattern`, `params`, `query`, `layout`). Public API vs boot: `start({ target })` and `boot_runtime(import.meta.url)` (auto-start only when the script URL is `/_alumna/runtime.js`). Middleware chain before load. SSE live reload only when `config.dev` is true. `config.base` prefixes asset URLs and is stripped for route match. If `<body>` has `data-alumna-ssg`, the boot uses `hydrate()` with the current route’s constructors after `load_all`; otherwise `mount()`. Then the existing `show_url` / SPA router.

**Dev server:** in-process `node:http`, memory overlay, SPA fallback, `src/static` pass-through, `fs.watch` with the §17.3 table (`classify_watch`: ignore unused `.svelte` and new dirs; reload static/html; **update** a used `.svelte` with `update_components`; full `recompile` for `app.js` / middlewares / other files). A used `.svelte` change recompiles that module only. New children are compiled. Unreachable children are dropped. Route `deps` update when the child list changes. Vendor chunks rebuild only when library or Svelte imports change. Compile failure keeps the last good graph and serves an overlay page (`overlay_html`) plus SSE reload. Optional `base` strips the prefix before lookup. Preview of an SSG build uses directory index (`/about` → `about/index.html`) and falls back to `_alumna/spa.html` for unknown HTML paths. A change to `src/index.html` re-injects the shell and reloads.

**Svelte / library vendor:** Rolldown (Alumna dependency). First-run Bun for Svelte vendor is **gone**. Production minify of runtime, `match.js`, and vendor chunks. Hashed vendor filenames. Source maps in dev; optional in build (`sourcemap` in hjson).

**Config:** optional `alumna.hjson` (`port`, `base`, `out`/`build`/`build_dir`, `title`, `sourcemap`, `ssg`). `--port` overrides `port`. `--port` busy is an error; hjson `port` busy auto-picks.

**Build output:**

```
build/
  index.html                 # SPA shell, or prerendered / when SSG
  about/index.html           # SSG only (Q36)
  alumna-manifest.json       # areas, routes, deps, base, ssg, prerender, lookup
  components/*.js + *.css
  _alumna/app.js
  _alumna/config.js
  _alumna/runtime.js
  _alumna/match.js
  _alumna/spa.html           # SSG only: empty SPA shell for unknown paths
  _alumna/ssg-data.js        # SSG only: JSON map of path → data()
  _alumna/vendor/            # hashed Svelte (including svelte + internals) + app libraries
  <src/static copied first, generated files overwrite>
```

SSG (`alumna build --ssg` or `ssg: true`): Q44 table. Static path with no route middleware → HTML. Route `middleware` skips unless `ssg: true`. Global `app.middleware` does not skip. `ssg: false` always SPA. Param + `prerender` (array or async function that returns that array) → those URLs. Redirects and `/*` never. Empty `prerender: []` writes no pages for that pattern. Server compile to a temp dir (`generate:'server'`) with `"type":"module"` so Node can `import()` the files, `svelte/server` `render()`, then delete the temp dir. HTML has CSS links, modulepreload, import map, runtime boot, `data-alumna-ssg` on `<body>`, SSR body, and optional `#alumna-data`. Hydrate sets `route` (including params) before the first client paint. Route `data()` (Q25) runs on the server at build time; JSON is passed as the `data` prop. `alumna rebuild --route` / `--id` / `--listen` is the Phase 5 primitive (`alumna build --route` is not a separate command).

**Source tree (actual):**

```
src/cli.js
src/cli/run.js                # parse argv, help, boot
src/alumna.js                 # Alumna class: new/add/setup/dev/build/rebuild/preview
src/add/install.js            # alumna add
src/build/write.js            # SPA emit + atomic_write
src/build/manifest.js         # alumna-manifest.json + lookup
src/build/rebuild.js          # alumna rebuild
src/build/notify.js           # localhost /notify
src/config/hjson.js           # alumna.hjson reader
src/config/load.js
src/compile/read-app.js       # vm.runInNewContext + clone (keeps data/prerender functions)
src/compile/validate.js       # routes, layouts, middleware names, ssg, prerender, data
src/compile/data.js           # data() call, timeout, ssg-data.js helpers
src/compile/match.js          # shared with the browser via /_alumna/match.js
src/compile/pattern.js        # :params, fill pattern, concrete paths
src/compile/graph.js
src/compile/svelte.js
src/compile/ssg.js            # server compile, per-route HTML, data()
src/compile/ssg-targets.js    # Q44 eligibility + prerender expansion (array or function)
src/compile/rewrite.js        # Acorn walk of import/export specifiers + used exports
src/compile/shell.js          # sequential + snippet layouts; data prop
src/compile/project.js        # compile_project + update_components (used .svelte only)
src/compile/vendor.js         # Rolldown: svelte tree-shake + app libraries + minify
src/compile/rolldown-load.js  # first-need Rolldown cache (dynamic import)
src/pack/assets.js            # disk vs inlined scaffold, runtime, Svelte files
src/pack/data.js              # live_data stub; release inlines strings here
src/release/collect.js        # binary asset collect + Rolldown externals
src/runtime/browser.js        # loader, router, middleware, start(), hydrate, data()
src/dev/server.js
src/dev/watch.js              # watch + classify_watch (§17.3) + changed_used_ids
src/dev/overlay.js            # compile error page
src/dev/html.js
src/dev/defaults.js
src/dev/mime.js
src/new/copy.js
src/utils/paths.js
src/utils/base.js             # Q35 base path
src/utils/bin.js              # find_bun for alumna add
src/utils/cache.js            # ALUMNA_CACHE / XDG / ~/.cache/alumna
src/utils/tgz.js              # npm tarball extract
src/utils/platform.js         # Rolldown native package name
src/utils/sri.js              # import-map SRI (sha384)
src/utils/embedded.js         # bun compile / $bunfs
scripts/build-binary.js       # Rolldown-bundle Alumna, then bun compile
.github/workflows/ci.yml      # Jest + Codecov coverage and JUnit on PRs
codecov.yml                   # 100% project and patch target
scaffold/
test/**/*.test.js             # Jest, 100% four-metric on src/**; Playwright Chromium e2e in test/e2e/
```

**Verified in this session:** Jest **100%** statements/branches/functions/lines on `src/**` (439 tests; 2721 / 2032 / 369 / 2644). Chromium e2e: Hello via `alumna dev` (import-map `integrity` present); `src/index.html` title live reload; SSG hydrate then SPA click; Q44 param prerender (`/blog/hello`), middleware skip (`/dash`), rebuild of an extra path (`/blog/world`); `data()` hydrate then click. Used `.svelte` watch path recompiles that module only (`update_components`). `bun run build:binary` writes `dist/alumna`; `--help` / `--version` / `new` / `setup` smoke on that file. GitHub Actions workflow is in `.github/workflows/ci.yml`.

**Explicitly not in this slice:**

| Planned item | Status |
| --- | --- |
| Named layouts + snippets (Q12–Q14) | **Shipped** (one level) |
| Middleware execution (Q23, Q30) | **Shipped** (before load, async, `export default`) |
| `alumna.hjson` (Q22) | **Shipped** (`port`, `base`, `out`, `title`, `sourcemap`, `ssg`) |
| `alumna add` + app `package.json` (Q21) | **Shipped** |
| Rolldown/OXC, minify, hashed vendor chunks | **Shipped** (Rolldown minify = Oxc; first-need Rolldown download **shipped** in alpha.5) |
| Configurable `base` (Q35) | **Shipped** |
| Source maps | **Shipped** (dev on; build via hjson) |
| `alumna.start({ target })` (Q40a) | **Shipped** (`start({ target })` + `boot_runtime`) |
| Error overlay in the browser | **Shipped** (`overlay_html` on compile fail) |
| Selective `on_event` recompile | **Shipped** (`classify_watch` + per-module `update_components`) |
| Import-map integrity | **Shipped** (sha384 SRI on vendor URLs + runtime) |
| Public GitHub binary download | CI + Codecov **shipped**. Public URL not started. Next conversation. |
| `src/index.html` live reload in `alumna dev` | **Shipped** |
| SSG first slice (static paths, hydrate then SPA) | **Shipped** (`4.0.0-alpha.3`) |
| Q44 route `ssg` / `prerender` (middleware skip, param lists) | **Shipped** (`4.0.0-alpha.4`) |
| `alumna rebuild` + manifest `lookup` + atomic HTML writes | **Shipped** (`4.0.0-alpha.4`) |
| `data()` | **Shipped** (Q25: server `data()`, JSON props, `#alumna-data`, `/_alumna/ssg-data.js`, dev `/_alumna/data`) |
| bun compile binary / npm publish | **Shipped** (`bun run build:binary` → `dist/alumna`). Public GitHub download: next conversation (CI + Codecov are in). npm `@alumna/alumna` stays the contingency. |
| Jest + coverage | **Shipped** (100% four-metric gate on current `src/`) |
| Chromium e2e | **Shipped** (Hello + SSG click-through + Q44 prerender + rebuild + `index.html` reload) |

**Known debt to fix, not copy forward:**

1. ~~`rewrite.js` regex~~ **Done.** Acorn parse + specifier walk (`ranges: true`).
2. ~~Dev watch recompiles everything~~ **Done.** `classify_watch` follows §17.3. A used `.svelte` change calls `update_components`: recompile that module; compile new children; drop unreachable children; refresh route `deps`; rebundle vendor only when library or Svelte imports change.
3. ~~Layout remount identity (S0)~~ **Done.** Proven; named layouts ship snippets.
4. ~~Import map `'alumna'` auto-start~~ **Done.** `should_auto_start` / `boot_runtime`; `start({ target })` is public.
5. ~~Bun required for Svelte vendor~~ **Done.** Rolldown vendors Svelte. `find_bun` remains only as a helper for `alumna add` if Bun is on the machine.
6. Sequential area tags must be PascalCase (`<Nav />`, not `<nav />`) so Svelte treats them as components. Fixed in `ident_from`.
7. ~~`src/index.html` in `alumna dev`.~~ **Done.** A change re-injects the shell and SSE-reloads.

### 0.2 Testing policy — Jest + 100% four-metric coverage `[DECIDED 2026-08-26]`

Alpha.1 tests started as `node:test` on `src/compile/*` only. **That is done.** Jest is the runner. Four-metric `coverageThreshold` is **on** at 100%.

**From the next conversation on:** keep the gate. New `src/` code does not land without tests that keep statements, branches, functions, and lines at 100%. Also keep both test directions in §0.2 item 9 (unit + integration / Chromium e2e).

1. **Jest** is the test runner. The author needs its coverage report — not a line-only summary. We will report **statements, branches (logic), functions, and lines**, all four, on every test run.
2. **100% on all four metrics** is the merge gate. Phase 1 + Phase 2 + Jest are in. SSG, Architect, and bun-compile (Phases 4–6) land after, still under 100%.
3. Every session that touches `src/` **prints the four-metric report.** New code does not land below 100%.
4. **Alumna is ESM** (`"type": "module"`). Follow the 3.0 pattern that already worked: Jest with `--experimental-vm-modules`, `"transform": {}` (native ESM, no Babel), `testEnvironment: "node"` by default, **`jsdom` for `src/runtime/browser.js`**.
5. `collectCoverageFrom`: `src/**/*.js`. **Exclude** `scaffold/`, `vendor/`, generated `build/`. Do not game coverage with `/* istanbul ignore */` except for a one-line platform stub that cannot run in CI.
6. Scripts (installed):

```json
"scripts": {
  "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage",
  "test:watch": "node --experimental-vm-modules node_modules/jest/bin/jest.js --watch",
  "cli": "bun src/cli.js"
}
```

Contributors run `bun install`, `bun src/cli.js`, `bun run test`. **`bun run test` still starts Node+Jest.** Verified 2026-08-26 on Bun 1.4.0: `bun --bun jest` fails (Web Streams vs `jest-environment-node`; jsdom worker SIGSEGV; coverage ~88%). `bun test` (bun:test) coverage is only funcs+lines, not the four-metric gate. Keep Jest on Node until one of those is fixed. See Q43.

```js
// jest.config.js (sketch)
export default {
  testEnvironment: 'node',
  transform: {},
  collectCoverageFrom: ['src/**/*.js'],
  coverageDirectory: './coverage/',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: { statements: 100, branches: 100, functions: 100, lines: 100 }
  },
  reporters: [
    'default',
    [ 'jest-junit', { outputDirectory: './junit', outputName: 'junit.xml' } ]
  ]
};
```

Turn the 100% `coverageThreshold` **on once the Jest port covers the existing alpha.1 surface**, not at 0. **Done in draft 1.4.** Keep it on.

7. **What to test, by layer** (all required for 100%):

| Layer | How |
| --- | --- |
| `compile/*` | Port the 21 node:test cases to Jest; add missing branches (empty group, invalid middleware type, `/*` 404, rewrite of `svelte/*` vs `./x.svelte` vs bare npm specifier) |
| `cli.js` | argv matrix: help, version, unknown flag, new/add/dev/build/preview, missing project |
| `new/copy.js` | empty dir, `.`, invalid name, non-empty dest |
| `dev/server.js` | ephemeral port, memory hit, static hit, SPA fallback, 404, SSE, HEAD for CSS |
| `compile/vendor.js` | Rolldown: Svelte tree-shake, app libraries, minify, hashed chunks |
| `add/install.js` | create `package.json`; bun add else npm install; invalid names |
| `config/*` | hjson parse; `port` / `base` / `out` / `title` / `sourcemap` / `ssg` |
| `utils/base.js` | normalize, prefix, strip |
| `alumna.js` | compile errors print and return false; build writes the tree; preview refuses missing `build/` |
| `runtime/browser.js` | jsdom: match, load cache, goto History path, click intercept, prefetch, redirect |

8. 2.0’s `test/generators/maincode` cases remain the **route-language spec**. Port any still-missing cases into Jest (`validate.test.js`).

9. **Both directions** `[DECIDED 2026-08-26]`. Every session that adds or changes behavior must keep **both**:
   - **Bottom-up (unit):** one function or module at a time (`compile/*`, `match.js`, `classify_watch`, …).
   - **Top-down:** integration of the real CLI, HTTP server, compiler, and Rolldown; and **real-browser e2e** (Playwright + Chromium) for author-visible flows (Hello, click, navigation, live reload, overlay).
   
   jsdom is not a real browser. It is fine for unit tests of `runtime/browser.js`. It does not replace Chromium.
   
   100% four-metric coverage stays. Browser tests do not replace unit tests. Pure helpers need unit tests. Author-visible runtime and UI also need integration, and Chromium when a real page is involved.
   
   **Today:** unit tests, integration tests (CLI, `alumna dev` HTTP, real Rolldown, `alumna rebuild`, `alumna setup` cache), and Chromium e2e (Hello, SSG, Q44 prerender, rebuild, `data()`, `index.html` reload) are in. Keep Chromium e2e for every later author-visible change.

10. **Contributor machine for the full suite:** Bun (CLI and package manager), Node (Jest only), Playwright Chromium (e2e). Order: `bun install`, then `bunx playwright install --with-deps chromium` once (apt/sudo for OS libraries). `@playwright/test` is already a devDependency; `bunx` runs that local CLI. Do not use `npx`. Firefox is optional. Headless Chromium is enough (no display). See README Developers.

### 0.3 What the next conversation should do (ordered)

Do **not** restart archaeology. Do **not** re-ask Q1–Q44. Do **not** re-do S0; the spike passed. Do **not** re-do Phase 3. Do **not** re-do used-`.svelte` incremental compile. Do **not** re-do SSG (first slice or Q44). Do **not** re-do Phase 5 rebuild. Do **not** re-do Phase 6 or `data()` (Q25). Do **not** re-do `src/index.html` live reload, import-map integrity, or GitHub Actions CI + Codecov. Do **not** start Architect or HMR unless asked.

1. **Public GitHub binary download.** CI + Codecov are in. Publish a public download URL for `dist/alumna`. Do not treat npm as the author install channel.
2. Keep Chromium e2e in the suite for every author-visible change (Hello, navigation, SSG, overlay, rebuild, `data()`, `index.html` reload).
3. At the end of the session, follow §0.5 (plan + changelog always; README when authors or contributors need a change). Keep Jest 100%. Cover both test directions (§0.2). Do not commit or push unless the author asks.

### 0.4 Coding and text rules `[DECIDED 2026-08-26]`

Follow these in every session. Alumna 4.0 is a new project. There is no retro-compatibility.

**Comments in code**

- Do not remove comments from unchanged code.
- When you change code that has comments, keep the comments and update them so they stay true.
- Add comments on new complex code.
- Add comments on existing complex code that has no comments.

**Text that is not code**

- Comments, README, CHANGELOG, this plan, PR text, Release text, and commit messages use very simple English (ASD-STE style). Prefer one simple phrase when that is clearer than several short ones.

**Simplicity**

- New code must be easy to read and simple. Efficiency and performance always come first.
- Use easy names for methods and variables.
- On existing code you change, follow this rule when you can, and without breaking code that depends on it.

**Freedom to refactor**

- 4.0 is from scratch. Improve anything you touch: simplicity, organization, performance, efficiency, readability.

**Performance**

- On every new or changed file, prefer faster code, less work, and fewer allocations. Use zero-allocation patterns when they are possible and still simple.

**File and method size**

- When a file is too long, split it. Add a new folder only when no current folder is the right place.
- When a method is too long or too complex, split it. Do not lose efficiency or performance.

**Repetition**

- When the same logic appears in more than one place, unify it if that is simpler. The shared code does not have to live in the same file.

**Tests** `[DECIDED 2026-08-26]`

- In every session, keep both directions from §0.2: unit tests (bottom-up) and integration / real-browser e2e (top-down).
- 100% four-metric coverage stays. jsdom is not a real browser.

**Package manager** `[DECIDED 2026-08-26]`

- Contributors use **Bun only**: `bun install`, `bunx`, `bun src/cli.js`. Do not use npm, yarn, or pnpm to install this repo.
- Commit `bun.lock`. Ignore npm / yarn / pnpm lockfiles.
- Use `bunx`, not `npx`.
- Node is only for Jest (`bun run test` starts Node).
- Rolldown is a **devDependency**. Contributors get it from `bun install`. The author binary must **not** embed Rolldown’s native binding (dynamic import from a first-need cache). Moving it to `devDependencies` does not by itself stop `bun build --compile` from bundling a static `import 'rolldown'`. `src/compile/vendor.js` uses `load_rolldown()`.

**Git**

- Do not commit or push unless the author asks.

### 0.5 Docs `[DECIDED 2026-08-26]`

**At the end of every work session**

- Always update this plan (`ALUMNA-4.0-PLAN.md`): status, what shipped, tree, next work, Decision Log / revision log when they change.
- Always update `CHANGELOG.md` (what authors and we should remember from this session: product first, then a short docs/process line if that is all that changed).
- Update `README.md` when authors need it: a new command, language, install step, a false fact, or a feature that must be in the complete author docs. Do not put internals in README “because we worked.”

**README.md is the documentation** `[DECIDED 2026-08-26]`

- README is the **whole** documentation. There is no docs site and no extra author guide.
- README is **complete**: newcomers and advanced users can work from this file alone. Comprehensive in *what* it covers, not in how it talks.
- Writing style: **concise, objective, straight to the point.** Simple English (§0.4). No filler.
- README **always has an index** at the top (section names and anchors).
- **Do not document npm as the way to install Alumna.** Alumna is a **single binary**. Authors do not need npm, Node, or Bun on `PATH` — not to run Alumna, and not for `alumna add`. `alumna add` talks to the npm registry for *app libraries*. That is not how you install Alumna. First `dev`/`build` may download Rolldown once. The Alumna binary already contains Bun’s installer (`BUN_BE_BUN=1`). See §3.5.
- README has **two install blocks**:
  - **Authors** (main, first): install the Alumna binary and start an app.
  - **Developers / contributors** (later): clone this repo, **Bun only** (`bun install`, `bunx`, `bun src/cli.js`). Node is still required to run Jest. That is not the author install path.
- README must not contain information that authors do not need (internals, phase lists, Jest policy, archaeology).
- A real contributor guide will come later. Until then, **this plan file** coordinates our work and its phases. Do not put that coordination into README.

---

## 1. Why Alumna exists (and why it is not SvelteKit)

### 1.1 The one-sentence product

Alumna is a **highly opinionated, single-binary-feeling meta-framework** that lets a person create a Svelte app without learning bundlers, file-based routers, adapters, or framework-specific lifecycle files. Alumna hides the machinery. The author writes routes, components, and (optionally) middlewares. Alumna does the rest.

### 1.2 The founding insight (2018)

In [sveltejs/svelte#1267](https://github.com/sveltejs/svelte/issues/1267) (opened as Altiva, 21 Mar 2018) you stated the idea that still defines Alumna:

```js
app.areas = [ 'menu', 'submenu', 'breadcrumb', 'content', 'footer' ];

app.route[ '/login' ] = {
    content: 'Login'
};

app.route[ '/' ] = {
    menu: 'MainMenu',
    content: 'Feed',
    footer: 'Footer'
};
```

Three consequences of this model, all still true:

1. **The app structure is known up front.** Alumna can generate a main shell that already knows every area and every route. No directory walk is required to discover routes.
2. **The same component can occupy the same area on many routes, without duplication and without remounting.** Directory routers make this awkward (you either copy the component, extract a layout, or invent named slots around filesystem conventions). Alumna makes it the default: if `/` and `/feed` both say `menu: 'MainMenu'`, `MainMenu` stays mounted.
3. **A route only loads the components it needs.** Combined with a client cache, first navigation is small, later navigations only fetch the difference, and once everything has been seen, navigation is instant.

Rich Harris’s reply (21 Apr 2018) was that multiple similar projects trying different ideas is healthy, and that *route transitions that keep shared regions alive* was something Sapper still needed to figure out ([sapper#157](https://github.com/sveltejs/sapper/issues/157)). SvelteKit later solved “shared chrome” with nested layouts, but **still from the filesystem**. Alumna’s differentiator remains: **a route definition file, not a directory tree.**

### 1.3 Positioning versus SvelteKit (4.0)

| | SvelteKit | Alumna 4.0 |
| --- | --- | --- |
| Router | Filesystem (`src/routes`) | `src/app.js` (or successor) with `app.areas` / `app.route` / layouts |
| Audience | Full-stack, adapters, hooks, many concepts | Authors who want Svelte, not a second framework |
| Bundler | Vite, visible and configurable | Hidden. Alumna picks and runs it |
| Rendering | SSR by default, adapters for deploy | SPA first, then SSG + hydration. No SSR server in production for v1 |
| Code splitting | File-route based | Route-definition based, on-demand ESM |
| Nested chrome | `+layout.svelte` trees | Areas + (new) named layouts |
| Complexity budget | High, powerful | Extreme simplicity, opinionated defaults |

Alumna is **not** a SvelteKit competitor on completeness. It is a different product: a human-friendly compiler+runtime that produces Svelte apps.

### 1.4 Non-goals for 4.0.0 `[DEFERRED]` — accepted as deferred

- Being a full-stack framework (server endpoints, form actions, databases).
- Replacing SvelteKit for people who want SvelteKit.
- Shipping a CMS. That is **Alumna Architect**, a higher-level project.
- Running SSR on the public origin. Production frontends are static files (SPA or SSG), optionally regenerated.
- A plugin ecosystem, virtual file routes, or “bring your own bundler.”
- Pixel-perfect backward compatibility with Altiva 2 / Alumna 3 apps. A migration guide later is enough.

---

## 2. Archaeology — what the previous versions actually were

This section is long on purpose. 4.0 should steal the parts that worked and drop the parts that were workarounds for 2018 browsers.

### 2.1 Timeline

| Era | Name | UI library | State of the repo in this workspace |
| --- | --- | --- | --- |
| ~2016 | Altiva 1.0 / 1.5 | RactiveJS (Rich Harris) | Not present here (GitHub `altiva/altiva/tree/1.5`) |
| 2018 | Altiva 2.0 | Svelte 1 → 2 (`svelte@^2.15.2`) | `alumna-2.0/` — complete, production-used, well tested |
| 2019-04-16 | Rename to Alumna | — | Recorded in 3.0 CHANGELOG |
| ~2019–2023 | Alumna 3.0 alpha | Svelte 3 then 4 (`svelte@^4.2.8`) | `alumna-3.0/` — incomplete rewrite (dev only) |
| ~2023–2024 | Alumna 3.0.1-alpha4 | Svelte 4.2.9 + bundled esbuild | `alumna-3.0-feature-build/` — incomplete `build` flow |

You shipped real production apps on 2.0. 3.0 never reached that bar. 4.0 is a new 2.0 in spirit: complete, opinionated, boringly reliable — on Svelte 5.

### 2.2 Alumna 2.0 / Altiva — the production system `[HISTORICAL]`

**Package:** `@altiva/altiva@2.0.22` (2018-11-06). CLI: `altiva`.

**Commands:** `altiva new <dir>`, `altiva dev`, `altiva build` (`-p/--preview`, `-u/--uncompressed`), `altiva install` / `update` for the unfinished modules system.

**User project shape:**

```
├ altiva.hjson
├ src
│ ├ components/          # *.html Svelte components
│ ├ app.js               # routes
│ └ index.html
├ middlewares/           # optional route filters
├ modules/               # optional bundled libraries
├ dev/                   # generated, live-reload
└ build/                 # generated, minified
```

**Config (`altiva.hjson`)** was a real control surface:

- `app.autoStart`, `app.filename`, `app.globalVar` (default `"app"`), `app.useStore`
- `build.smallComponents` (share Svelte helpers from the main file — the 2018 tree-shaking story)
- `build.deleteComponents`, `build.deleteFiles`
- `componentVersioning` — **present in hjson, never read in source**
- `middlewares: { name: "path/of/file" }`
- `modules: { ... }` filled by `altiva install <github_author/repo>`
- On every `dev`/`build`/`install`, `updateOptions.js` **round-trip-merged the latest base hjson into the project file** (kept comments, added new keys). Friendly for upgrades; surprising if you deleted a key on purpose.

**Route language (the contract, proven by 33 generator tests):**

```js
app.areas = [ 'content', 'footer' ];

app.route[ '/' ] = {
  content: 'HelloAltiva',
  footer: 'Footer1'
};

app.route[ '/other' ] = {
  content: 'HelloAltiva',      // same component, same area → stays mounted
  footer: 'Footer2'
};

// comma-separated aliases share one definition
app.route[ '/, /test' ] = { content: 'HelloAltiva' };

// groups: path prefix, or named `group:public`
app.group[ '/base' ] = {
  '/path1, /path2': { content: 'ReusedComponent' }
};

// middlewares: array form [ areaMap, ...middlewareNames ]
app.route[ '/:number' ] = [{ content: 'HelloAltiva' }, 'first', 'second'];
```

`app.js` was **not parsed as an AST**. It was executed in a Node `vm.runInNewContext` sandbox whose only global was `app = { areas, route, group, store }`. Syntax errors were reported with a line number extracted from the VM stack. This is clever, friendly, and slightly cursed — it is also how 3.0 still did it.

**Generated shell (the 2.0 “main app”):** Alumna compiled a synthetic Svelte component whose template was a sequence of `{#if _route == '...'}` blocks, **one block per area, in `app.areas` order**. Case 9 from the tests is the canonical picture of the “keep shared regions” trick:

```html
<!-- Area: "content" -->
{#if _route == '/' || _route == '/other' }
  <HelloAltiva/>
{/if}

<!-- Area: "footer" -->
{#if _route == '/' }
  <Footer1/>
{:elseif _route == '/other' }
  <Footer2/>
{/if}
```

`HelloAltiva` is **not** torn down when navigating `/` → `/other`. Only the footer swaps. That is the whole point. It is also why layouts were missing: areas are **siblings in document order**, not regions inside a visual shell. CSS can paper over this for simple cases. A dashboard with a persistent left sidebar and a right column that itself has header+content cannot be expressed as “areas are just stacked.”

**Route functions generated for on-demand load:**

```js
Altiva.routes[ '/' ] = function () {
  return Promise.all([ Altiva.load('HelloAltiva'), Altiva.load('Footer1') ]);
};
// identical load sets are aliased to save bytes
Altiva.routes[ '/test' ] = Altiva.routes[ '/' ];
```

Subcomponents were walked from a `componentsMap` and added to the same `Promise.all`, so a route fetched its deep tree in parallel.

**Client runtime (`src/browser/browser.js`):**

- Router: **page.js** (fork `github:altiva/page.js#master`).
- Component load: `XMLHttpRequest` GET `/components/{name}.js`, then

  ```js
  Altiva.component[url] = new Function('return ' + request.responseText)();
  ```

  That is the “safer than `eval`” IIFE runner. Compiled components were wrapped as:

  ```js
  (function () { "use strict";
    // svelte output, with `import { … } from "svelte/shared.js"` rewritten to
    // `var x = Altiva.shared.x;`
    return ComponentName;
  }())
  ```

- Cache: `if (Altiva.component[url]) resolve(true)` — in-memory only, for the life of the page.
- Mobile / `file:` : `configBaseUrl()` rewrote the load prefix from the current pathname; page.js was started with `{ dispatch: false }` then `page(initial)`.
- Middlewares: on first hit of a route, a chain of functions was built (last = render). Subsequent hits reused the chain. Each middleware was `fn.call(Altiva.root, context, next)` with a cloned `{ current, next }` context (`_route`, `_path`, `_params`).
- Redirect: `Altiva.redirect(path)` → `page.redirect`.
- Store: optional Svelte 2 `Store`, with route context written into it.
- HTTP helper: vendored **fetchival**.
- Global: `window[globalVar] = Altiva.root` (default `window.app`).

**Dev mode:** compile every `src/components/**/*.html` to `dev/components/**/*.js` (Svelte `format: 'eval'`), generate `dev/app.js`, rsync non-component src files, **browser-sync** on port 3030 with `connect-history-api-fallback`. Watcher (chokidar): if a component’s *subcomponent list* changed, regenerate the main app; otherwise just reload. Assets used `rsyncwrapper` (later you built `reflect` as a pure-JS rsync, then dropped it when you decided on a single static folder).

**Build mode:** Svelte `format: 'es'` + `shared` helpers + Terser, output `build/`. `--preview` served `build/` on port 4040.

**Dynamic routes and identity (easy to get wrong in 4.0):** `/:number` is passed through as a **page.js pattern string**. The generator treats that string as the route key. At runtime `_route` is the **pattern** (`'/:number'`), not the concrete path (`'/99'`). `{#if _route == '/:number'}` therefore keeps one area map for every concrete URL that matches. Params live in `_params`. **Query strings were not copied into the store at all** — components that needed `?foo=` had to parse `location.search` themselves.

**Nested components in 2.0 were not normal Svelte imports.** Authors had to write:

```js
export default {
  components: {
    Test: Altiva.component['Test'],
    'Sub/Child': Altiva.component['Sub/Child']
  }
}
```

Svelte 2 then emitted `var Test = Altiva.component['Test']; new Test(...)`. The generator **deleted the `var Test =` line** and rewrote `new Test(` → `new Altiva.component['Test'](` so instantiations always hit the **live cache** (children are fetched async, possibly after the parent constructor ran). Directory names became tags with slashes flattened: `Login/Modal` → `<Login_Modal/>`. This is the convention 3.0 still expected (`Al.component['Name']` in the instance script). **4.0 must not ask authors to do this.** The compiler graphs real Svelte imports instead.

**404:** none. Unmatched URLs were whatever page.js did (blank). Advertised JWT, sockets, “easy route filters,” and mobile packaging were README promises, not code. `docs/routes.md`, `docs/methods.md`, `docs/template.md` are empty stubs — the **test suite is the documentation**.

**CLI marketing vs reality:** comments and help text claim build does “tree-shaking and inlining JS/CSS into `index.html`.” It did **not**. Every `src/components/**/*.html` was compiled even if unused (3.0’s route-graph compile is the fix). Terser used `{ compress: { negate_iife: false, side_effects: false } }` **because** the `new Function('return ' + iife)` loader required the IIFE to still return the constructor.

**Bugs not to port:**

- `rsyncAssets` in build used `options.build.smallComponents` where it meant `deleteFiles`.
- App generator called `showError(..., path, true)` with `path` undefined.
- `componentVersioning` and sandbox `app.store` were dead.
- `altiva update` was the same function as `install`.
- `generate_html` always appended `{/if}` even if no `{#if}` opened (empty-area edge).
- Middleware context was `JSON.parse(JSON.stringify(...))` — Functions/Dates dropped; `current` is `null` on the first navigation.
- `connect-history-api-fallback` was a devDependency required at runtime, only saved because Rollup bundled it into `cli.js`.

**What 2.0 did exceptionally well:** the route language, the “don’t remount shared areas” generator, parallel on-demand loads, middleware chains, Cordova/`file:` awareness, and a test suite that *is* the spec (`test/generators/maincode.test.js` cases 1–33).

### 2.3 Alumna 3.0 — incomplete Svelte 4 rewrite `[HISTORICAL]`

**Package:** `@alumna/alumna@3.0.1-alpha`. `"type": "module"`. CLI: `alumna`. Svelte **4.2.8**. Router library: **navaid**. Live reload: **@alumna/liven**. Orchestration: **@alumna/unitflow**. Copy: **@alumna/reflect**.

**You have already decided, for 4.0, not to keep Unitflow as the way libraries are organized.** 3.0 is the existence proof of that approach: `src/alumna.js` is a class that registers units and flows. It is readable, but the indirection (every function is `(state, next, end)`) tax is real, and several units were never written.

**What 3.0 finished:**

- `alumna new` (copy `other/base` via reflect, empty-dir checks).
- `alumna dev` pipeline: read `src/app.js` → VM-eval routes → validate `app.areas` only → start Liven (SPA, in-memory files) → compile each route’s components recursively → generate a tiny App shell → compile it → wrap as IIFE → inject `Al.deps` / `Al.routes` → `server.memory('dev.js', ...)` → watch via `on_event`.
- In-memory component cache: `state.server.memory('components/' + name + '.js', code)`. **No `dev/` directory on disk.** This is a genuine 3.0 improvement over 2.0 (less disk thrash, faster reload).
- Client runtime `Al`:
  - `load(url)` injects a `<script src="{base}{url}.js">` and resolves on `onload`/`onerror`. Cache: `Al.component[url]`.
  - `register()`: for each route in `Al.deps`, `navaid.on(route, async () => { if (Al.areas[route]) return app.show(...); await load_all(deps); add_area(route); app.show(...) })`.
  - Cordova/`file:` still special-cased; `Al.nav.listen(mobile ? '/' : undefined)` — this is *your* navaid PR [#26](https://github.com/lukeed/navaid/pull/26).
- App shell generation (`modules/app/code.js`) replaced 2.0’s `{#if _route}` tree with:

  ```html
  <script>
    let areas = {}
    export const show = function (updated) { areas = updated }
  </script>
  <svelte:component this={areas['header']}/><svelte:component this={areas['content']}/>
  ```

  Then `Al.add_area(route)` built `{ header: Al.component['X'], content: Al.component['Y'] }` and `app.show(...)` assigned it. **This still sequences areas as siblings.** In Svelte 4, `<svelte:component this={ctor}>` remounts when `this` **changes**. Same constructor reference ⇒ instance can survive `areas = updated`. That is a cleaner model than 2.0’s `{#if}` forest **if** the runtime always passes the cached constructor, not a new wrapper. 4.0 must prove this in Svelte 5 (spike S0), including snippets inside layouts — that is the riskier part, not sequential `svelte:component`.
- Compiled components wrapped as:

  ```js
  Al.component['HelloAlumna'] = (function () { "use strict";
    const { ... } = Al.lib;   // rewritten from `import { ... } from "svelte/internal"`
    return Component;
  })();
  ```

  `Al.lib` was the entire `svelte/internal` namespace bundled into `dist/browser.js`.
- Subcomponent discovery: walk the Svelte instance AST looking for `Al.component['Name']`. The fixture `test/modules/components/subcomponents/example.html` shows the **authoring convention 3.0 expected**:

  ```js
  const Component_1 = Al.component['Component_1']
  ```

  Unlike 2.0, **3.0 does not rewrite compiled JS** (`new X(` → `new Al.component['X'](`). It only records deps so those scripts load *before* `show()`. The parent must still read `Al.component['Child']` at runtime. Standard Svelte `import Child from './Child.html'` is **not handled** (`translate_imports` only rewrites `svelte/internal`). 4.0 should let people write normal Svelte, and have Alumna graph those imports itself.
- **navaid params are discarded.** The handler is `async () => { ... app.show(...) }` with no `params` argument. 2.0 put `_params` on the store. This is a 3.0 regression 4.0 must not keep.
- **Script-tag `load` treats failure as success:** `js.onerror = js.onload = () => res(true)`. A 404 component still proceeds to `add_area` / `show`. 4.0’s `import()` must reject and surface the error.
- Incremental rebuild (`on_event`): `app.js` change → `refresh_app` flow; used `.html` component change → recompile that component; if its subcomponent set changed → `refresh_routing`; unused component changes are ignored; deleting a used component errors without refresh.

**What 3.0 did not finish (commented in source as “ALPHA NOTE”):**

- Route validations beyond “`app.areas` is an array.” (`routes` and `components` validators imported as comments only.)
- Groups, comma-routes, middlewares (mentioned in `alumna.js` comments, not implemented). `app.group` exists in the VM sandbox and is **never consumed**.
- `alumna build` — CLI calls `alumna.build()` but **there is no `build()` method** on `Alumna` in this tree. `save` is registered as a unit and never appears in a flow. Help text still advertises it.
- `alumna.hjson` is an **existence token** only (never parsed). Scaffold is `{}`.
- Modules system, store, HTTP helper, JWT.
- HMR (explicit future goal in `server.js` comments). Full liven reload only.
- Layouts.
- Svelte `compile()` is called **with no options** (`filename`, `dev`, `css`, `generate`). CSS is whatever the default was (injected via `append_styles` in JS). Missing `filename` makes compiler errors worse than they need to be.
- Dead `css-tree` dependency. `install_dir` from `import.meta.url` is Linux-centric (`file://` strip).

**Bugs in this tree 4.0 must not repeat:**

1. `components_per_route.js`: `Object.keys[ state.components[component].subcomponents ]` — subscript, not a call. Recalc after a subcomponent-set change is broken. The unit also **never calls `next()`**.
2. `compile_flow` early-return when `state.components[id]` already exists: it tags only the **parent** on the second route, so **subcomponents are omitted from `Al.deps` for reused components**. Parallel `Promise.all` can also race the first compile. Symptom: route B that reuses a parent from route A under-loads children.
3. Nested compile errors call the inner flow’s `end()`, not `parent_end`.
4. `on_event` relies on Unitflow binding `this` as the library instance (`const library = this`). Fine inside unitflow, a trap if 4.0 drops unitflow without capturing the Alumna instance another way.
5. Test fixture `expected-result.json` looks for `Al.components` (plural); the walker looks for `Al.component`. Stale.

**Scaffold:** `alumna.hjson` is `{}`. `src/app.js` uses three areas but only fills `content`. `index.html` loads `/dev.js` (the in-memory bundle). Components are still `*.html`.

### 2.4 `alumna-3.0-feature-build` — the unfinished production build `[HISTORICAL]`

Same architecture as 3.0, plus a `build` flow. Version `3.0.1-alpha4`. Extra deps: `terser`, a vendored **esbuild** binary under `dist/esbuild/linux-x64/esbuild`.

**New units:**

- `set_mode_flag('dev'|'build')` so compile_flow can branch.
- `prepare_imports` — `state.app.imports = new Map()`.
- Per-component, in build mode: `imports` (scan `import { … } from "svelte/internal"`), `minify` (Terser), `save` to `build/components/{name}.js`.
- `app_imports` — union of svelte/internal symbols used by the app and all components, then:

  ```js
  state.app.svelte_internal_imports = `import { ${imports} } from '.../svelte-internal-build.js';`
  state.app.svelte_internal_lib     = `Al.lib = { ${imports} }`
  ```

- `save` of the main app: concatenate those strings + `browser.js` + routing + compiled App, then **pipe through esbuild `--bundle --minify`** via `spawnSync` of the vendored binary. Output: `build/app.js`.
- Separate Rollup builds of `svelte-internal.js` (dev, full) vs `svelte-internal-build.js` (tree-shaken entry).

**The contribution worth stealing:** **one boot file + many route chunks + shared `Al.lib`.** Dev concatenates a **full** `svelte/internal` IIFE into `dev.js` (speed, no tree-shake). Build feeds an ESM `export * from 'svelte/internal'` plus the **union of named imports** used by the App and every component into esbuild, so production `app.js` only keeps used helpers. Components stay **separate files** on purpose (route-level split without a bundler module graph). That split is the 4.0 production shape, minus IIFE/`Al.lib` (native ESM + import map instead).

**What is still incomplete / broken (do not copy):**

- `bundle_and_minify.js` is a stub around `spawnSync`; `save.js` calls it with **three** arguments, the function accepts **two**.
- Vendored esbuild is **`linux-x64` only**. macOS / Windows / ARM cannot `alumna build`.
- Component `save.js` path math: `slice(0, last_slash - 1)` **drops the last character of the folder**; `ensure_dir` is called **without** `recursive: true`. Nested components cannot land on disk even if the slice were fixed.
- **No `build/index.html` transform** — the scaffold still has `<script src='/dev.js'>`. A “successful” build is not a shippable app.
- No static asset copy. CLI comments still claim rsync + CSS inlining; both are false.
- CSS remains `append_styles` inside each JS file (`svelte.compile()` with no options ⇒ injected CSS, `dev: false` **even during `alumna dev`**).
- `build_dir` is not defaulted in `app_config`; it only exists because the CLI passes `./build/`.
- `components_per_route.js` `Object.keys[` bug + never calls `next()` (same as 3.0). `refresh_routing` is dead.
- `compile_flow.js` still has `!! IMPORTANT MISSING FEATURE HERE !!` (force recompile of an already-mapped component).
- **Zero tests** for minify, save, bundle, mode flags, or the build flow. Fixtures are rot (Svelte 3.55.1 / 4.2.8 snapshots vs package 4.2.9).
- No `--uncompressed` (2.0 had it). Two minifiers: Terser per component IIFE (no options), esbuild for the boot file.
- `Alumna.build()`’s comment still says “Dev mode flow.” `new()` no longer prints errors (CLI only does that for dev/build).
- No SSG. Middleware / groups still absent. Areas still sequential siblings.

**The test `test/modules/app/routes.test.js` is the 3.0/4.0 contract in miniature:** `app.js` source in, VM sandbox out, `state.app.areas` + `state.app.route` populated, bad `app.routes` (plural) becomes a friendly error. 4.0 should keep this exact idea.

### 2.5 Related libraries you built, and what 4.0 should do with them

| Library | What it is | 4.0 stance `[DECIDED]` |
| --- | --- | --- |
| [page.js](https://github.com/visionmedia/page.js) (your fork) | 2.0 router | Do not use. See §5. |
| [navaid](https://github.com/lukeed/navaid) | 3.0 router; you added `listen(url)` for Cordova ([PR #26](https://github.com/lukeed/navaid/pull/26), [issue #25](https://github.com/lukeed/navaid/issues/25)) | Do not use as the primary router if Navigation API is acceptable. Keep the *requirement* (hash-less SPA + `file:` / webview) as a fallback question. |
| [pulsa](https://github.com/alumna/pulsa) | 13 kB in-memory static file server, Express/Polka compatible, SPA fallback, `pulsa.memory(path, content)` | **Re-embed the idea** inside Alumna’s hidden dev server. Do not depend on the old package. |
| [liven](https://github.com/alumna/liven) | 64 kB live-reload on top of Pulsa: watch, websocket refresh, `instance.memory()`, `on_event` veto | **Rewrite inside Alumna 4** (steal the API: SPA, `memory()`, `on_event` veto, websocket reload). Do not depend on the old package. |
| [reflect](https://github.com/alumna/reflect) | Pure-JS rsync | You already deprecated it in favor of a single static folder. 4.0 should not need it. |
| [unitflow](https://github.com/alumna/unitflow) | Flows of units | You asked not to follow this. 4.0 organizes modules as normal ESM. A tiny internal `run(steps)` helper is fine; a framework-for-frameworks is not. |
| fetchival (vendored) | Tiny `fetch` wrapper | Optional convenience in the runtime. Not a differentiator. Native `fetch` is enough; a 20-line helper is fine if you still want `app.api`. |

Correction, gently: **SvelteKit does not use navaid.** Sapper had its own router in the page.js family. SvelteKit has its own. navaid is still the right *historical* next step from 2.0 → 3.0. 4.0 can step again.

### 2.6 Invariants to preserve (the Alumna soul)

These are not negotiable unless you explicitly kill them:

1. **Route definition file, not directory router.**
2. **Areas (named regions) filled per route with component names.**
3. **The same component in the same area across routes does not remount.**
4. **A route loads only its components (and their deep tree), in parallel.**
5. **Already-loaded components are not fetched again.**
6. **Author does not configure a bundler, does not think about tree-shaking, does not learn Vite/Rolldown/OXC.**
7. **CLI is `new` / `dev` / `build` (plus maybe `preview`).** One mental model.
8. **SPA works on a static file server** (history fallback). Mobile/webview is a *question*, not a given.
9. **Front-end middlewares** can intercept navigation (auth, redirects).
10. **Extreme simplicity of the author-facing API.** New features must pay rent in simplicity.

### 2.7 Things to retire

| Thing | Why |
| --- | --- |
| `new Function('return ' + xhrText)()` / IIFE wrapping | Native ESM `import()` + module map is the cache. |
| Rewriting `import { x } from "svelte/internal"` into `Al.lib` by string replace | Fragile (3.0 already special-cased `disclose-version`). Import maps + real ESM. |
| `Al.component['Name']` as the **authoring** style | Authors write normal Svelte 5. Alumna graphs imports. |
| Unitflow as the library backbone | Your call, already made. |
| rsync / reflect as a core feature | One static directory. |
| Svelte 2 `export default { data() {} }` components | Svelte 5 runes. |
| `.html` component extension | `.svelte` only. |
| Bundling *all* of `svelte/internal` into every dev payload as a custom global | Shared ESM module, HTTP-cached. |
| browser-sync | Liven, or a hidden Vite, not a 2018 stack. |
| page.js / navaid as the *primary* router | Navigation API exists (with a fallback question). |
| Compiling *every* component up front in 2.0-style `compileAll` glob | 3.0 was right: compile from the route graph, not from the folder. Unused components stay on disk. |

---

## 3. What the platform solved while Alumna was paused (2018 → 2026)

This is the “knowledge gap” section, mapped onto Alumna’s old jobs.

### 3.1 Routing — you were right that a native API was coming

**Navigation API** (`window.navigation`, `navigate` event, `event.intercept({ handler })`) is **Baseline Newly Available as of 2026-01-13**:

- Chrome/Edge 102 (2022)
- Safari 26.2 / iOS 26.2 (2025-12-12)
- Firefox 147 (2026-01-13)

It is the SPA router the History API never was: one event for link clicks, form submissions, back/forward, and `navigation.navigate()`. `intercept()` updates the URL, manages focus, and can split **precommit** (fetch while old UI is visible) vs **commit** (swap content). Safari still lagged on `precommitHandler` as of mid-2026.

Caveats that matter to Alumna:

- **Newly Available ≠ Widely Available.** Widely Available is estimated ~2028-07. Older phones, older WebViews, many Capacitor/Cordova shells, and enterprise locked browsers will not have it.
- `file:` / custom schemes are historically where History/Navigation APIs are weird. Your navaid `listen('/')` fix existed for a reason.
- Hash routing is still the nuclear fallback.

`[DECIDED]` Navigation API first, History API adapter underneath, feature-detected. One Alumna router module, two drivers. Authors never see either.

`[DECIDED Q1]` **HTTPS origins** are the target (C). Cordova, PhoneGap, and `file:` are **not** first-class. Capacitor (and later Tauri) are welcome **deploy targets**, not a second runtime: Alumna apps should be ordinary HTTPS/ESM SPAs that a WebView can host. If a current Capacitor WebView cannot run on a strict HTTPS origin, we add the smallest B-shaped accommodation (History fallback, configurable `base`, no `file:` loader). Native `import()` only — no classic-script IIFE dual loader.

### 3.2 On-demand components — native ESM is the old cache

What 2.0 invented by hand is now three browser features stacked:

1. **`import()`** — Baseline widely available since 2020. Returns a Promise of the module namespace. The **module map** guarantees a given URL is fetched/parsed/evaluated **once** per document. Re-import is instant and does not re-download.
2. **Import maps** — Baseline widely available since March 2023 (`<script type="importmap">`). Bare specifiers (`svelte/internal/client`) can point at one shared URL. Integrity keys exist in newer browsers.
3. **`modulepreload`** — `<link rel="modulepreload" href="...">` lets Alumna fetch a route’s whole graph **in parallel**, which is exactly what `Promise.all(Altiva.load(...))` did, and which naive nested `import` would *not* do (waterfall).

So the 4.0 loader is:

```js
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const mod = await import(specifierFor(name)); // browser cache + module map
  cache.set(name, mod.default);
  return mod.default;
}

async function loadRoute(route) {
  // deps precomputed by Alumna from the component graph
  await Promise.all(deps[route].map(load));
}
```

No `eval`, no IIFE, no `Al.lib` rewrite. Compiled output stays legal ESM:

```js
import * as $ from 'svelte/internal/client';
export default function Hello($$anchor, $$props) { /* … */ }
```

Import map:

```json
{
  "imports": {
    "svelte/internal/client": "/_alumna/svelte-internal-client.js",
    "svelte/internal/server": "/_alumna/svelte-internal-server.js"
  }
}
```

`[DECIDED Q2]` Yes. ESM + import maps are required (~Safari 16.4+ / 2023). No IE, no 2018 WebViews.

Caveat: **HTTP cache ≠ module map.** Full page reload re-asks the HTTP cache (usually 304 / disk). In-page navigation uses the module map (zero network). That is the same UX 2.0 had, only native.

Caveat: **failed imports may be sticky** in the module map depending on browser/spec evolution. Alumna should treat a failed component load as a recoverable error in dev (retry with a cache-bust query) and a hard error in prod. 3.0’s script-tag loader swallowed errors (`onerror` = success); do not copy that.

Caveat: **`import()` from `file://` is historically painful** (opaque origin, CORS on classic scripts vs module scripts). 3.0 used classic `<script src>` IIFEs specifically because that still ran under Cordova/`file:`. If Q1 is “HTTPS origins only,” native ESM is clean. If Q1 keeps `file:`/Cordova, the loader may need a classic-script fallback (or a bundler-per-route, which we do not want). This is the real technical reason 3.0 did not use `import()`, not ignorance of ESM.

### 3.3 Svelte 5 — the compiler Alumna 4 wraps

Alumna 4 compiles with `svelte/compiler`, **not** via SvelteKit.

Relevant compiler surface:

```js
import { compile } from 'svelte/compiler';

const client = compile(source, { filename, generate: 'client', css: 'external', dev, hmr });
const server = compile(source, { filename, generate: 'server', css: 'external' });
```

- **Runes** (`$state`, `$derived`, `$effect`, `$props`) are the authoring model. `[DECIDED]` runes-first in docs/scaffold; Svelte 5 legacy mode still compiles if someone writes it.
- Components are **functions**, mounted with `mount` / `hydrate` from `svelte`, not `new App({ target })`.
- SSR/SSG: `import { render } from 'svelte/server'` → `{ body, head }`. Hydration: `hydrate(App, { target, props })`. All Svelte 5 components are hydratable (the old `hydratable` compile flag is gone).
- CSS `[DECIDED Q3]`: **injected in dev** (fast), **external files in build**, SSG always links those files in `<head>`.
- TypeScript `[DECIDED Q4]`: Alumna itself is **JavaScript**. Author components **may** use TypeScript because Svelte 5 already accepts `<script lang="ts">` and Rolldown/OXC strip types from imported `.ts` modules. We do **not** run `tsc`. We advertise “TS works in components; Alumna does not typecheck.” If that extra graph work ever proves ugly, drop TS — it is welcome only while it stays cheap. Not in the Hello scaffold.
- `compile().ast` + `parse(..., { modern: true })` replace the brittle `Al.component[` AST walk for subcomponent discovery. 4.0 should walk **imports and component tags**, not a custom global.
- `hmr: true` is a compiler flag. Real HMR still needs a runtime (Vite’s, or a small Alumna one). `[DEFERRED]` full HMR; 4.0.0 can keep 3.0’s “recompile + reload”, then add HMR.
- File extension `[DECIDED Q5]`: **`.svelte` only.**

Svelte 5 also has **snippets** (`{#snippet x()}...{/snippet}` + `{@render x()}`), which are the right primitive for layout slots. Named `<slot>` still exists in compatibility mode; snippets are the future.

### 3.4 Bundlers Alumna can hide

You said you are fine bundling OXC / Rolldown / Vite / Vite+ and using them transparently. That is the right call. The author still never writes a `vite.config`.

2026 landscape:

| Tool | Role | Notes |
| --- | --- | --- |
| **OXC** | Parse / transform / minify JS | Rust, used by Rolldown |
| **Rolldown** | Bundle | Rollup-compatible, Rust, powers **Vite 8+** (Vite 8 shipped March 2026, replacing esbuild+Rollup) |
| **Vite 8** | Dev server + build orchestrator | HMR, SSR load, plugin ecosystem including `vite-plugin-svelte` |
| **Vite+** | VoidZero unified CLI (Vite, Vitest, Oxlint, Oxfmt, tsdown) | Attractive if we want tests/lint later; not required for v1 |
| **esbuild** | What 3.0-feature-build vendored | Still fine; Rolldown is the 2026 default |
| **svelte/compiler** | The actual Svelte compile | Must be called by Alumna or by a Svelte plugin we wrap |

`[DECIDED]` two-layer internals:

1. **Alumna compiler driver** — route graph, `svelte/compiler`, import graph, emit ESM + CSS + HTML. This is *our* product.
2. **Hidden bundler (Rolldown / OXC)** — only for (a) bundling `svelte/internal/*` and other shared deps into stable URLs, (b) npm packages a component imports, (c) production minify/tree-shake of the **runtime + shared chunks**, not of “the whole app into one file.”

Per-component files stay separate. That is the on-demand model. We bundle **dependencies**, not the app.

`[DECIDED Q6]` Native tools are **not** something authors `npm install`. Alumna **downloads the right platform binary on first need** into a cache dir (like esbuild/prisma), whether Alumna itself was installed as a bun-compiled executable or (fallback) an npm package. The binary cache is Alumna’s problem, not the author’s.

**What to download (and what not):**

| Tool | In the Alumna executable | First-need cache |
| --- | --- | --- |
| Alumna JS (bundled + minified) + `svelte/compiler` + scaffold | Yes | — |
| **Rolldown** (NAPI / native) | No — bun-compile does not pack NAPI well | Yes, first `alumna dev` or `alumna build` |
| **OXC as its own CLI** | No | **No.** Oxc minify/transform arrives *inside* Rolldown (`minify: true`). Do not ship a second Oxc binary in 4.0. |
| Package installer for `alumna add` | **Yes.** Bun’s installer is already inside the bun-compiled Alumna file (`BUN_BE_BUN=1`). | **No** extra download. |

`alumna setup` prefetches the cache so a machine can go offline after that.

**Ship-all-in-one vs download:** first-need cache is for **Rolldown only**. The Alumna download stays one file. Bun (runtime + package manager) is already inside that file because of `bun compile`. Rolldown is large, native, and NAPI — packing it into every Alumna update is the wrong default. A later GitHub “full” archive (Alumna + Rolldown for that OS) is allowed if offline-first install becomes a real request. It is not the 4.0.0 default.

### 3.5 Binary distribution of Alumna itself

2.0 used **pkg** (Vercel/Zeit) to ship a standalone executable. pkg is a dead end.

Candidates you named, plus mature extras:

| Tool | Model | Fit for Alumna CLI |
| --- | --- | --- |
| **[scriptc](https://github.com/vercel-labs/scriptc)** (your first candidate) | TS/JS → LLVM/clang native. Static ~170–200 KB, ~2 ms startup, **no JS engine**. `--dynamic` embeds quickjs-ng for `any` / npm. Needs Clang. Released ~July 2026. Apache-2.0. | Promising for a *small typed core*. Alumna-the-compiler currently needs `svelte/compiler` (heavy JS), filesystem, HTTP, child processes. Static mode will almost certainly not compile that graph today. `--dynamic` may. **Treat as a spike, not a day-one dependency.** |
| **[porffor](https://github.com/CanadaHonk/porffor)** | Experimental AOT JS | Even less likely to run Svelte’s compiler. Spike only. |
| **[perry](https://github.com/PerryTS/perry)** | (to be evaluated with you) | Spike only. |
| **Bun `bun build --compile`** | Embeds Bun runtime, one executable | Mature, practical, larger binary. Strong “it just works” option. |
| **Deno compile** | Similar | Fine if we are OK with Deno APIs. |
| **Node SEA** (Single Executable Apps) | Official Node | Practical, larger. |
| **npm global + Node** | What 2.0/3.0 actually were besides pkg | **Contingency fallback** if bun compile cannot ship 4.0.0. |

`[DECIDED Q7]` **Primary distribution for 4.0.0: try `bun build --compile` first** so authors install and run Alumna **without npm as the channel**. The compiler/runtime must not be blocked on this — if bun compile is not ready, ship `@alumna/alumna` on npm as the fallback. **scriptc / Porffor / Perry AoT is a later optimization**, not a 4.0.0 requirement.

Q37 clarified: **authors are not required to have Bun or Node on `PATH`** if they have the Alumna executable — including for `alumna add` (Q42). Our *release pipeline* and **contributor workflow** use Bun (Q43). Alumna *source* is JavaScript. Node current LTS is what the npm fallback needs, and what Jest still needs today.

#### 3.5.1 Bundle Alumna itself before `bun compile` `[DECIDED 2026-08-26]`

The author binary is not a zip of the git tree. **This step is required**, not optional polish. Release pipeline (`4.0.0-alpha.5`):

1. **Rolldown** bundles Alumna’s ESM (CLI, compiler, `svelte/compiler`, Acorn, scaffold as embedded assets). Tree-shake. One JS file.
2. **`minify: true`** on that file. Rolldown uses the **Oxc minifier** built into Rolldown. Same knob Alumna already uses on app vendor chunks. **No separate Oxc CLI.**
3. **`bun build --compile`** that one JS file into the executable.

Do not minify Alumna during development of Alumna. Minify is for the release artifact.

**What cannot go into that JS file:** Rolldown’s native binding. Keep it as a first-need cache download. Dynamic `import('rolldown')` / NAPI load from the cache dir. In this repo Rolldown is a **devDependency** (contributors still get it from `bun install`). `dependencies` vs `devDependencies` does **not** control `bun build --compile`: a static `import { rolldown } from 'rolldown'` still pulls it in. `load_rolldown()` externalizes that import.

#### 3.5.2 `alumna add` uses Bun’s installer inside the Alumna binary `[DECIDED Q42]`

**Yes, this works.** A `bun build --compile` executable contains the full Bun runtime, including the package manager.

There is **no public JS API** named `Bun.install()` today (Bun #16262, closed 2026-08-13: a JS-level package-manager API is still a separate request). The **supported** mechanism, documented since Bun **1.2.16** and verified by the Bun team on 1.3.14 and 1.4.0-canary:

`alumna add` spawns **the same Alumna executable** (`process.execPath`) with `BUN_BE_BUN=1` and args `add --ignore-scripts <packages…>`, `cwd` = the app root.

- `BUN_BE_BUN=1` makes the compiled file act as the `bun` CLI and ignore Alumna’s own entrypoint for that child process.
- Official Bun docs: CLI tools can install packages this way **without** a second binary and **without** Bun on `PATH`.
- Set the env var **only on that child**. Do not set it on `alumna dev` / `alumna build`.
- Package names still reject a leading `-` so the child cannot become a different Bun command.

If Bun later ships `Bun.install()` / `Bun.add()`, switch to the in-process call. Same strategy: the installer already in this binary; no extra download.

**`[ALTERNATIVE]` rejected:** embed `@npmcli/arborist`. **`[ALTERNATIVE]` rejected:** Orogene / a second installer download. **`[ALTERNATIVE]` rejected:** write our own npm resolver.

**`[DECIDED]` `alumna add` ignores lifecycle scripts** (`--ignore-scripts`). The tree is for the **browser** bundle.

**Alpha (this repo, `bun src/cli.js`):** still spawn `bun add` or `npm install` if they exist on `PATH` when the process is not a compiled Alumna binary. The `BUN_BE_BUN` path is for the **compiled Alumna binary**. The npm `@alumna/alumna` contingency (if bun compile cannot ship) may keep using Node’s npm.

#### 3.5.3 Contributor runtime is Bun `[DECIDED Q43]`

**Authors** never install Bun or Node. **Contributors** do.

Default contributor tool is **Bun** (`>= 1.4`): `bun install`, `bunx`, `bun src/cli.js`, later `bun build --compile`. That matches the author binary (Bun inside). Do not use npm / yarn / pnpm to develop Alumna. Commit `bun.lock` only.

**Exception, today:** Jest 30 cannot run *inside* Bun 1.4.0 at our 100% four-metric gate. So Node (`>= 22`) stays a **test-only** contributor dependency (`bun run test` → Node+Jest). Do not switch `package.json` `"test"` to `bun --bun jest` or to `bun test` until that suite is green at 100% statements/branches/functions/lines. `bun test --coverage` reports only funcs and lines.

Verified 2026-08-26: `bun src/cli.js --help` works.

---

## 4. Product definition — Alumna 4.0 as the author sees it

### 4.1 The three modes (v1)

```
alumna new my-app      # scaffold
cd my-app
alumna dev             # compile graph, in-memory server, live reload
alumna build           # SPA production output in build/
alumna build --ssg     # SSG + hydration (can be the same command with a flag or config)
alumna rebuild         # selective SSG (Phase 5)
alumna preview         # serve build/ locally
```

`[DECIDED Q8]` `alumna build` is SPA. `alumna build --ssg` or `ssg: true` in optional `alumna.hjson`. Not two CLIs.

### 4.2 Author-facing mental model

An Alumna app is:

1. **`src/app.js`** — the map of the world (areas, layouts, routes, middlewares).
2. **`src/components/**`** — Svelte components. Names in the map refer to files here.
3. **`src/static/**`** — files copied as-is. No rsync. `[DECIDED Q9]`
4. **`src/index.html`** — the HTML shell Alumna injects into (title, extra tags). Alumna owns the script tags.
5. **`src/middlewares/**`** — optional. Named in routes.
6. **No `package.json` required to start.** `[DECIDED Q10]` If a component imports an npm package, `alumna add` creates one. See §7.6.

That is the entire tutorial.

### 4.3 Rendering modes, staged

| Stage | What ships | Production server |
| --- | --- | --- |
| **4.0.0 — SPA** | `index.html` + `/_alumna/*` + `/components/*.js` + static | Any static host with history fallback |
| **4.0.x — SSG + hydration** | Per-route HTML + same JS graph | Any static host, **no** history fallback required for known routes |
| **Architect era — selective SSG** | Same as SSG, plus a tiny rebuild worker that regenerates *some* HTML when content changes | Still static. Worker is not on the public hot path |

No SSR on the public origin in this plan. That is a feature, not a gap: the public fleet is dumb and fast; intelligence lives in the compiler and (later) the rebuild worker.

### 4.5 Capacitor (and later Tauri) — friendly, not forked

Cordova / PhoneGap / `file:` are out. A Capacitor (or future Tauri) shell should host a **normal** Alumna SPA. We help them without a second runtime:

- ESM + import maps + Navigation API, History fallback already there
- configurable `base` (Q35)
- relative URLs, no `file:` special case
- SPA history fallback in `alumna preview` / production `index.html`
- `alumna-manifest.json` so a native shell can know the route list later

If a current Capacitor origin is `https://localhost` or another real origin that supports modules, that is still Q1-C. We only add extra WebView work if a spike shows modules cannot load.

### 4.4 Alumna Architect (out of scope, but the plan must not paint us into a corner)

Architect is a low-code CMS. Visual editors change a page/article. That change **notifies** a rebuild service (centralized, or the local Alumna instance). The service:

1. Knows which routes depend on which content keys.
2. Re-runs **only** those routes’ SSG (and only if component JS is stale, those too).
3. Atomically replaces the HTML (and maybe JSON) on the static origin.

Implications for 4.0 that we *should* already honor:

- Route → component graph must be serializable (JSON artifact in `build/alumna-manifest.json`).
- SSG of one route must be invocable without rebuilding the world (`alumna build --route /blog/slug` or a JS API `rebuild(route)`).
- Content inputs should be addressable later (files, HTTP, a stub `app.data` hook) without inventing the CMS now.
- HTML output should be overwrite-safe (write to temp, rename).

`[DEFERRED]` all of Architect. `[DECIDED]` emit the manifest from day one so Architect is an addition, not a rewrite.

---

## 5. Proposed route language (the heart)

### 5.1 Keep the 2.0 vocabulary, add layouts

`[DECIDED]` `src/app.js` remains a sandboxed JS file assigned onto `app`. It is more human than JSON, supports comments, and you already have a decade of muscle memory. We do **not** switch to YAML/filesystem. Reserved keys on a route object (not area names): `layout`, `middleware`, `redirect`, `data`, `ssg`, `prerender`.

```js
// src/app.js

app.areas = [ 'nav', 'header', 'content', 'footer' ];

// Optional named visual shells. A layout is a Svelte component
// whose snippets/props are the areas it owns.
app.layout.marketing = {
  component: 'layouts/Marketing',   // src/components/layouts/Marketing.svelte
  areas: [ 'nav', 'content', 'footer' ]
};

app.layout.dashboard = {
  component: 'layouts/Dashboard',   // persistent sidebar chrome
  areas: [ 'nav', 'header', 'content' ]
};

app.route[ '/login' ] = {
  content: 'Login'
};

app.route[ '/' ] = {
  layout: 'marketing',
  nav: 'MainMenu',
  content: 'Feed',
  footer: 'Footer'
};

app.route[ '/dash, /dash/overview' ] = {   // [DECIDED Q11] comma-string aliases
  layout: 'dashboard',
  nav: 'DashNav',
  header: 'DashHeader',
  content: 'Overview'
};

app.route[ '/dash/users' ] = {
  layout: 'dashboard',
  nav: 'DashNav',          // same as overview → DashNav does not remount
  header: 'DashHeader',    // same
  content: 'Users'         // only this swaps
};

app.route[ '/dash/users/:id' ] = {
  layout: 'dashboard',
  nav: 'DashNav',
  header: 'DashHeader',
  content: 'UserDetail',
  middleware: [ 'auth' ]
};
```

### 5.2 Layouts — the missing 2.0 feature, specified

**Problem.** 2.0/3.0 treated `app.areas` as a sequence of sibling mounts. A dashboard cannot say “left column is `nav`, right column is a stack of `header`+`content`” without CSS hacks, and even then the chrome is not a component (no dashboard-level state, no responsive drawer, no error boundary around the right pane).

**Invariant (extends §2.6.3).** Identity is the triple `(layout, area, componentName)`. If two consecutive routes share that triple, that instance is not destroyed. If they share `layout` but not `content`, the layout instance is kept and only the content snippet’s component is swapped.

**Layout component (Svelte 5, sketched):**

```svelte
<!-- src/components/layouts/Dashboard.svelte -->
<script>
  let { nav, header, content } = $props(); // snippets — [DECIDED Q12]
</script>

<div class="dash">
  <aside>{@render nav()}</aside>
  <section>
    <header>{@render header()}</header>
    <main>{@render content()}</main>
  </section>
</div>
```

Alumna generates the parent that:

1. Picks the layout constructor for the current route (or a built-in sequential layout if none).
2. For each area, holds the **current component constructor** in `$state`.
3. Passes snippets that do `<Foo {...routeProps} />` where `Foo` is that constructor.
4. On navigation, assigns **only the constructors that changed**. Svelte 5 will keep the unchanged snippet’s component instance if we do not recreate the snippet identity carelessly. This needs a prototype — it is the riskiest implementation detail in 4.0. See §10.

**Default layout.** If a route omits `layout`, Alumna uses a built-in **sequential** layout that mounts `app.areas` in order (2.0 behavior). `[DECIDED Q13]` no magic CSS grid.

`[ALTERNATIVE A]` CSS `grid-template-areas` as the layout language — **rejected** (Q13).

`[ALTERNATIVE B]` Nested layouts — **rejected** for 4.0.0 and probably forever (Q14).

`[DECIDED Q12–Q14]` Named layouts as Svelte components + snippet areas. One level. Default sequential layout when omitted. No nested layouts. Omit an area on a route ⇒ nothing mounted there (Q31). No cross-layout persistent instances in v1 (Q32).

### 5.3 Groups, aliases, params, 404

**Keep from 2.0 `[DECIDED Q29, Q11, Q15]`:**

- `app.group['/base'] = { '/x': {...} }` → `/base/x`
- `app.group['group:name']` as a named bundle without a prefix (organizational only)
- Comma aliases `'/, /home'`
- Params: `'/users/:id'`, `'/blog/:year/:slug'`

`[DECIDED Q15]` Param syntax: `:id`.

**404.** `[DECIDED]`

```js
app.route[ '/*' ] = { content: 'NotFound' }; // or app.notfound = 'NotFound'
```

**Redirects as data.** `[DECIDED]`

```js
app.route[ '/old' ] = { redirect: '/new' };
```

Middleware can also redirect (see §8).

**Query strings.** 2.0 did **not** expose them (only route params). 4.0 `[DECIDED]` exposes `query` on the runtime route object, not as route keys. This is a new feature, not a restoration.

**Hash vs path.** Path is default. Hash mode for `file:` if we keep that target.

### 5.4 Parsing `app.js`

Keep the VM sandbox. It is the friendliest parser you can give a non-compiler-person: they write real JS, get real line numbers.

Hardening `[DECIDED]`:

- Timeout the VM.
- No Node builtins in the sandbox.
- Only `app` is writable. Reading `process`, `fs`, `fetch` fails.
- After eval, **validate** the object (the 2.0 `MainCode` validator is the spec — port those 33 cases).
- Dynamic patterns (`/:id`) remain **one route identity**. Concrete URLs share the area map; params are data. Do not generate one `{#if}` per concrete path.
- 3.0 only validated `areas`. 4.0 must validate: areas exist, components exist on disk, layouts exist, middlewares exist, no duplicate routes after group expansion, param patterns parse.

`[DECIDED Q16]` Keep the VM for v1. Can change later if we want TS in `app.js` (we do not today).

### 5.5 Component naming convention

`[DECIDED]`

- A name in the route map is a path relative to `src/components/`, without extension: `'Login'`, `'dash/UserDetail'`, `'layouts/Dashboard'`.
- File is `Login.svelte` (or `.html` if Q5 says so).
- Case-sensitive on disk; we warn on case mismatch because macOS lies.

Subcomponents **inside** a Svelte file use normal Svelte imports:

```svelte
<script>
  import Modal from './Modal.svelte';
  import { onMount } from 'svelte';
  import { something } from 'some-npm-lib'; // see §7.6
</script>
<Modal />
```

Alumna’s compiler, not the author, is responsible for making those imports work with on-demand loading (graph + rewrite + modulepreload).

---

## 6. Proposed runtime (browser)

### 6.1 What loads, in order, on first visit (`/dash/users/42`)

1. `index.html` (SPA) or `/dash/users/42/index.html` (SSG).
2. Import map.
3. `/_alumna/runtime.js` (tiny: router + loader + `show`).
4. `/_alumna/svelte-internal-client.js` (shared, long-cache).
5. `modulepreload` of **exactly** the modules that route needs: layout, area components, their deep imports, npm chunks they need.
6. Runtime matches the URL, `import()`s anything not already evaluated (usually all preloaded), `mount` or `hydrate`s the shell, fills areas.

No other components exist on the network path.

### 6.2 Navigation (`/dash/users/42` → `/dash/overview`)

1. Navigation API `navigate` event (or History fallback).
2. Run route middlewares with `{ current, next }` (2.0 shape, worth keeping).
3. If middleware calls `redirect('/login')`, intercept that instead.
4. Diff the target route against the current area map.
5. `import()` **only missing** constructors (module map makes already-seen ones free).
6. Assign changed constructors. Unchanged layout + `DashNav` + `DashHeader` stay.
7. Update URL, title, focus (Navigation API helps).

### 6.3 `app.show` / area updates

3.0’s `areas = updated` is acceptable **if** each slot’s constructor reference is stable (Svelte 4 `svelte:component` dirty-checks `this`). `[DECIDED]` still prefer a keyed store so we never depend on “replacing the whole object happens to be fine”:

```js
areas.nav     = DashNav;      // same reference → no remount
areas.content = Overview;     // different → swap
```

Implementation will likely be a Svelte 5 rune object Alumna generates, not a public author API. Authors do not call `show`. They call `alumna.goto('/x')` or click `<a href="/x">`.

3.0 already used **plain `<a href>`** and let navaid intercept — no `<Link>` component. Keep that. Restore 2.0’s missing piece: pass **params** (and query) into the runtime route object. 3.0 dropped them.

### 6.4 Public runtime API (small)

`[DECIDED Q18 / Q41]` No `window.app` global. Public API is the virtual module `alumna`:

| API | Role |
| --- | --- |
| `goto(path)` | Programmatic navigation |
| `redirect(path)` | Replace-history navigation (middleware uses this) |
| `route` | `{ path, pattern, params, query, layout }` reactive |
| `prefetch(path)` | Warm the module map for a likely next route |

`[DECIDED Q17]` No built-in `alumna.api`. Docs show `fetch`.

### 6.5 Links

`[DECIDED]` plain `<a href="/dash">`. The router intercepts same-origin clicks. No `<Link>` component required (we can still offer one later). External links and `target="_blank"` are ignored by the interceptor. This is how Navigation API wants to work. `[DECIDED Q34]` prefetch on hover for known routes, on by default.

### 6.6 CSS of components

If `css: 'external'`, each component emits `Hello.css` next to `Hello.js`, and the loader inserts `<link>` once (set of seen hrefs). If `injected`, Svelte injects on first mount (simpler, worse caching). See Q3.

Layout shift: SSG should include the CSS of the route in `<head>` so first paint is correct.

### 6.7 State

Svelte 5 runes are **per instance**. Shared app state:

`[DECIDED Q19]` Alumna does **not** ship a global store. Making one must be the shortest Svelte 5 possible. Convention: an optional `src/store.svelte.js` (Svelte 5 rune module) that any component can import. Documented in the Hello comment and in docs; **not** generated as a real file (authors who do not want a store should not have to delete one).

```js
// src/store.svelte.js  — you create this file if you want shared state
export const user = $state({ name: null, token: null });
```

```svelte
<script>
  import { user } from '../store.svelte.js';
</script>
<p>{user.name}</p>
```

That is the whole API. It is a normal ESM import, so it participates in the same graph / cache / `alumna add` story as everything else. 2.0’s `useStore: true` is retired.

Route params as runes on a module (`alumna.route.params.id`) is enough for the common case that 2.0 stuffed into the Svelte 2 store.

---

## 7. Proposed compiler / CLI internals

### 7.1 Organize code as a library, not as Unitflow

`[DECIDED]` a normal JS ESM tree (Alumna itself is JavaScript, Q4/Q38). **As of alpha.1 the tree is the one in §0.1** — there is no `packages/alumna/` and no Unitflow. `src/alumna.js` is the class; `src/compile/project.js` is the pipeline; client loader+router live together in `src/runtime/browser.js`. Build emit is methods on `Alumna`, not a `build/` folder yet. SSG files do not exist yet.

Pipelines are async functions calling the next. No `next`/`end` callbacks.

### 7.2 The compile graph (the 3.0 idea, done properly)

```
app.js
  → routes, layouts, middlewares
  → for each component name:
       read file
       parse Svelte (modern AST)
       collect:
         - imported .svelte components (recursive)
         - imported .js/.ts next to them
         - imported npm packages
         - imported CSS/assets
       compile generate:'client'
       optionally compile generate:'server'
       rewrite specifiers
       emit JS/CSS
  → compute deps[route] = set of all module URLs that route needs
  → emit runtime config: { routes, layouts, deps, middlewares }
  → emit import map
  → emit HTML (SPA shell and/or per-route SSG)
```

Unused files in `components/` are **not compiled**. 3.0 was right; 2.0’s glob was wasteful.

When a file changes in dev:

| Change | Action |
| --- | --- |
| `app.js` | Re-eval, revalidate, maybe recompile new components, refresh routing config, reload |
| Used `.svelte` whose import graph is unchanged | Recompile that module, memory-replace, reload (HMR later) |
| Used `.svelte` whose import graph changed | Recompile, recompute `deps`, refresh routing, reload |
| Unused `.svelte` | Ignore |
| Static file | Memory-replace or pass-through, reload |
| Delete used component | Error overlay, do not serve a broken graph |

Port 3.0 `same_keys` / `on_event` logic. It was the right design. When building the deps map, **walk the full recursive tree for every route even if the parent was already compiled** (3.0’s early-return omitted children on the second route — do not copy that). `compile` once, **register** many times.

### 7.3 Import rewriting (replaces 3.0 `translate_imports`)

Compiled Svelte emits:

```js
import * as $ from 'svelte/internal/client';
import Modal from './Modal.svelte';
import { onMount } from 'svelte';
```

Alumna rewrites to stable, browser-resolvable specifiers (or relies on the import map):

```js
import * as $ from 'svelte/internal/client';          // mapped
import Modal from '/components/dash/Modal.js';        // rewritten to absolute app URL
import { onMount } from 'svelte';                     // mapped to /_alumna/svelte.js
```

Do **not** string-replace `from "svelte/internal"`. Parse with OXC (or `svelte/compiler`’s knowledge of its own imports) and rewrite properly. 3.0’s string replace is a known footgun.

### 7.4 Dev server

`[DECIDED Q20]` **Rewrite the server inside Alumna.** Steal Pulsa/Liven’s API (static + SPA fallback + `memory(path, content)` + websocket reload + `on_event` veto). Do not depend on `@alumna/liven` / `@alumna/pulsa`. No emotional attachment to the old packages; DX and speed without compromising quality.

Why not expose Vite?

- Authors would need to know Vite the moment something breaks.
- Vite’s unit of hot update is a bundler module graph, not Alumna’s route graph.
- We can *use* Vite internally later if the in-house server becomes a burden. The public story stays `alumna dev`.

Port `[DECIDED]`: default **3030**, `--port`, auto-pick if busy unless `--port` was explicit (3.0 behavior). Preview on **4040**.

### 7.5 Production SPA emit

```
build/
  index.html                 # shell + import map + runtime + modulepreload for `/` only? or none
  _alumna/
    runtime.js
    svelte.js
    svelte-internal-client.js
    importmap.json           # inlined into HTML actually
  components/
    Login.js
    Feed.js
    layouts/Dashboard.js
    ...
  static/...                 # copied
  alumna-manifest.json       # graph, for Architect and for `alumna build --route`
```

SPA `index.html` should **not** preload the entire app. It should preload the **current URL’s** graph. For a generic `index.html` used by history-fallback, that means either:

- a tiny inline boot that reads `location.pathname`, looks up `deps` in a small `routes.json`, then `import()` + modulepreload inject, or
- only preload the runtime and let the first route `import()` waterfall one level (runtime knows deps, so it can still `Promise.all` — **no nested waterfall**).

`[DECIDED]` the second: runtime.js is small, contains `deps` map, `Promise.all`s the route’s modules. Same as 2.0’s `Altiva.routes[path]`. First paint of SPA waits on JS; that is SPA’s nature. SSG is how we fix first paint.

### 7.6 Third-party libraries inside components `[DECIDED Q21]`

This is **not** the same npm as “Alumna is distributed on npm.” Two different jobs:

| Job | Who talks to the npm registry | What the author sees |
| --- | --- | --- |
| **Install Alumna itself** | Nobody, if bun-compile works (Q7). npm is only the contingency channel. | `alumna` on their PATH |
| **Use `marked` (or any library) inside a component** | Alumna, behind `alumna add marked` | `import { marked } from 'marked'` in a `.svelte` file. A generated `package.json` + lockfile that Alumna owns. |

They do not contradict. A bun-compiled Alumna still needs *somewhere* to fetch `marked` from when the author asks for it. The registry is that somewhere. Alumna is the one who calls it; the author never runs `npm install`, never writes a bundler config, never learns Rolldown.

**Pure apps (the default):** no `package.json`. Only Svelte, `alumna`, and relative `./Foo.svelte` imports are legal.

**When a component imports a bare specifier Alumna does not know:**

```
Error: "marked" is not installed.
Run: alumna add marked
```

**`alumna add <pkg>`** (opinionated wrapper):

1. Creates `package.json` if missing (Alumna-managed; authors should not edit it by hand, but it is fine if they do).
2. Fetches the package **without Node/Bun/npm on `PATH`** (Q42). The compiled Alumna binary spawns itself with `BUN_BE_BUN=1` and `add --ignore-scripts`. Lifecycle scripts off.
3. Writes a lockfile so builds are reproducible.

**At compile / build**, Alumna (Rolldown) bundles each used library into **content-hashed shared chunks** under `/_alumna/vendor/` (e.g. `marked-a1b2c3.js`). If two components import `marked`, they share one chunk. Import map:

```json
{ "imports": { "marked": "/_alumna/vendor/marked-a1b2c3.js" } }
```

The browser never talks to npm. The hashed filename is cache-friendly. Tree-shaking happens inside that vendor chunk.

So: **`package.json` = Alumna’s shopping list / lockfile. `/_alumna/vendor/*` = what actually ships.** Both exist on purpose. The first is for Alumna-the-compiler; the second is for the browser.

### 7.7 Minify / tree-shake

Production:

- Rolldown `minify: true` (Oxc minifier) on emitted JS. No separate Oxc CLI.
- `svelte/internal/client` is one hashed file, tree-shaken **if** we bundle it with the set of used runtime functions — 3.0-feature-build’s `app.imports` Map was this idea. With native ESM, tree-shaking `svelte/internal` only works if we **bundle that package**, not if we re-export the whole module. `[DECIDED]` Rolldown-bundle `svelte/internal/client` once per build, based on used exports collected from compiled output. That preserves 3.0’s “smallComponents” win without IIFE hacks.

Dev: no minify, `dev: true` compile for runtime checks.

### 7.8 Scaffold (`alumna new`)

Tiny, like 2.0:

```
my-app/
  src/
    app.js
    index.html
    components/
      Hello.svelte
    static/
  # no alumna.hjson unless the author wants to override a default
  # no package.json unless they ran `alumna add`
```

`app.js`:

```js
app.areas = [ 'content' ];
app.route[ '/' ] = { content: 'Hello' };
```

No tutorials in the scaffold. The app has to run in one command.

### 7.9 Config file

2.0’s hjson earned its keep (store, middlewares, build flags). 3.0’s empty `{}` did not.

`[DECIDED Q22]` **zero config by default.** Optional **`alumna.hjson`** (not `.ts` / `.js` config) for: port, base path, ssg on/off, out dir, title. Human, comment-friendly, only when a default must change. Middlewares live in `app.js`, not in hjson.

### 7.10 Tests we must port before writing new features

**Runner:** Jest + four-metric coverage, not `node:test`. Full policy in §0.2.

The 2.0 `maincode` cases **are the route language spec**. Port them to 4.0’s validator (Jest), including errors:

- missing/invalid `app.areas`
- empty path, duplicate routes, group conflicts
- unknown area on a route
- comma aliases, groups with and without prefix
- middleware **explicit field** `middleware: ['auth']` (2.0 array form is **not** valid in 4.0 — Q30)
- identical load-set aliasing (byte-saving) — may become a deps-map implementation detail

3.0 tests to keep: VM routes, compile_single errors, subcomponent walk (rewritten for real Svelte imports), `on_event` behaviors.

---

## 8. Middlewares (front-end)

2.0 shipped this and production apps needed it. 3.0 dropped it. 4.0 must have it.

### 8.1 Author API `[DECIDED]`

`src/middlewares/auth.js`:

```js
export default function auth({ current, next }, proceed, redirect) {
  if (!localStorage.getItem('token')) return redirect('/login');
  proceed();
}
```

`app.js`:

```js
app.route[ '/dash' ] = {
  layout: 'dashboard',
  nav: 'DashNav',
  content: 'Overview',
  middleware: [ 'auth' ]
};
```

Semantics from 2.0 that are worth keeping:

- List order is execution order.
- Each middleware sees a **cloned** snapshot of `{ current, next }` so it cannot corrupt the router by accident.
- First visit of a route builds the chain; later visits reuse it (micro-optimization, keep if cheap).
- `redirect` aborts the chain.
- Middleware can be async (`await proceed()`). `[DECIDED Q23]`
- 2.0 middleware files were **not** modules. They assigned themselves onto the global. 4.0 uses `export default` so they are real ESM.
- `[DECIDED Q30]` **only** the explicit field `middleware: ['foo']`. The 2.0 array form `[ areaMap, 'mw1' ]` is invalid.
- `[DECIDED Q44]` Route-level `middleware` also means “no SSG unless `ssg: true`.” Global `app.middleware` does not skip SSG. See §9.0.

`[ALTERNATIVE]` SvelteKit-style `load` functions per route — rejected for v1.

Global middleware: `[DECIDED]` `app.middleware = [ 'analytics' ]` runs on every navigation, then route-specific ones.

Protected-route sugar: `[DEFERRED]`.

### 8.2 When middleware runs relative to loading

`[DECIDED]` **before** fetching missing components (so a logged-out user hitting `/dash` does not download the dashboard tree). 2.0 actually loaded then rendered; we can do better because middleware is data in `app.js`, known before load.

Exception: a middleware that must inspect a component — not a v1 need.

---

## 9. SSG + hydration (v1.x, designed now)

First slice **shipped** in `4.0.0-alpha.3`. Q44 (which routes, including param lists) and Phase 5 rebuild **shipped** in `4.0.0-alpha.4`. `data()` and async `prerender` **shipped** in `4.0.0-alpha.5`.

### 9.0 Which routes get HTML `[DECIDED Q44]`

Eligibility (should this pattern ever become HTML?) and expansion (which concrete URLs for a param pattern?) are two jobs. They are not one boolean.

The master switch stays `[DECIDED Q8]`: `alumna build --ssg` or `alumna.hjson` `ssg: true`. Route fields apply only when that switch is on. A SPA `alumna build` ignores them.

Two optional reserved keys on the route object:

- `ssg` — boolean. Override the default.
- `prerender` — array of param objects, e.g. `[ { slug: 'hello' }, { slug: 'world' } ]`. Expands a param pattern. Keys must match that pattern’s `:params`.

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

Rules:

- `ssg: false` wins over `prerender`.
- `ssg: true` on a param route **without** `prerender` is an error (“say which URLs”).
- Route `middleware` skips SSG unless `ssg: true`. That is the protected `/dash` case: the author already lists `middleware: ['auth']`; Alumna must not emit public HTML for a logged-out shell.
- Global `app.middleware` does **not** skip SSG (analytics and similar).
- Redirects and `/*` never SSG.
- If `prerender` is present and `ssg` is not `false`, generate those URLs even though the pattern has params. That is the public `blog/:slug` case.
- Empty `prerender: []` means “this pattern can SSG, but this build writes no pages for it.”
- Param objects, not full paths: `{ slug: 'hello' }` matches `route.params`. Do not use `'/blog/hello'` in `prerender`.

```js
app.route['/'] = { content: 'Home' };

app.route['/dash'] = {
  layout: 'dashboard',
  content: 'Overview',
  middleware: [ 'auth' ]
  // skipped: route middleware, no ssg: true
};

app.route['/about'] = {
  content: 'About',
  middleware: [ 'announce' ],
  ssg: true
};

app.route['/blog/:slug'] = {
  content: 'Post',
  prerender: [
    { slug: 'hello' },
    { slug: 'world' }
  ]
};
```

`[ALTERNATIVE]` rejected: a second map (`app.ssg.include` / `exclude`); infer from JWT or a backend; infer from layout name; `ssg` as both boolean and array; opt-in `ssg: true` on every public page; skip SSG because of global `app.middleware`.

`[SHIPPED]` `prerender` / `data` as async functions (`4.0.0-alpha.5`). The `app.js` VM has `fetch` (not `fs`). `clone_out` keeps functions. Architect can also skip the list and rebuild a concrete path it already knows (`/blog/hello`). Content-id lookup for Phase 5 lives on the **manifest**, not as `app.prerender`.

**On disk in alpha.5:** Q44 table plus `data()` and async `prerender`. Route `ssg` / `prerender` / `data` are read. Middleware skip. Param expansion. Manifest `lookup`. `alumna rebuild`. `#alumna-data` and `/_alumna/ssg-data.js`.

### 9.1 Algorithm

For each concrete route that SSG can know (alpha.3 = static paths only; later = §9.0 table):

1. Resolve the concrete URL (`/`, `/about`, or `/blog/hello` from `prerender`).
2. `[DECIDED Q24]` First SSG slice on disk: **static paths only**. `[DECIDED Q44]` **shipped** in alpha.4; table in §9.0.
3. Compile (or reuse) server versions of the layout + area components.
4. `render(layout, { areaProps })` with `svelte/server`.
5. Write `build/{path}/index.html` containing: `<head>` from render + CSS links for that route + import map + `modulepreload` of that route’s client graph + body HTML + `hydrate` boot.
6. Client boot: `hydrate(Shell, { target })` then attach the router for subsequent navigations (SPA after first paint).

### 9.2 Data at SSG time

`[SHIPPED Q25]` optional per-route `data` in `app.js`:

```js
app.route[ '/about' ] = {
  content: 'About',
  data: async () => {
    // Node-side, build time only
    const res = await fetch('https://cms.example/about');
    return res.json();
  }
};
```

Passed as props into the content component. Serialized into the HTML for hydration (`hydratable` in Svelte 5, or a simple `<script type="application/json" id="alumna-data">`).

This is the hook Architect will later call with CMS content instead of `fetch`.

This is the hook Architect will later call with CMS content instead of `fetch`. **Shipped in `4.0.0-alpha.5`.** Async `prerender` functions use the same server-side timeout helper.

### 9.3 Hybrid rebuild (Architect era)

CLI primitive, manifest `lookup`, localhost `/notify`, and atomic HTML writes **shipped** in `4.0.0-alpha.4`. The Architect CMS itself stays `[DEFERRED]`.

```
notify({ contentId: 'post:42' })
  → manifest.lookup(contentId) → ['/blog/42', '/']
  → for those routes: render server, atomic write HTML
  → if components unchanged, do not touch JS
```

The rebuild worker can be:

- a CLI `alumna rebuild --route /blog/42` **[SHIPPED]**
- a localhost HTTP endpoint the CMS pings **[SHIPPED]** (`alumna rebuild --listen`)
- a cloud function that *is* Alumna’s compile in Node, writing to object storage `[DEFERRED]`

Content keys in this alpha are route paths (and param patterns). Real CMS ids wait with Architect.

---

## 10. Implementation risks (things that can make 4.0 feel worse than 2.0)

1. **Remounting shared areas.** Sequential `<svelte:component this={sameCtor}>` likely already works in Svelte 4/5. **Snippets inside a layout component** are the unknown. If we get snippet/`$state` identity wrong, dashboards will flicker and lose sidebar state. **Prototype this before building the rest of the compiler.** A 50-line Svelte 5 playground with two routes sharing a layout is the first spike.
2. **Import waterfalls.** If we forget `Promise.all` / modulepreload and rely on nested ESM imports, 4.0 will *feel slower* than 2.0 on first visit to a deep tree. The graph exists to prevent this.
3. **String-rewriting compiled output.** 3.0’s `translate_imports` will break on the first Svelte minor that changes import shape (`svelte/internal/client` vs `svelte/internal`). Parse, don’t regex.
4. **Navigation API on WebViews.** If you still care about Cordova, test a WebView matrix early. Do not assume Baseline Newly Available means “PhoneGap 2018.”
5. **Svelte 5 function components vs 3.0 `new App`.** The 3.0 runtime cannot be copied. `mount`/`hydrate`/`unmount` are new.
6. **CSS ordering across on-demand components.** Mentioned in public Navigation API commentary as a remaining SPA pain. Define an order: layout CSS first, then area CSS in `app.areas` order, each file included at most once.
7. **`vm.runInNewContext(app.js)` and ESM.** `app.js` as ESM (`import`) will not run in `vm` the same way. Keep `app.js` as a script (not a module), or switch to `import()` of a user module (Q16).
8. **HMR false start.** Shipping bad HMR is worse than full reload. 2.0/3.0 reload was honest.
9. **scriptc too early.** Do not couple the compiler’s architecture to what scriptc can statically compile.
10. **Scope creep into SvelteKit.** Every time we are tempted to add `+page.js` equivalents, re-read §1.3.

---

## 11. Phased delivery

Each phase produces something you can run. We do not start phase N+1 with phase N half-broken. Dates omitted on purpose; this is a sequence, not a calendar.

### Phase 0 — Spikes (days, throwaway)

| Spike | Status |
| --- | --- |
| **S0. Shared areas in Svelte 5** | **Passed 2026-08-26.** Sequential shell and snippet layout: shared `nav` `onMount` count stays **1** when only `content` swaps (`test/compile/s0-remount.test.js`). Named layouts then shipped on that pattern. |
| **S1. Native ESM component load** | **Done.** Compile → import map → `import()` + `deps` `Promise.all`. Chromium Hello e2e in `test/e2e/browser.test.js`. |
| **S2. Navigation API + History fallback** | **Done** in `runtime/browser.js`. Chromium e2e clicks `/about` after SSG hydrate. |
| **S3. svelte/compiler generate client+server** | **Done** (SSG first slice). Client + server compile. Server JS stays in a temp dir; not written to `build/`. |
| **S4. Rolldown as a library** | **Shipped 2026-08-26.** Rolldown API vendors Svelte (used exports) and app libraries into hashed ESM chunks. Production minify (`minify: true` = Oxc). First-need native Rolldown download **shipped** in alpha.5. |
| **S5. scriptc hello** | **Not started.** bun compile is the author binary (`4.0.0-alpha.5`). scriptc AoT stays later. |

### Phase 1 — SPA vertical slice (“Hello Alumna 4”) `[SHIPPED]` as `4.0.0-alpha.1`

Shipped 2026-08-26 (details in §0.1). Remaining Phase 1 hygiene:

- ~~Jest port + coverage on existing modules (§0.2)~~ **Done** (100%)
- Browser smoke of Hello (open `alumna dev`, confirm “Welcome to Alumna!”) — **Done** (Chromium e2e)
- ~~Preview integration test~~ **Done** (`test/alumna.test.js`)
- ~~Do not treat regex `rewrite.js` as finished~~ **Done** (Acorn)

### Phase 2 — The Alumna language, complete

Already in alpha.1 (do not rebuild): groups, comma aliases, `:id`, redirects, hover prefetch, `alumna-manifest.json`.

Still to do:

- ~~Jest 100% four-metric gate on the then-current `src/`~~ **Done**
- ~~Layouts (after S0)~~ **Done** (one-level named layouts + sequential default)
- ~~Middleware **execution**~~ **Done** (sync+async, before load, `export default`)
- ~~Watch selectivity (§17.3)~~ **Done** (`classify_watch` + `update_components` per used `.svelte`)
- ~~Component-missing and compile-error overlay~~ **Done** (`overlay_html`)
- ~~Split public `alumna` module vs auto-boot~~ **Done** (`start({ target })`, `boot_runtime`)
- ~~Parser-based import rewrite~~ **Done** (Acorn)

Phase 2 language work is **shipped** for 4.0.0-alpha.1. Phase 3 is **shipped** as `4.0.0-alpha.2`.

### Phase 3 — Production quality SPA `[SHIPPED]` as `4.0.0-alpha.2`

Shipped 2026-08-26 (details in §0.1):

- ~~Rolldown/OXC vendor bundling for npm imports (`alumna add`)~~ **Done**
- ~~Tree-shaken Svelte client runtime~~ **Done** (used `$` / named exports; not a full bun-split runtime)
- ~~Minify, hashed shared chunks~~ **Done**. Import-map integrity **Done** (sha384 SRI on vendor URLs + runtime)
- ~~CSS strategy (Q3): injected-dev / external-build; no FOUC~~ **Done** (fetch CSS before mount)
- ~~Base path (`/app/` hosted) (Q35)~~ **Done**
- ~~Source maps in dev, optional in build~~ **Done**
- ~~Keep 100% Jest coverage as a merge gate~~ **Done**

Leftover from this phase (not a blocker): none. Import-map integrity shipped in `4.0.0-alpha.7`.

### Phase 4 — SSG + hydration `[SHIPPED]` first slice as `4.0.0-alpha.3`

Shipped 2026-08-26 (details in §0.1):

- ~~`generate: 'server'` path (S3)~~ **Done**
- ~~Per-route HTML (`/about/index.html`, Q36)~~ **Done**
- ~~Static paths only (Q24). No `data()` in this slice (Q25; shape reserved)~~ **Done**
- ~~Hydration that then continues as SPA~~ **Done**
- ~~`alumna build --route` for one-route rebuild can wait~~ **Done as `alumna rebuild --route` / `--id` / `--listen` (Phase 5)**
- ~~Q44 (`ssg` / `prerender` / middleware skip) **decided**; not in alpha.3~~ **Done** (`4.0.0-alpha.4`)
- ~~`data()` waits (Q25)~~ **Done** (`4.0.0-alpha.5`; async `prerender` too)

### Phase 5 — Selective rebuild (Architect-facing) `[SHIPPED]` as `4.0.0-alpha.4`

Shipped 2026-08-26:

- ~~Manifest content-key mapping (even if keys are just route paths at first)~~ **Done** (`lookup` in `alumna-manifest.json`)
- ~~`alumna rebuild` API~~ **Done** (`--route`, `--id`, JS `rebuild()`)
- ~~Tiny notify HTTP listener (local)~~ **Done** (`alumna rebuild --listen`, `127.0.0.1`, `/notify`)
- ~~Atomic writes~~ **Done** (`atomic_write`: temp file, then rename)

### Phase 6 — Distribution `[SHIPPED]` as `4.0.0-alpha.5`

Shipped 2026-08-26:

- ~~Rolldown-bundle + `minify: true` (Oxc **inside Rolldown**) Alumna itself into one JS file, then **`bun build --compile`**. Required. See §3.5.1.~~ **Done** (`bun run build:binary` → `dist/alumna`)
- ~~First-need download of **Rolldown** into a cache dir. **Not** a separate Oxc binary. Optional `alumna setup` to prefetch Rolldown. See Q6.~~ **Done** (`4.0.0-alpha.6` also rewrites pluginutils imports and copies the `.node` so a compiled binary can load the cache)
- ~~`alumna add` uses **Bun’s installer inside the same binary** (`BUN_BE_BUN=1`, `--ignore-scripts`). No extra installer download. No Node/Bun on `PATH`. See §3.5.2 / Q42.~~ **Done**
- **npm `@alumna/alumna`** only if bun compile cannot ship. Compile **can** ship; GitHub Actions CI + Codecov on PRs **shipped** (`CODECOV_TOKEN`). A public GitHub download URL is not out yet. **Next conversation.**
- scriptc / AoT later as an optimization, not a gate.
- Docs: README is the complete author documentation (index, binary install, no npm as the Alumna install channel; first-need Rolldown; `data()`).

### Explicitly not scheduled until you ask

- HMR that preserves component state
- Nested layouts
- i18n framework
- Service worker / offline
- JWT helpers as a built-in (middleware example in docs instead)
- Real-time sockets (2.0 README listed this as “in development” for years)
- Modules marketplace (`altiva install user/repo`)
- TypeScript app.js
- SvelteKit compatibility / mixed apps

---

## 12. Questions — all answered 2026-08-26

Full table is in §15. Narrative answers that needed more than a yes/no:

**Q1 / Capacitor.** C: HTTPS origins. No Cordova, no PhoneGap, no `file://` loader. Capacitor (and later Tauri) should host a normal Alumna SPA; their WebView is their problem except we make it easy: configurable `base` (Q35), History fallback next to Navigation API, relative URLs, ESM + import maps. If a current Capacitor origin is not strict `https:` but is still a real origin (e.g. `https://localhost` or a custom scheme that supports modules), we treat it as C. Dual IIFE loader is off the table.

**Q4 / TypeScript.** Alumna = JS. Components may use `<script lang="ts">` and import `.ts` modules because Svelte 5 + OXC already strip types. No `tsc`. Advertise “works, not typechecked.” Drop it if the graph ever gets messy. Not in Hello.

**Q6 / Q7 / Q37 / Q42 / Q43 / distribution.** Rolldown-bundle and minify Alumna to one JS file (`minify: true` = Oxc inside Rolldown), then `bun build --compile`. Native **Rolldown** downloads on first `dev`/`build`. No separate Oxc CLI. `alumna add` uses Bun’s installer **inside the same binary** (`BUN_BE_BUN=1`; there is no `Bun.install()` JS API yet). npm `@alumna/alumna` is the fallback. scriptc AoT is later. **Contributors use Bun.** Node is still required to run Jest (Bun 1.4.0 cannot host that suite at 100% four-metric). Source is JS.

**Q19 / store.** No built-in store. Optional `src/store.svelte.js` with `$state`, imported like any module. Comment in Hello; do not generate the file.

**Q21 / `package.json` vs vendor chunks.** Not a contradiction — see §7.6. `package.json` is Alumna’s lockfile for libraries the **app** uses. `/_alumna/vendor/*.js` is what the **browser** loads. Alumna’s own distribution still aims to be a bun binary.

**Q39 / repo root.** **Done.** This directory is Alumna 4.0.0. Archaeology folders deleted by the author. Plan file kept.

**Q40.** 4.0 is a new project with a similar language. No extra 2.0 features. No automated migrator, ever (Q28). Q40a: hidden `alumna.start({ target })` for tests/embed, auto-start default. Q40b: no `globalVar`. Q40c: no `alumna install user/repo`.

**Q44 / which routes SSG.** Eligibility and expansion are separate. Master switch remains `--ssg` / hjson. On a route: optional `ssg` (boolean) and `prerender` (array of param objects, or an async function that returns that array). Defaults: static path with no route middleware → SSG; route middleware → SPA unless `ssg: true`; param / `*` → SPA unless `prerender`; `ssg: false` always SPA; redirects never. Global `app.middleware` does not skip. No second include/exclude map. **Shipped in alpha.4**; async lists **shipped in alpha.5** with Q25. Full table in §9.0.

---

## 13. Locked 4.0.0 picture

- This repo root, Svelte 5, `.svelte` only, runes-first, Alumna itself in JS.
- `src/app.js` VM-evaluated; 2.0 vocabulary + **one-level named layouts**; reserved route keys `layout`, `middleware`, `redirect`, `data`, `ssg`, `prerender`; snippets as areas; sequential default; no nested layouts; `app.group`; comma aliases; `:id` params.
- Native ESM `import()`, import maps, parallel `deps` load. No eval, no IIFE, no `Al.lib`.
- Navigation API + History fallback. HTTPS origins. Capacitor-friendly, not Cordova-special.
- Hidden Rolldown (first-need download). Oxc minify via Rolldown, not a second binary. Dev server rewritten inside Alumna (Pulsa/Liven ideas, not those packages).
- CLI: `new`, `dev`, `build`, `rebuild`, `preview`, `add`, `setup`. Zero config; optional `alumna.hjson`.
- Distribution: Rolldown-bundle + Oxc-minify Alumna → **bun compile**. `alumna add` = `BUN_BE_BUN=1` on that same file. npm fallback. scriptc later. Authors need no JS runtime on `PATH`, including for `add` (Q42). Contributors use Bun (Q43); Node remains for Jest only.
- SPA first. SSG next (`--ssg` / hjson). Manifest from day one. Architect deferred.
- Middlewares: `export default`, async, `middleware: ['auth']` only, run before load.
- No Unitflow, no directory router, no author-facing Vite, no built-in store/api, no `window.app`.
- Optional `src/store.svelte.js` as the one-line `$state` recipe.
- `alumna add` + hashed `/_alumna/vendor/` chunks; `package.json` only when libraries exist.

---

## 14. Mapping old code → new homes (for implementers)

| Old (2.0 / 3.0) | New (4.0) |
| --- | --- |
| `generators/app/maincode.js` validator | `[SHIPPED]` `src/compile/read-app.js` + `validate.js` + Jest |
| `maincode/organize-areas.js` | `[SHIPPED]` sequential keyed `$state` + snippet layouts in `shell.js` |
| `maincode.generate_route_functions` | `[SHIPPED]` `deps` in `_alumna/config.js` |
| `browser.js` `load` XHR + `new Function` | `[SHIPPED]` `import()` in `src/runtime/browser.js` |
| `browser.js` page.js / navaid | `[SHIPPED]` Navigation API + History in the same runtime file |
| `configRoute` middleware chain | `[SHIPPED]` `run_middleware` before `load_all` |
| `translate.js` IIFE wrap | **deleted** |
| `translate_imports` string replace | `[SHIPPED]` `rewrite.js` Acorn walk |
| `subcomponents.js` AST walk of `Al.component[` | `[SHIPPED]` `graph.js` via `parse({ modern: true })` |
| `compile_flow` + Unitflow | `[SHIPPED]` `project.js` + `svelte.js` (plain async, no Unitflow) |
| `server.js` Liven `memory()` | `[SHIPPED]` `dev/server.js` |
| `on_event.js` | `[SHIPPED]` `classify_watch` + `update_components`; not a per-module HMR patch |
| `dynamic_routing.js` string inject | `[SHIPPED]` `config.js` ESM export |
| `code.js` sequential `svelte:component` | `[SHIPPED]` `shell.js` `{#if}` + PascalCase `{@const C}` |
| `bundle_and_minify.js` esbuild spawn (linux-x64 only, 3-arg/2-param mismatch) | `[SHIPPED]` Rolldown in `compile/vendor.js` (vendor + minify, multi-arch) |
| Component `save.js` `slice(0, last_slash - 1)` + non-recursive `ensure_dir` | Normal `path.dirname` + `mkdir recursive` |
| Scaffold `index.html` still `/dev.js` after “build” | Emit `build/index.html` pointing at the boot file + import map |
| `altiva.hjson` middlewares map | `[SHIPPED]` `middleware:` in `app.js` + optional `alumna.hjson` |
| `modules/` + `altiva install` | `[SHIPPED]` `alumna add` + vendor chunks |
| `rsyncAssets` | copy `src/static` → `build/` |
| `fetchival` | optional, probably not |
| `Store` | user `$state` module |
| `pkg` binary | `bun build --compile` first; npm fallback; scriptc later |

---

## 15. Decision log

All `[PROPOSED]` items in the body were accepted on 2026-08-26 unless listed as rejected below. All `[DEFERRED]` items stay deferred (Architect CMS, HMR, nested layouts, View Transitions, protected-route sugar, i18n, SW, JWT helpers, modules marketplace).

| Date | ID | Decision |
| --- | --- | --- |
| 2026-08-26 | Q1 | HTTPS origins (C). No Cordova/PhoneGap/`file:`. Capacitor-friendly ordinary SPA; smallest B-shaped accommodation only if a current Capacitor origin cannot be treated as HTTPS-like. Native `import()` only. |
| 2026-08-26 | Q2 | ESM + import maps required. |
| 2026-08-26 | Q3 | CSS injected in dev, external files in build, SSG `<head>` links. |
| 2026-08-26 | Q4 | Alumna = JS. Component TS welcome if cheap (Svelte 5 + OXC, no `tsc`). Not in Hello. Drop if it gets hard. |
| 2026-08-26 | Q5 | `.svelte` only. |
| 2026-08-26 | Q6 | First-need download of native **Rolldown** into a cache. Not an author `npm install`. **No separate Oxc CLI** — Oxc minify/transform is Rolldown’s. Optional `alumna setup` to prefetch. A later “full” OS archive is allowed; not the 4.0.0 default. |
| 2026-08-26 | Q7 | Primary: Rolldown-bundle + minify Alumna to one JS file, then `bun build --compile` for 4.0.0 (no npm channel). npm package is contingency. scriptc AoT later. Binary is not a blocker for writing the compiler. |
| 2026-08-26 | Q8 | `alumna build` = SPA; `--ssg` or hjson `ssg: true`. |
| 2026-08-26 | Q9 | `src/static`. Copy, no rsync. |
| 2026-08-26 | Q10 | Pure apps: no `package.json`. `alumna add` creates one. |
| 2026-08-26 | Q11 | Comma-string aliases `'/, /home'`. |
| 2026-08-26 | Q12 | Layout areas = Svelte 5 snippets. |
| 2026-08-26 | Q13 | Named layout components + snippets. Sequential default. No magic grid. |
| 2026-08-26 | Q14 | No nested layouts in 4.0.0 (probably never). |
| 2026-08-26 | Q15 | `:id`. |
| 2026-08-26 | Q16 | Keep VM sandbox for `app.js`. |
| 2026-08-26 | Q17 | No `alumna.api`. |
| 2026-08-26 | Q18 | `import { goto, route } from 'alumna'`. |
| 2026-08-26 | Q19 | No built-in store. Document `src/store.svelte.js` + `$state`. Do not generate the file. |
| 2026-08-26 | Q20 | Rewrite the dev server inside Alumna. Do not revive liven/pulsa as deps. |
| 2026-08-26 | Q21 | `package.json` is Alumna’s lockfile for **app** libraries. Hashed `/_alumna/vendor/` chunks are what the browser loads. See §7.6. |
| 2026-08-26 | Q22 | Zero config. Optional `alumna.hjson` only (not a `.ts` config). |
| 2026-08-26 | Q23 | Async middleware: yes. |
| 2026-08-26 | Q24 | First SSG slice on disk: static paths only. |
| 2026-08-26 | Q25 | No `data()` in the first SSG slice. Shape reserved. **Shipped in `4.0.0-alpha.5`:** per-route `data: async () => {}`, Node-side, JSON props, `#alumna-data`, async `prerender`. |
| 2026-08-26 | Q44 | SSG eligibility vs expansion. Route `ssg` (boolean) and `prerender` (param objects). Route middleware skips SSG unless `ssg: true`. Global `app.middleware` does not skip. `ssg: false` wins. Param routes need `prerender`. **Shipped in alpha.4.** See §9.0. |
| 2026-08-26 | Q26 | Package name `@alumna/alumna`, CLI `alumna`. |
| 2026-08-26 | Q27 | MIT. |
| 2026-08-26 | Q28 | Similar language. No automated migrator (never). |
| 2026-08-26 | Q29 | Keep `app.group`. |
| 2026-08-26 | Q30 | Only `middleware: ['foo']`. No 2.0 array form. |
| 2026-08-26 | Q31 | Omit area = nothing mounted. |
| 2026-08-26 | Q32 | No cross-layout persistent instances in v1. |
| 2026-08-26 | Q33 | View Transitions later. |
| 2026-08-26 | Q34 | Prefetch on hover: on, known routes. |
| 2026-08-26 | Q35 | Configurable `base` (hjson). |
| 2026-08-26 | Q36 | SSG output `/about/index.html`. |
| 2026-08-26 | Q37 | Authors are not required to have Bun or Node on `PATH` if they have the Alumna binary. npm fallback needs Node current LTS. Alumna source is JS. Contributors use Bun (Q43). |
| 2026-08-26 | Q42 | `alumna add` needs no Node/Bun/npm on `PATH`. **Chosen:** spawn the compiled Alumna executable with `BUN_BE_BUN=1` and `add --ignore-scripts` (Bun docs since 1.2.16; no JS `Bun.install()` yet). Not arborist. Not Orogene. Not a second installer download. |
| 2026-08-26 | Q43 | Contributor default runtime is **Bun** (`bun install`, `bun src/cli.js`, bun-compile). Node stays **test-only** until Jest runs on Bun at 100% four-metric (verified Bun 1.4.0 + Jest 30 cannot). |
| 2026-08-26 | Q38 | Alumna CLI is JS. Architect is a separate app built *with* Alumna. |
| 2026-08-26 | Q39 | This directory is the 4.0.0 root. Archaeology folders deleted. Plan kept. |
| 2026-08-26 | Q21 | Confirmed: `package.json` is Alumna’s lockfile for app libraries; `/_alumna/vendor/` is what the browser loads. |
| 2026-08-26 | Q40 | New project, inspired not ported. Nothing extra from 2.0. |
| 2026-08-26 | Q40a | Hidden `alumna.start({ target })` for tests/embed. Auto-start default. |
| 2026-08-26 | Q40b | No `globalVar` / `window.app`. |
| 2026-08-26 | Q40c | No `alumna install user/repo`. `alumna add` for registry libraries only. |
| 2026-08-26 | Q41 | No runtime global. Public API is the `alumna` module. |
| 2026-08-26 | — | Manifest from day one. Architect fully deferred. `layout` reserved key accepted. |
| 2026-08-26 | Q39 | Executed: this directory is the 4.0 root; archaeology folders deleted. |
| 2026-08-26 | — | **Jest** is the test runner going forward (not `node:test`). Coverage must report **statements, branches, functions, and lines**. **100% on all four** is the gate once the basic roadmap (Phase 1 + Phase 2 + Jest port) is in. Until then, every session that touches `src/` expands coverage and prints the four-metric report. See §0.2. |
| 2026-08-26 | — | README is the **complete** documentation (newcomers and advanced). Concise, objective. Always an index. Authors install a **single binary**; do not document npm as the Alumna install channel. `alumna add` may use the npm registry for app libraries. |
| 2026-08-26 | — | Phase 3 shipped as `4.0.0-alpha.2`: `alumna add`, Rolldown vendor, minify, hashed chunks, `alumna.hjson`, `base`, sourcemaps, CSS-before-mount. |
| 2026-08-26 | — | Tests must cover **both directions**: unit (bottom-up) and integration + real-browser e2e (top-down). jsdom is not a real browser. Playwright Chromium is a contributor requirement for the full suite. See §0.2. |
| 2026-08-26 | — | SPA surface is enough to start Phase 4 (SSG). First slice: static paths, no `data()`, server compile, per-route HTML, hydrate then SPA. |
| 2026-08-26 | — | Phase 4 SSG first slice shipped as `4.0.0-alpha.3`. Parametric prerender, `data()`, and `alumna build --route` wait. |
| 2026-08-26 | Q44 | Which routes SSG: defaults + optional `ssg` / `prerender`. **Shipped in `4.0.0-alpha.4`.** |
| 2026-08-26 | — | Contributor package manager is **Bun only**. Commit `bun.lock`. Ignore npm / yarn / pnpm lockfiles. Use `bunx`, not `npx`. |
| 2026-08-26 | — | Rolldown is a **devDependency** in this repo. Authors get a first-need download. `devDependencies` does not stop bun-compile from bundling a static `import 'rolldown'`; that import must be externalized. **Done in alpha.5** (`load_rolldown()`). |
| 2026-08-26 | — | Q44 and Phase 5 shipped as `4.0.0-alpha.4`: route `ssg` / `prerender`, middleware skip, param lists, manifest `lookup`, `alumna rebuild`, localhost `/notify`, atomic HTML writes. `data()` still waits. |
| 2026-08-26 | — | Phase 6 + Q25 shipped as `4.0.0-alpha.5`: bun compile (`dist/alumna`), first-need Rolldown, `alumna setup`, `BUN_BE_BUN` `add`, `data()`, async `prerender`. |
| 2026-08-27 | — | Compiled binary could not load the Rolldown cache (`Cannot find package '@rolldown/pluginutils'`). **Fixed in `4.0.0-alpha.6`:** relative imports + `.node` copy + `layout-2` ready marker. |
| 2026-08-27 | — | Next conversation: `src/index.html` live reload in `alumna dev`; import-map integrity; public GitHub binary. Public binary requires GitHub Actions CI + Codecov on PRs (`CODECOV_TOKEN`) first. Architect and HMR still wait. |
| 2026-08-27 | — | `4.0.0-alpha.7`: `src/index.html` live reload in `alumna dev`; import-map SRI (`integrity` sha384); GitHub Actions CI + Codecov on PRs. Public binary URL still waits. Architect and HMR still wait. |

---

## 16. Conversation / revision log

| Date | Draft | What changed |
| --- | --- | --- |
| 2026-08-25 | 0.1 | Initial plan after reading all three trees, #1267, navaid#26, pulsa/liven/unitflow, Svelte 5 compiler docs, Navigation API Baseline 2026, import maps, Vite 8/Rolldown, scriptc. |
| 2026-08-25 | 0.2 | Second pass on 2.0: `_route` is the pattern not the pathname; query strings were absent; no 404; nested components required `Altiva.component['X']` + a rewrite so `new X` always hit the live cache; hjson round-trip merge; CLI tree-shake/inline claims were false; unused-component glob compile; Terser `negate_iife: false` existed only for the Function loader; bugs not to port (`rsyncAssets`/`deleteFiles`, undefined `path` in `showError`, dead `componentVersioning`); README JWT/sockets/packaging were not code; tests are the real docs. Split Q40 into 40a/b/c. |
| 2026-08-25 | 0.3 | Second pass on 3.0: `build()` missing on the class; hjson is an existence token; navaid **params discarded** (regression vs 2.0); script `onerror` treated as success; `compile_flow` early-return omits subcomponents on reused routes; `Object.keys[` bug + `next()` never called; no compiled-JS rewrite for children (authors must `Al.component['X']`); `svelte.compile` with no options; `file://` is *why* 3.0 used classic script IIFEs, not because ESM did not exist. Nuanced remount: same constructor in `svelte:component` can survive; layout snippets are the real spike. Kept “no Unitflow” despite the 3.0 report recommending it — that was your prior call. |
| 2026-08-25 | 0.4 | Second pass on feature-build: the idea to keep is **one boot file + per-route component files + shared internals** (full IIFE in dev, tree-shaken ESM union in prod). Do not copy: linux-x64-only esbuild, broken nested `save` paths, no `index.html` rewrite, `svelte.compile` with `dev: false` in dev, Terser-per-IIFE + esbuild-per-boot with no tests. 4.0 should achieve the same split with native ESM + import maps + a real multi-arch bundler. |
| 2026-08-26 | 1.0 | Author accepted every `[PROPOSED]` and `[DEFERRED]`. All Q1–Q41 answered. Q21 explained (lockfile vs vendor chunks). Distribution: bun compile first. Repo: recommend this directory as 4.0 root. Capacitor-friendly HTTPS SPA, not Cordova. |
| 2026-08-26 | 1.1 | Q21 confirmed. Q39 executed. Phase 0/1 implementation started on Node 26 + Bun 1.4. |
| 2026-08-26 | 1.2 | Recorded **4.0.0-alpha.1** delivery (file tree, what runs, what warns, what is unverified). Marked Phase 1 shipped with hygiene left. Testing policy: **Jest + 100% statements/branches/functions/lines**; next conversation starts with the Jest port, then layouts/middleware. |
| 2026-08-26 | 1.3 | Coding and text rules (§0.4). Jest port started. |
| 2026-08-26 | 1.4 | Jest **100%** four-metric on `src/**`. Acorn rewrite. Runtime `start({ target })` vs auto-boot. **S0 passed** (sequential + snippets). One-level named layouts. Middleware execution before load. Watch `classify_watch` + compile overlay. Next: Phase 3. |
| 2026-08-26 | 1.5 | Docs rules (§0.5): at session end always update this plan and CHANGELOG (when the product changed); update README only when authors need it. README is the whole author documentation, stay short, add an index only when it is large, two install blocks (authors vs developers). Contributor guide later; this plan coordinates phases. |
| 2026-08-26 | 1.6 | README rules tightened: complete docs for newcomers and advanced users; concise speaking; **always** an index; **no npm as Alumna install** (single binary). Phase 3 shipped as `4.0.0-alpha.2` (add, Rolldown, minify, hash, hjson, base, sourcemaps, CSS-before-mount). Next: optional polish, then Phase 4 when asked. |
| 2026-08-26 | 1.7 | Distribution: authors need no JS runtime on `PATH`, including for `alumna add` (Q42). Bundle+minify Alumna with Rolldown (`minify: true` / Oxc) then bun-compile. First-need Rolldown cache; no separate Oxc CLI. Reject arborist-in-binary and Orogene as 4.0 defaults. |
| 2026-08-26 | 1.8 | Q42 locked: `alumna add` uses Bun’s installer **inside** the compiled binary (`BUN_BE_BUN=1`). No extra installer. §3.5.1 confirmed: Rolldown-bundle + built-in Oxc minify, then bun-compile. |
| 2026-08-26 | 1.9 | Q43: contributors use Bun as the default runtime. Node remains for Jest only (`bun --bun jest` fails on Bun 1.4.0). `package.json` `"cli"` is `bun src/cli.js`. |
| 2026-08-26 | 1.10 | Used `.svelte` watch path recompiles that module only (`update_components`). Child-list change updates route `deps`. Vendor rebuilds only when imports change. Browser smoke still blocked (no Chromium/Firefox). Next: Phase 4 (SSG) when asked. |
| 2026-08-26 | 1.11 | Tests: unit + integration + Chromium e2e required from now on (§0.2 / §0.4). Playwright Chromium is a contributor requirement. Phase 4 (SSG) is ready to start (SPA surface is enough). Next: SSG first slice, then Hello in Chromium when installed. |
| 2026-08-26 | 1.12 | Contributor package manager is **Bun only** (`bun install`, `bunx`). Commit `bun.lock`; ignore npm/yarn/pnpm lockfiles. Rolldown is a devDependency (first-need download for authors is still Phase 6; a static import still needs to be externalized for bun-compile). Playwright: `bun install` then `bunx playwright install --with-deps chromium`. |
| 2026-08-26 | 1.13 | Phase 4 SSG first slice shipped as `4.0.0-alpha.3`: static paths, `generate:'server'`, per-route HTML, hydrate then SPA. Vendor import map always includes `svelte` (`mount`/`hydrate`). Chromium e2e: Hello + SSG click-through. Jest 100% (324 tests). Next: leftover SSG / Phase 5 only if asked. |
| 2026-08-26 | 1.14 | Q44: which routes get SSG. Defaults table in §9.0. Optional route keys `ssg` and `prerender`. Route middleware skips unless `ssg: true`. Not in alpha.3. |
| 2026-08-26 | 1.15 | Q44 + Phase 5 shipped as `4.0.0-alpha.4`: route `ssg` / `prerender`, middleware skip, param lists, manifest `lookup`, `alumna rebuild --route` / `--id` / `--listen`, atomic HTML writes. Hydrate sets `route` before first paint. Chromium e2e: param prerender, skip `/dash`, rebuild extra path. Jest 100% (353 tests). Next: Phase 6 / `data()` only if asked. |
| 2026-08-26 | 1.16 | Phase 6 + Q25 shipped as `4.0.0-alpha.5`: `data()`, async `prerender`, `bun run build:binary` → `dist/alumna`, first-need Rolldown, `alumna setup`, compiled `alumna add` (`BUN_BE_BUN=1`). Chromium e2e: `data()` hydrate then click. Jest 100% (424 tests). Next: leftovers only if asked (public binary URL, import-map integrity, Architect, HMR). |
| 2026-08-27 | 1.17 | Compiled-Rolldown cache fix as `4.0.0-alpha.6`: rewrite `@rolldown/pluginutils` to relative paths, copy the `.node` next to the loader, `layout-2` ready marker so `alumna setup` rebuilds a broken alpha.5 cache. Jest 100% (432 tests). Next: leftovers only if asked. |
| 2026-08-27 | 1.18 | Next conversation ordered: (1) `src/index.html` live reload in `alumna dev`; (2) import-map integrity; (3) public GitHub binary, after GitHub Actions CI + Codecov on PRs (`CODECOV_TOKEN`). Architect and HMR still wait unless asked. |
| 2026-08-27 | 1.19 | `4.0.0-alpha.7`: `src/index.html` live reload; import-map SRI; GitHub Actions CI + Codecov (`CODECOV_TOKEN`). Jest 100% (439 tests). Next: public GitHub binary URL. Architect and HMR still wait unless asked. |

---

## 17. Appendix — verbatim fragments worth not losing

### 17.1 The 2018 explanation (from #1267)

> You can define "areas" that can receive components, and in each route you choose which components must be loaded.
>
> The main concept of this approach is to know all the app structure from the beginning, which allow the creation of a "main app" component that has all the routing and component loading rules.
>
> Also, **routes that have one or more areas that use the same components**, those components remain untouched, which accelerates even more the route transition.

### 17.2 3.0 client loader (the behavior to preserve, not the implementation)

```js
load (url) {
  return new Promise(res => {
    if (Al.component[url]) return res(true);
    const js = document.createElement('script');
    js.src = Al.base + url + '.js';
    js.onerror = js.onload = () => { res(true); head.removeChild(js) };
    head.appendChild(js);
  })
}
```

4.0 equivalent: `import(url)` + module map. Same control flow: cache check, parallel `load_all`, then `show`.

### 17.3 3.0 `on_event` policy (dev server intelligence)

- Directory create: no refresh. Directory delete: refresh.
- `app.js`: recompile app + first-time components.
- Generated JS: never refresh.
- Non-component: refresh.
- Unused component: ignore.
- Delete used component: error, no refresh.
- Update used component: recompile; if subcomponent set unchanged, refresh; if changed, refresh routing too.

Keep this table. It is the DX.

### 17.4 2.0 middleware chain (the semantics to preserve)

Middlewares are named files, ordered, receive `(context, next)`, can short-circuit, and are compiled into a per-route pipeline on first use. Context has `current` and `next` with `_route`, `_path`, `_params`.

`_route` is the **pattern** (`'/:id'`), `_path` is the concrete URL, `_params` is the parsed object. Once a route pattern has been rendered in the session, **component loads are skipped** (`routes_rendered[route] = true`) but the context/params are still updated. First navigation has `current: null`. Context was a JSON clone (Dates/functions lost) — 4.0 can use a structuredClone or a plain immutable snapshot instead.

### 17.5 3.0-feature-build build flow (the sequence to preserve)

```
build_mode_flag → app_read → app_routes → app_validations
→ prepare_imports → components → app_code → app_compile
→ app_imports → app_translate → dynamic_routing → save
```

In 4.0 English: validate map → compile graph → rewrite + bundle vendor → emit SPA (and later SSG). Same movie, better actors.

---

*End of draft 1.19. Decisions locked. Phase 3–5, Phase 6 distribution, `data()` (Q25), the compiled-Rolldown cache fix, `src/index.html` live reload, import-map SRI, and GitHub Actions CI + Codecov are on disk (`4.0.0-alpha.7`). Contributors use Bun only, Node (Jest), and Playwright Chromium (`bunx`). Next conversation (§0.3): public GitHub binary download URL. Follow §0.2 both test directions and §0.5 at session end. Keep Jest 100%. Do not re-read archaeology. Do not re-do S0, Phase 3, SSG, Phase 5, Phase 6, `data()`, `index.html` reload, import-map integrity, or CI.*
