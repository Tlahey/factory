# Bug: React hydration error on every page load (raw i18n keys rendered by SSR)

**Severity:** High — fires on every single page load in the browser console, and briefly flashes raw translation keys (e.g. `common.overview`) instead of real text before React discards and re-renders the tree.

**Status:** Confirmed live in browser (Next.js dev overlay + console).

## Root cause

`LocalizationManager` (`apps/game/src/game/systems/LocalizationManager.ts`) is a module-level singleton whose constructor kicks off translation loading asynchronously and never awaits it:

```ts
private constructor() {
  // Load default locale
  this.loadTranslations("en"); // fire-and-forget, returns a Promise
}
```

`loadTranslations` uses a dynamic `import("../data/locales/en.json")`, which always resolves at least one microtask later. Any synchronous call to `localization.t(key)` that happens before that promise resolves — which is exactly what happens during Next.js SSR/prerendering, and confirmed by the build log:

```
🌐 [Localization] Key not found: "common.overview" (locale: en)
🌐 [Localization] Key not found: "building_menu.intro_title" (locale: en)
...
🌐 [Localization] Loaded "en" translations.
```

— returns the raw key string instead of the translated value (`t()` falls into its "key not found" branch and returns `key`).

On the client, by the time hydration/first paint happens, translations are already loaded, so the client renders the real text (`"Overview"`). This produces a server/client mismatch that React reports as a **recoverable hydration error** on literally every load.

## Reproduction

1. `npm run dev:game`, open `http://localhost:3000`.
2. Open the browser console / Next.js issues overlay.
3. Observe:
   ```
   Uncaught Error: Hydration failed because the server rendered text didn't match the client. ...
   + common.overview
   - Overview
   ```
   at `src/components/ui/BuildingMenu.tsx:106`:
   ```tsx
   {
     hoveredBarBuilding ? t("common.building") : t("common.overview");
   }
   ```

This isn't specific to `BuildingMenu` — it's a structural issue in `LocalizationManager`, so any component that calls `t()` during the initial/server render is affected the same way.

## Suggested fix

Make translation loading synchronous/available before first render instead of an unresolved background promise:

- Import the default locale JSON statically (`import en from "../data/locales/en.json"`) and seed `this.translations` with it synchronously in the constructor, then only use the async path for locale _switches_ (`setLocale`), or
- Gate the app's initial client/server render on a "translations ready" flag so `t()` is never called before the default locale is loaded.
