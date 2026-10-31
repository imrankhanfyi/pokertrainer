import type { Lesson } from './index';

export const lesson2: Lesson = {
  id: 2,
  title: 'Starting hands',
  summary: 'Which two cards to play, from which seat, and how much to raise.',
  skill: 'preflop',
  available: true,
  screens: [
    {
      title: 'Most hands are folds',
      blocks: [
        { t: 'p', text: 'The biggest leak for new players is playing too many hands. Weak hands make weak pairs, and weak pairs lose big pots to better pairs. Good players fold most of their hands [[preflop|before the flop]] – and that’s fine.' },
        { t: 'p', text: 'There are 169 different starting hands. A [[chart|starting-hand chart]] tells you which ones to play, depending on your seat and what has happened before you.' },
        { t: 'cards', cards: 'Ah Ks', caption: 'A-K: play it from anywhere.' },
        { t: 'cards', cards: 'Kd 7c', caption: 'K-7 offsuit: looks pretty, usually a fold.' },
      ],
    },
    {
      title: 'Reading the chart',
      blocks: [
        { t: 'p', text: 'The chart is a 13×13 grid. [[pair|Pocket pairs]] run down the diagonal (AA top-left, 22 bottom-right). [[suited|Suited]] hands ("s") are above the diagonal; [[offsuit]] hands ("o") are below it.' },
        { t: 'list', items: [
          '**Solid fill** = raise.',
          '**Striped** = call (or check from the big blind).',
          '**Blank** = fold.',
        ] },
        { t: 'chart', situation: 'open', caption: 'Tap a seat to see its range. Tap a cell to see the hand.' },
        { t: 'tip', text: 'Notice the shape: the chart gets wider as you move towards the button. That’s position at work.' },
      ],
    },
    {
      title: 'Folded to you: raise or fold',
      blocks: [
        { t: 'p', text: 'If everyone before you folds, either [[open-raise]] or fold. Don’t [[limp]] (just call the big blind). Limping invites everyone into the pot, gives up the chance to win the blinds right away, and tells the table you’re unsure.' },
        {
          t: 'format',
          fullring: '**Full ring:** raise to about **3bb**. Home games are loose, so some players will still call – that’s fine, you have the better hand.',
          sixmax: '**6-max online:** raise to about **2.5bb** (3bb from the small blind). Online players defend their blinds more, and a smaller raise risks less when they fight back.',
        },
        { t: 'chart', situation: 'open' },
      ],
    },
    {
      title: 'Facing limpers: isolate',
      blocks: [
        { t: 'p', text: 'When players have [[limpers|limped]] in front of you, they usually have medium or weak hands. With a strong hand, raise to [[isolate]] them: you’ll often play the pot against one weak player, with the better hand and often [[in-position|in position]].' },
        {
          t: 'format',
          fullring: '**Full ring:** raise to **4bb + 1bb per limper**. Two limpers → raise to 6bb. Home-game players call a lot, so a bigger raise is needed to thin the field.',
          sixmax: '**6-max online:** raise to **3bb + 1bb per limper**. One limper → raise to 4bb.',
        },
        { t: 'p', text: 'Hands that want a cheap, big [[multiway]] pot – small pairs and [[connectors|suited connectors]] – can just call behind ([[overlimp]]). They either hit big or get folded on the flop.' },
        { t: 'chart', situation: 'limpers' },
      ],
    },
    {
      title: 'Facing a raise: tighten up',
      blocks: [
        { t: 'p', text: 'A raise means strength. Hands that were fine to open – like A-J or K-Q offsuit – are often [[dominated]] by a raiser’s range (A-K, A-Q). Most of the time, fold.' },
        { t: 'list', items: [
          '**Re-raise ([[3-bet]])** with the very best hands: QQ+ and A-K (6-max also adds JJ and AQs from the cutoff, button and small blind).',
          '**Call** with pocket pairs to try to flop a [[set]] ([[set-mining|set mining]]), and with good suited hands when you have position.',
          '**Fold** most other hands, especially offsuit ones.',
        ] },
        {
          t: 'format',
          fullring: '**Full ring:** home-game players who raise usually have it. Respect raises from early seats.',
          sixmax: '**6-max online:** raisers have wider ranges, especially from the cutoff and button, so you can play back a little more – but the beginner chart stays simple.',
        },
        { t: 'chart', situation: 'raise' },
      ],
    },
  ],
};
