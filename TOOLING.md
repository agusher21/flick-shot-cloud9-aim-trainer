# Tooling — JetBrains IDE usage for this entry

## JetBrains tool used

**IntelliJ IDEA Community Edition 2025.2.6.4** (build 252.28539.149, product code `IC`) —
the free, open-source JetBrains IDE. The project was opened in the IDE on
19 Nov 2026; the IDE generated the project's `.idea/` directory (module file,
`modules.xml`, `misc.xml`, `vcs.xml`), which is committed in this repository as
evidence. The game files (`index.html`, `game.js`, `style.css`) were opened and
reviewed in the IDE editor. No game code was changed by the IDE session.

## What did NOT happen (corrected 19 Nov 2026)

An earlier draft of this file claimed WebStorm, Junie and JetBrains Air were used.
That was not true when it was written, so those claims are removed here.

- **WebStorm 2026.3** was installed and launched on the build machine, but its
  30-day trial could not be activated: the machine's sandbox egress policy blocks
  outbound TCP from JVM processes, so the trial activation call never reached
  JetBrains (the IDE reported "Unsupported or unrecognized SSL message" and the
  activation dialog blocked further use). WebStorm was therefore not used on
  this project.
- **Junie** and **JetBrains Air** were researched but never used on this project.

IntelliJ IDEA Community Edition needs no license or activation, so it is the
JetBrains tool actually used for this entry.

## Notes

- The project has no build step and no dependencies — plain HTML + CSS + vanilla
  JavaScript — so the IDE was used for editing and review, not for a build.
- `.idea/workspace.xml` is intentionally NOT committed: the IDE's own default
  `.idea/.gitignore` excludes it (it holds per-user editor state).
- The `.idea/` folder is intentionally committed (see `.gitignore` — it does not
  ignore `.idea`).
