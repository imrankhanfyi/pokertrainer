# Changelog

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
