# Methodology — Flick Shot: Cloud9 Aim Trainer

## The problem

At an esports event booth, a fan has maybe two minutes between the queue moving and their friends getting bored. A booth game has to do three things at once: be instantly understandable with zero instructions, be genuinely fun in under three minutes, and reset cleanly so the next person in line can play without staff help. Most booth games fail one of the three — they need a tutorial, they drag on, or they leak state between players.

## The approach

Flick Shot is a 60-second aim trainer, because aiming is the one skill every esports fan already understands and secretly wants to measure:

- **One mechanic, zero tutorial.** Targets appear; you click them. That is the whole game, readable in a single line on the start screen. Mouse-only controls mean anyone — gamer or not — can play the second they sit down.
- **Skill, not luck.** Small targets pay more points than big ones, drifting and shrinking targets punish slow aim, and golden targets (3x points) reward sharp eyes. The combo multiplier (up to x3.0, reset by any miss) turns the round into a risk/reward decision: chase the streak or play it safe.
- **A reason to play again.** A 60-second round ends with a full stat sheet — score, accuracy, average reaction time in milliseconds, best combo, and a rank title — plus a local top-10 leaderboard. At a booth, the leaderboard is the game: beating the person before you is the hook that keeps the line moving. It is stored locally (`localStorage`, in-memory fallback) so it works with no Wi-Fi at all, exactly as the category brief asks.
- **Booth-proof engineering.** Every round is a clean slate: targets, particles, timers, and scores are all torn down on reset, so sustained use cannot leak state or slow the game. There are no runtime network requests — no CDNs, no web fonts — so the game cannot fail on venue Wi-Fi. The layout adapts to any desktop window size.

## Why it fits Category 3

The brief asks for a fast, engaging, intuitive mini game for a Cloud9 booth, with a complete start → play → ending loop, simple controls, clean resets, and — as a "next level" — a useful gamer skill plus a local leaderboard without Wi-Fi. Flick Shot delivers all of it: a 60-second aim/reaction drill (a real competitive skill, the same kind coaches measure), a local leaderboard, and a full loop that resets in one click. The sky-and-clouds theme is original art, with a Cloud9-inspired blue/white palette and no third-party game IP of any kind.

## What was measured while building

- A full round spawns roughly 110–150 targets; a strong player lands 50–70 hits.
- Rank thresholds were set from playtesting: Rookie (<1,500), Sharp (1,500), Deadeye (3,000), Flick Master (5,000), Cloud9 Legend (8,000+).
- Particles self-remove after their animation and expired targets are removed on a timer, so memory stays flat across many consecutive rounds.

## Tools

The game was built as plain HTML + CSS + vanilla JavaScript with no build step
and no dependencies. The project was opened and reviewed in **IntelliJ IDEA
Community Edition 2025.2.6.4**, the free JetBrains IDE; the IDE-generated
`.idea/` project folder is committed in this repository as evidence (see
`TOOLING.md` for the full, corrected tooling record). Code was written and
tested with Muse + Codex, and the IDE was used for editing and review.
