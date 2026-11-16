# Changelog

## 2026-11-16 — v2.1
- **In-app number pad for typed answers.** On iPhone, the system keyboard covered the sticky answer box, and scrolling to it pushed the cards off screen. Typed answers now use a built-in pad (1–6 / 7–0 ⌫, plus Check), so the keyboard never opens. On short screens (iPhone SE in Safari) the cards shrink and the outs summary line is hidden. `npm run layout` now fails if the cards and the pad aren't both fully visible.

## 2026-11-16 — v2 (branch `v2`; spec in `docs/v2-spec.md`)
- **Big-blind check bug fixed:** facing limpers, the big blind could be told to fold hands like K5s. Unlisted hands now default to check (chart-level `default`), with a regression test.
- **New "Home 6" format (default):** 6-handed, loose-passive home game. Ranges cite Advanced Poker Training's "NL Hold'em Starting Hand Charts" (charts #1 and #3); deviations are listed in the `src/data/ranges/index.ts` header. The big-blind defence against a raise uses the 6-max range rather than the source's "pairs and AQ". Existing installs are switched to Home 6 once (state `version` 1 → 2).
- **Three grades:** Right / Close call (amber, not counted as a miss) / Mistake. A close call is a hand next to a different action on the 13×13 grid, and it now works for the blinds too. Stats count close calls separately.
- **Chart after a miss:** a "See the whole chart" grid with your hand outlined.
- **Typed answers:** outs and % are typed in, and so is the "% you need" in pot odds. Feedback shows the working one step at a time: the out cards flash up, chip bars show the pot, and a "need" line sits next to your chance.
- **Order-of-play oval:** a small dot oval showing who has acted, who has folded, you, and who is still to come, on starting hands, post-flop and full hands. Full-hand steps now record `inHand`/`acted`.
- **Layout check:** it now handles typed answers and expands the working and chart.

## 2026-11-02
- **Gemini option for "Explain more":**
  - Settings now offers a choice of AI provider, Gemini (free tier, default model `gemini-3.5-flash-lite`) or OpenAI.
  - Each provider's key is stored separately on the device and never included in backups.
  - Gemini errors such as a bad key, a free-limit hit or an unknown model get their own messages.
- **"Why isn't that right?":** after a wrong answer, the student can type what they were thinking, and the AI coach responds to that reasoning.
- **Positions questions:** they now give the AI the seat order and where the student sits relative to the button.
- **Separate-storage reminder:** Progress and Settings show it when the app is open in a browser tab rather than from the home screen. The app also asks the browser to keep its storage.
- **"Try again":** hidden for errors a retry can't fix (bad key or model name).
- **Docs:** README updated for Gemini setup and the iPhone storage split. Added `CLAUDE.md` with handoff notes.

## 2026-10-31
- Lessons 1–6, practice drills, Progress stats, Settings, and OpenAI "Explain more".
- Deployed to GitHub Pages.
