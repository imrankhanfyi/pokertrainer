import type { Card } from '../cards';
import type { Format, Pos } from '../../data/positions';

export type SkillId = 'positions' | 'preflop';

export const SKILLS: { id: SkillId; title: string; blurb: string; lesson: number }[] = [
  { id: 'positions', title: 'Positions & action order', blurb: 'Who sits where, who acts next', lesson: 1 },
  { id: 'preflop', title: 'Starting hands', blurb: 'Fold, call or raise before the flop', lesson: 2 },
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
}
