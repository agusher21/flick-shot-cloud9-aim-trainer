# Flick Shot — Cloud9 Aim Trainer

A fast, fun, booth-ready aim trainer built for the **Cloud9 x JetBrains Hackathon 2026 — Category 3: Event Mini Game**.

How fast are your flicks? Targets pop up across a bright sky field — click them as fast and accurately as you can in **60 seconds**. Small targets pay more, golden targets pay 3x, and every consecutive hit raises your combo multiplier. One miss resets the combo. Your score lands on a **local top-10 leaderboard** that lives on the machine — no Wi-Fi, no account, no network needed.

## How to run

No build step, no dependencies, no server required:

```bash
# Option 1 — just open it
open index.html        # or double-click it in your file manager

# Option 2 — any static server (optional)
python3 -m http.server 8000
# then open http://localhost:8000
```

Works fully offline. Open `index.html` in any modern desktop browser (Chrome, Edge, Firefox, Safari).

## Controls

- **Mouse only** — click targets to score. Clicking empty sky counts as a miss and resets your combo.
- **Enter** on the start screen also starts the game.
- **🔊 button** (top right) toggles sound.

## Features

- **Complete loop:** start screen → 60-second round → ending/score screen → play again.
- **60-second countdown** with a 3-2-1-GO start and a pulsing low-time warning under 10 seconds.
- **Target variety:** random sizes (small = more points), drifting targets, shrinking targets, and rare golden bonus targets worth 3x.
- **Combo multiplier:** consecutive hits raise the multiplier up to x3.0; a miss resets it.
- **Juice:** hit-burst particles, spawn rings, floating "+points" popups, screen shake on golden hits, and WebAudio-synthesized hit/miss/golden/countdown sounds (no audio files, no copyrighted material).
- **Stats:** final score, hits, misses, accuracy %, average reaction time (ms), best combo, and a rank title — Rookie / Sharp / Deadeye / Flick Master / Cloud9 Legend.
- **Local leaderboard:** top 10 scores saved in `localStorage` (with an in-memory fallback), shown on the start and end screens, highlighted entry for the player who just played.
- **Booth-ready:** every round fully resets (no leftover targets, timers, or state), the game stays responsive during sustained use, the layout adapts to any desktop window size, and there are zero runtime network requests — no CDNs, no web fonts, system fonts only.
- **Original art only:** sky, clouds, sun, targets, and palette are all original CSS artwork. No third-party game IP, names, art, logos, or trademarks anywhere.

## Files

| File | What it is |
|---|---|
| `index.html` | Single entry point — start / game / end screens |
| `style.css` | All styling, animated sky, targets, particles, HUD |
| `game.js` | All game logic (spawning, combo, timer, audio, leaderboard) |
| `README.md` | This file |
| `METHODOLOGY.md` | Problem, approach, and why it fits Category 3 |
| `TOOLING.md` | JetBrains tools used |
| `LICENSE` | MIT |

## License

MIT — see `LICENSE`. Copyright 2026 Toni Banzai (agusher21).
