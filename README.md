# Weekly Planner — Focus Workspace Edition

A Next.js weekly planner inspired by a monochrome spreadsheet dashboard, redesigned to remove the repetitive seven-column task section and replace it with a focused daily workspace.

## What changed in this version

- Replaced seven full daily task cards with a compact Monday–Sunday day selector.
- Added a large selected-day workspace with one task list at a time.
- Overall chart bars are now clickable and open that day.
- Added quick task entry: type a task and press Enter.
- Added task priority: High, Medium, Normal.
- Added task categories: General, Work, Study, Health, Personal, Errand.
- Added an 80% daily goal indicator.
- Added current goal streak and best goal streak.
- Added level progress and XP-to-next-level information.
- Added upcoming unfinished tasks from later in the week.
- Added weekly insights: strongest day, day needing attention, most missed habit, task completion, and comparison with the previous saved week.
- Kept week history, local browser saving, editable habits, and PWA files.
- Existing v2 localStorage data remains compatible; older tasks simply default to General / Normal when shown.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Deploy to Vercel

Import the repository into Vercel. The framework should be detected as Next.js automatically. No environment variables are required for this local-storage version.

## Storage

Planner data is stored in the browser using `localStorage` under `weekly-planner-game-v2`. It does not sync across devices yet.
