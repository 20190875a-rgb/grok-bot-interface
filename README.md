# grok-bot-interface

Dark HeroUI viewer for **Gym Buddy** and **weather-sim** JSON. No CMS, no auth — files under `data/` are read at request time in `next dev`, and baked into the static export at `npm run build`.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
```

That writes a static site to `out/`. Preview with any static server, for example `npx serve out`.

Pages: `/` (and `/gym`) Gym · `/predictions` Predictions.

## GitHub Pages

The site is published from the **`gh-pages`** branch (Settings → Pages → Deploy from a branch → `gh-pages` / `/`).

The Pages URL is `https://20190875a-rgb.github.io/grok-bot-interface/`. A production build with `GITHUB_PAGES=true` sets `basePath` and `assetPrefix` to `/grok-bot-interface` (the repository name). User/org sites named `*.github.io` omit that prefix so they can live at the domain root. Local `npm run build` leaves `basePath` empty.

## Where JSON lives

Drop live files in `data/` using the contracts in [`data/README.md`](data/README.md).

**Gym Buddy JSON is in this branch** (`data/food-log`, `data/gym-log`, `data/body-reports`). Gym reads those files at build time for the static export (and on each request in `next dev`) — they are not sample numbers.

**Weather-sim JSON is in this branch** (`data/weather-sim`: predictions, bets, accounts, state, config, dry_run_archive). Predictions reads the live files. Void/dry-run days (including `2026-09-09`) are hidden; `dry_run_archive/` is not loaded as live data. Sample fixtures are only used if those files are missing.

| Domain | Paths |
| --- | --- |
| Gym food | `data/food-log/YYYY-MM.json` |
| Gym next session | `data/gym-log/next-session.json` |
| Gym sessions | `data/gym-log/YYYY-MM/index.json` + session files |
| Body reports | `data/body-reports/index.json` |
| Predictions | `data/weather-sim/predictions/YYYY-MM-DD.json` |
| Bets | `data/weather-sim/bets/open.json`, `history.json` |
| Accounts / state | `data/weather-sim/accounts.json`, `state.json` |

Void and dry-run prediction days are hidden (including `2026-09-09`).

## Stack

Next.js App Router, HeroUI (dark only, purple accent), Tailwind CSS v4.
