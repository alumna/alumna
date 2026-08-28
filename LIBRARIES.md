# Libraries

The [README](README.md#libraries) has the usual path: `alumna add marked`, then `import { marked } from 'marked'`. This file is the rest.

Alumna is not a package manager with a second personality. `alumna add` installs a library so a **component** can import it. Alumna then bundles what you actually import into hashed files under `/_alumna/vendor/`. The browser never talks to npm.

The installer inside the Alumna binary is [Bun’s `add`](https://bun.sh/docs/pm/cli/add). That is why some extra specifiers work. It is also why this file exists: not every `bun add` flag or workflow is an Alumna feature.

## Contents

- [Add and import](#add-and-import)
- [Versions and names](#versions-and-names)
- [What Alumna does with a library](#what-alumna-does-with-a-library)
- [What will not work](#what-will-not-work)
- [Other origins](#other-origins)
- [What `alumna add` will not pass through](#what-alumna-add-will-not-pass-through)

## Add and import

```
alumna add marked
```

```svelte
<script>
	import { marked } from 'marked';
</script>
```

Several names at once:

```
alumna add marked date-fns
```

A pure app has no `package.json`. The first `alumna add` creates one (private, `"type": "module"`) and a lockfile. Later adds keep that file.

Do not run `npm install` in the app. Use `alumna add`. You do not need Node, Bun, or npm on `PATH`.

If a component imports a package that is not installed:

```
"marked" is not installed.
Run: alumna add marked
```

The **import** is always a package name (`marked`, `@scope/pkg`). The **origin** (registry, git, a tarball URL) lives in `package.json`. Components do not import `github:…` or `npm:…` strings. Alumna treats those as invalid library specifiers.

## Versions and names

The default origin is the npm registry.

```
alumna add marked
alumna add marked@15.0.0
alumna add marked@^15.0.0
alumna add marked@latest
alumna add @scope/pkg
alumna add @scope/pkg@^2.0.0
```

A tag (`@latest`, `@next`) or a range (`@^15.0.0`) is a suffix on the name. It is not a CLI flag.

After install, import the **name**, not the version:

```svelte
<script>
	import { marked } from 'marked';
	import { something } from '@scope/pkg';
</script>
```

Subpaths follow the package’s exports, as usual: `import x from 'pkg/subpath'`.

There is no `alumna update` or `alumna remove` yet. Pin a version when you add. Removing a library is still manual (and you must drop the import, or compile will ask you to add it again).

## What Alumna does with a library

1. `alumna add` writes the name into `package.json` and installs it on disk.
2. When a **used** `.svelte` file imports that name, compile bundles it for the **browser**.
3. The result is hashed files under `/_alumna/vendor/`, listed in the import map.
4. Names that sit in `package.json` but are never imported are not sent to the browser.

Unused installed packages stay on disk. That is fine. They do not become vendor chunks.

The author binary always runs the installer with `--ignore-scripts`. Lifecycle scripts from the package (`postinstall` and similar) do not run. That is deliberate.

## What will not work

The vendor bundle is a browser bundle. A library that needs Node (`fs`, `path`, `node:…`), a native addon, or a CLI binary will fail at compile or in the browser, even if `alumna add` installed it cleanly.

Alumna does not typecheck. `<script lang="ts">` only strips types. Adding `@types/…` does not change that. Skip type packages unless you truly import them.

Svelte itself is already provided. Do not `alumna add svelte`.

## Other origins

The golden path is the npm registry. Other origins exist because the installer is `bun add`. They are useful in a pinch. They are not a second way to structure an Alumna app.

Whatever the origin, the library must still:

- install as a real package (its own `package.json`, a name you can import)
- resolve from the project
- bundle for the browser

[Bun’s `add` page](https://bun.sh/docs/pm/cli/add) is the installer reference. The notes below are what matters **here**.

### npm alias

Install a registry package under a different name. Import the alias.

```
alumna add my-marked@npm:marked
alumna add my-marked@npm:marked@15.0.0
```

```svelte
<script>
	import { marked } from 'my-marked';
</script>
```

In `package.json` this looks like `"my-marked": "npm:marked"`. Use it when two packages want the same name, or when you want a stable import while the underlying package changes.

### Git

Public or private git repositories. Bun documents `github`, `git`, `git+ssh`, and `git+https`.

```
alumna add github:owner/repo
alumna add github:owner/repo#v1.2.3
alumna add git+https://github.com/owner/repo.git
alumna add git+ssh://github.com/owner/repo.git#v1.2.3
alumna add git@github.com:owner/repo.git
```

Private repos need SSH (or other git) credentials on **your** machine. The Alumna binary does not store git secrets.

The repo must be an installable package. A random source tree is not enough. Import the **package name** from that repo’s `package.json`, not the `github:…` string.

Bun may fetch GitHub repos as HTTP tarballs when it can. That is an installer detail.

### Tarball

A publicly hosted `.tgz`:

```
alumna add https://registry.npmjs.org/marked/-/marked-15.0.0.tgz
alumna add marked@https://registry.npmjs.org/marked/-/marked-15.0.0.tgz
```

The URL is written into `package.json`. If the URL contains credentials, they are written there too. Prefer a registry version or a git tag.

A local tarball uses a `file:` path to a `.tgz`. Same rule: it must unpack to a package you can import by name.

### Local folder

A folder on disk that is already a package:

```
alumna add file:../my-utils
```

Use this while you develop a library next to the app. The folder needs its own `package.json`. Import that package’s `name`.

### Link

```
alumna add link:../my-utils
```

Also a local folder, installed as a symlink instead of a copy. Same import rule. Prefer this only when you already know you want a symlink.

### Not an Alumna app structure

Bun also has **workspaces**, **catalogs**, and `--filter` for monorepos. Alumna is one project directory: `src/app.js`, `src/components/`, `alumna add`. Do not reach for `workspace:` to invent a framework layout. If a library lives in another folder, `file:` or `link:` is the honest extra.

## What `alumna add` will not pass through

`alumna add` takes package specifiers only. A token that starts with `-` is rejected (`Invalid package name`).

These `bun add` flags are **not** available through `alumna add`:

- `--dev` / `-d`, `--optional`, `--peer`
- `--exact` / `-E` (write the version on the specifier instead: `marked@15.0.0`)
- `--global` / `-g`
- `--filter` / `-F`, `--catalog`

There is no global install. There is no “devDependency” split that changes what the browser receives: if a component imports it, it is bundled.

Pin a version on the name. That is the Alumna way.
