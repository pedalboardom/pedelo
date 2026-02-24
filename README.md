# Pedal Elo

Guitar pedals are deeply subjective — but what if the collective taste of the community could surface a real ranking? Pedal Elo puts two pedals head-to-head and asks you to pick the better one. Every vote updates a shared leaderboard using the Elo rating system, the same math that ranks chess grandmasters, competitive video game players, and football clubs worldwide.

## What it does

The app presents a random matchup from a library of guitar pedals. You click the one you prefer. Behind the scenes, both pedals' ratings update based on how surprising the result was — a nobody beating a top-ranked pedal earns a lot of points; expected wins earn almost nothing. Over enough votes from enough people, the leaderboard converges on a genuine community consensus.

Three voting modes let you slice the data different ways:

- **Global** — all pedals in the pool, one shared leaderboard
- **Brand Pool** — filter to specific brands you care about
- **Brand Battle** — force every matchup to pit one pedal from Brand A against one from Brand B, with a completely separate Elo pool so the results don't pollute the global rankings

An **Analysis** panel tracks the leaderboard in depth: a searchable rankings explorer, a brand-level report, the most hotly contested pedals (win rates nearest 50%), a live match feed, and an upsets tracker for when underdogs pull off a win against the odds.

An **About** panel explains the Elo system from first principles — the expected score formula, the rating update equation, and the tiered K-factor schedule the app uses.

## Why Elo

Traditional 5-star ratings collapse — everything ends up between 3.8 and 4.6 and the ordering is meaningless. Elo forces a choice. You can't hedge by giving everything four stars. Every vote is a direct comparison, and the system rewards accurate predictions over time. A pedal that keeps beating higher-rated opponents will climb; one that keeps losing to lower-rated opponents will fall, regardless of how many glowing reviews it has elsewhere.

The app uses a tiered K-factor specifically tuned for crowdsourced voting:

- **K = 64** for a pedal's first 30 matches — high volatility so new entrants find their level fast rather than getting anchored near the 1200 starting rating by a handful of early mismatches
- **K = 32** for matches 31–100 — the standard FIDE rate, responsive but stable
- **K = 16** for 100+ matches — a well-evidenced rating that resists manipulation from sudden vote streaks

## Tech stack

- **React + Vite** — frontend
- **Vercel** — hosting and serverless functions
- **Upstash Redis** — shared persistent storage for rankings and vote history
- **`api/redis.js`** — a thin Vercel serverless proxy that keeps Upstash credentials server-side; the browser never sees the token
- **PedalPlayground** — open source pedal data and images, fetched fresh on every build

## Credits

Built by [Jeremy Abramson](https://www.linkedin.com/in/jeremydabramson/). Pedal data and images from [PedalPlayground](https://github.com/PedalPlayground/pedalplayground). Elo methodology based on the work of Arpad Elo, as standardised by FIDE for competitive chess.
