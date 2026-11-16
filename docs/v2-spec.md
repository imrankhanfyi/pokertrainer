# Hold'em Coach v2 – spec (draft for review)

Status: **draft, not approved, nothing built.** Written 2026-11-16 from the user's phone notes and two rounds of interview in the same session.
Release plan: **everything ships together** as one v2 (user's call).

## 0. Decisions made in the interview

| # | Topic | Decision | Who |
|---|---|---|---|
| D1 | Target game | The user wants to play **6-handed home games with friends**. Add a new **"6-handed home game"** chart set and make it the default. | User agreed |
| D2 | Outs answer | **Type the number of outs, then type the percentage.** | User |
| D3 | Outs correction | **Flash up the actual out cards** (e.g. the three remaining kings), then show the working **one step at a time**. Open to other visuals. | User |
| D4 | Starting-hand grading | Three tiers: **Right / Close call / Mistake.** Missing a close call doesn't count against you. | User agreed |
| D5 | After a starting-hand miss | Show **that seat's whole 13×13 chart** with your hand marked. | User agreed |
| D6 | Order of play | A **very minimal** oval with 6 dots: who has acted, whose turn it is, who is still to come. On every table. | User |
| D7 | Pot odds | Replace the wall of text with a visual and step-by-step numbers. The problems are the arithmetic and too much at once. | User |
| D8 | K5s big-blind bug | Fixed as part of v2. | User |
| D9 | Step reveal (user unsure) | **Default: tap to advance through the steps, with a "Show all" link.** Easy to change. | Claude, **veto at review** |
| D10 | Pot-odds input (not answered) | **Default: you type the % you need, then choose Call or Fold.** Your chance of winning is then shown, not asked. | Claude, **veto at review** |

## 1. Evidence behind the starting-hand changes

**Bug.** The big blind facing limpers lists only raises and says the rest should check:
```
src/data/ranges/index.ts:56   BB: { raise: '99+, ATs+, KJs+, AJo+, KQo', note: 'Everything else: just check and see a free flop.' },
src/data/ranges/index.ts:81   BB: { raise: '88+, ATs+, KJs+, AJo+, KQo', note: 'Everything else: just check and see a free flop.' },
```
But any hand that isn't listed is graded as a fold:
```
src/engine/preflop.ts:26   return chart.raise.has(hc) ? 'raise' : chart.call.has(hc) ? 'call' : 'fold';
```

**Probe** (2026-11-16): share of the 1,326 starting combos that each chart raises, calls or folds. These are the raw rows that matter (the full table covers every chart):
```
fullring limpers BB  raise   8% call   0% fold  92%
sixmax   limpers BB  raise   9% call   0% fold  91%
fullring limpers SB  raise   6% call   9% fold  86%
sixmax   limpers SB  raise   9% call   7% fold  84%
sixmax   limpers BTN raise  18% call   4% fold  78%
fullring raise   BB  raise   3% call  11% fold  86%
sixmax   raise   BB  raise   3% call  18% fold  79%
```
The ranges file describes itself as *"deliberately conservative … tightened for beginners"* (`src/data/ranges/index.ts:4-8`).

**What this proves:** the big blind facing limpers folds about 91% when it should fold 0%. That explains K5s, and probably much of the "never takes a cheap look" feeling.
**What it doesn't prove:** whether the other narrow calling ranges are too tight for the user's game. See UNKNOWN U1.

## 2. Changes

### 2.1 Fix the big-blind check bug (D8)
- In the big blind facing limpers, every hand not on the raise list is a **check**, in every format. Add a `default` action to the chart (`default: 'call'`) instead of special-casing `chartAction`.
- Keep the Fold button. Folding there is graded as a **Mistake** with a one-line reason: "You can check for free; never fold here."
- **Drill weighting** (`src/engine/scenarios/preflop.ts:77`): after the fix, about 90% of hands in this spot are "check". Down-weight the obvious checks so the drill focuses on the line between raising and checking.
- Regression test: K5s in the big blind facing limpers → check, in every format.

### 2.2 New "6-handed home game" chart set (D1)
- New `Format` `home6`: 6 seats (UTG, HJ, CO, BTN, SB, BB), loose-passive, home-game sizing (open to 3bb, raise limpers to 4bb + 1bb per limper, as in `fullring`).
- Calling ranges are wider than `sixmax`, especially limping behind, completing from the small blind and defending the big blind. Ranges come from a **cited** published source for small-stakes, loose-passive games, not from memory (U1). The ranges file header names the source.
- Touchpoints: the `Format` type, `positionsFor` / `chartPositions`, `OTHER_FORMAT_POS`, `SIZING`, `RANGES`, the `FORMAT_SHORT` labels, the format picker in Settings, and `normalise()` in `storage.ts`. Today `normalise()` turns anything except `'sixmax'` into `'fullring'`, so without this change `home6` would reset on every load.
- **Migration:** the default becomes `home6`. Existing installs are switched to `home6` once on the first v2 load. `fullring` and `sixmax` stay available.
- `tests/ranges.test.ts` already checks parsing, no overlap, and widening towards the button. Run those checks on `home6` too.

### 2.3 Three-tier grading (D4)
- **Definition of a close hand** (it also has to work for the blinds, which are skipped today at `src/engine/preflop.ts:52`): a hand is close if a hand next to it on the 13×13 grid, in the **same chart**, has a different action. A miss counts as a **Close call** only if the hand is close **and** the action you chose is the one that neighbour uses. Otherwise it's a **Mistake**.
- Feedback headers: "Right" (green), "Close call" (amber: "also reasonable; the chart prefers X"), "Mistake" (red).
- **Stats:** `SkillStats` gains a `close` count. Accuracy = (right + close) ÷ seen. The `recent` sparkline counts a close call as a pass. The new field goes in `normalise()` (defaults to 0, so old records still load) with a round-trip test.
- Full hands (`src/data/hands.ts`) already have a per-step `close?` flag. They use the same three tiers.

### 2.4 Whole chart after a miss (D5)
- On a Close call or Mistake in a starting-hand drill: a 13×13 grid of that seat's chart (raise / call / fold colours) with your hand outlined. A link "See full chart" opens it.
- It reuses whatever chart renderer the lessons already have, if there is one (check during the build).

### 2.5 Outs: type it, then see it (D2, D3, D9)
- Input: a number keypad (`inputmode="numeric"`) for outs, then a second field for the % (`inputmode="decimal"`).
- **Outs** must be exact.
- **%** is accepted if it falls between the ×2 / ×4 shortcut figure and the exact figure, with ±1 point of slack. The feedback shows both, as the current copy does ("about 44%, exactly 45.0%").
- Correction, one tap per step:
  1. The out cards **flash up** as real cards, grouped by what they make (e.g. "K♠ K♥ K♦ → two pair · 9 hearts → flush"). Cards that are already visible or don't count are shown greyed out with the reason.
  2. Count: "3 + 9 = 12 outs".
  3. Percentage: "12 × 4 = 48%, or about 44% if you use 12 × 4 − (12 − 8)" (whichever correction the lessons teach), plus the exact figure.
- `Question.facts` is updated so "Explain more" sees the typed answers and the out list.

### 2.6 Pot odds as a picture (D7, D9, D10)
- Input: type the % you need (keypad), then tap Call or Fold.
- Correction, one tap per step, each step one line plus a picture:
  1. **The pot:** stacked chip bar showing the pot (5.5) + their bet (5.5) + your call (5.5) = 16.5 to play for.
  2. **Your price:** your 5.5 highlighted against the 16.5 → **need 33%**. A marker goes on a 0–100% bar.
  3. **Your chance:** 12 outs → about 44%. A second bar fills to 44%.
  4. **The verdict:** 44% clears the 33% line → **Call**. The line and the fill are side by side, so it shows at a glance.
- The same component is used wherever pot odds appear (`potodds.ts`, `drawspot.ts`, full-hand steps with `facing`).

### 2.7 Order-of-play oval (D6)
- A small oval with one dot per seat (6, or 9 for full ring): **your dot** ringed, a **dealer "D"**, seats that have **acted** filled, seats that have **folded** hollow and faint, and the **seat to act** with a subtle pulse. No text, except an optional "you act 4th of 6" caption.
- It knows that the order changes after the flop: the blinds act last before it and first after it.
- Shown on every table: preflop, postflop, draw spots, pot odds and full hands.
- **Data gap:** full hands store only `heroPos` (`src/data/hands.ts:36`), and who acted when is only in the story text. Each full-hand step needs a new `seats` field (who's still in, who has acted on this street), written by hand for the existing hands. Whether the postflop generators already produce seats gets checked during the build (U3).

## 3. Not in v2
The lesson text rewrites (beyond the new visuals), live play or hand tracking at the table, accounts or sync, and changes to the AI providers.

## 4. Verification before shipping
- `npm test`: the new tests are the big-blind check regression, the `home6` range checks, close-call classification (including the blinds), stats `normalise()` round-trip, outs/% tolerance, and full-hand `seats` consistency.
- `npm run build`.
- `npm run layout` for WebKit at iPhone SE, 15 and Pro Max, in light and dark mode. It needs the Playwright WebKit download (about 300 MB, approval first). Afterwards, delete `~/Library/Caches/ms-playwright` and `layout-shots/`.
- Manual run on the dev server: one of each drill, covering a Right, a Close call and a Mistake, the step-through on outs and pot odds, and the oval before and after the flop.
- The user confirms on an iPhone after deploy.

## UNKNOWNS
| # | Assumption | How it gets verified before it's acted on |
|---|---|---|
| U1 | The `home6` calling ranges should be noticeably wider than `sixmax` for limping behind, completing from the small blind and defending the big blind. | Source the ranges from a named published small-stakes / loose-passive reference, cite it in the ranges file, and show the user a before/after probe table like §1 before building on it. |
| U2 | The friends' game is **6 players** with roughly **100bb** stacks ("6ring" was read as 6-handed). | Ask the user at review. |
| U3 | Postflop / draw-spot / pot-odds generators may not produce seat data for the oval. | Grep `src/engine/scenarios/*.ts` for `seats` at the start of the build. If it's missing, generate plausible seats from position. |
| U4 | D9 (tap-through steps) and D10 (type the % needed for pot odds) are defaults Claude chose. | The user accepts or vetoes them at spec review. |
| U5 | The lessons may already have a 13×13 chart renderer to reuse. | Grep `src/screens` / `src/components` at the start of the build. |
