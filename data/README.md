# data/

Gym Buddy JSON is checked in under `food-log/`, `gym-log/`, and `body-reports/`. Weather-sim JSON is checked in under `weather-sim/`. The app reads both at request time.

Void/dry-run prediction days (including `2026-09-09`) are hidden. Files under `weather-sim/dry_run_archive/` stay in the tree for history and are not loaded as live predictions.

Do not commit invented gym or weather numbers as if they were real — update the JSON files instead.

## Gym

### `food-log/YYYY-MM.json`

```json
{
  "daily_targets": { "kcal": 2400, "protein_g": 180, "carb_g": 250, "fat_g": 70 },
  "entries": [
    {
      "date": "2026-09-10",
      "meal": "breakfast",
      "items": [{ "name": "Eggs", "kcal": 300, "protein_g": 20, "carb_g": 2, "fat_g": 22 }],
      "totals": { "kcal": 300, "protein_g": 20, "carb_g": 2, "fat_g": 22 }
    }
  ]
}
```

Numbers as numbers. Missing fields `null`.

### `gym-log/YYYY-MM/index.json` + session files

`index.json` may list `{ "sessions": [{ "date": "2026-09-08", "file": "2026-09-08.json" }] }` or inline session objects. Session files:

```json
{
  "date": "2026-09-08",
  "session_type": "A_upper",
  "exercises": [{ "name": "Bench press", "sets": 4, "reps": 8 }]
}
```

`session_type` examples: `A_upper`, `B_lower`.

### `gym-log/exercise-muscles.json`

Optional muscle map for the Gym heatmap (`body-muscles` ids). Each exercise has `aliases`, `main`, `supporting`, `weight_main`, and `weight_supporting`. Missing weights fall back to top-level `weight_defaults` (main `1.0`, supporting `0.4` in the checked-in file). Logged names are matched after stripping full-width/ASCII parentheses and Chinese suffixes; the longest alias or canonical key wins (`Super high row` stays off generic `Row`). The page scores sets in the browser from this file plus session JSON. A missing or invalid file leaves both charts empty and does not crash.

### `gym-log/next-session.json`

Overwrite after each logged session. Missing file → Gym page shows a quiet empty state.

```json
{
  "session_type": "B_lower",
  "split_label": "B · Legs + core",
  "suggested_date": "2026-09-13",
  "duration_min": { "full": 50, "short": 30 },
  "goals": ["compound rest ~2 min"],
  "exercises": [
    { "name": "Squat", "sets": 3, "reps": "8-12", "priority": "primary", "notes": null }
  ],
  "short_version": [{ "name": "Squat", "sets": 3, "reps": "8-12" }]
}
```

### `body-reports/index.json`

```json
{
  "reports": [
    {
      "measured_at": "2026-09-08T08:00:00Z",
      "metrics": {
        "weight_kg": 81.6,
        "fat_percent": 17.8,
        "muscle_kg": 63.7,
        "smm_kg": 38.4,
        "bmr_kcal": 1794
      }
    }
  ]
}
```

## Predictions (weather-sim)

Live files: `predictions/`, `bets/`, `accounts.json`, `state.json`, `config.json`. Archived dry-run output lives under `dry_run_archive/` and is not scored.

### `weather-sim/predictions/YYYY-MM-DD.json`

London / Tokyo / Hong Kong × d1 / d2 / d3 high-temp buckets. City keys may be `london` / `tokyo` / `hong_kong`. Horizons are nested under `horizons`. Mark unused days with `"void": true`, `"dry_run": true`, `"status": "void_dry_run"`, or `"exclude_from_scoring": true` (they are hidden in the UI, as is `2026-09-09`).

```json
{
  "date": "2026-09-10",
  "cities": {
    "london": {
      "horizons": {
        "d1": { "target_local_date": "2026-09-11", "predicted_tmax_c": 22.13, "predicted_bucket": "22°C" },
        "d2": { "target_local_date": "2026-09-12", "predicted_tmax_c": 22.8, "predicted_bucket": "23°C" },
        "d3": { "target_local_date": "2026-09-13", "predicted_tmax_c": 23.3, "predicted_bucket": "23°C" }
      }
    }
  }
}
```

A flatter `{ "d1": { "high_c": 21, "bucket": "20-22" } }` shape is also accepted.

### `weather-sim/accounts.json`

Nine accounts with stable `account_id` (`london_d1` … `hong_kong_d3`). Balance is `bankroll` (alias `balance`).

```json
{
  "accounts": [
    { "account_id": "london_d1", "label": "London D1", "bankroll": 900 }
  ]
}
```

### `weather-sim/bets/open.json` and `history.json`

`horizon` may be `1`/`2`/`3` or `"d1"`/`"d2"`/`"d3"`. Date may be `date`, `target_date`, or `predicted_at`. The Predictions matrix has one row per city × horizon account and columns for the last three target dates (on or before `state` as-of). History `resolved_bucket` (alias `resolved`) colors settled cells.

```json
{
  "bets": [
    {
      "account_id": "london_d1",
      "city": "london",
      "horizon": 1,
      "target_date": "2026-09-11",
      "bucket": "22°C",
      "stake": 100,
      "status": "open"
    }
  ]
}
```

History `resolved_bucket` is the official settled bucket for that city + target date. Void bets/days and dry-run files (including `2026-09-09`) are omitted from the matrix.

### `weather-sim/state.json`

```json
{
  "updated": "2026-09-10T06:54:10Z",
  "void_dry_run_date": "2026-09-09",
  "void_dry_run": { "date": "2026-09-09", "status": "void_dry_run" }
}
```
