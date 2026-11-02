# Hold’em Coach – notes for Claude sessions

User-facing setup, deploy and content-editing docs are in `README.md`. This file covers only what a new code session needs. Change history: `CHANGELOG.md`.

## What it is
- An iPhone-first static PWA that teaches No-Limit Hold'em: 6 lessons, drills, a "Mix it up" mode and Progress stats.
- No backend and no accounts.
- Live at https://imrankhanfyi.github.io/pokertrainer/. The repo is github.com/imrankhanfyi/pokertrainer (public).
- `.github/workflows/deploy.yml` runs tests, builds and deploys on every push to `main`. Netlify is configured (`netlify.toml`) but not connected.
- Stack: Vite 8, React 19, TypeScript, Vitest, vite-plugin-pwa. Routing is hash-based and `base` is `'./'`.

## Map
| Area | Where |
|---|---|
| Drill generators (each returns a `Question` with `facts` for the AI) | `src/engine/scenarios/*.ts` |
| Lessons, ranges, hands, glossary | `src/data/` |
| State and storage, plus API keys (one localStorage key per provider, never in state or backups) | `src/lib/storage.ts` |
| AI: OpenAI Responses API, the shared `SYSTEM_PROMPT`, `scenarioMessage`, `errorText(kind, provider)` | `src/lib/openai.ts` |
| AI: Gemini generateContent | `src/lib/gemini.ts` |
| AI: dispatcher | `src/lib/ai.ts` |
| AI chat sheet: "Explain more", and "Why isn't that right?" when the student types their reasoning | `src/screens/ExplainSheet.tsx` |
| Practice screen, with the reasoning box shown on wrong answers | `src/screens/Practice.tsx` |
| Settings, with the provider choice | `src/screens/Settings.tsx` |
| Layout check | `scripts/layout-check.mjs` |

## Rules that aren't obvious from the code
- **API keys:** never hard-code them, put them in env vars or the build, commit them, or include them in backups. Keys stay in localStorage, masked in the UI, with a Remove button. Each key goes only to its own provider.
  - Gemini errors are readable from the browser.
  - The OpenAI-only `diagnose()` fallback must never receive a Gemini key.
- **New settings fields:** any new field in `Settings` must also be added to `normalise()` in `storage.ts`. Otherwise it silently resets on every load. `tests/gemini.test.ts` has a round-trip test.
- **iPhone storage:** the home-screen app and Safari tabs keep separate localStorage. That's the likely cause of "my progress disappeared" reports, not a save bug; on 2026-11-02 WebKit showed save → reload working. Progress and Settings show a `StorageNote` when the app isn't running from the home screen.
- **Verification:**
  - `npm test`, `npm run build`, then `npm run layout` (WebKit, iPhone SE/15/Pro Max, light and dark).
  - The layout check needs the Playwright WebKit browser: `npx playwright install webkit`, ~300 MB. The user's disk is tight, so delete `~/Library/Caches/ms-playwright` and `layout-shots/` afterwards.

## Where to pick up (as of 2026-11-02)
1. **Gemini works end to end.** On 2026-11-02 the user confirmed on iPhone that a real free key, Check and the "Why isn't that right?" box all work.
2. **The progress-loss report is unconfirmed.** The user was asked whether they practised in Safari and then checked the home-screen app, or re-added the icon. Follow up if it recurs inside the installed app.
3. **Deploy warnings:** the GitHub Actions in `deploy.yml` (checkout, setup-node, upload-artifact and deploy-pages, all @v4) are flagged as Node-20-deprecated, and ubuntu-latest is moving to 26. Bump them when convenient.
4. **Optional:** connect Netlify (see README §2B).

Retire this section once those items are done; history goes in `CHANGELOG.md`.
