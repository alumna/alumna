# Roadmap

What is not done yet. Product choices and the principles that guide how Alumna works are in [PRINCIPLES.md](PRINCIPLES.md).

## Next

After **at least one GitHub Release is published**:

- **`alumna upgrade`** — reuse install-script target detection and `SHA256SUMS`. Do not start this before that Release exists.

## For later

- Architect (CMS), as a separate Alumna app
- HMR that keeps component state
- View Transitions
- i18n
- Service worker / offline
- JWT helpers as a built-in (a middleware example in docs is enough until then)
- Real-time sockets
- TypeScript `app.js`
- A “full” OS archive (Alumna + Rolldown) if offline-first install becomes a real request
- scriptc / porffor or other AoT compiler for smaller binary
- **Minify compiled Svelte output in `alumna build`.** Today `runtime.js`, `match.js`, and `/_alumna/vendor/` are minified; `components/*.js` and `_alumna/app.js` are the Svelte compiler’s raw emit. Same minify path as the runtime, production only (`alumna dev` stays readable).
- **Easier optional store, still zero cost if unused.** No default store in the binary and no generated `src/store.svelte.js`. If the author creates that file, Alumna can map it (for example `import { … } from 'store'`) so the path is short. If the file is missing, no extra JS is emitted.
- **`alumna update`** — update packages that `alumna add` installed (not Alumna itself; that stays `alumna upgrade`).
- **`alumna remove`** — uninstall those packages. If the name is not in the app’s `package.json`, print a clear notice and do not fail as if the disk were corrupt. Prefer `remove` over `delete`.

## Not planned

- Nested layouts
- Modules marketplace (`alumna install user/repo`)
- SvelteKit compatibility / mixed apps
- An automated migrator from Alumna 2.0 / 3.0
- Cordova / PhoneGap / `file://` as a first-class loader
