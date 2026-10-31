/**
 * STARTING-HAND RANGES — edit here.
 *
 * Where these come from: a deliberately conservative composite in the style of
 * widely taught beginner / low-stakes charts (the kind found in free beginner
 * material from training sites and in books such as Ed Miller's small-stakes
 * series). They are NOT copied from one source and NOT solver output. They are
 * tightened for beginners: simple to remember, hard to get into trouble with.
 *
 * Assumptions: 100 big-blind stacks.
 *  - Full ring = live home game, 8–9 players, loose and passive (lots of limping,
 *    lots of calling). Open-raise 3bb; isolate limpers with 4bb + 1bb per limper.
 *  - 6-max = online, 6 players, more aggressive. Open-raise 2.5bb (3bb from the
 *    small blind); isolate limpers with 3bb + 1bb per limper.
 *
 * Notation: see notation.ts ("77+", "ATs+", "A2s-A9s", "KQs", "AK", "96s+").
 * Any hand not listed is a fold. In "facing limpers" from the big blind a call
 * means "check" (you already have the big blind in).
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
  /** Short note shown under the chart. */
  note?: string;
}

type Table = Partial<Record<ChartPos, RangeSpec>>;

export const RANGES: Record<Format, Record<Situation, Table>> = {
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
      BB: { raise: '99+, ATs+, KJs+, AJo+, KQo', note: 'Everything else: just check and see a free flop.' },
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
      BB: { raise: '88+, ATs+, KJs+, AJo+, KQo', note: 'Everything else: just check and see a free flop.' },
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
  fullring: { open: 3, openSB: 3, isoBase: 4, threeBetIP: 3, threeBetOOP: 4 },
  sixmax: { open: 2.5, openSB: 3, isoBase: 3, threeBetIP: 3, threeBetOOP: 4 },
};

export const isoSize = (format: Format, limpers: number) => SIZING[format].isoBase + limpers;
