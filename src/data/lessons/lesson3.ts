import type { Lesson } from './index';

export const lesson3: Lesson = {
  id: 3,
  title: 'Outs and the rule of 2 and 4',
  summary: 'Count the cards that help you and turn them into a percentage.',
  skill: 'outs',
  available: true,
  screens: [
    {
      title: 'What are outs?',
      blocks: [
        { t: 'p', text: 'When you’re behind but could improve, your [[outs]] are the unseen cards that would give you the best hand. Counting them is the first step to every “should I call?” decision.' },
        { t: 'spot', hero: '9h 8h', board: 'Kh 6h 2c', villain: 'Ks Qd', outs: 9, caption: 'Four hearts: any of the 9 remaining hearts makes your flush and beats their pair of kings. 9 outs.' },
        { t: 'tip', text: 'Count against the hand you think you’re up against. Here, a 9 or an 8 would give you a pair – but a smaller pair than their kings, so those aren’t outs.' },
      ],
    },
    {
      title: 'The common draws',
      blocks: [
        { t: 'list', items: [
          '[[flush-draw|Flush draw]] (four of a suit): **9 outs**.',
          '[[open-ender|Open-ended straight draw]] (four in a row): **8 outs**.',
          '[[gutshot]] (one missing in the middle): **4 outs**.',
          'Two [[overcards]] against a pair: **6 outs** (three of each), though they’re weaker than they look.',
          'Flush draw + open-ender ([[combo-draw|combo draw]]): **15 outs**.',
        ] },
        { t: 'spot', hero: '9c 8d', board: '7h 6s 2c', villain: 'Ks Kd', outs: 8, caption: 'Open-ender: any 10 or 5 makes a straight. 4 + 4 = 8 outs.' },
        { t: 'spot', hero: '9c 8d', board: 'Jh 7s 2c', villain: 'As Ad', outs: 4, caption: 'Gutshot: only a 10 fills the gap. 4 outs.' },
        { t: 'spot', hero: 'Ac Kd', board: '8h 5c 2d', villain: '8s 7s', outs: 6, caption: 'Two overcards against a pair of eights: any ace or king. 6 outs.' },
      ],
    },
    {
      title: 'Don’t count twice – and watch for dirty outs',
      blocks: [
        { t: 'p', text: 'With two draws at once, some cards help both. Count each card once.' },
        { t: 'spot', hero: '9h 8h', board: '7h 6h 2c', villain: 'As Ad', outs: 15, caption: '9 hearts + 8 straight cards = 17? No: the 10♥ and 5♥ are in both lists. 15 outs – you’re actually a favourite against aces.' },
        { t: 'p', text: 'Some cards complete your draw but give your opponent something even better. These are [[dirty-outs|dirty outs]] – don’t count them.' },
        { t: 'spot', hero: 'Ah Kh', board: 'Qc 7h 2h', villain: 'Qs Qd', outs: 8, caption: 'Against a set of queens, the Q♥ makes your flush but gives them four of a kind. 8 outs, not 9.' },
      ],
    },
    {
      title: 'The rule of 2 and 4',
      blocks: [
        { t: 'p', text: 'To turn outs into a rough percentage, use the [[rule-of-2-and-4|rule of 2 and 4]]:' },
        { t: 'list', items: [
          '**One card to come** (turn → river): outs × 2.',
          '**Two cards to come** (flop → river): outs × 4. With more than 8 outs, subtract the extra: 12 outs → 48 − 4 = 44%.',
        ] },
        { t: 'oddsTable', outs: [4, 8, 9, 12, 15] },
        { t: 'tip', text: 'The rule is never more than about 3 percentage points off – close enough to decide at the table.' },
      ],
    },
    {
      title: 'When to use ×4 – and hitting isn’t winning',
      blocks: [
        { t: 'p', text: 'Outs × 4 assumes you’ll see **both** the turn and the river for one price. That’s only true when someone is [[all-in]]. If there’s more betting to come, your opponent can bet again on the turn – so count one card at a time (× 2).' },
        { t: 'p', text: 'Hitting an out is also not quite the same as winning: sometimes the opponent improves too. The app shows the exact chance of winning after each drill, so you can see how close the shortcut is.' },
        { t: 'tip', text: 'Routine: name your draw → count outs (minus dirty ones) → ×2 per card to come.' },
      ],
    },
  ],
};
