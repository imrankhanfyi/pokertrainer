import type { Card } from '../cards';
import type { ChartPos, Format, Pos } from '../../data/positions';
import type { Situation } from '../../data/ranges';

export type SkillId = 'positions' | 'preflop' | 'outs' | 'potodds' | 'postflop' | 'fullhand';

export const SKILLS: { id: SkillId; title: string; blurb: string; lesson: number }[] = [
  { id: 'positions', title: 'Positions & action order', blurb: 'Who sits where, who acts next', lesson: 1 },
  { id: 'preflop', title: 'Starting hands', blurb: 'Fold, call or raise before the flop', lesson: 2 },
  { id: 'outs', title: 'Outs & the rule of 2 and 4', blurb: 'Count your outs, estimate your chances', lesson: 3 },
  { id: 'potodds', title: 'Pot odds', blurb: 'Is the call worth the price?', lesson: 4 },
  { id: 'postflop', title: 'After the flop', blurb: 'Bet, check, call or fold', lesson: 5 },
  { id: 'fullhand', title: 'Full hands', blurb: 'Preflop to river, one decision at a time', lesson: 6 },
];

export type SeatState = 'waiting' | 'folded' | 'limped' | 'raised' | 'hero' | 'blind' | 'in';

export interface Seat {
  pos: Pos;
  state: SeatState;
  /** Chips in front of the seat this round, in bb. */
  bet?: number;
  /** Short action text shown on the seat ("Limp", "Raise 3bb"). */
  tag?: string;
  highlight?: boolean;
}

export interface TableVisual {
  seats: Seat[]; // in preflop action order, i.e. UTG first, BB last
  heroPos?: Pos;
  heroCards?: [Card, Card];
  board?: Card[];
  pot?: number;
  /** Hide position names (for "what's my position?" questions). */
  hideLabels?: boolean;
}

export interface Choice { id: string; label: string; sub?: string }

export interface Question {
  id: string;
  skill: SkillId;
  format: Format;
  prompt: string;
  /** One-line situation summary shown above the choices (e.g. "Folded to you"). */
  context?: string;
  table?: TableVisual;
  /** Big card rows for board-focused drills (outs, pot odds). */
  cardsView?: { board: Card[]; hero: Card[]; villain?: Card[]; villainLabel?: string };
  choices: Choice[];
  correct: string; // choice id
  /** True when good players could disagree or it depends on opponents. */
  close: boolean;
  /** Beginner explanation (may contain [[glossary]] links). */
  explanation: string;
  /** Extra sentence shown when the answer is close or depends on the format. */
  closeNote?: string;
  /** Plain-text facts sent to "Explain more". */
  facts: Record<string, string>;
  /** Next step of a multi-step question (e.g. outs → percentage, or the next street of a hand). */
  followUp?: Question;
  /** e.g. "Step 2 of 4" or "Turn". */
  stepLabel?: string;

  // ---- v2 additions (see docs/v2-spec.md) ----
  /** Choice ids that are a reasonable alternative: picking one grades as 'close' (amber, not counted as a miss). */
  closeAlternatives?: string[];
  /** When set, the student types a number instead of tapping a choice. `choices` is then ignored (may be []). */
  numeric?: NumericSpec;
  /** Step-by-step working shown in the feedback, one tap per step (with "Show all"). */
  working?: WorkingStep[];
  /** Starting-hand chart to show (with this hand marked) after a close call or a mistake. */
  chart?: { format: Format; situation: Situation; pos: ChartPos; hand: string };
  /** Minimal order-of-play oval. */
  order?: OrderView;
}

export type Grade = 'right' | 'close' | 'mistake';

/** Grade an answer: a choice id, or the typed number as a string for numeric questions. */
export function gradeAnswer(q: Question, answer: string): Grade {
  if (q.numeric) {
    const v = Number(answer.replace(',', '.').replace('%', '').trim());
    if (!Number.isFinite(v)) return 'mistake';
    return v >= q.numeric.min && v <= q.numeric.max ? 'right' : 'mistake';
  }
  if (answer === q.correct) return 'right';
  return q.closeAlternatives?.includes(answer) ? 'close' : 'mistake';
}

export interface NumericSpec {
  /** Shown after the input box, e.g. "outs" or "%". */
  unit: string;
  /** Accepted range, inclusive. */
  min: number;
  max: number;
  /** The figure shown as the answer ("12 outs", "about 44%"). */
  answerText: string;
  /** Allow a decimal point on the keypad. */
  decimal?: boolean;
  placeholder?: string;
}

export interface WorkingStep {
  /** One short line; may contain **bold** and [[glossary]] links (rendered with <Rich>). */
  text: string;
  visual?: WorkingVisual;
}

export type WorkingVisual =
  /** Cards that flash up, grouped by what they make. `dead` = cards that look like outs but don't count. */
  | { kind: 'cards'; groups: { label: string; cards: Card[] }[]; dead?: { label: string; cards: Card[] } }
  /** A stacked chip bar, e.g. pot + their bet + your call. `mine` marks your share. Amounts in bb. */
  | { kind: 'chips'; parts: { label: string; bb: number; mine?: boolean }[] }
  /** A 0–100% bar with a "need" line, optionally a "have" fill. Values are percentages 0–100. */
  | { kind: 'bars'; need: number; have?: number; needLabel?: string; haveLabel?: string }
  /** The final pot as one bar: YOUR call first (accent), the others after it, with a 0–100% ruler. `pct` = mine ÷ total, rounded. Amounts in bb. */
  | { kind: 'slice'; mine: number; others: { label: string; bb: number }[]; pct: number }
  /** "Play it n times": one winning tile (+win) and n−1 losing tiles (−lose). Amounts in bb. */
  | { kind: 'tiles'; n: number; win: number; lose: number };

/** hero = you, about to act; acted = has acted and is still in; folded = out of the hand (this street or earlier); waiting = still to act after you. */
export type OrderStatus = 'hero' | 'acted' | 'folded' | 'waiting';

export interface OrderView {
  /** Seats in action order for this street (preflop: UTG→BB; postflop: SB→BTN). */
  seats: { pos: Pos; status: OrderStatus }[];
  street: 'preflop' | 'flop' | 'turn' | 'river';
}

