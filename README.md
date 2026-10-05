# Glass Planner

A see-through glass to-do widget for Windows 11. Paste in a day's schedule,
tick tasks off, and keep a history of past days and photos.

Built with [Tauri 2](https://tauri.app) (Rust) + React + TypeScript, so the
installer is small and the app uses Windows' built-in WebView2.

## Install

Open the **Actions** tab, pick the latest green **Build** run on `main`, and
download `glass-planner-windows-installer`. Unzip it and run the
`Glass Planner_x.y.z_x64-setup.exe`. Tagged versions (`v0.2.0` …) also appear
under **Releases**.

## Using it

- **Paste** a schedule like the one below. A date line sets the day; bullet
  lines become tasks and times like `7:00-7:30 am`, `22:00-4:30 am` or
  `@ 7:00 am` are picked up.
  ```
  29 July 2026
  * Wake up @ 7:00 am
  * Cooking + Breakfast 7:30-8:00 am
  * Saying hi to roommates
  * Sleep 22:00-4:30 am
  ```
- Click a circle to tick a task, double-click its title to rename it.
- ⚙︎ sets the wallpaper, how much of the desktop shows through, the glass
  frost and the accent colour. 📌 cycles between a normal window, always on
  top, and stuck to the desktop like a widget.
- Data lives in `%APPDATA%\com.hashsign.glassplanner\` as one JSON file per
  day (`days/YYYY-MM-DD.json`) plus `photos/`.

## Developing

```sh
npm install
npm run dev          # UI only, in a browser, with localStorage standing in for disk
npm run tauri dev    # the real desktop window
npm test             # schedule parser tests
```

### Adding a panel

Create `src/features/<name>/index.tsx` with a default-exported component and
an optional `meta`. It appears in the side rail automatically:

```tsx
import type { FeatureMeta } from "../../shell/registry";
import { useApp } from "../../shell/AppContext";

export const meta: FeatureMeta = { title: "Study", icon: "📚", order: 20, placement: "side" };

export default function Study() {
  const { date } = useApp();
  return <div className="glass card">…</div>;
}
```

`placement: "side"` opens the panel next to the main view and widens the
window; `"main"` (the default) swaps the main view. Shared data types are in
`src/lib/types.ts` and storage calls in `src/lib/storage.ts`
(`loadDay`, `saveDay`, `listDays`, `loadDays`, `addPhoto`, `deletePhoto`,
`photoSrc`, `onDayChanged`). Task categories and their colours are
`CATEGORIES` in `src/lib/parser.ts`.
