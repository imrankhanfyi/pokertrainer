import type { Lesson } from './index';

export const lesson4: Lesson = {
  id: 4,
  title: 'Pot odds',
  summary: 'Is a call worth the price?',
  skill: 'potodds',
  available: true,
  screens: [
    {
      title: 'The price of a call',
      blocks: [
        { t: 'p', text: 'When someone bets, calling has a price. [[pot-odds|Pot odds]] turn that price into a percentage: how often you need to win for the call to break even.' },
        { t: 'p', text: '**Price = your call ÷ (the pot + their bet + your call)**' },
        { t: 'p', text: 'Example: the pot is 10bb and they bet 5bb. You call 5 to win 15. Your 5 out of a final pot of 20 = **25%**. If you win more than a quarter of the time, calling makes money in the long run.' },
      ],
    },
    {
      title: 'Learn the common prices',
      blocks: [
        { t: 'p', text: 'Bets come in a few standard sizes, so you can learn the prices by heart instead of dividing at the table:' },
        { t: 'potTable' },
        { t: 'tip', text: 'Bigger bets = worse price for you. A pot-sized bet means you need to win a third of the time.' },
      ],
    },
    {
      title: 'Compare: your chance vs the price',
      blocks: [
        { t: 'p', text: 'Now put it together with your [[outs]]. If your chance to hit is **bigger** than the price, call. If it’s **smaller**, fold.' },
        { t: 'spot', hero: 'Ah 5h', board: 'Kh 9h 7c 2s', villain: 'Ks Qd', outs: 12, caption: 'Turn: nut flush draw against top pair. 9 hearts + 3 aces = 12 outs × 2 ≈ 24%.' },
        { t: 'list', items: [
          'They bet a third of the pot → price 20% → **call** (24% > 20%).',
          'They bet the pot → price 33% → **fold** (24% < 33%).',
        ] },
        { t: 'p', text: 'On the flop, unless someone is all-in, still use one card at a time (× 2): your opponent can bet again on the turn.' },
      ],
    },
    {
      title: 'Implied odds',
      blocks: [
        { t: 'p', text: '[[implied-odds|Implied odds]] are the extra chips you expect to win **later** when you hit. If a call is slightly too expensive now but your opponent will pay you a lot when you make your hand, a call can still be right.' },
        { t: 'list', items: [
          'Implied odds are bigger when stacks are deep and your draw is well hidden (a straight on a quiet board).',
          'They’re smaller when your draw is obvious (three hearts on board) or stacks are short.',
        ] },
        {
          t: 'format',
          fullring: '**Full ring home games:** loose players often pay off when you hit, so implied odds are real. Call a little lighter with good draws – but not with gutshots facing big bets.',
          sixmax: '**6-max online:** opponents are more careful and fold when the obvious draw arrives, so lean on the direct price and treat implied odds as a small bonus.',
        },
      ],
    },
    {
      title: 'Your routine',
      blocks: [
        { t: 'list', items: [
          '1. Count your outs (minus dirty ones).',
          '2. Turn them into a chance: × 2 for one card.',
          '3. Find the price from the bet size (⅓ pot = 20%, ½ = 25%, ⅔ ≈ 29%, pot = 33%).',
          '4. Chance > price → call. Chance < price → fold, unless implied odds are big.',
        ] },
        { t: 'tip', text: 'It feels slow at first. After a few dozen drills it becomes automatic.' },
      ],
    },
  ],
};
