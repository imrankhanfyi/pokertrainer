import { type Rng, pick, shuffled } from '../cards';
import { type Format, type Pos, FORMAT_SHORT, POS_NAME, positionsFor, postflopOrder } from '../../data/positions';
import type { Question, Seat } from './types';

let counter = 0;
const qid = () => `pos-${Date.now().toString(36)}-${counter++}`;

const label = (p: Pos) => `${POS_NAME[p]} (${p})`;

function baseSeats(order: Pos[]): Seat[] {
  return order.map((pos) => ({ pos, state: pos === 'SB' || pos === 'BB' ? 'blind' : 'waiting', bet: pos === 'SB' ? 0.5 : pos === 'BB' ? 1 : undefined }));
}

function distractors(correct: Pos, pool: Pos[], n: number, rng: Rng): Pos[] {
  // Prefer neighbouring seats: they are the ones people actually confuse.
  const i = pool.indexOf(correct);
  const near = pool.filter((p, j) => p !== correct && Math.abs(j - i) <= 2);
  const far = pool.filter((p) => p !== correct && !near.includes(p));
  return [...shuffled(near, rng), ...shuffled(far, rng)].slice(0, n);
}

type Gen = (format: Format, rng: Rng) => Question;

/** "Which seat are you in?" – labels hidden, only the dealer button shown. */
const nameMySeat: Gen = (format, rng) => {
  const players = format === 'fullring' ? pick([8, 9], rng) : 6;
  const order = positionsFor(format, players);
  const hero = pick(order, rng);
  const opts = shuffled([hero, ...distractors(hero, order, 3, rng)], rng);
  const toRight = (order.indexOf('BTN') - order.indexOf(hero) + order.length) % order.length;
  const explain: Record<Pos, string> = {
    BTN: 'The [[button]] is the dealer seat. It acts last on every street after the flop.',
    SB: 'The seat directly left of the [[button]] posts the [[small-blind]].',
    BB: 'Two seats left of the [[button]] is the [[big-blind]]. It acts last before the flop.',
    UTG: 'The seat directly left of the [[big-blind]] is [[utg|under the gun]]: first to act before the flop.',
    'UTG+1': 'One seat after [[utg|under the gun]] is UTG+1, still [[early-position|early position]].',
    'UTG+2': 'Two seats after [[utg|under the gun]] is UTG+2, the last early seat at a nine-handed table.',
    LJ: 'Count right from the button: [[cutoff]], [[hijack]], then [[lojack]].',
    HJ: 'Two seats to the right of the button is the [[hijack]].',
    CO: 'The seat directly right of the [[button]] is the [[cutoff]].',
  };
  return {
    id: qid(), skill: 'positions', format,
    prompt: 'What is your position?',
    context: `${players}-handed table. Find the dealer button (D), then count.`,
    table: { seats: baseSeats(order).map((s) => (s.pos === hero ? { ...s, state: 'hero' } : s)), heroPos: hero, hideLabels: true },
    choices: opts.map((p) => ({ id: p, label: label(p) })),
    correct: hero,
    close: false,
    explanation: `${explain[hero]}${toRight > 0 && toRight <= 3 && hero !== 'BTN' ? ` You are ${toRight} seat${toRight > 1 ? 's' : ''} to the right of the button.` : ''}`,
    facts: {
      question: 'Identify my position from the seat and the dealer button',
      players: String(players),
      seats_in_preflop_action_order: order.join(' > '),
      button_is: 'the dealer seat; SB is directly to its left, BB two seats left',
      my_seat_relative_to_button: toRight === 0 ? 'I am on the button' : toRight <= order.length - toRight ? `${toRight} seat${toRight > 1 ? 's' : ''} to the right of the button` : `${order.length - toRight} seat${order.length - toRight > 1 ? 's' : ''} to the left of the button`,
      answer: hero,
    },
  };
};

/** "Who acts first after the flop?" among 2–4 players still in. */
const firstPostflop: Gen = (format, rng) => {
  const order = positionsFor(format);
  const n = pick([2, 3, 3, 4], rng);
  const inHand = shuffled(order, rng).slice(0, n);
  const post = postflopOrder(order).filter((p) => inHand.includes(p));
  const askLast = rng() < 0.4;
  const answer = askLast ? post[post.length - 1] : post[0];
  const seats = baseSeats(order).map((s): Seat => (inHand.includes(s.pos) ? { ...s, state: 'in', bet: undefined } : { ...s, state: 'folded', bet: undefined }));
  return {
    id: qid(), skill: 'positions', format,
    prompt: askLast ? 'After the flop, who acts LAST?' : 'After the flop, who acts FIRST?',
    context: `Still in the hand: ${post.map((p) => p).join(', ')}`,
    table: { seats },
    choices: shuffled(inHand, rng).map((p) => ({ id: p, label: label(p) })),
    correct: answer,
    close: false,
    explanation: askLast
      ? `After the flop the player closest to the [[button]] (on its right side, or the button itself) acts last. Here that's the ${POS_NAME[answer].toLowerCase()} – they are [[in-position|in position]] on everyone else.`
      : `After the flop, action starts with the first player still in to the left of the [[button]]: [[small-blind]], then [[big-blind]], then round the table. Here that's the ${POS_NAME[answer].toLowerCase()}.`,
    facts: { question: askLast ? 'Who acts last post-flop' : 'Who acts first post-flop', playersInHand: post.join(', '), answer },
  };
};

/** "Who acts next before the flop?" */
const nextPreflop: Gen = (format, rng) => {
  const order = positionsFor(format);
  // Pick an actor (not BB, since the BB closes the action in an unraised pot).
  const i = Math.floor(rng() * (order.length - 1));
  const actor = order[i];
  const answer = order[i + 1];
  const seats = baseSeats(order).map((s, j): Seat => {
    if (j < i) return { ...s, state: 'folded', bet: s.bet };
    if (j === i) return { ...s, state: s.state === 'blind' ? 'blind' : 'folded', tag: 'Just folded', highlight: true };
    return s;
  });
  const opts = shuffled([answer, ...distractors(answer, order.filter((p) => p !== actor), 3, rng)], rng);
  return {
    id: qid(), skill: 'positions', format,
    prompt: `Before the flop, the ${POS_NAME[actor].toLowerCase()} just folded. Who acts next?`,
    table: { seats },
    choices: opts.map((p) => ({ id: p, label: label(p) })),
    correct: answer,
    close: false,
    explanation:
      i === 0
        ? 'Action always moves clockwise (to the left). Before the flop it starts [[utg|under the gun]] and finishes with the [[big-blind]].'
        : `Action moves clockwise, one seat at a time. Before the flop the order is ${order.join(' → ')}, so after the ${actor} comes the ${answer}.`,
    facts: { question: 'Who acts next preflop', justActed: actor, answer, order: order.join(' > ') },
  };
};

/** "Are you in position?" */
const inPositionQ: Gen = (format, rng) => {
  const order = positionsFor(format);
  const [a, b] = shuffled(order, rng);
  const post = postflopOrder(order);
  const heroLast = post.indexOf(a) > post.indexOf(b);
  const seats = baseSeats(order).map((s): Seat =>
    s.pos === a ? { ...s, state: 'hero', bet: undefined } : s.pos === b ? { ...s, state: 'in', bet: undefined } : { ...s, state: 'folded', bet: undefined });
  return {
    id: qid(), skill: 'positions', format,
    prompt: `You're in the ${POS_NAME[a].toLowerCase()} and one opponent, the ${POS_NAME[b].toLowerCase()}, sees the flop with you. Are you in position?`,
    table: { seats, heroPos: a },
    choices: [{ id: 'yes', label: 'Yes – I act last' }, { id: 'no', label: 'No – I act first' }],
    correct: heroLast ? 'yes' : 'no',
    close: false,
    explanation: (heroLast
      ? `You act after the ${b} on every street from the flop on, so you're [[in-position|in position]]. That's an advantage: you see what they do before you decide.`
      : `The ${b} acts after you on the flop, turn and river, so you're [[out-of-position|out of position]] and must decide first with less information.`),
    facts: { question: 'Am I in position post-flop', me: a, opponent: b, format: FORMAT_SHORT[format], answer: heroLast ? 'yes' : 'no' },
  };
};

const GENERATORS: [Gen, number][] = [[nameMySeat, 3], [firstPostflop, 2], [nextPreflop, 2], [inPositionQ, 2]];

export function positionsQuestion(format: Format, rng: Rng = Math.random): Question {
  const total = GENERATORS.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [g, w] of GENERATORS) if ((r -= w) < 0) return g(format, rng);
  return GENERATORS[0][0](format, rng);
}
