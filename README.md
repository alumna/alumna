# Alumna
![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/alumna/alumna/ci.yml) [![codecov](https://codecov.io/gh/alumna/alumna/graph/badge.svg?token=eXiY3W4jbg)](https://codecov.io/gh/alumna/alumna) ![GitHub package.json version](https://img.shields.io/github/package-json/v/alumna/alumna) ![GitHub License](https://img.shields.io/github/license/alumna/alumna)

You write routes and components. Alumna does the rest, in **one executable**.

An opinionated meta-framework for [Svelte](https://svelte.dev) 5.

**4.0.0-alpha.9**

## Contents

**Start here**

- [Welcome](#welcome)
- [Install](#install)
- [A small app](#a-small-app)
- [Commands](#commands)

**The app**

- [Project layout](#project-layout)
- [Areas](#areas)
- [Routes](#routes)
- [Components](#components)
- [Layouts](#layouts)
- [Groups, aliases, params, redirects](#groups-aliases-params-redirects)
- [Navigation](#navigation)
- [Middlewares](#middlewares)
- [Data](#data)

**Files and libraries**

- [Libraries](#libraries) — extra: [LIBRARIES.md](LIBRARIES.md)
- [CSS](#css)
- [Static files](#static-files)
- [Shared state](#shared-state)

**Config and shipping**

- [Config](#config)
- [Base path](#base-path)
- [Build and preview](#build-and-preview)
- [Static HTML (SSG)](#static-html-ssg)
- [Rebuild](#rebuild)
- [Embed](#embed)

**Notes**

- [Not in this alpha](#not-in-this-alpha)
- [Contributing](CONTRIBUTING.md)
- [Also](#also)
- [License](#license)

## Welcome

Front-end work should feel like building your app. For a long time, it has not.

A useful idea arrived, then another, then another: bundling, tree-shaking, minification, code splitting, lazy loading, live reload, SPA, SSG, hydration. Each one is mature now. Each one is worth keeping. Together they became a second job — a pile of libraries, CLIs, and config — before you could even show a page.

We do not have to throw that progress away to feel simple again. We can **automate** it.

Alumna is that path: **one opinionated executable**. You do not collect a stack of tools. You run `alumna`. It compiles your [Svelte](https://svelte.dev) components, loads only what the next route needs, live-reloads in development, and builds a SPA (and, when you ask, static HTML). You spend your time on routes and on the components each route uses. That is the whole contract.

If you have never used Svelte, you can still follow this file. The next two sections get a small site running. After that, the text turns into documentation: each idea in a short form first, then the details.

This is an alpha. A few things are still missing. The shape is already the one we wanted: start, then forget the machinery.

## Install

Alumna is **one executable**. Do not install it with npm. You do not need Node, Bun, or npm on your machine.

Linux and macOS:

```
curl -fsSL https://alumna.dev/install | bash
```

Windows:

```
powershell -c "irm alumna.dev/install.ps1|iex"
```

That puts `alumna` in `~/.alumna/bin` (Windows: `%USERPROFILE%\.alumna\bin`) and adds that folder to `PATH`. Pin a version on Unix with `curl -fsSL https://alumna.dev/install | bash -s -- v4.0.0-alpha.8`.

The first `alumna dev` or `alumna build` downloads Rolldown once (cached). You can run `alumna setup` first if you want that download before you go offline. A newer Alumna binary uses a new cache folder, so the first run after an upgrade may download again.

## A small app

```
alumna new my-app
cd my-app
alumna dev
```

Open `http://localhost:3030`. Live reload is on, including `src/index.html`. A compile error shows an overlay; the last good compile stays in memory.

`alumna new .` creates the same files in the current empty directory. A project name may use letters, numbers, `-`, `_`, and `.`.

You now have a running app. Three files matter:

```
src/app.js                 the map of the app
src/index.html             the HTML shell (title, fonts, meta)
src/components/Hello.svelte
```

`src/app.js` is not a bundler config. It is the app itself, written down:

```js
app.areas = [ 'content' ];

app.route[ '/' ] = {
	content: 'Hello'
};
```

In words: the page has one **area**, called `content`. The route `/` puts the component `Hello` there. `Hello` is the file `src/components/Hello.svelte`. That is the whole mental model.

A single screen does not show why this is pleasant. A small site does. Replace the generated files with a menu that stays put, and two pages.

`src/app.js`:

```js
app.areas = [ 'nav', 'content' ];

app.route[ '/' ] = {
	nav: 'MainMenu',
	content: 'Home'
};

app.route[ '/about' ] = {
	nav: 'MainMenu',
	content: 'About'
};
```

`src/components/MainMenu.svelte`:

```svelte
<nav>
	<a href="/">Home</a>
	<a href="/about">About</a>
</nav>
```

`src/components/Home.svelte`:

```svelte
<script>
	let name = $state('friend');
</script>

<h1>Hello, {name}</h1>
<p>You are on the home page.</p>
<label>
	Your name
	<input bind:value={name}>
</label>
```

`src/components/About.svelte`:

```svelte
<h1>About</h1>
<p>Two routes. Three components. The menu is the same on both pages, so it stays mounted when you move.</p>
```

Save. The browser reloads. You can delete `src/components/Hello.svelte`; unused components are not compiled. Click **About**, then **Home**. The menu does not tear down. The home page keeps its own state until you leave it.

You did not write a router package, a bundler config, a layout tree, or an adapter. You named the areas, you named which component sits in each area on each route, and you wrote those components. Rarely does a front-end tool stay out of the way this completely. That is the point. The rest of this file is the same idea, expanded.

A little Svelte, used above: `$state(...)` is a value that updates the page when it changes. `{name}` prints it. `bind:value={name}` keeps the input and `name` in sync. `<script>` is the logic; the rest is HTML. You can go a long way with only that. The [Svelte](https://svelte.dev) tutorial is there when you want more. Alumna will not add a second framework on top.

## Commands

```
alumna new <name>       Create a project
alumna new .            Create a project in the current empty directory
alumna dev [--port n]   Compile in memory, live reload (default port 3030)
alumna add <package>    Add a library for use in components
alumna setup            Download Rolldown into the cache (optional)
alumna build            Production SPA into build/
alumna build --ssg      Production SSG + hydration
alumna rebuild          Rebuild SSG pages (needs a prior build)
alumna preview          Serve build/ (default port 4040)
alumna --help
alumna --version
```

`--port` is not required, but when passed and it is busy, Alumna stops. Without `--port`, Alumna uses `alumna.hjson` `port` if set, then picks the next free port if that one is busy.

`alumna add` accepts several names: `alumna add marked date-fns`.

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

There is no author bundler config. A pure app has no `package.json` until you add a library.

`src/index.html` is yours: title, fonts, meta tags. Keep a normal `<html>`, `<head>`, and `<body>`. Alumna injects its boot script before `</head>`. You do not mount anything by hand.

## Areas

An **area** is a named slot on the page: `nav`, `content`, `footer`, and so on. You list them once:

```js
app.areas = [ 'nav', 'content' ];
```

Alumna mounts **one component per area**. If the next route uses the **same component on the same area** (and the same layout), that instance stays mounted. Only areas that change are swapped.

That is why the menu in [A small app](#a-small-app) survives navigation. It is not a nested-layout trick. It is the route file saying `nav: 'MainMenu'` twice.

Omit an area on a route to leave that area empty.

Area names cannot be the reserved keys: `layout`, `middleware`, `redirect`, `data`, `ssg`, `prerender`.

## Routes

A route is a path and a map of areas to component names:

```js
app.route[ '/' ] = {
	nav: 'MainMenu',
	content: 'Home'
};

app.route[ '/dash' ] = {
	layout: 'dash',
	nav: 'DashNav',
	content: 'Overview',
	middleware: [ 'auth' ]
};
```

You need at least one route. You need at least one area on a route, unless the route is only a [redirect](#redirects).

### Component names

`Hello` is `src/components/Hello.svelte`. Nested files use the path as the name: `layouts/Dash` is `src/components/layouts/Dash.svelte`.

### Reserved keys

These are not area names. They configure the route:

| Key | Meaning |
| --- | --- |
| `layout` | Named layout (see [Layouts](#layouts)) |
| `middleware` | List of middleware names (see [Middlewares](#middlewares)) |
| `redirect` | Other path; replaces the history entry |
| `data` | Function that returns JSON for the `data` prop (see [Data](#data)) |
| `ssg` | Force or skip static HTML when SSG is on |
| `prerender` | Concrete param pages for SSG |

### Catch-all

`app.route['/*']` is the fallback for unknown paths. Use it for a “not found” page.

Without it, an unknown path does not change the current view. A full load of an unknown URL still gets the SPA shell, then shows empty areas.

A `*` segment in another pattern is a rest param, available as `route.params._`:

```js
app.route[ '/files/*' ] = { content: 'File' };
```

`/files/a/b` → `route.params._` is `a/b`.

Exact paths win over params. `/users/me` and `/users/:id` can both exist; `/users/me` is the one that matches that URL.

## Components

Svelte 5, `.svelte` only, runes-first. Each route loads only the components it needs. The first visit to a route fetches that set. The next visit fetches only what is not cached yet. After a route has been seen, moving back to it is instant.

Area components receive a `data` prop (see [Data](#data)). It is `undefined` when the route has no `data` function.

### Child components

Import children with a relative path. They must stay under `src/components/`:

```svelte
<script>
	import Badge from './Badge.svelte';
	import { goto, route } from 'alumna';
</script>
```

From `src/components/dash/Page.svelte`, `./Modal.svelte` is `src/components/dash/Modal.svelte`, and `../Nav.svelte` is `src/components/Nav.svelte`. Imports that leave `src/components/` are rejected.

Children do not receive `data` unless you pass it.

In a pure app, legal imports are Svelte, `alumna`, and `./Something.svelte`. For a registry package, see [Libraries](#libraries).

### TypeScript

`<script lang="ts">` is allowed but types are only stripped, not checked, since there is no `tsc`. Type-only imports still count as dependencies and can bloat the import graph. If that happens, use plain JS in that component and remove type-only imports. `src/app.js` is JavaScript.

### A little Svelte

Enough to read this file:

| Syntax | Meaning |
| --- | --- |
| `let name = $state('friend')` | A reactive value |
| `let { data } = $props()` | Props from outside (including `data` from the route) |
| `{name}` | Print a value |
| `onclick={() => ...}` | An event |
| `{@render nav?.()}` | Render a snippet (used in layouts) |

## Layouts

By default, Alumna renders areas in `app.areas` order, with no extra wrapper. That is enough for a lot of apps. When you need a shared frame around the areas — a sidebar, a header row — you name a **layout**.

A named layout is a Svelte 5 component. Area contents are snippets:

```js
app.layout.dash = {
	component: 'layouts/Dash',
	areas: [ 'nav', 'content' ]
};

app.route[ '/dash' ] = {
	layout: 'dash',
	nav: 'DashNav',
	content: 'Overview'
};
```

`src/components/layouts/Dash.svelte`:

```svelte
<script>
	let { nav, content } = $props();
</script>

<aside>{@render nav?.()}</aside>
<main>{@render content?.()}</main>
```

Set `layout: 'dash'` on each route that should use it. Routes with no `layout` keep the sequential default.

A layout’s `areas` list must use names from `app.areas`. The layout component does not receive the route `data` prop; the area components do.

Layouts are one level. Nested layouts are not supported, and they are not planned. One wrapper around your areas is enough for almost every app. Nesting layouts is how the frame of the page becomes a puzzle.

Changing layout remounts the areas inside. Persistence (the menu that stays) holds **inside** the same layout, when the same component stays on the same area.

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

### Aliases

A comma list is several paths with the same route. `'/, /home'` is `/` and `/home`.

### Params and query

`:id` is one URL segment, available as `route.params.id`. Several params are fine: `/shop/:cat/:id`. Values are URL-decoded.

Query strings are `route.query`: `/search?q=alumna` → `route.query.q` is `alumna`.

```svelte
<script>
	import { route } from 'alumna';
</script>

<p>User {route.params.id}</p>
```

### Redirects

`redirect: '/new'` sends that path to another path and **replaces** the history entry, so Back does not return to `/old`.

### Groups

`app.group['/dash']` prefixes every inner path: `'/'` becomes `/dash`, `'/users'` becomes `/dash/users`.

`app.group['group:name']` only creates a group for organization purposes, like when reusing the same middlewares. It does not add a prefix to the path. Use it to keep related routes together.

Inner paths can use comma aliases too. A path may be defined only once; a group cannot collide with `app.route`.

## Navigation

```js
import { goto, redirect, prefetch, route } from 'alumna';

goto('/users/9');
redirect('/login');
prefetch('/about');

route.path      // '/users/9'
route.pattern   // '/users/:id'
route.params    // { id: '9' }
route.query     // { tab: 'info' } from ?tab=info
route.layout    // 'dash' or null
```

`goto` pushes a history entry. `redirect` replaces the current one (same as a route-level `redirect`). `prefetch` loads that route's components without moving. `route` is live: it always describes the screen that is showing. Reading `route.path` (or the other fields) in a Svelte template or `$derived` is reactive, so a layout that stays mounted still updates when the path changes.

Alumna uses the Navigation API when the browser has it, and the History API if not. Automatically and you don't need to worry about it.

`goto('/about')` is an **app** path. With a [base path](#base-path), the browser URL is `/app/about`. You still write `/about` in routes, in `goto`, and in `<a href>`.

### Links

Same-origin `<a href>` clicks are intercepted. The page does not reload. Hover prefetches known routes.

Alumna leaves the browser alone when:

- the link has `download` or `target` (including `_blank`)
- a modifier key is held (Ctrl, Meta, Shift, Alt), or it is not a left click
- the link is another origin
- it is only a hash on the same path (`#section`)

## Middlewares

A middleware is a small function that runs **in the browser**, **before** the next route’s components load. It can allow the navigation, or send the user somewhere else.

Put a file in `src/middlewares/`. The default export is the function. The name of the file is the name you list on the route.

```js
app.middleware = [ 'log' ];

app.route[ '/dash' ] = {
	content: 'Overview',
	middleware: [ 'auth' ]
};
```

`app.middleware` runs on **every** navigation. `middleware` on a route runs after that, only for that route. Both are arrays of names: `middleware: ['auth']`.

This is a gate for screens, not a server. It can hide `/dash` from a logged-out user. It cannot protect an API secret. Keep secrets on the backend.

### A login gate

`src/middlewares/auth.js`:

```js
export default async function auth (ctx, proceed, redirect) {
	if (!localStorage.getItem('session'))
		return redirect('/login');
	return proceed();
}
```

`src/app.js` (excerpt):

```js
app.route[ '/login' ] = {
	nav: 'MainMenu',
	content: 'Login'
};

app.route[ '/dash' ] = {
	nav: 'DashNav',
	content: 'Overview',
	middleware: [ 'auth' ]
};
```

`src/components/Login.svelte`:

```svelte
<script>
	import { goto } from 'alumna';

	function enter () {
		localStorage.setItem('session', '1');
		goto('/dash');
	}
</script>

<h1>Login</h1>
<button onclick={enter}>Enter</button>
```

That is enough to protect a screen in this alpha. A JWT helper is not built in; a middleware like this is the intended place for one.

### Global middleware

Use `app.middleware` for work that is not a gate: analytics, a title, a scroll reset. Those names still run on public pages.

```js
// src/middlewares/log.js
export default async function log (ctx, proceed) {
	console.log(ctx.current.path, '→', ctx.next.path);
	return proceed();
}
```

### The function

The default export is `async function (ctx, proceed, redirect)`.

`ctx.current` is the screen you are on. `ctx.next` is the screen you asked for. Each is `{ path, pattern, params, query, layout }`. Changing those objects does not change the router; they are copies.

Call **one** of:

- `proceed()` — run the next middleware, or load the route if this was the last one
- `redirect('/login')` — leave, and replace the history entry

Async is allowed (`await` a `fetch`, and so on). If you return without `proceed` or `redirect`, the navigation stops and the current view stays.

The file must exist at compile time. A missing `src/middlewares/auth.js` is a compile error.

### SSG

A route with `middleware: ['auth']` does **not** get static HTML, unless you set `ssg: true` on that route. Alumna will not write a public file for a page you already marked as gated. Global `app.middleware` does not skip SSG. See [Static HTML (SSG)](#static-html-ssg).

## Data

Optional `data` on a route is a function. Alumna runs it **outside the browser**: in `alumna dev` when the page asks, and at **build** time for pages that become static HTML. The result must be JSON. Area components receive it as the `data` prop.

```js
app.route['/about'] = {
	content: 'About',
	data: async () => {
		const res = await fetch('https://cms.example/about');
		return res.json();
	}
};

app.route['/blog/:slug'] = {
	content: 'Post',
	prerender: async () => [
		{ slug: 'hello' },
		{ slug: 'world' }
	],
	data: async (ctx) => {
		const res = await fetch('https://cms.example/posts/' + ctx.params.slug);
		return res.json();
	}
};
```

```svelte
<script>
	let { data } = $props();
</script>

<h1>{data.title}</h1>
```

The function receives `{ path, pattern, params, query, layout }`. At build time `query` is empty (static files have no query string). Alumna waits up to 30 seconds.

`src/app.js` is a plain script, not a module. You cannot `import` in it, and you cannot use Node `fs`. `fetch` is available. That is enough to talk to a CMS.

`data()` is **not** shipped to the browser. A production SPA (`alumna build` without `--ssg`) has no server to run it, so `data` will be `undefined`. For production data you either:

- use `alumna build --ssg`, so the JSON is written into the HTML (and into `/_alumna/ssg-data.js` for later client navigations), or
- `fetch` from the component itself, which always runs in the browser.

In `alumna dev`, the client calls `/_alumna/data?path=`. SSG writes the JSON into the page (`<script type="application/json" id="alumna-data">`). After the first static page, the client loads `/_alumna/ssg-data.js`.

`data` is a reserved route key.

## Libraries

Pure apps have no `package.json`. To use a registry package in a component:

```
alumna add marked
```

Then:

```svelte
<script>
	import { marked } from 'marked';
</script>
```

Alumna creates `package.json` and a lockfile if needed. It bundles **used** libraries into hashed files under `/_alumna/vendor/`. Unused names in `package.json` stay on disk; they are not sent to the browser. The browser never talks to npm. The Alumna binary installs the packages (Bun’s installer, inside the same file). You do not need Node, Bun, or npm on `PATH`.

If a component imports a package that is not installed:

```
"marked" is not installed.
Run: alumna add marked
```

Do not run `npm install` in the app. Use `alumna add`.

Versions, git, tarballs, local folders, and aliases: [LIBRARIES.md](LIBRARIES.md).

## CSS

Each component’s `<style>` is scoped to that component, as in Svelte.

In `alumna dev`, CSS is injected in the compiled module. In `alumna build`, CSS is a sibling `.css` file. Alumna waits for that CSS before it mounts the component, so the first paint of a route is not unstyled.

## Static files

Files in `src/static/` are served as-is in dev and copied first in build. Put `favicon.ico`, images, and robots.txt there. Generated files overwrite them if names clash (`index.html` from Alumna wins over `src/static/index.html`).

## Shared state

Alumna does not ship a store. Most screens do not need one: pass props, or keep state in the component that owns it. The menu that stays mounted is already shared in a stronger sense — it is the same instance.

When several components must share a value, put it in a small module under `src/components/` and import it:

```svelte
<!-- src/components/store.svelte -->
<script module>
	export const state = $state({ count: 0 });
</script>
```

```svelte
<script>
	import { state } from './store.svelte';
</script>

<button onclick={() => state.count++}>{state.count}</button>
```

Alumna does not generate this file. If you do not create it, nothing extra is compiled.

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

| Field | Meaning |
| --- | --- |
| `port` | Default port for `dev` / `preview` / `rebuild --listen` |
| `base` | URL prefix (see [Base path](#base-path)) |
| `out`, `build`, `build_dir` | Output directory (`build` by default) |
| `title` | Inserted only if `src/index.html` has no `<title>` |
| `sourcemap` | Source maps in `alumna build` (always on in `alumna dev`) |
| `ssg` | `true` is the same as `alumna build --ssg` |

`--port` overrides `port`. See [Static HTML (SSG)](#static-html-ssg) for `ssg`.

## Base path

Host the app under `/app/` (a subfolder, Capacitor, and similar):

```
base: /app
```

App paths stay `/about`. Browser URLs are `/app/about`. `goto`, `redirect`, `prefetch`, route patterns, and `<a href="/about">` all use the app path.

Root-absolute HTML links that Alumna does not intercept (a file in `src/static/`, a raw asset) must include the base, or use relative links. Capacitor and similar hosts use the same `base` setting. This is an ordinary SPA: there is no `file://` loader.

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
  _alumna/                  # runtime, vendor, ssg-data.js; spa.html when SSG
```

`alumna-manifest.json` is a snapshot of that build: areas, routes, deps, `base`, `ssg`, `prerender`, and `lookup`. The browser does not load it. `alumna rebuild` does. If it is missing, rebuild asks you to run `alumna build --ssg` first.

Production JS for the runtime and shared vendor chunks is minified. Vendor files are content-hashed. Source maps are on in `alumna dev`. In `alumna build` they are off unless `sourcemap: true` in `alumna.hjson`.

`alumna preview` serves `build/` (default port 4040). For unknown HTML paths it serves `_alumna/spa.html` when that file exists, otherwise `index.html`.

## Static HTML (SSG)

`alumna build --ssg` (or `ssg: true` in `alumna.hjson`) writes HTML for eligible routes. `/` → `build/index.html`, `/about` → `build/about/index.html`, `/blog/hello` → `build/blog/hello/index.html`. Unknown paths use `build/_alumna/spa.html`. `alumna preview` serves the directory index.

The first paint is that HTML. The client then hydrates and the app is a SPA. Clicks do not reload the page.

A SPA `alumna build` (no `--ssg`) ignores `ssg` and `prerender` on routes.

### Which routes become HTML

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

`ssg: false` wins over `prerender`. `ssg: true` on a param route without `prerender` is an error: say which URLs to write. Empty `prerender: []` means this pattern can SSG, but this build writes no pages for it.

Global `app.middleware` does not skip SSG. Route `middleware` does, unless you force `ssg: true`. That is the `/dash` + `auth` case: do not emit a public HTML file that looks like a logged-in shell.

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
```

### Param pages

`prerender` is an array of param objects, or a function that returns that array. Keys must match that route’s `:params`. The function may be async and may use `fetch`. It receives no arguments.

```js
app.route['/blog/:slug'] = {
	content: 'Post',
	prerender: async () => [
		{ slug: 'hello' },
		{ slug: 'world' }
	]
};

app.route['/shop/:cat/:id'] = {
	content: 'Product',
	prerender: [
		{ cat: 'books', id: '1' }
	]
};
```

`ssg` and `prerender` are reserved route keys.

## Rebuild

After `alumna build --ssg`, you can rewrite selected HTML without a full build. That is the primitive for a CMS that says “this page changed.”

```
alumna rebuild --route /blog/hello
alumna rebuild --id /blog/hello
alumna rebuild --listen [--port 4050]
```

`--route` is a concrete URL (for example `/blog/hello`), not a pattern. You can pass `--route` more than once. `--id` looks up that key in `alumna-manifest.json` `lookup` (in this alpha, keys are route paths). A path that was not in the original prerender list can still be written if the route allows SSG (`/blog/world` on `/blog/:slug` is fine).

Rebuild writes only those HTML files. It does not rewrite JS unless the compiled files changed. HTML writes are atomic (temp file, then rename). The `ssg-data.js` map is merged, not replaced.

`--listen` starts a **localhost** endpoint at `/notify` (default port 4050, host `127.0.0.1` only). POST JSON `{ "contentId": "..." }` or `{ "route": "/blog/hello" }`. GET query `?route=` or `?contentId=` / `?id=` also works.

## Embed

The boot script auto-starts when it is loaded as `/_alumna/runtime.js`. For tests or a custom mount:

```js
import { start } from 'alumna';
await start({ target: document.querySelector('#app') });
```

## Not in this alpha

HMR that keeps component state. A change reloads the page. That comes later.

Nested layouts are not supported and are not planned.

There is no SSR server in production. SPA, or SSG plus hydration.

No `alumna upgrade` / `alumna update` / `alumna remove` yet. Pin the binary at install time. Add libraries with `alumna add`; removing them is still manual.

See [ROADMAP.md](ROADMAP.md) for the rest of the list.

## Contributing

To work on Alumna itself, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Also

[Alumna Backend](https://github.com/alumna/backend) is a separate project with the same idea for the server. Independent, complementary.

## License

MIT. Copyright (c) 2015-2026 Paulo Coghi and contributors.
