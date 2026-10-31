import type { Lesson } from './index';

export const lesson6: Lesson = {
  id: 6,
  title: 'Putting it together',
  summary: 'Whole hands, one decision at a time.',
  skill: 'fullhand',
  available: true,
  screens: [
    {
      title: 'One routine for every decision',
      blocks: [
        { t: 'p', text: 'Every decision in a hand comes down to the same four questions:' },
        { t: 'list', items: [
          '**Where am I?** [[position|Position]] decides how many hands you can play, and acting last makes everything easier.',
          '**How strong is my hand – right now and potentially?** Made hand, draw, or nothing.',
          '**What’s the price?** Pot odds when facing a bet; bet size when betting.',
          '**Who am I up against?** Loose players call too much (value-bet them); tight players fold too much (bluff them a little); quiet players who bet big usually have it.',
        ] },
      ],
    },
    {
      title: 'Good decisions, bad results',
      blocks: [
        { t: 'p', text: 'You can make every right decision and still lose a hand – the cards don’t care. What matters is making choices that win **over many hands**.' },
        { t: 'tip', text: 'After a session, judge your decisions, not your results. “Did I play by my plan?” is the only question that matters.' },
        { t: 'p', text: 'This takes a lot of the stress out of playing: if you made the call your routine says to make, you did your job.' },
      ],
    },
    {
      title: 'How the walkthroughs work',
      blocks: [
        { t: 'p', text: 'In the full-hand drills you play a hand from start to finish, one decision at a time. After each answer you’ll see the reasoning, then the hand continues as if you’d taken the recommended action.' },
        {
          t: 'format',
          fullring: 'You’ll see home-game hands: isolating limpers, set mining, value-betting loose callers.',
          sixmax: 'You’ll see 6-max hands: button steals, defending the big blind, knowing when to give up.',
        },
        { t: 'tip', text: 'Switch the format to see the other set of hands.' },
      ],
    },
  ],
};
