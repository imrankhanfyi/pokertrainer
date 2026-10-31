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
  | { t: 'order'; caption?: string }
  /** Hand + board diagram. If `villain` and `outs` are given, tests verify the outs count. */
  | { t: 'spot'; hero: string; board: string; villain?: string; outs?: number; caption: string }
  /** Rule of 2 and 4 vs exact odds, computed live. */
  | { t: 'oddsTable'; outs: number[] }
  /** Price of a call for common bet sizes, computed live. */
  | { t: 'potTable' };

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
import { lesson3 } from './lesson3';
import { lesson4 } from './lesson4';
import { lesson5 } from './lesson5';
import { lesson6 } from './lesson6';

export const LESSONS: Lesson[] = [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6];
