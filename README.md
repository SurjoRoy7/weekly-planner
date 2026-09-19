# Weekly Planner v4

A local-first, gamified weekly planner rebuilt as a real multi-view app while keeping the monochrome spreadsheet-inspired visual style.

## Views

- Today — focused task + habit workspace with day tabs, daily goal, XP and upcoming tasks
- Dashboard — weekly progress chart, habit matrix, weekly summary and insights
- History — saved week cards with completion progress and jump-back navigation
- Settings — daily goal control, XP rules, habit management, JSON backup and demo/reset tools

## Data

The app keeps using the existing `weekly-planner-game-v2` localStorage key, so upgrading the same Vercel deployment in the same browser preserves v2/v3 planner data. A new optional settings object is added without changing the saved week structure.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

Replace the project files in the existing GitHub repository with this version and commit to `main`. The existing Vercel project should redeploy automatically. No environment variables are required for this local-only preview.

## Next backend phase

Supabase authentication + database sync can be added after the UI is approved. Until then, data remains browser-local.
