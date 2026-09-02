# Nordic Dispatch

A daily headline board: hyperlinked headlines only, no summarizing. Two sections —
**Abroad** (international press coverage of the Nordics, via GDELT) and **At Home**
(top recent headlines from one national outlet per Nordic country, via RSS).

## No API keys needed

Both data sources are free and keyless:
- **GDELT DOC 2.0 API** — public, no signup, no rate-limit key.
- **RSS feeds** — public feeds from SVT (Sweden), NRK (Norway), DR (Denmark),
  Yle (Finland), and RÚV (Iceland). Public broadcasters were chosen over
  commercial outlets because their feeds are stable and unpaywalled.

So "setting up the APIs" here just means running the project — there's no
account to create or secret to paste in.

## How the daily-catch-up logic works

- The app stores the timestamp of your last check in your browser (`localStorage`).
- The "Check for news" button is disabled once you've used it for the day, and
  re-enables the next calendar day.
- When you check, it asks each source for everything published *since your last
  check* (capped at 14 days back, so a long absence doesn't pull in a huge dump).
  - GDELT genuinely supports this — it can search any date range.
  - RSS feeds only contain whatever's currently live on the outlet's site
    (usually the last day or so), so if you miss several days, some older
    home-country stories may have already scrolled out of the feed by the time
    you check back. There's no way around this without paying for a
    historical-archive API — worth knowing so it doesn't feel like a bug.

## Project structure

```
nordic-dispatch/
├── api/
│   ├── gdelt.js         # serverless function: international coverage
│   └── nordic-rss.js    # serverless function: national outlet headlines
├── src/
│   ├── App.jsx          # UI + refresh logic
│   ├── index.css        # styling
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

## Run it locally

You'll need the Vercel CLI so the `/api` functions run locally too (plain
`vite dev` won't serve them).

1. Install dependencies:
   ```
   npm install
   npm install -g vercel
   ```
2. Start the dev server:
   ```
   vercel dev
   ```
3. Open the URL it prints (usually `http://localhost:3000`).

The first load auto-fetches the last 24 hours so the page isn't empty; after
that, the button follows the once-a-day rule described above.

## Deploy (GitHub → Vercel, same as your other projects)

1. Create a new GitHub repo and push this folder to it:
   ```
   git init
   git add .
   git commit -m "Nordic Dispatch"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. In Vercel: **New Project** → import that GitHub repo → it auto-detects Vite
   → **Deploy**. No environment variables needed.
3. Visit your `.vercel.app` URL — that's it.

## Customizing

- **Add or swap an outlet**: edit the `OUTLETS` array at the top of
  `api/nordic-rss.js` — each entry is just `{ country, outlet, url }`.
- **Headlines per outlet**: change `MAX_PER_OUTLET` in `api/nordic-rss.js`
  (currently 6).
- **How far "Abroad" reaches back on a first-ever check / long absence**:
  change `MAX_LOOKBACK_DAYS` in either API file (currently 14).
- **Language filter for international coverage**: `api/gdelt.js` currently
  restricts to `sourcelang:english`. Remove that clause from the `query`
  string to include coverage in other languages too.

## A note on the feed URLs

The five outlet RSS URLs were verified as currently live via web search while
building this, but outlets do occasionally restructure their sites and break
feed URLs without notice. If one outlet stops showing headlines, that section
will just say "Feed unavailable right now" rather than breaking the whole
page — check FeedSpot or the outlet's own site for an updated RSS link and
swap it into `OUTLETS`.
