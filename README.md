# Weekly Planner

A black-and-white gamified weekly planner and habit tracker recreated from the supplied reference video.

## Included in this build

- Monday–Sunday planner with real calendar dates
- Previous / next week navigation and a Today shortcut
- A separate saved record for every opened week
- History modal with completion summaries and jump-to-week controls
- Habit tracker with editable names, add/delete, checkboxes, and progress bars
- Daily tasks with editable labels, add/delete, and completion checkboxes
- Overall weekly chart and completion donut
- Daily task completion donuts
- XP system: +10 XP per completed task and +5 XP per completed habit check
- Level progression every 500 XP
- Best perfect-day streak across saved weeks
- Automatic local persistence with localStorage
- Responsive desktop/mobile layout
- Web app manifest + service worker for PWA/installable behavior

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Production build

```bash
npm run build
npm start
```

## Deploy on Vercel

1. Put this project in a GitHub repository.
2. Import that repository into Vercel.
3. Vercel should detect Next.js automatically.
4. Deploy with the default settings.

## Data storage

This version saves planner data in the browser with `localStorage`, so no database account is required. Data is specific to that browser/device.

Cloud accounts and cross-device synchronization need a backend such as Supabase or Firebase. They are intentionally not faked in this build because real authentication and cloud sync require your own project credentials.
