# Alumna

Opinionated meta-framework for [Svelte](https://svelte.dev) 5. Write routes and components. Alumna handles routing, on-demand loading, and the bundler.

**4.0.0-alpha.1:** `new` / `dev` / `build` / `preview`, named layouts, front-end middlewares. SSG is not in this alpha.

## Install

Need [Node.js](https://nodejs.org) 22 or newer.

```
npm i -g @alumna/alumna
```

Need [Bun](https://bun.sh) 1.4 or newer on the machine that **first** runs `alumna dev` or `alumna build`. Alumna uses it once to bundle Svelte for the browser (then cached).

If this alpha is not on npm yet, see [Developers](#developers).

## Start

```
alumna new my-app
cd my-app
alumna dev
```

Open `http://localhost:3030`.

## Commands

```
alumna new <name>       Create a project
alumna new .            Create a project in the current empty directory
alumna dev [--port n]   Compile in memory, live reload
alumna build            Production SPA into build/
alumna preview          Serve build/ (default port 4040)
```

## An app is this

```
src/app.js                 routes, layouts, middlewares
src/index.html             HTML shell
src/components/*.svelte    Svelte 5 components
src/middlewares/*.js       optional route filters (`export default`)
src/static/                copied as-is
```

```js
app.areas = [ 'nav', 'content' ];

app.layout.dash = {
	component: 'layouts/Dash',
	areas: [ 'nav', 'content' ]
};

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

`Hello` is `src/components/Hello.svelte`. The same component on the same area across routes stays mounted. A layout is a Svelte 5 component that renders area snippets.

Also: groups (`app.group`), comma aliases (`'/, /home'`), params (`:id`), redirects (`redirect: '/new'`), global `app.middleware`.

## License

MIT. Copyright (c) 2015-2026 Paulo Coghi and contributors.

## Developers

Clone this repo, then:

```
npm install
npm test
node src/cli.js new my-app
```

Need Node.js 22+ and Bun 1.4+ (same first-run Svelte bundle as above).
