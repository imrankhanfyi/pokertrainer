import type { Lesson } from './index';

export const lesson1: Lesson = {
  id: 1,
  title: 'Table basics',
  summary: 'Seats, the button, and why acting last is a superpower.',
  skill: 'positions',
  available: true,
  screens: [
    {
      title: 'The button and the blinds',
      blocks: [
        { t: 'p', text: 'Every hand, one player has the dealer [[button]] – a disc marked **D**. It moves one seat to the left (clockwise) after each hand, so everyone takes a turn.' },
        { t: 'p', text: 'The two players to the left of the button post the [[blinds]]: the [[small-blind]] puts in half a bet and the [[big-blind]] a full bet. These forced bets mean there’s always something to fight for.' },
        { t: 'table', highlight: ['BTN', 'SB', 'BB'], caption: 'The button (D), small blind and big blind.' },
        { t: 'tip', text: 'Bets in this app are measured in [[bb|big blinds (bb)]]. "Raise to 3bb" means three times the big blind, whatever the stakes.' },
      ],
    },
    {
      title: 'Who acts when',
      blocks: [
        { t: 'p', text: '**Before the flop**, the first player to act is the one to the left of the big blind. This seat is called [[utg|under the gun (UTG)]]. Action goes round to the left, and the big blind acts last.' },
        { t: 'p', text: '**After the flop** (and on the [[turn]] and [[river]]), action starts with the first player still in to the left of the button – usually the small blind – and the button acts last.' },
        { t: 'order', caption: 'Action order before and after the flop.' },
        { t: 'tip', text: 'Short version: the button acts last on every street after the flop. That’s why everyone wants it.' },
      ],
    },
    {
      title: 'The seats have names',
      blocks: [
        { t: 'p', text: 'Seats are named by where they sit relative to the button. Counting to the right from the button: [[cutoff]] (CO), [[hijack]] (HJ), [[lojack]] (LJ). Counting left: small blind, big blind, then [[utg|UTG]].' },
        { t: 'table', zones: true, caption: 'Early, middle and late positions.' },
        {
          t: 'format',
          fullring: 'At a **full-ring** home game (8–9 players) there are extra early seats: UTG, UTG+1 and (with 9 players) UTG+2. Early = UTG to UTG+2, middle = LJ and HJ, late = CO and button.',
          sixmax: 'At a **6-max** table there are only six seats: UTG, HJ, CO, BTN, SB, BB. UTG is early, the hijack is middle, the cutoff and button are late. Fewer players means you can play more hands from every seat.',
        },
      ],
    },
    {
      title: 'Why position matters',
      blocks: [
        { t: 'p', text: 'Acting last means you see what everyone else does before you decide. If they check, you can take a free card or bet. If they bet big, you can get out cheaply. Being [[in-position|in position]] makes every decision easier.' },
        { t: 'p', text: 'Acting first ([[out-of-position|out of position]]) is the opposite: you have to guess. So from early seats you should play **fewer, stronger** hands, and from late seats you can play more.' },
        { t: 'list', items: [
          'Early position: many players still to act → only strong hands.',
          'Late position: few players left → more hands are playable.',
          'Blinds: you have money in already, but you’ll act first after the flop → careful.',
        ] },
        { t: 'tip', text: 'This one idea – play tighter early, looser late – is the backbone of the starting-hand charts in the next lesson.' },
      ],
    },
  ],
};
