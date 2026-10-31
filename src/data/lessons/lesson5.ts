import type { Lesson } from './index';

export const lesson5: Lesson = {
  id: 5,
  title: 'A default post-flop plan',
  summary: 'Simple rules for the flop, turn and river.',
  skill: 'postflop',
  available: true,
  screens: [
    {
      title: 'Keep it simple',
      blocks: [
        { t: 'p', text: 'After the flop, decisions get harder. A simple default plan beats improvising under pressure:' },
        { t: 'list', items: [
          '**Strong hand?** Bet for value.',
          '**Good draw?** Bet as a semi-bluff, or call if the price is right.',
          '**Weak hand, no draw?** Check, and fold to big bets.',
          '**You raised before the flop and it’s heads-up on a dry board?** A small continuation bet.',
          '**Against players who call too much?** Bluff rarely, value-bet often.',
        ] },
      ],
    },
    {
      title: 'Continuation bets',
      blocks: [
        { t: 'p', text: 'If you raised before the flop, a [[c-bet|continuation bet]] on the flop often wins straight away – most flops miss most hands. But pick your spots:' },
        { t: 'spot', hero: 'Qd Js', board: 'Ks 7d 2c', caption: '[[dry-board|Dry board]], one opponent: a small c-bet (about ⅓ pot) is a good default even when you missed.' },
        { t: 'spot', hero: 'Ad Qc', board: '9h 8h 6s', caption: '[[wet-board|Wet board]], two or more opponents: someone usually connects. Check when you miss.' },
        {
          t: 'format',
          fullring: '**Full ring:** home-game pots are often [[multiway]] – c-bet less, and mostly when you have something.',
          sixmax: '**6-max:** you’ll be heads-up more often, so c-betting dry boards works well.',
        },
      ],
    },
    {
      title: 'Bet your good hands',
      blocks: [
        { t: 'p', text: 'When you have a strong hand – top pair with a good kicker or better – [[value-bet|bet for value]]. Worse hands will call, and the pot grows while you’re ahead.' },
        { t: 'list', items: [
          'Bet about **two-thirds of the pot** with strong hands, especially on boards with draws.',
          'Don’t slow-play on wet boards: free cards let draws catch up.',
          'Against players who call a lot, bigger value bets earn more.',
        ] },
        { t: 'spot', hero: 'Ah Kd', board: 'Kc 8s 3h', caption: 'Top pair, top kicker: bet, bet, bet.' },
      ],
    },
    {
      title: 'Weak hands and draws',
      blocks: [
        { t: 'p', text: '**Weak made hands** (bottom pair, small pocket pairs below the board) want a cheap showdown. Check, and fold to big bets – a big bet usually means a better hand.' },
        { t: 'p', text: '**Draws** can be played two ways: bet as a [[semi-bluff]] (you can win now, and still hit later) or call when the [[pot-odds|price]] is right. Fold draws to bets that are too big.' },
        { t: 'tip', text: 'Ask “what does a bet mean from this player?” A quiet player betting big is rarely bluffing.' },
      ],
    },
    {
      title: 'Why river bluffs should be rare',
      blocks: [
        { t: 'p', text: 'A [[bluff]] only wins if your opponent folds. Players who call too much – [[calling-station|calling stations]] – don’t fold. Bluffing them just loses money.' },
        { t: 'p', text: 'The flip side is good news: against those same players, **value-bet** your good hands and they’ll pay you. That’s where most of your profit will come from.' },
        {
          t: 'format',
          fullring: '**Full ring home games:** pure river bluffs should be very rare. Bet for value, check when you miss.',
          sixmax: '**6-max online:** thinking players fold more, so an occasional river bluff can work – but against anyone who has called every street, still don’t.',
        },
      ],
    },
  ],
};
