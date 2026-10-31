/**
 * Full-hand walkthroughs for lesson 6 – hand-written. Pots are in big blinds and
 * are the pot BEFORE the decision (including any bet you face). tests/hands.test.ts
 * checks: all cards are unique, preflop answers match the charts, claimed hand
 * strengths match the evaluator, showdown results are right, and pots add up.
 */
import type { ChartPos, Format, Pos } from './positions';
import type { Situation } from './ranges';

export interface HandStepSpec {
  street: 'preflop' | 'flop' | 'turn' | 'river';
  board: string; // cards visible at this decision ("" preflop)
  pot: number;
  facing?: number; // bet you must call
  story: string;
  prompt: string;
  choices: { id: string; label: string; sub?: string }[];
  correct: string;
  close?: boolean;
  explanation: string;
  closeNote?: string;
  /** What happens after the right action – shown before the next step. */
  then?: string;
  /** For tests: the hand category the text claims you hold here (evaluator name). */
  claim?: string;
  /** For tests: preflop chart this decision comes from. */
  chart?: { situation: Situation; pos: ChartPos };
  /** For tests: pot arithmetic – chips added between this step and the next. */
  added?: number;
}

export interface HandSpec {
  id: string;
  format: Format;
  title: string;
  heroPos: Pos;
  hero: string;
  steps: HandStepSpec[];
  outcome: string;
  showdown?: { villain: string; board: string; heroWins: boolean };
}

const FR = 'fullring' as const;
const SM = 'sixmax' as const;

export const HANDS: HandSpec[] = [
  {
    id: 'iso-top-pair',
    format: FR,
    title: 'Isolating limpers with A-J suited',
    heroPos: 'CO',
    hero: 'As Js',
    steps: [
      {
        street: 'preflop', board: '', pot: 3.5,
        story: 'Home game, 100bb stacks. UTG+1 and the lojack limp. It’s folded to you in the cutoff.',
        prompt: 'You have A♠J♠. What do you do?',
        choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: '1bb' }, { id: 'raise', label: 'Raise', sub: 'to 6bb' }],
        correct: 'raise',
        explanation: 'A-J suited is well ahead of typical limping hands. [[isolate|Isolate]]: raise to 4bb + 1bb per limper = 6bb, aiming to play against one weak player with position.',
        then: 'The blinds fold, UTG+1 calls and the lojack folds. Heads-up, and you’re [[in-position|in position]].',
        chart: { situation: 'limpers', pos: 'CO' },
        added: 11, // you 6 + UTG+1 calls 5 more
      },
      {
        street: 'flop', board: 'Jd 7c 2h', pot: 14.5,
        story: 'UTG+1 checks to you.',
        prompt: 'You have top pair, top kicker on a dry board. What do you do?',
        choices: [{ id: 'check', label: 'Check' }, { id: 'small', label: 'Bet small', sub: '5bb' }, { id: 'big', label: 'Bet big', sub: '9.5bb' }],
        correct: 'big', close: true,
        explanation: 'You very likely have the best hand, and a loose player who limp-calls will call with worse jacks, sevens and draws. Bet about two-thirds of the pot for [[value-bet|value]].',
        closeNote: 'On a board this dry a smaller bet is fine too. Checking is the only real mistake.',
        then: 'They call.',
        claim: 'one pair',
        added: 19,
      },
      {
        street: 'turn', board: 'Jd 7c 2h 4s', pot: 33.5,
        story: 'The 4♠ changes nothing. They check again.',
        prompt: 'What now?',
        choices: [{ id: 'check', label: 'Check' }, { id: 'small', label: 'Bet small', sub: '11bb' }, { id: 'big', label: 'Bet big', sub: '22bb' }],
        correct: 'big',
        explanation: 'Keep betting for value. Players who call the flop with a weaker jack or a seven will usually call again. Checking lets them see a free river.',
        then: 'They call again.',
        claim: 'one pair',
        added: 44,
      },
      {
        street: 'river', board: 'Jd 7c 2h 4s Kh', pot: 102.5, facing: 25,
        story: 'The river is the K♥. Your opponent, who has only called so far, now bets 25bb into 77.5bb.',
        prompt: 'What do you do?',
        choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: '25bb' }, { id: 'raise', label: 'All-in', sub: '62.5bb' }],
        correct: 'call', close: true,
        explanation: 'When a passive player suddenly bets, the king may well have helped them. But the bet is small: you call 25bb to win 102.5bb, so you need to be right only about 20% of the time ([[pot-odds|pot odds]]). Call – don’t raise, because worse hands won’t call a raise and better ones will.',
        closeNote: 'Against a very tight, honest player who never bluffs, folding is understandable. The price makes calling the better default.',
        claim: 'one pair',
      },
    ],
    outcome: 'They show K♣T♣ – the king on the river gave them a better pair. You lose this one, but every decision was sound. Good decisions lose sometimes; they win over many hands.',
    showdown: { villain: 'Kc Tc', board: 'Jd 7c 2h 4s Kh', heroWins: false },
  },
  {
    id: 'set-mine',
    format: FR,
    title: 'Set mining with a small pair',
    heroPos: 'HJ',
    hero: '6h 6c',
    steps: [
      {
        street: 'preflop', board: '', pot: 4.5, facing: 3,
        story: 'Home game, 100bb stacks. Under the gun raises to 3bb. It’s folded to you in the hijack.',
        prompt: 'You have 6♥6♣. What do you do?',
        choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: '3bb' }, { id: 'raise', label: 'Re-raise', sub: 'to 9bb' }],
        correct: 'call',
        explanation: 'A small pair rarely wins unimproved, but about 1 flop in 8 you make a [[set]] – and then you can win a big pot from an early-position raiser with a strong hand. With 100bb stacks the price is right. Call ([[set-mining|set mining]]).',
        then: 'The button also calls; the blinds fold. Three players see the flop.',
        chart: { situation: 'raise', pos: 'MP' },
        added: 6, // you 3 + button 3
      },
      {
        street: 'flop', board: 'Qs 6d 3c', pot: 16.5, facing: 6,
        story: 'UTG bets 6bb into 10.5bb. The button is still to act after you.',
        prompt: 'You flopped a set of sixes. What do you do?',
        choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: '6bb' }, { id: 'raise', label: 'Raise', sub: 'to 18bb' }],
        correct: 'raise', close: true,
        explanation: 'You have a monster. An early raiser on a queen-high board often has a big pair or a queen and will pay you. Raise for value now: it builds the pot while they still like their hand.',
        closeNote: 'Just calling to trap is OK on a board this dry, but raising is simpler and usually wins more against players who don’t fold top pair.',
        then: 'The button folds and UTG calls.',
        claim: 'three of a kind',
        added: 30, // you put in 18, UTG calls 12 more (their 6 is already in the pot)
      },
      {
        street: 'turn', board: 'Qs 6d 3c 9h', pot: 46.5,
        story: 'The 9♥ arrives. UTG checks.',
        prompt: 'What do you do?',
        choices: [{ id: 'check', label: 'Check' }, { id: 'small', label: 'Bet small', sub: '15bb' }, { id: 'big', label: 'Bet big', sub: '31bb' }],
        correct: 'big',
        explanation: 'Keep building the pot: a queen or an overpair will call again. Checking risks a free card that could complete a straight draw.',
        then: 'UTG calls. You have 48bb left.',
        claim: 'three of a kind',
        added: 62,
      },
      {
        street: 'river', board: 'Qs 6d 3c 9h 2d', pot: 108.5,
        story: 'The river is the 2♦. UTG checks. You have 48bb left in your stack.',
        prompt: 'What do you do?',
        choices: [{ id: 'check', label: 'Check' }, { id: 'small', label: 'Bet small', sub: '20bb' }, { id: 'allin', label: 'All-in', sub: '48bb' }],
        correct: 'allin',
        explanation: 'Your 48bb is less than half the pot. Someone who called the flop raise and the turn with a queen will very likely call the rest. Get it all in for value.',
        claim: 'three of a kind',
      },
    ],
    outcome: 'UTG calls with A♣Q♦ – top pair, top kicker. Your set wins a 204.5bb pot. This is why you call raises with small pairs: rarely, but when it hits, it pays.',
    showdown: { villain: 'Ac Qd', board: 'Qs 6d 3c 9h 2d', heroWins: true },
  },
  {
    id: 'button-steal',
    format: SM,
    title: 'Button steal and knowing when to stop',
    heroPos: 'BTN',
    hero: 'Kd Ts',
    steps: [
      {
        street: 'preflop', board: '', pot: 1.5,
        story: '6-max online, 100bb stacks. It’s folded to you on the button.',
        prompt: 'You have K♦T♠. What do you do?',
        choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Limp', sub: '1bb' }, { id: 'raise', label: 'Raise', sub: 'to 2.5bb' }],
        correct: 'raise',
        explanation: 'From the button only the blinds are left, so a wide range of hands is worth an [[open-raise]]. K-T offsuit is comfortably in it. Raise to 2.5bb – never limp.',
        then: 'The small blind folds; the big blind calls.',
        chart: { situation: 'open', pos: 'BTN' },
        added: 4, // you 2.5 + BB 1.5 more
      },
      {
        street: 'flop', board: 'Ac 7d 2s', pot: 5.5,
        story: 'The big blind checks.',
        prompt: 'You missed. What do you do?',
        choices: [{ id: 'check', label: 'Check' }, { id: 'small', label: 'Bet small', sub: '2bb' }, { id: 'big', label: 'Bet big', sub: '3.5bb' }],
        correct: 'small',
        explanation: 'An ace-high, dry board is great for the preflop raiser: you’re “supposed” to have the aces. A small [[c-bet|continuation bet]] wins often and risks little.',
        then: 'The big blind calls.',
        claim: 'high card',
        added: 4,
      },
      {
        street: 'turn', board: 'Ac 7d 2s 8h', pot: 9.5,
        story: 'The 8♥. The big blind checks again.',
        prompt: 'You still have only king-high. What do you do?',
        choices: [{ id: 'check', label: 'Check' }, { id: 'small', label: 'Bet small', sub: '3bb' }, { id: 'big', label: 'Bet big', sub: '6.5bb' }],
        correct: 'check', close: true,
        explanation: 'They called on an ace-high board, so they often have an ace or a seven and won’t fold now. Your hand has no draw to fall back on. Check and take the free card.',
        closeNote: 'Strong players sometimes bet again here as a bluff. As a default, one bluff is enough when you have no draw.',
        claim: 'high card',
      },
      {
        street: 'river', board: 'Ac 7d 2s 8h 5c', pot: 13.5, facing: 4,
        story: 'The river is the 5♣. The big blind bets 4bb into 9.5bb.',
        prompt: 'You have king-high. What do you do?',
        choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: '4bb' }, { id: 'raise', label: 'Raise', sub: 'to 12bb' }],
        correct: 'fold',
        explanation: 'King-high beats only a bluff, and they’ve shown interest in the hand on every street. Fold. Losing 4.5bb here is a small, disciplined loss.',
        claim: 'high card',
      },
    ],
    outcome: 'You fold and lose 4.5bb. That’s fine: you tried a cheap bluff, stopped when it didn’t work, and didn’t pay off at the end.',
  },
  {
    id: 'bb-flush-draw',
    format: SM,
    title: 'Defending the big blind with a flush draw',
    heroPos: 'BB',
    hero: '9h 8h',
    steps: [
      {
        street: 'preflop', board: '', pot: 4, facing: 1.5,
        story: '6-max online, 100bb stacks. The cutoff raises to 2.5bb; the button and small blind fold.',
        prompt: 'You’re in the big blind with 9♥8♥. What do you do?',
        choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: '1.5bb' }, { id: 'raise', label: 'Re-raise', sub: 'to 10bb' }],
        correct: 'call',
        explanation: 'You already have 1bb in, so calling costs only 1.5bb more to win the 4bb pot – you need to win just 1.5 ÷ 5.5 ≈ 27% of the time. Suited connectors play well enough after the flop to do that against a cutoff raise. Call.',
        then: 'Heads-up to the flop. You act first.',
        chart: { situation: 'raise', pos: 'BB' },
        added: 1.5,
      },
      {
        street: 'flop', board: 'Kh 7h 2c', pot: 7, facing: 1.5,
        story: 'You check, and the cutoff bets 1.5bb into 5.5bb.',
        prompt: 'You have a flush draw. What do you do?',
        choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: '1.5bb' }, { id: 'raise', label: 'Raise', sub: 'to 5bb' }],
        correct: 'call',
        explanation: 'You call 1.5bb to win 7bb: you need 1.5 ÷ 8.5 ≈ 18%. Nine flush [[outs]] on the next card alone is about 19% (9 × 2). The price is right before even counting what you’ll win when you hit. Call.',
        closeNote: undefined,
        then: 'Pot is 8.5bb.',
        claim: 'high card',
        added: 1.5,
      },
      {
        street: 'turn', board: 'Kh 7h 2c 3s', pot: 14.5, facing: 6,
        story: 'The 3♠ misses you. You check, and the cutoff bets 6bb into 8.5bb.',
        prompt: 'Still a flush draw, one card to come. What do you do?',
        choices: [{ id: 'fold', label: 'Fold' }, { id: 'call', label: 'Call', sub: '6bb' }, { id: 'raise', label: 'Raise', sub: 'to 18bb' }],
        correct: 'fold',
        explanation: 'Now you’d call 6bb to win 14.5bb: you need 6 ÷ 20.5 ≈ 29%. With one card to come, 9 outs is about 18–20% (9 × 2). That price is too high. Fold.',
        closeNote: 'Very deep stacks and an opponent who always pays off could justify a call ([[implied-odds|implied odds]]), but that’s an advanced adjustment.',
        claim: 'high card',
      },
    ],
    outcome: 'You fold and lose 4bb in total. Calling the cheap flop bet and folding to the big turn bet is exactly how pot odds should guide draws.',
  },
];
