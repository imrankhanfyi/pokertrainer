/**
 * Post-flop decisions (lesson 5). The SITUATIONS and ADVICE are hand-written below;
 * only the cards are random, dealt until they match each template's constraints
 * (checked with the hand evaluator), so the explanation always fits the cards.
 */
import { type Card, FULL_DECK, type Rng, classOf, rankOf, rankValue, showCards, shuffled, suitOf } from '../cards';
import { CATEGORY_NAME, Category, evaluate } from '../evaluator';
import { type Format, FORMAT_SHORT, type Pos } from '../../data/positions';
import { getChart } from '../preflop';
import { classifyDraw } from './drawspot';
import { improvingCards } from '../odds';
import type { Choice, Question } from './types';

let counter = 0;
const qid = () => `post-${Date.now().toString(36)}-${counter++}`;
const bb = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}bb`;
const half = (n: number) => Math.max(1, Math.round(n * 2) / 2);

// ---------- board & hand helpers ----------
const ranksOf = (cs: Card[]) => cs.map(rankValue);
export const maxSuitCount = (b: Card[]) => Math.max(...'shdc'.split('').map((s) => b.filter((c) => suitOf(c) === s).length));
/** Most board cards that fit inside any 5-rank straight window (aces count high and low). */
export function connectedness(b: Card[]): number {
  const rs = new Set(ranksOf(b).flatMap((r) => (r === 14 ? [14, 1] : [r])));
  let best = 0;
  for (let lo = 1; lo <= 10; lo++) {
    let n = 0;
    for (let r = lo; r < lo + 5; r++) if (rs.has(r)) n++;
    best = Math.max(best, n);
  }
  return best;
}
const paired = (b: Card[]) => new Set(b.map(rankOf)).size !== b.length;
export const isDry = (b: Card[]) => !paired(b) && maxSuitCount(b) === 1 && connectedness(b) <= 2 && Math.max(...ranksOf(b)) >= 11;
/** Draw-heavy: two-tone and three cards within a straight window of middle cards (no ace-low wheel boards). */
export const isWet = (b: Card[]) => !paired(b) && maxSuitCount(b) >= 2 && connectedness(b) >= 3 && Math.max(...ranksOf(b)) <= 13 && Math.min(...ranksOf(b)) >= 5;
const topRank = (b: Card[]) => Math.max(...ranksOf(b));
const minRank = (b: Card[]) => Math.min(...ranksOf(b));

function isTopPairGoodKicker(h: Card[], b: Card[]) {
  if (rankOf(h[0]) === rankOf(h[1])) return false;
  const v = evaluate([...h, ...b]);
  if (v.category !== Category.Pair) return false;
  const pairCard = h.find((c) => rankValue(c) === topRank(b));
  const kicker = h.find((c) => c !== pairCard);
  return !!pairCard && !!kicker && rankValue(kicker) >= 10;
}
function isBottomPair(h: Card[], b: Card[]) {
  if (rankOf(h[0]) === rankOf(h[1])) return false;
  const v = evaluate([...h, ...b]);
  return v.category === Category.Pair && h.some((c) => rankValue(c) === minRank(b)) && !h.some((c) => rankValue(c) === topRank(b));
}
const isAir = (h: Card[], b: Card[]) => evaluate([...h, ...b]).category === Category.HighCard && classifyDraw(h, b) === null;
const isStrong = (h: Card[], b: Card[]) => {
  const c = evaluate([...h, ...b]).category;
  // Two pair using both hole cards, or a set (pocket pair + board card).
  if (c === Category.Trips) return rankOf(h[0]) === rankOf(h[1]);
  if (c === Category.TwoPair) return h.every((x) => b.some((y) => rankOf(y) === rankOf(x))) && rankOf(h[0]) !== rankOf(h[1]);
  return false;
};
const isGoodDraw = (h: Card[], b: Card[]) => {
  const k = classifyDraw(h, b);
  return (k === 'flush' || k === 'oesd' || k === 'combo') && evaluate([...h, ...b]).category === Category.HighCard;
};

const RAISE_RANGE = (() => {
  const s = new Set<string>();
  for (const p of ['CO', 'BTN'] as const) for (const h of getChart('fullring', 'open', p)!.raise) s.add(h);
  return s;
})();

function deal(nBoard: number, rng: Rng, ok: (h: Card[], b: Card[]) => boolean, heroRange = RAISE_RANGE): { hero: [Card, Card]; board: Card[] } {
  for (let i = 0; i < 40000; i++) {
    const d = shuffled(FULL_DECK, rng);
    const hero = [d[0], d[1]] as [Card, Card];
    if (!heroRange.has(classOf(hero[0], hero[1]))) continue;
    const board = d.slice(2, 2 + nBoard);
    if (ok(hero, board)) return { hero, board };
  }
  throw new Error('deal: constraints too tight');
}

// ---------- choice sets ----------
const UNOPENED = (pot: number): Choice[] => [
  { id: 'check', label: 'Check' },
  { id: 'small', label: 'Bet small', sub: `⅓ pot · ${bb(half(pot / 3))}` },
  { id: 'big', label: 'Bet big', sub: `⅔ pot · ${bb(half((pot * 2) / 3))}` },
];
const FACING = (bet: number): Choice[] => [
  { id: 'fold', label: 'Fold' },
  { id: 'call', label: 'Call', sub: bb(bet) },
  { id: 'raise', label: 'Raise', sub: `to ${bb(half(bet * 3))}` },
];

interface Built {
  street: 'flop' | 'turn' | 'river';
  hero: [Card, Card];
  board: Card[];
  pot: number;
  bet?: number;
  heroPos: Pos;
  story: string;
  prompt: string;
  correct: string;
  close: boolean;
  explanation: string;
  closeNote?: string;
}

type Template = { id: string; weight: number; build: (f: Format, rng: Rng) => Built };

const flopPot = (f: Format, players: number) => (f === 'fullring' ? 3 * players + 1.5 : 2.5 * players + 1.5);

const TEMPLATES: Template[] = [
  {
    id: 'cbet-dry',
    weight: 3,
    build: (f, rng) => {
      const { hero, board } = deal(3, rng, (h, b) => isDry(b) && isAir(h, b));
      const pot = flopPot(f, 2);
      return {
        street: 'flop', hero, board, pot, heroPos: 'BTN',
        story: `You raised on the button and the big blind called. Heads-up. They check to you.`,
        prompt: 'You missed the flop. What do you do?',
        correct: 'small', close: false,
        explanation: `This is a dry board – no flush draws and few straight draws – so it rarely helps the big blind’s calling range either. A small [[c-bet|continuation bet]] (about a third of the pot) wins the pot right away surprisingly often, and costs little when it doesn’t. If they call or raise, you can give up.`,
        closeNote: f === 'fullring' ? 'Home-game note: against a player who never folds, just check and give up – bluffs need someone who folds.' : undefined,
      };
    },
  },
  {
    id: 'no-cbet-wet-multiway',
    weight: 2,
    build: (f, rng) => {
      const { hero, board } = deal(3, rng, (h, b) => isWet(b) && isAir(h, b));
      const pot = flopPot(f, 3);
      return {
        street: 'flop', hero, board, pot, heroPos: 'BTN',
        story: `You raised on the button and both blinds called – three players. They both check to you.`,
        prompt: 'You missed this connected, two-suited board. What do you do?',
        correct: 'check', close: false,
        explanation: `With two opponents on a board full of draws, someone has very often hit a pair or a draw and won’t fold. A bluff here rarely works. Check, take the free card, and give up if you don’t improve.`,
        closeNote: f === 'fullring' ? 'Multiway pots are the norm in loose home games – this is one of the most useful spots to get right.' : undefined,
      };
    },
  },
  {
    id: 'value-top-pair',
    weight: 3,
    build: (f, rng) => {
      const street = rng() < 0.6 ? 'flop' : 'turn';
      const { hero, board } = deal(street === 'flop' ? 3 : 4, rng, (h, b) => isTopPairGoodKicker(h, b) && !paired(b) && maxSuitCount(b) <= 2 && connectedness(b) <= 3);
      const pot = street === 'flop' ? flopPot(f, 2) : half(flopPot(f, 2) * 2);
      return {
        street, hero, board, pot, heroPos: 'CO',
        story: `You raised from the cutoff and the big blind called. ${street === 'turn' ? 'You bet the flop and they called. ' : ''}They check to you.`,
        prompt: `You have top pair with a good kicker. What do you do?`,
        correct: 'big', close: false,
        explanation: `Top pair with a good [[kicker]] is usually the best hand here, and worse hands (weaker pairs, draws) will call. Bet for [[value-bet|value]] – around two-thirds of the pot – to get paid. Checking gives free cards that could beat you.`,
        closeNote: 'A smaller bet isn’t a disaster, but against players who call a lot, bigger value bets earn more.',
      };
    },
  },
  {
    id: 'strong-wet',
    weight: 2,
    build: (f, rng) => {
      const sets = new Set([...RAISE_RANGE].filter((h) => h.length === 2 || h.endsWith('s')));
      const { hero, board } = deal(3, rng, (h, b) => isStrong(h, b) && maxSuitCount(b) >= 2 && connectedness(b) >= 2, sets);
      const pot = flopPot(f, 2);
      const what = CATEGORY_NAME[evaluate([...hero, ...board]).category];
      return {
        street: 'flop', hero, board, pot, heroPos: 'BTN',
        story: `You raised on the button and the big blind called. They check to you.`,
        prompt: `You flopped ${what === 'three of a kind' ? 'a [[set]]' : 'two pair'}. What do you do?`,
        correct: 'big', close: false,
        explanation: `You have a very strong hand on a board with possible draws. Bet big: you get paid by pairs and draws now, and you make drawing hands pay the wrong price to chase. Don’t slow-play on a wet board – a free card could beat you.`,
      };
    },
  },
  {
    id: 'semi-bluff',
    weight: 2,
    build: (f, rng) => {
      const { hero, board } = deal(3, rng, (h, b) => isGoodDraw(h, b) && !paired(b));
      const pot = flopPot(f, 2);
      return {
        street: 'flop', hero, board, pot, heroPos: 'BTN',
        story: `You raised on the button and the big blind called. They check to you.`,
        prompt: 'You have a strong draw. What do you do?',
        correct: 'big', close: true,
        explanation: `Bet as a [[semi-bluff]]: you can win the pot right now if they fold, and if they call you still have lots of [[outs]] to make the best hand. Betting also means you won’t have to call a bet later with a draw.`,
        closeNote: 'Checking to take a free card is also reasonable, especially against players who never fold. Betting is the better default heads-up.',
      };
    },
  },
  {
    id: 'call-draw-small-bet',
    weight: 2,
    build: (f, rng) => {
      // Flush and combo draws only, facing a quarter-pot bet: the one-card chance always beats
      // the price, so this agrees with the pot-odds drill's rule (tests check it).
      const { hero, board } = deal(3, rng, (h, b) => ['flush', 'combo'].includes(classifyDraw(h, b) ?? '') && evaluate([...h, ...b]).category === Category.HighCard && !paired(b));
      const pot = flopPot(f, 2);
      const bet = half(pot / 4);
      const outs = improvingCards(hero, board, Category.Straight).length;
      const need = bet / (pot + 2 * bet);
      return {
        street: 'flop', hero, board, pot, bet, heroPos: 'BB',
        story: `You called a raise from the big blind. On the flop you check and your opponent bets ${bb(bet)} into ${bb(pot)}.`,
        prompt: 'You have a strong draw facing a small bet. What do you do?',
        correct: 'call', close: true,
        explanation: `A small bet gives you a good price: call ${bb(bet)} to win ${bb(pot + bet)}, so you need to win ${Math.round(need * 100)}% of the time. ${outs} cards complete your draw – about ${outs * 2}% on the next card alone (${outs} × 2) – and you’ll win more when you hit ([[implied-odds|implied odds]]). Call.`,
        closeNote: 'Raising as a semi-bluff is also fine against opponents who fold. Folding is the mistake.',
      };
    },
  },
  {
    id: 'top-pair-facing-bet',
    weight: 2,
    build: (f, rng) => {
      const { hero, board } = deal(3, rng, (h, b) => isTopPairGoodKicker(h, b) && !paired(b) && maxSuitCount(b) <= 2);
      const pot = flopPot(f, 2);
      const bet = half(pot / 2);
      return {
        street: 'flop', hero, board, pot, bet, heroPos: 'BB',
        story: `You called a raise from the big blind. You check and your opponent bets ${bb(bet)} into ${bb(pot)}.`,
        prompt: 'You have top pair with a good kicker. What do you do?',
        correct: 'call', close: true,
        explanation: `Top pair, good kicker is too good to fold to a normal-sized bet, but raising mostly makes worse hands fold and gets called by better ones. Calling keeps their weaker hands and bluffs in, and keeps the pot manageable [[out-of-position|out of position]].`,
        closeNote: 'Raising for value is fine against players who bet lots of weak hands. Folding is the mistake here.',
      };
    },
  },
  {
    id: 'fold-weak-pair-big-bet',
    weight: 2,
    build: (f, rng) => {
      const { hero, board } = deal(4, rng, (h, b) => isBottomPair(h, b) && !paired(b) && classifyDraw(h, b) === null);
      const pot = half(flopPot(f, 2) * 2);
      const bet = half(pot);
      return {
        street: 'turn', hero, board, pot, bet, heroPos: 'BB',
        story: `You called a raise from the big blind and called a small bet on the flop. On the turn your opponent – ${f === 'fullring' ? 'a quiet player who rarely bets without a hand' : 'a solid regular'} – bets the size of the pot.`,
        prompt: 'You have bottom pair. What do you do?',
        correct: 'fold', close: f === 'sixmax',
        explanation: `A big bet on the turn usually means a strong hand, and bottom pair beats only bluffs. You’d need to win a third of the time to call a pot-sized bet, and with one card to come you rarely improve. Fold.`,
        closeNote: f === 'sixmax' ? '6-max note: aggressive online players bluff more, so this is closer there – but folding is still the safe beginner default.' : 'Full ring note: quiet, passive players almost never bluff big. Believe them.',
      };
    },
  },
  {
    id: 'no-river-bluff',
    weight: 2,
    build: (f, rng) => {
      const { hero, board } = deal(5, rng, (h, b) => {
        // Missed draw: four to a flush or straight on the turn that bricked on the river.
        const turn = b.slice(0, 4);
        // …and no hole card above the board's top card, so it really can't win at showdown.
        return isGoodDraw(h, turn) && evaluate([...h, ...b]).category === Category.HighCard && Math.max(...ranksOf(h)) < topRank(b);
      });
      const pot = half(flopPot(f, 2) * 3);
      return {
        street: 'river', hero, board, pot, heroPos: 'BTN',
        story: `You chased a draw all the way and missed. Your opponent – ${f === 'fullring' ? 'a loose player who calls almost everything' : 'a player who has called every bet'} – checks to you on the river.`,
        prompt: 'You have nothing. What do you do?',
        correct: 'check', close: f === 'sixmax',
        explanation: `A [[bluff]] only works if your opponent folds, and players who call too much won’t. Your hand can’t win at [[showdown]], so check and accept the loss – that’s cheaper than bluffing into someone who always calls.`,
        closeNote: f === 'sixmax' ? '6-max note: thinking opponents fold more, so the occasional river bluff can work online. Against a confirmed calling station, never.' : 'Full ring note: in loose home games, pure river bluffs should be rare.',
      };
    },
  },
  {
    id: 'river-value',
    weight: 2,
    build: (f, rng) => {
      const { hero, board } = deal(5, rng, (h, b) => isTopPairGoodKicker(h, b) && !paired(b) && maxSuitCount(b) <= 2 && connectedness(b) <= 3);
      const pot = half(flopPot(f, 2) * 3);
      return {
        street: 'river', hero, board, pot, heroPos: 'CO',
        story: `You bet the flop and turn and your opponent called both times. They check the river.`,
        prompt: 'You have top pair, good kicker, and the board looks safe. What do you do?',
        correct: 'big', close: true,
        explanation: `Players who call a lot will call again with worse pairs. Bet for [[value-bet|value]]. This is how you make money against loose players: bet your good hands, don’t bluff your bad ones.`,
        closeNote: 'A smaller value bet is fine too if you think they only call with weak hands. Checking misses value.',
      };
    },
  },
];

export function postflopQuestion(format: Format, rng: Rng = Math.random, templateId?: string): Question {
  const pool = templateId ? TEMPLATES.filter((t) => t.id === templateId) : TEMPLATES;
  const total = pool.reduce((s, t) => s + t.weight, 0);
  let r = rng() * total;
  const t = pool.find((x) => (r -= x.weight) < 0) ?? pool[0];
  const b = t.build(format, rng);
  const choices = b.bet ? FACING(b.bet) : UNOPENED(b.pot);
  const streetName = b.street[0].toUpperCase() + b.street.slice(1);
  return {
    id: qid(),
    skill: 'postflop',
    format,
    prompt: b.prompt,
    context: `${streetName} · Pot ${bb(b.pot)}${b.bet ? ` · They bet ${bb(b.bet)}` : ''}. ${b.story}`,
    cardsView: { board: b.board, hero: b.hero },
    choices,
    correct: b.correct,
    close: b.close,
    explanation: b.explanation,
    closeNote: b.closeNote,
    facts: {
      template: t.id,
      format: `${FORMAT_SHORT[format]} (${format === 'fullring' ? 'loose-passive home game' : 'online, more aggressive'})`,
      street: b.street,
      my_position: b.heroPos,
      my_cards: showCards(b.hero),
      board: showCards(b.board),
      my_hand: CATEGORY_NAME[evaluate([...b.hero, ...b.board]).category],
      pot: bb(b.pot),
      story: b.story,
      ...(b.bet ? { bet_facing: bb(b.bet) } : {}),
    },
  };
}

export const POSTFLOP_TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
