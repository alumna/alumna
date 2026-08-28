# Contributing to Alumna

This file is for work on Alumna itself. To *use* Alumna, install the binary. See [README.md](README.md).

Why Alumna is shaped this way: [PRINCIPLES.md](PRINCIPLES.md). What is not done yet: [ROADMAP.md](ROADMAP.md).

In a new working session, read those two files plus this one. Do not re-open [PRINCIPLES.md](PRINCIPLES.md) unless we ask.

## Setup

Need **Bun 1.4 or newer**. `bun install` and `bun src/cli.js` are the default. Do not use npm, yarn, or pnpm to install this repository. Commit `bun.lock`. Ignore npm / yarn / pnpm lockfiles. Use `bunx`, not `npx`.

To run **all tests** you also need:

- **Node.js 22 or newer** (Jest). That split is temporary: Jest 30 does not run inside Bun 1.4 at 100% coverage.
- **Playwright Chromium** (real-browser tests). After `bun install`, run once: `bunx playwright install --with-deps chromium`. That command needs apt/sudo for OS libraries. Headless is enough; no display. Firefox is optional.

```
git clone <this-repo>
cd alumna
bun install
bunx playwright install --with-deps chromium
bun run test
bun src/cli.js new my-app
bun run build:binary    # writes dist/alumna for this machine
```

Rolldown is a **devDependency**. Contributors get it from `bun install`. The author binary must **not** embed Rolldown’s native binding (`load_rolldown()`). `devDependencies` does not stop `bun build --compile` from bundling a static `import 'rolldown'`.

## Tests

Jest is the runner. `bun run test` starts Node. Report **statements, branches, functions, and lines**. **100% on all four** on `src/**` is the gate. Do not use `/* istanbul ignore */` except for a one-line platform stub that cannot run in CI.

Keep **both directions**:

- **Unit** (bottom-up): one function or module at a time.
- **Integration and Chromium e2e** (top-down): real CLI, HTTP, compiler, Rolldown; Playwright Chromium for author-visible flows (Hello, navigation, live reload, overlay, SSG, rebuild, `data()`).

jsdom is not a real browser. It is fine for unit tests of `src/runtime/browser.js`. It does not replace Chromium.

## Binary and release

`bun run build:binary` bundles Alumna with Rolldown, then `bun build --compile` for this machine. `bun run build:release` writes one archive per Bun target under `dist/release/` plus `SHA256SUMS`. In both cases the binary does not embed Rolldown’s native binding.

A git tag `v<version>` (must match `package.json`) starts a **draft** GitHub Release. On alumna.dev, serve `scripts/install.sh` at `/install` and `scripts/install.ps1` at `/install.ps1` as `text/plain`. See `scripts/nginx-install.example.conf`.

GitHub Actions runs `bun run test` on pull requests and uploads coverage and JUnit to Codecov.

## Code and text

4.0 is a new project. There is no retro-compatibility. New code must be easy to read. Efficiency and performance always come first. Prefer faster code, less work, and fewer allocations when that stays simple. Use easy names. When a file or method is too long, split it. Unify repeated logic when that is simpler.

Do not remove comments from unchanged code. When you change commented code, keep the comments true. Add comments on new or existing complex code.

Comments, README, CONTRIBUTING.md, PRINCIPLES.md, ROADMAP.md, CHANGELOG, PR text, Release text, and commit messages use very simple English. Prefer one simple phrase when that is clearer than several short ones.

## Docs at the end of a session

- [CHANGELOG.md](CHANGELOG.md) — always (product first; a short docs line if that is all that changed).
- [README.md](README.md) — when authors need a change (command, language, install, a false fact). Do not put internals there “because we worked.”
- This file — when clone, test, binary, or release steps change.
- [PRINCIPLES.md](PRINCIPLES.md) — when a locked product choice changes (in conversation).
- [ROADMAP.md](ROADMAP.md) — when pending work changes.
