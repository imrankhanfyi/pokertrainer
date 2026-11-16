/**
 * STARTING-HAND RANGES — edit here.
 *
 * Full ring and 6-max: a deliberately conservative composite in the style of
 * widely taught beginner / low-stakes charts (the kind found in free beginner
 * material from training sites and in books such as Ed Miller's small-stakes
 * series). They are NOT copied from one source and NOT solver output. They are
 * tightened for beginners: simple to remember, hard to get into trouble with.
 *
 * Home 6 (home6) — SOURCE: "NL Hold'em Starting Hand Charts", Advanced Poker
 * Training (no author named; page footer © 2009-2026), read 2026-11-16:
 * https://www.pokertraining.com/poker/articles/beginners/no-limit-holdem-starting-hand-chart.php
 * Its Chart #1 is for "loose, passive" low-stakes games ($1/$2 live and home
 * games) when nobody has raised; Chart #3 is for "a single raise (3-5 times
 * the big blind) before you". How each home6 situation maps onto it:
 *  - limpers (HJ, CO, BTN): Chart #1. "Raise always" + "call from early
 *    position, otherwise raise" → raise; "call always" + the yellow "call from
 *    middle or late position if the conditions are right" → call. We treat the
 *    yellow conditions (several callers, loose players who pay off) as met,
 *    because that is what this format assumes. (Our judgment, not the source's.
 *    Note the source's Chart #1 assumes about 4-5 limpers per hand; the drill
 *    deals 1-3, which makes the case for calling the yellow hands weaker.)
 *  - limpers SB: the source says play your late-position hands "plus a few
 *    more". The few more (K9s, K8s, Q8s, J7s) are OUR pick, not the source's.
 *  - limpers BB: raise the same hands as above; everything else checks
 *    (the source has no big-blind-vs-limpers chart; checking is free).
 *  - raise (HJ, CO, BTN): Chart #3. "Re-raise always" + "call from early
 *    position, otherwise re-raise" → re-raise; "call always" + the yellow hands
 *    (conditions treated as met) → call.
 *  - raise SB and BB: the source says to play the big blind "like you would if
 *    you had already called from early position", and when raised after a
 *    limp: pairs lean towards calling, fold suited connectors and hands like
 *    KQ. So the blinds call only with pairs and AQ. One of the source's yellow
 *    conditions is using position after the flop, which the blinds never have.
 *    Deviation: the source would only call with QQ and AKo from early
 *    position; we re-raise them from the blinds, as in the other formats.
 *    Deviation (lead's call, 2026-11-16): the BIG blind does not follow the
 *    source. It closes the action and already has 1bb in, so against a 3bb
 *    raise it needs only ~29% equity; "pairs and AQ" (6% of hands) left it
 *    defending less than the button cold-calls. It uses the 6-max big-blind
 *    defence instead (18%). The small blind keeps the source's tight range.
 *  - open (folded to you): NOT from the source. Its Chart #1 limps first in,
 *    which this app teaches against, so home6 reuses the 6-max opening ranges
 *    (with home-game 3bb sizing).
 *  - Seat mapping is ours: the source assumes 9-10 players; we read 6-handed
 *    UTG as early, the hijack as middle, and the cutoff and button as late.
 *
 * Assumptions: 100 big-blind stacks.
 *  - Home 6 = live home game with friends, 6 players, loose and passive.
 *    Open-raise 3bb; isolate limpers with 4bb + 1bb per limper.
 *  - Full ring = live home game, 8–9 players, loose and passive (lots of limping,
 *    lots of calling). Open-raise 3bb; isolate limpers with 4bb + 1bb per limper.
 *  - 6-max = online, 6 players, more aggressive. Open-raise 2.5bb (3bb from the
 *    small blind); isolate limpers with 3bb + 1bb per limper.
 *
 * Notation: see notation.ts ("77+", "ATs+", "A2s-A9s", "KQs", "AK", "96s+").
 * Any hand not listed is a fold, unless the chart sets `default` (the big blind
 * facing limpers: anything not raised is a free check, shown as "Check").
 *
 * Tests in tests/ranges.test.ts check that every table parses, has no overlap
 * between raise and call, and that opening ranges only widen towards the button.
 */
import type { ChartPos, Format } from '../positions';

export type Situation = 'open' | 'limpers' | 'raise';

export const SITUATION_LABEL: Record<Situation, string> = {
  open: 'Folded to you',
  limpers: 'Facing limpers',
  raise: 'Facing a raise',
};

export interface RangeSpec {
  raise: string;
  call?: string;
  /** Action for every hand not listed (default: fold). The big blind facing limpers checks. */
  default?: 'call';
  /** Short note shown under the chart. */
  note?: string;
}

type Table = Partial<Record<ChartPos, RangeSpec>>;

export const RANGES: Record<Format, Record<Situation, Table>> = {
  home6: {
    // Not from the source (see header): the 6-max opening ranges, raised to 3bb.
    open: {
      UTG: { raise: '66+, A9s+, KTs+, QTs+, JTs, T9s, AJo+, KQo' },
      HJ: { raise: '44+, A7s+, A5s, K9s+, Q9s+, J9s+, T9s, 98s, ATo+, KJo+' },
      CO: { raise: '22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, A9o+, KTo+, QTo+, JTo' },
      BTN: { raise: '22+, A2s+, K2s+, Q6s+, J7s+, T7s+, 96s+, 86s+, 75s+, 65s, 54s, A2o+, K9o+, Q9o+, J9o+, T9o', note: 'Best seat at the table: you act last after the flop.' },
      SB: { raise: '22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, A7o+, KTo+, QTo+, JTo', note: 'Raise or fold. You will be out of position for the whole hand.' },
    },
    // Source Chart #1 (loose, passive game, nobody has raised).
    limpers: {
      HJ: { raise: '99+, ATs+, KJs+, AJo+, KQo', call: '22-88, A2s-A9s, KTs, Q9s+, J8s+, T7s+, 97s+, 86s+, 75s+, 64s+, 53s+, 43s', note: 'Loose game: small pairs and suited hands can call behind and hope to hit big.' },
      CO: { raise: '99+, ATs+, KJs+, AJo+, KQo', call: '22-88, A2s-A9s, KTs, Q9s+, J8s+, T7s+, 97s+, 86s+, 75s+, 64s+, 53s+, 43s' },
      BTN: { raise: '99+, ATs+, KJs+, AJo+, KQo', call: '22-88, A2s-A9s, KTs, Q9s+, J8s+, T7s+, 97s+, 86s+, 75s+, 64s+, 53s+, 43s' },
      SB: { raise: '99+, ATs+, KJs+, AJo+, KQo', call: '22-88, A2s-A9s, K8s-KTs, Q8s+, J7s+, T7s+, 97s+, 86s+, 75s+, 64s+, 53s+, 43s', note: 'Completing is cheap, but you act first after the flop. Stick to pairs and suited hands.' },
      BB: { raise: '99+, ATs+, KJs+, AJo+, KQo', default: 'call', note: 'Everything else: just check and see a free flop.' },
    },
    // Source Chart #3 (a single raise before you).
    raise: {
      HJ: { raise: 'QQ+, AK', call: '22-JJ, A2s-AQs, KQs, QJs, JTs, T9s, 98s, 87s, AQo' },
      CO: { raise: 'QQ+, AK', call: '22-JJ, A2s-AQs, KQs, QJs, JTs, T9s, 98s, 87s, AQo' },
      BTN: { raise: 'QQ+, AK', call: '22-JJ, A2s-AQs, KQs, QJs, JTs, T9s, 98s, 87s, AQo' },
      SB: { raise: 'QQ+, AK', call: '22-JJ, AQs, AQo', note: 'Home-game raisers usually have it. Out of position, call only with pairs and AQ.' },
      // Deviation from the source (see header): the 6-max big-blind defence, not "pairs and AQ only".
      BB: { raise: 'QQ+, AK', call: '22-JJ, A2s-AQs, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, ATo-AQo, KJo+, QJo', note: 'You already have 1bb in and close the action, so calling a normal raise is cheap. Defend with pairs, suited hands and good high cards; fold the rest.' },
    },
  },
  fullring: {
    open: {
      EP: { raise: '77+, ATs+, KQs, AQo+', note: 'Many players still to act behind you – play only strong hands.' },
      MP: { raise: '55+, A9s+, KTs+, QTs+, JTs, AJo+, KQo' },
      CO: { raise: '22+, A2s+, K9s+, Q9s+, J9s+, T9s, 98s, 87s, ATo+, KJo+, QJo' },
      BTN: { raise: '22+, A2s+, K5s+, Q8s+, J8s+, T8s+, 97s+, 86s+, 76s, 65s, A8o+, KTo+, QTo+, JTo', note: 'Best seat at the table: you act last after the flop.' },
      SB: { raise: '22+, A2s+, K8s+, Q9s+, J9s+, T9s, 98s, A9o+, KTo+, QJo', note: 'Raise or fold. You will be out of position for the whole hand.' },
    },
    limpers: {
      EP: { raise: '88+, AJs+, KQs, AQo+', call: '22-77' },
      MP: { raise: '88+, ATs+, KJs+, AJo+, KQo', call: '22-77, JTs, T9s, 98s' },
      CO: { raise: '77+, A9s+, KTs+, QTs+, JTs, ATo+, KJo+', call: '22-66, A2s-A8s, K9s, Q9s, J9s, T9s, 98s, 87s, 76s' },
      BTN: { raise: '77+, A8s+, K9s+, Q9s+, J9s+, T9s, ATo+, KJo+, QJo', call: '22-66, A2s-A7s, T8s, 98s, 87s, 76s, 65s' },
      SB: { raise: '99+, AJs+, KQs, AQo+', call: '22-88, A2s-ATs, KTs-KJs, QTs-QJs, JTs, T9s, 98s, 87s, 76s' },
      BB: { raise: '99+, ATs+, KJs+, AJo+, KQo', default: 'call', note: 'Everything else: just check and see a free flop.' },
    },
    raise: {
      EP: { raise: 'QQ+, AK', call: '22-JJ, AQs' },
      MP: { raise: 'QQ+, AK', call: '22-JJ, AJs-AQs, KQs' },
      CO: { raise: 'QQ+, AK', call: '22-JJ, ATs-AQs, KJs-KQs, QJs, JTs, AQo' },
      BTN: { raise: 'QQ+, AK', call: '22-JJ, AJs-AQs, KJs-KQs, QJs, JTs, T9s, 98s, AQo' },
      SB: { raise: 'QQ+, AK', call: '66-JJ, AJs-AQs, KQs' },
      BB: { raise: 'QQ+, AK', call: '22-JJ, A9s-AQs, KTs+, QTs+, JTs, T9s, 98s, 87s, 76s, AJo-AQo, KQo' },
    },
  },
  sixmax: {
    open: {
      UTG: { raise: '66+, A9s+, KTs+, QTs+, JTs, T9s, AJo+, KQo' },
      HJ: { raise: '44+, A7s+, A5s, K9s+, Q9s+, J9s+, T9s, 98s, ATo+, KJo+' },
      CO: { raise: '22+, A2s+, K8s+, Q9s+, J9s+, T8s+, 98s, 87s, 76s, A9o+, KTo+, QTo+, JTo' },
      BTN: { raise: '22+, A2s+, K2s+, Q6s+, J7s+, T7s+, 96s+, 86s+, 75s+, 65s, 54s, A2o+, K9o+, Q9o+, J9o+, T9o' },
      SB: { raise: '22+, A2s+, K6s+, Q8s+, J8s+, T8s+, 97s+, 87s, 76s, 65s, A7o+, KTo+, QTo+, JTo', note: 'Raise or fold. Raise to 3bb from here.' },
    },
    limpers: {
      HJ: { raise: '77+, ATs+, KJs+, AJo+, KQo', call: '22-66' },
      CO: { raise: '66+, A8s+, KTs+, QTs+, JTs, ATo+, KJo+', call: '22-55, A2s-A7s, T9s, 98s, 87s' },
      BTN: { raise: '55+, A7s+, K9s+, Q9s+, J9s+, T9s, A9o+, KTo+, QJo', call: '22-44, A2s-A6s, 98s, 87s, 76s, 65s' },
      SB: { raise: '88+, ATs+, KJs+, AJo+, KQo', call: '22-77, A2s-A9s, KTs, QTs, JTs, T9s, 98s, 87s' },
      BB: { raise: '88+, ATs+, KJs+, AJo+, KQo', default: 'call', note: 'Everything else: just check and see a free flop.' },
    },
    raise: {
      HJ: { raise: 'QQ+, AK', call: '77-JJ, AJs-AQs, KQs' },
      CO: { raise: 'JJ+, AK, AQs', call: '22-TT, ATs-AJs, KJs-KQs, QJs, JTs, AQo' },
      BTN: { raise: 'JJ+, AK, AQs', call: '22-TT, A9s-AJs, KTs+, QTs+, JTs, T9s, 98s, AJo-AQo, KQo' },
      SB: { raise: 'JJ+, AK, AQs', call: '77-TT, AJs, KQs', note: 'From the small blind, lean towards re-raise or fold.' },
      BB: { raise: 'QQ+, AK', call: '22-JJ, A2s-AQs, K9s+, Q9s+, J9s+, T8s+, 97s+, 87s, 76s, 65s, ATo-AQo, KJo+, QJo' },
    },
  },
};

export interface Sizing {
  open: number; // bb
  openSB: number;
  isoBase: number; // bb, plus 1bb per limper
  threeBetIP: number; // multiple of the raise when you'll have position
  threeBetOOP: number;
}

export const SIZING: Record<Format, Sizing> = {
  home6: { open: 3, openSB: 3, isoBase: 4, threeBetIP: 3, threeBetOOP: 4 },
  fullring: { open: 3, openSB: 3, isoBase: 4, threeBetIP: 3, threeBetOOP: 4 },
  sixmax: { open: 2.5, openSB: 3, isoBase: 3, threeBetIP: 3, threeBetOOP: 4 },
};

export const isoSize = (format: Format, limpers: number) => SIZING[format].isoBase + limpers;
