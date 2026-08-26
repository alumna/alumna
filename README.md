# Alumna

Opinionated meta-framework for [Svelte](https://svelte.dev) 5. You write routes and components. Alumna handles routing, on-demand loading, and the bundler.

**4.0.0-alpha.4**

## Index

- [Install](#install)
- [Start](#start)
- [Commands](#commands)
- [Project layout](#project-layout)
- [Routes](#routes)
- [Areas](#areas)
- [Layouts](#layouts)
- [Groups, aliases, params, redirects](#groups-aliases-params-redirects)
- [Middlewares](#middlewares)
- [Components](#components)
- [Libraries](#libraries)
- [Navigation](#navigation)
- [CSS](#css)
- [Static files](#static-files)
- [Config](#config)
- [Base path](#base-path)
- [Build and preview](#build-and-preview)
- [Static HTML (SSG)](#static-html-ssg)
- [Rebuild](#rebuild)
- [Optional store](#optional-store)
- [Embed](#embed)
- [Not in this alpha](#not-in-this-alpha)
- [Developers](#developers)
- [License](#license)

## Install

Alumna is **one executable**. Put it on your `PATH`. Do not install Alumna with npm.

You do not need Node, Bun, or npm on your machine.

The first `alumna dev` or `alumna build` may download Rolldown once (cached). `alumna add` uses the installer already inside the Alumna binary.

Public binaries for this alpha are not out yet. Until they are, run Alumna from this repository. See [Developers](#developers).

## Start

```
alumna new my-app
cd my-app
alumna dev
```

Open `http://localhost:3030`. Live reload is on. A compile error shows an overlay; the last good compile stays in memory.

## Commands

```
alumna new <name>       Create a project
alumna new .            Create a project in the current empty directory
alumna dev [--port n]   Compile in memory, live reload (default port 3030)
alumna add <package>    Add a library for use in components
alumna build            Production SPA into build/
alumna build --ssg      Production SSG + hydration
alumna rebuild          Rebuild SSG pages (needs a prior build)
alumna preview          Serve build/ (default port 4040)
alumna --help
alumna --version
```

`--port` is required: if that port is busy, Alumna stops. Without `--port`, Alumna uses `alumna.hjson` `port` if set, then picks the next free port if that one is busy.

## Project layout

```
src/app.js                 routes, layouts, middlewares
src/index.html             HTML shell
src/components/*.svelte    Svelte 5 components
src/middlewares/*.js       optional route filters (`export default`)
src/static/                copied as-is
alumna.hjson               optional config
package.json               only after `alumna add`
```

There is no author bundler config.

## Routes

```js
app.areas = [ 'nav', 'content' ];

app.route[ '/' ] = {
	nav: 'MainMenu',
	content: 'Hello'
};

app.route[ '/dash' ] = {
	layout: 'dash',
	nav: 'DashNav',
	content: 'Overview',
	middleware: [ 'auth' ]
};
```

`Hello` is `src/components/Hello.svelte`. Nested files use the path as the name: `layouts/Dash` is `src/components/layouts/Dash.svelte`.

Omit an area on a route to leave that area empty.

Reserved route keys (not area names): `layout`, `middleware`, `redirect`, `data`, `ssg`, `prerender`.

`app.route['/*']` is the catch-all. Without it, an unknown path does not change the current view.

## Areas

Alumna mounts one component per area. If the next route uses the **same component on the same area** (and the same layout), that instance stays mounted. Only areas that change are swapped.

## Layouts

A named layout is a Svelte 5 component. Area contents are snippets.

```js
app.layout.dash = {
	component: 'layouts/Dash',
	areas: [ 'nav', 'content' ]
};
```

```svelte
<script>
	let { nav, content } = $props();
</script>

<aside>{@render nav?.()}</aside>
<main>{@render content?.()}</main>
```

Set `layout: 'dash'` on a route. Routes with no `layout` use the sequential default: areas render in `app.areas` order.

Layouts are one level. Nested layouts are not supported.

`layout` is a reserved route key. So are `middleware`, `redirect`, `data`, `ssg`, and `prerender`.

## Groups, aliases, params, redirects

```js
app.route[ '/, /home' ] = { content: 'Hello' };

app.route[ '/users/:id' ] = { content: 'User' };

app.route[ '/old' ] = { redirect: '/new' };

app.group[ '/dash' ] = {
	'/': { content: 'Overview' },
	'/users': { content: 'Users' }
};

app.group[ 'group:admin' ] = {
	'/admin': { content: 'Admin' }
};
```

- Comma aliases: `'/, /home'` is two paths with the same route.
- Params: `:id` is available as `route.params.id`.
- Query: `?q=1` is `route.query.q`.
- `redirect` replaces the history entry.
- `app.group['/dash']` prefixes paths. `app.group['group:name']` does not.

## Middlewares

Files in `src/middlewares/`. Default export. Async is allowed. They run **before** components load.

```js
app.middleware = [ 'log' ];

app.route[ '/dash' ] = {
	content: 'Overview',
	middleware: [ 'auth' ]
};
```

Only `middleware: ['name']`. The old array form `[ areaMap, 'name' ]` is invalid.

```js
export default async function auth (ctx, proceed, redirect) {
	if (!ok)
		return redirect('/login');
	return proceed();
}
```

`ctx.current` and `ctx.next` are `{ path, pattern, params, query, layout }`. Call `proceed()` or `redirect(path)`. Global names run first, then the route list.

## Components

Svelte 5, `.svelte` only, runes-first. Relative child imports:

```svelte
<script>
	import Badge from './Badge.svelte';
	import { goto, route } from 'alumna';
</script>
```

TypeScript in `<script lang="ts">` is stripped, not typechecked. Drop it if the graph gets messy.

## Libraries

Pure apps have no `package.json`. Legal imports: Svelte, `alumna`, and `./Foo.svelte`.

To use a registry package in a component:

```
alumna add marked
```

Then:

```svelte
<script>
	import { marked } from 'marked';
</script>
```

Alumna creates `package.json` and a lockfile if needed. It bundles used libraries into hashed files under `/_alumna/vendor/`. The browser never talks to npm. The Alumna binary installs the packages (Bun’s installer, inside the same file). You do not need Node, Bun, or npm on `PATH`.

If a component imports a package that is not installed:

```
"marked" is not installed.
Run: alumna add marked
```

Do not run `npm install` in the app. Use `alumna add`.

## Navigation

```js
import { goto, redirect, prefetch, route } from 'alumna';

goto('/users/9');
redirect('/login');
prefetch('/about');

route.path
route.pattern
route.params
route.query
route.layout
```

Same-origin `<a href>` clicks are intercepted. Hover prefetches known routes. Navigation API is used when present; History API is the fallback.

`goto('/about')` is an app path. With a [base path](#base-path), the browser URL is `/app/about`.

## CSS

Dev: CSS is injected in the compiled module. Build: CSS is a sibling `.css` file. Alumna waits for that CSS before it mounts the component, so the first paint of a route is not unstyled.

## Static files

Files in `src/static/` are served as-is in dev and copied first in build. Generated files overwrite them if names clash.

## Config

Zero config by default. Optional `alumna.hjson` in the project root:

```
# comments are allowed
port: 3030
base: /app
out: build
title: My app
sourcemap: false
ssg: false
```

`--port` overrides `port`. `out`, `build`, and `build_dir` all mean the output directory (`build` by default). `ssg: true` is the same as `alumna build --ssg`. See [Static HTML (SSG)](#static-html-ssg).

## Base path

Host the app under `/app/` (Capacitor, a subfolder, and similar):

```
base: /app
```

App paths stay `/about`. Browser URLs are `/app/about`. Root-absolute HTML links must include the base, or use relative links. Capacitor and similar hosts use the same `base` setting.

## Build and preview

```
alumna build
alumna build --ssg
alumna rebuild --route /about
alumna preview
```

Output:

```
build/
  index.html
  about/index.html          # only with --ssg
  alumna-manifest.json
  components/
  _alumna/                  # runtime, vendor; spa.html when SSG
```

`alumna-manifest.json` lists areas, routes, deps, `base`, `ssg`, `prerender`, and `lookup`.

Production JS for the runtime and shared vendor chunks is minified. Vendor files are content-hashed. Source maps are on in `alumna dev`. In `alumna build` they are off unless `sourcemap: true` in `alumna.hjson`.

## Static HTML (SSG)

`alumna build --ssg` (or `ssg: true` in `alumna.hjson`) writes HTML for the routes in the table below. `/` → `build/index.html`, `/about` → `build/about/index.html`, `/blog/hello` → `build/blog/hello/index.html`. Unknown paths use `build/_alumna/spa.html`. `alumna preview` serves the directory index.

When `--ssg` is on:

| Route | Result |
| --- | --- |
| Static, no route `middleware`, not a redirect | HTML |
| Static, has route `middleware: [...]` | SPA only |
| `ssg: false` | SPA only |
| `ssg: true` | HTML even with route middleware |
| Param / `*` | SPA only |
| Param + `prerender: [...]` | those concrete pages |
| Redirect and `/*` | never HTML |

`ssg: false` wins over `prerender`. `ssg: true` on a param route without `prerender` is an error. Global `app.middleware` does not skip SSG. `prerender` is an array of param objects; keys must match that route’s `:params`. Empty `prerender: []` writes no pages for that pattern in this build.

```js
app.route['/dash'] = {
	layout: 'dashboard',
	content: 'Overview',
	middleware: [ 'auth' ]
	// SPA only: route middleware, no ssg: true
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

`ssg` and `prerender` are reserved route keys. They apply only when the SSG switch is on. A SPA `alumna build` ignores them.

The first paint is the prerendered HTML. The client then hydrates and the app is a SPA. There is no `data()` hook in this alpha.

## Rebuild

After `alumna build --ssg`:

```
alumna rebuild --route /blog/hello
alumna rebuild --id /blog/hello
alumna rebuild --listen [--port 4050]
```

`--route` is a concrete URL (for example `/blog/hello`). `--id` looks up that key in `alumna-manifest.json` `lookup` (keys are route paths in this alpha). `--listen` starts a localhost endpoint at `/notify`. POST JSON `{ "contentId": "..." }` or `{ "route": "/blog/hello" }`. GET query `?route=` or `?contentId=` / `?id=` also works.

Rebuild writes only those HTML files. It does not rewrite JS unless the compiled files changed. HTML writes are atomic (temp file, then rename).

## Optional store

There is no built-in store. If you want shared state, add `src/store.svelte.js` yourself:

```js
export const state = $state({ count: 0 });
```

Import it from components. Alumna does not generate this file.

## Embed

The boot script auto-starts when it is loaded as `/_alumna/runtime.js`. For tests or a custom mount:

```js
import { start } from 'alumna';
await start({ target: document.querySelector('#app') });
```

## Not in this alpha

HMR that keeps component state, and a public binary download. Those come later. Nested layouts are not supported and are not planned. There is no `data()` hook yet.

## Developers

This section is for work on Alumna itself, not for installing Alumna as an author.

Need **Bun 1.4 or newer**. `bun install` and `bun src/cli.js` are the default. Do not use npm, yarn, or pnpm to install this repository. To run **all tests** you also need:

- **Node.js 22 or newer** (Jest). That split is temporary: Jest 30 does not run inside Bun 1.4 at 100% coverage.
- **Playwright Chromium** (real-browser tests). After `bun install`, run once: `bunx playwright install --with-deps chromium`. That command needs apt/sudo for OS libraries. Headless is enough; no display. Firefox is optional.

```
git clone <this-repo>
cd alumna
bun install
bunx playwright install --with-deps chromium
bun run test
bun src/cli.js new my-app
```

Tests must stay at 100% statements, branches, functions, and lines on `src/**`. Cover both unit tests and integration / real-browser tests.

## License

MIT. Copyright (c) 2015-2026 Paulo Coghi and contributors.
