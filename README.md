# Hold’em Coach

An iPhone-first practice app for the fundamentals of No-Limit Texas Hold’em.
It's a static site with no backend and no accounts. It works offline, except for the optional “Explain more” button.

**Status:** all six lessons and their drills are built:
1. Table basics
2. Starting hands
3. Outs and the rule of 2 and 4
4. Pot odds
5. A default post-flop plan
6. Full-hand walkthroughs

Also built: practice mode with "Mix it up", stats, settings, and the optional "Explain more".

---

## 1. Run it on your Mac

You need [Node.js](https://nodejs.org) 20 or newer. Check with `node -v`.

```bash
cd ~/Projects/pokertrainer
npm install          # first time only
npm run dev          # opens a local preview, usually at http://localhost:5173
```

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests (hand evaluator, outs, pot odds, ranges, generated-scenario checks) |
| `npm run build` | Builds the production site into `dist/` |
| `npm run layout` | Checks the layout in Safari’s engine at iPhone SE, 15 and Pro Max sizes, light and dark. Run `npm run build` first. Screenshots go to `layout-shots/`. |
| `npm run icons` | Regenerates the app icons |

---

## 2. Put it online for free

Pick **one** host. Both are free. Both rebuild automatically whenever you push changes.

### Option A: GitHub Pages

1. On github.com, click **+ → New repository**. Name it `pokertrainer`. Private is fine on paid plans; on a free account Pages needs a **public** repo. Don't add a README. Click **Create repository**.
2. In Terminal, in this folder:
   ```bash
   git add -A
   git commit -m "First version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/pokertrainer.git
   git push -u origin main
   ```
3. On GitHub, open the repo, then **Settings → Pages**. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Open the **Actions** tab. The “Deploy to GitHub Pages” run takes about 1–2 minutes. When it shows a green tick, the app is live at `https://YOUR-USERNAME.github.io/pokertrainer/`.

### Option B: Netlify

1. Do steps 1–2 above to get the code onto GitHub.
2. At [app.netlify.com](https://app.netlify.com), choose **Add new site → Import an existing project → GitHub**, then pick the `pokertrainer` repo.
3. Netlify reads `netlify.toml` from this folder, so you don't need to change any settings. Click **Deploy**.
4. Your site appears at `https://something-random.netlify.app`. You can rename it under **Site configuration → Change site name**.

To publish changes later, run `git add -A && git commit -m "…" && git push`. Either host picks the change up automatically. The installed app updates itself the next time you open it while online.

---

## 3. Add it to your iPhone home screen

1. Open your site's address in **Safari**. Other browsers on iPhone can't install web apps the same way.
2. Tap the **Share** button (the square with an up arrow), then **Add to Home Screen**, then **Add**.
3. Open it from the new spade icon. It runs full-screen like a normal app, and it works offline after the first launch.

> On iPhone, the home-screen app has **its own storage**, separate from Safari. Your progress and API key live inside the installed app. If you paste your key in Safari, the home-screen app won't see it.

---

## 4. Turn on “Explain more” (optional)

“Explain more” sends the current hand to an AI and shows a short, beginner-friendly explanation. You can ask up to two follow-up questions. When you get an answer wrong, you can also type **what you were thinking**; the coach responds to your reasoning and points to where it goes wrong. Everything else in the app works without AI.

Pick a provider in **Settings → “Explain more” → AI provider**. Each provider's key is stored separately.

### Option A: Google Gemini (free)

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in with your Google account, and create an API key. No card or billing is needed for the free tier. The key starts with `AIza`.
2. In the **installed** app, choose **Gemini (free)**, paste the key and tap **Save key**.
3. Optionally tap **Check** next to the model name.

Notes (from Google's pricing and models pages, checked 2026-11-02):
- The default model is `gemini-3.5-flash-lite`, Google's recommended Flash-Lite model. It is free of charge on the free tier.
- On the free tier, Google says your prompts are “used to improve our products”. Here that's only the poker hand and your question.
- Free-tier rate limits are shown only in AI Studio. If you hit one, the app says so; wait a minute, or try again tomorrow.
- If billing is never turned on, nothing can be charged.

### Option B: OpenAI (pay as you go)

1. **Make a key just for this app.** Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys) and click **Create new secret key**. Name it `holdem-coach`. Copy the key; it starts with `sk-`.
2. **Set a spending limit first.** In the OpenAI dashboard, go to **Settings → Limits** (or **Billing → Usage limits**) and set a low monthly budget, for example $5.
3. In the **installed** app, choose **OpenAI**, paste the key and tap **Save key**.
4. The default model is `gpt-6-luna`. On 2026-10-31, OpenAI's models page listed it as the cheapest current model, at $0.10 / $0.50 per million input/output tokens. Answers are capped at about 350 tokens.

**How keys are handled:**
- Each key is stored only in this app's storage on this device.
- The Gemini key is only ever sent to `generativelanguage.googleapis.com`. The OpenAI key is only ever sent to `api.openai.com`.
- Keys are never in the code, the build or git, and never included in backups.
- The screen shows a key masked, and **Remove key** deletes it.
- If you think a key has leaked, delete it on the provider's keys page; that disables it immediately.

---

## 5. Your data

- **Settings → Export backup** downloads a `.json` file with your progress and settings. It does not include API keys. **Import backup** restores one.
- **Reset progress** wipes stats and lesson progress. Your keys stay until you remove them.
- On iPhone, the home-screen app and a Safari tab keep **separate** progress. When the app is open in a browser tab, Progress and Settings show a reminder. To move progress between them, export a backup in one and import it in the other. Deleting the home-screen icon can delete its progress too, so export a backup first.

---

## 6. Editing the content

Content is kept as data, separate from the screens:

| What | Where |
|---|---|
| Starting-hand charts | `src/data/ranges/index.ts` (shorthand like `77+, ATs+, KQs`; the notes at the top explain the assumptions) |
| Lessons | `src/data/lessons/` |
| Glossary (tap-to-define words) | `src/data/glossary.ts`. In any text, write `[[key]]` or `[[key|shown words]]` |
| Drill generators and built-in explanations | `src/engine/scenarios/` (post-flop situations are hand-written templates in `postflop.ts`) |
| Full-hand walkthroughs | `src/data/hands.ts` (tests check every card, chart answer, hand-strength claim, pot total and showdown) |

**Where the ranges come from:**
- They are a deliberately conservative composite in the style of widely taught beginner charts. They are not copied from one source and are not solver output.
- **Full ring** assumes a loose, passive live home game with 100bb stacks. Open-raise 3bb; isolate limpers with 4bb + 1bb per limper.
- **6-max** assumes online play with 100bb stacks. Open-raise 2.5bb; isolate limpers with 3bb + 1bb per limper.

Run `npm test` after editing ranges. The tests catch typos, any overlap between "raise" and "call", and an opening range that is wider early than late.

**How the drill numbers are checked:**
- Outs are counted by trying every unseen card against the opponent's hand, so a combo draw comes out at 15 outs, not 17, and "dirty" outs are excluded.
- Equities are computed exactly and cross-checked against a Monte Carlo simulation in the tests.
- Pot-odds drills are thrown away if the rule-of-thumb estimate, the exact hit chance and the true equity against the opponent's actual cards don't all agree on the answer.
- Every outs claim in the lesson examples is re-counted by the tests.
- A test plays all 2,598,960 five-card hands through the hand evaluator and checks the textbook totals.

## Tech

Vite, React and TypeScript. `vite-plugin-pwa` (Workbox) handles offline support, and Vitest runs the tests. Routing is hash-based (`#/…`), so the same build works on GitHub Pages (`/pokertrainer/`) and Netlify (`/`) without server rewrites.
