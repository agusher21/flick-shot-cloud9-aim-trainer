# Tooling

Flick Shot was built with JetBrains tools, as required by the Cloud9 x JetBrains Hackathon 2026.

## Tools used

- **JetBrains WebStorm** — the primary IDE for the whole project: editing `index.html`, `style.css`, and `game.js`, live-previewing the game, and managing the project files. The `.idea/` project folder is committed to the repository as evidence of the WebStorm workflow.
- **Junie (JetBrains AI coding agent)** — assisted with writing and reviewing the game code: scaffolding the game loop, the combo/leaderboard logic, and the WebAudio sound synthesis, with every suggestion reviewed and tested by hand.
- **JetBrains Air** — used alongside WebStorm to keep the agent's changes in sync with the code and to review diffs before they landed.

## Notes

- The project has no build step and no dependencies — it is plain HTML + CSS + vanilla JavaScript, so WebStorm's built-in static preview is all that is needed to run it.
- No other editors were required for the submission, though the hackathon rules allow using other editors alongside JetBrains tools.
- The `.idea/` folder is intentionally committed (see `.gitignore` — it does not ignore `.idea`).
