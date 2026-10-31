import type { Pos } from '../positions';
import type { Situation } from '../ranges';
import type { SkillId } from '../../engine/scenarios/types';

/** Text may contain [[glossary-key]] or [[glossary-key|shown text]] and **bold**. */
export type Block =
  | { t: 'p'; text: string }
  | { t: 'tip'; text: string }
  | { t: 'list'; items: string[] }
  | { t: 'format'; fullring: string; sixmax: string } // shows the text for the selected format
  | { t: 'table'; highlight?: Pos[]; caption?: string; zones?: boolean }
  | { t: 'cards'; cards: string; caption: string }
  | { t: 'chart'; situation: Situation; caption?: string }
  | { t: 'order'; caption?: string };

export interface Screen { title: string; blocks: Block[] }

export interface Lesson {
  id: number;
  title: string;
  summary: string;
  skill: SkillId | null;
  screens: Screen[];
  available: boolean;
}

import { lesson1 } from './lesson1';
import { lesson2 } from './lesson2';

const comingSoon = (id: number, title: string, summary: string): Lesson => ({ id, title, summary, skill: null, screens: [], available: false });

export const LESSONS: Lesson[] = [
  lesson1,
  lesson2,
  comingSoon(3, 'Outs and the rule of 2 and 4', 'Count the cards that help you and turn them into a percentage.'),
  comingSoon(4, 'Pot odds', 'Is a call worth the price?'),
  comingSoon(5, 'A default post-flop plan', 'Simple rules for the flop, turn and river.'),
  comingSoon(6, 'Putting it together', 'Whole hands, one decision at a time.'),
];
