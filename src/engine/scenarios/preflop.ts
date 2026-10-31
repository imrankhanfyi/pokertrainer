import { ALL_CLASSES, type HandClass, type Rank, type Rng, classOf, combosIn, dealClass, describeClass, pick, rankValue, shuffled } from '../cards';
import { type ChartPos, type Format, type Pos, CHART_POS_LABEL, FORMAT_SHORT, POS_NAME, chartPos, positionsFor } from '../../data/positions';
import { SITUATION_LABEL, SIZING, type Situation, isoSize } from '../../data/ranges';
import { type PreAction, getChart, preflopAnswer } from '../preflop';
import type { Question, Seat } from './types';

let counter = 0;
const qid = () => `pre-${Date.now().toString(36)}-${counter++}`;

const fmt = (bb: number) => `${Number.isInteger(bb) ? bb : bb.toFixed(1)}bb`;

interface Setup {
  format: Format;
  situation: Situation;
  hero: Pos;
  seats: Seat[];
  limpers: number;
  raiser?: Pos;
  raiseTo?: number;
  pot: number;
}

/** Build a legal preflop action sequence leading up to the hero. */
export function buildSetup(format: Format, situation: Situation, rng: Rng): Setup {
  const order = positionsFor(format);
  const heroChoices = order.filter((p) => {
    if (situation === 'open') return p !== 'BB';
    return p !== 'UTG'; // someone must act before us
  }).filter((p) => getChart(format, situation, chartPos(format, p)) !== null);
  const hero = pick(heroChoices, rng);
  const hi = order.indexOf(hero);
  const before = order.slice(0, hi);
  const seats: Seat[] = order.map((pos) => ({
    pos,
    state: pos === hero ? 'hero' : pos === 'SB' || pos === 'BB' ? 'blind' : 'waiting',
    bet: pos === 'SB' ? 0.5 : pos === 'BB' ? 1 : undefined,
  }));
  const set = (pos: Pos, patch: Partial<Seat>) => Object.assign(seats[order.indexOf(pos)], patch);
  let pot = 1.5;
  let limpers = 0;
  let raiser: Pos | undefined;
  let raiseTo: number | undefined;

  if (situation === 'open') {
    for (const p of before) set(p, { state: 'folded', tag: 'Fold' });
  } else if (situation === 'limpers') {
    // Full ring home games limp a lot; 6-max online less so.
    const maxL = Math.min(before.length, format === 'fullring' ? 3 : 2);
    const wanted = 1 + Math.floor(rng() * maxL);
    const limpSeats = new Set(shuffled(before, rng).slice(0, wanted));
    for (const p of before) {
      if (limpSeats.has(p)) {
        const add = p === 'SB' ? 0.5 : 1;
        set(p, { state: 'limped', tag: p === 'SB' ? 'Complete' : 'Limp', bet: 1 });
        pot += add;
        limpers++;
      } else set(p, { state: 'folded', tag: 'Fold' });
    }
  } else {
    // One raiser before us (not from the blinds, to keep it simple and common).
    const candidates = before.filter((p) => p !== 'SB' && p !== 'BB');
    raiser = pick(candidates.length ? candidates : before, rng);
    raiseTo = SIZING[format].open;
    for (const p of before) {
      if (p === raiser) set(p, { state: 'raised', tag: `Raise ${fmt(raiseTo)}`, bet: raiseTo });
      else set(p, { state: 'folded', tag: 'Fold' });
    }
    pot += raiseTo;
  }
  return { format, situation, hero, seats, limpers, raiser, raiseTo, pot };
}

/** Weight hands so drills focus on decisions that matter, not obvious trash folds. */
function sampleHand(format: Format, situation: Situation, cp: ChartPos, rng: Rng): HandClass {
  const weights = ALL_CLASSES.map((hc) => {
    const a = preflopAnswer(format, situation, cp, hc);
    let w = a.close ? 5 : a.action !== 'fold' ? 2 : 0.6;
    // A sprinkling of tempting-but-bad hands (any ace, two face cards, suited) for realism.
    if (a.action === 'fold' && (hc[0] === 'A' || (rankValue(hc[1] as Rank) >= 10) || hc[2] === 's')) w = 1.2;
    return w * combosIn(hc);
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rng() * total;
  for (let i = 0; i < ALL_CLASSES.length; i++) if ((r -= weights[i]) < 0) return ALL_CLASSES[i];
  return ALL_CLASSES[ALL_CLASSES.length - 1];
}

function choiceLabels(s: Setup): Record<PreAction, { label: string; sub?: string }> {
  const sz = SIZING[s.format];
  if (s.situation === 'open') {
    const open = s.hero === 'SB' ? sz.openSB : sz.open;
    return { fold: { label: 'Fold' }, call: { label: s.hero === 'SB' ? 'Complete' : 'Limp', sub: s.hero === 'SB' ? 'add 0.5bb' : 'just call 1bb' }, raise: { label: 'Raise', sub: `to ${fmt(open)}` } };
  }
  if (s.situation === 'limpers') {
    const to = isoSize(s.format, s.limpers);
    const callLabel = s.hero === 'BB' ? 'Check' : s.hero === 'SB' ? 'Complete' : 'Call';
    return { fold: { label: 'Fold' }, call: { label: callLabel, sub: s.hero === 'BB' ? 'see a free flop' : s.hero === 'SB' ? '+0.5bb' : '1bb' }, raise: { label: 'Raise', sub: `to ${fmt(to)}` } };
  }
  const ip = isInPositionVs(s.format, s.hero, s.raiser!);
  const to = s.raiseTo! * (ip ? sz.threeBetIP : sz.threeBetOOP);
  return { fold: { label: 'Fold' }, call: { label: 'Call', sub: fmt(s.raiseTo! - (s.hero === 'SB' ? 0.5 : s.hero === 'BB' ? 1 : 0)) }, raise: { label: 'Re-raise', sub: `to ${fmt(to)}` } };
}

function isInPositionVs(format: Format, hero: Pos, villain: Pos): boolean {
  // Post-flop: blinds act first. Otherwise later in preflop order = later post-flop.
  const order = positionsFor(format);
  const blind = (p: Pos) => p === 'SB' || p === 'BB';
  if (blind(hero) && !blind(villain)) return false;
  if (!blind(hero) && blind(villain)) return true;
  return order.indexOf(hero) > order.indexOf(villain);
}

const isPair = (hc: HandClass) => hc.length === 2;
const isSmallPair = (hc: HandClass) => isPair(hc) && rankValue(hc[0] as Rank) <= 8;
const isSuitedPlayable = (hc: HandClass) => hc[2] === 's';

function explain(s: Setup, hc: HandClass, action: PreAction): string {
  const hand = describeClass(hc);
  const H = hand[0].toUpperCase() + hand.slice(1);
  const seat = POS_NAME[s.hero].toLowerCase();
  const sz = SIZING[s.format];
  const behind = positionsFor(s.format).length - 1 - positionsFor(s.format).indexOf(s.hero);

  if (s.situation === 'open') {
    if (action === 'raise') {
      const size = s.hero === 'SB' ? sz.openSB : sz.open;
      return `${H} is strong enough to [[open-raise]] from the ${seat}. Raise to about ${fmt(size)}: you might win the [[blinds]] straight away, and if not you take the lead into the flop. Don't [[limp]] – it invites everyone in and you can't win the pot before the flop.`;
    }
    if (s.hero === 'SB') return `${H} isn't strong enough to play from the [[small-blind]], where you'll be [[out-of-position|out of position]] for the whole hand. Fold, and don't just complete: half a big blind saved is better than a weak hand played badly.`;
    if (s.hero === 'BTN' || s.hero === 'CO')
      return `Even from the ${seat}, ${hand} is too weak: it rarely makes a strong hand and, when it hits, it's often [[dominated]]. Fold, and wait for a hand from the chart.`;
    return `${H} is too weak from the ${seat}: ${behind} players still act after you, and any of them may have a better hand. Fold. Hands like this become playable closer to the [[button]].`;
  }

  if (s.situation === 'limpers') {
    const n = s.limpers;
    const lp = n === 1 ? 'one limper' : `${n} limpers`;
    if (action === 'raise') {
      return `With ${hand}, raise to about ${fmt(isoSize(s.format, n))} (${sz.isoBase}bb + 1bb per limper) to [[isolate]] the ${lp}. Limpers usually have weak hands, so raising lets you build a pot with the better hand, often [[heads-up]].`;
    }
    if (action === 'call') {
      if (s.hero === 'BB') return `${H} isn't worth a raise here, but you already have the [[big-blind]] in, so just [[check]] and see a free flop.`;
      if (isSmallPair(hc)) return `${H} wants a cheap look at the flop to hit a [[set]] (about 1 flop in 8). With ${lp} already in, the pot will be big when you hit, so [[overlimp|call]]. If you miss, you'll usually give up.`;
      return `${H} plays well in a cheap [[multiway]] pot because it can make straights and flushes. [[overlimp|Call]] rather than raise, and be ready to fold the flop if you miss.`;
    }
    return `${H} is too weak to play against ${lp} from the ${seat}. In a pot with several players you need a hand that can make something strong, and this one usually makes a weak pair that costs you money. Fold.`;
  }

  // facing a raise
  const r = POS_NAME[s.raiser!].toLowerCase();
  const ip = isInPositionVs(s.format, s.hero, s.raiser!);
  const to = s.raiseTo! * (ip ? sz.threeBetIP : sz.threeBetOOP);
  if (action === 'raise') return `${H} is one of the best starting hands. [[3-bet|Re-raise]] to about ${fmt(to)} (${ip ? 3 : 4}× their raise${ip ? '' : ', a bit bigger because you\'ll be out of position'}). Worse hands will often call, and you want a bigger pot when you are ahead.`;
  if (action === 'call') {
    if (isPair(hc)) return `${H} is a good call against a raise from the ${r}: you're mostly hoping to flop a [[set]] ([[set-mining|set mining]]). With 100bb stacks you can win a big pot when you hit. If you miss and face a bet, you can usually fold.`;
    if (s.hero === 'BB') return `In the [[big-blind]] you already have 1bb in, so calling is cheap. ${H} has enough playability (${isSuitedPlayable(hc) ? 'it can make flushes and straights' : 'it has good high cards'}) to defend. Keep it simple after the flop.`;
    return `${H} plays well enough to call the raise from the ${r}${ip ? ', and you will be [[in-position|in position]] after the flop' : ''}. It isn't strong enough to re-raise for value.`;
  }
  if (isPair(hc)) return `Fold. Calling a raise with ${hand} only works when you're getting a good price and can win a big pot if you flop a [[set]]. From the ${seat} against a raise from the ${r}, that price isn't good enough in this chart.`;
  const domin = hc[0] === 'A' || hc[0] === 'K' ? ' When you pair your big card, they often hold the same card with a better [[kicker]].' : '';
  return `Fold. A raise from the ${r} usually means a strong hand, and ${hand} doesn't do well against strong hands.${domin}`;
}

function closeNote(s: Setup, hc: HandClass, a: ReturnType<typeof preflopAnswer>): string | undefined {
  const parts: string[] = [];
  const verb = (x: PreAction, sit: Situation) => (x === 'raise' ? (sit === 'raise' ? 're-raise' : 'raise') : x === 'call' ? (sit === 'open' ? 'limp' : 'call') : 'fold');
  const diffs = a.neighbours.filter((n) => n.action !== a.action);
  if (diffs.length) {
    const d = diffs[0];
    parts.push(`This is close: from ${CHART_POS_LABEL[d.pos].toLowerCase()} the chart says ${verb(d.action, s.situation)}. Against very passive players, the more aggressive choice gets better; against tough players, the tighter one.`);
  }
  if (a.otherFormat && a.otherFormat.action !== a.action) {
    parts.push(`Format difference: in ${FORMAT_SHORT[a.otherFormat.format]} the chart says ${verb(a.otherFormat.action, s.situation)} with ${hc} from the equivalent seat.`);
  }
  return parts.length ? parts.join(' ') : undefined;
}

export function preflopQuestion(format: Format, rng: Rng = Math.random, forced?: { situation?: Situation; hand?: HandClass }): Question {
  const situation: Situation = forced?.situation ?? (rng() < 0.4 ? 'open' : rng() < 0.5 ? 'limpers' : 'raise');
  const s = buildSetup(format, situation, rng);
  const cp = chartPos(format, s.hero);
  const hc = forced?.hand ?? sampleHand(format, situation, cp, rng);
  const cards = dealClass(hc, rng);
  const ans = preflopAnswer(format, situation, cp, hc);
  const labels = choiceLabels(s);
  const actions: PreAction[] = ['fold', 'call', 'raise'];
  const context =
    situation === 'open' ? 'Everyone has folded to you.' :
    situation === 'limpers' ? `${s.limpers} player${s.limpers > 1 ? 's have' : ' has'} limped. Nobody has raised.` :
    `The ${POS_NAME[s.raiser!].toLowerCase()} raised to ${fmt(s.raiseTo!)}. Everyone else folded.`;
  const note = closeNote(s, hc, ans);
  if (classOf(cards[0], cards[1]) !== hc) throw new Error('dealClass mismatch');
  return {
    id: qid(),
    skill: 'preflop',
    format,
    prompt: `You're ${s.hero === 'BTN' ? 'on' : 'in'} the ${POS_NAME[s.hero].toLowerCase()}. What do you do?`,
    context,
    table: { seats: s.seats, heroPos: s.hero, heroCards: cards, pot: s.pot },
    choices: actions.map((id) => ({ id, ...labels[id] })),
    correct: ans.action,
    close: ans.close,
    explanation: explain(s, hc, ans.action),
    closeNote: note,
    facts: {
      format: `${FORMAT_SHORT[format]} (${format === 'fullring' ? 'live home game, loose-passive' : 'online, more aggressive'}), 100bb stacks`,
      position: POS_NAME[s.hero],
      hand: `${cards.join(' ')} (${hc})`,
      action_before_me: context,
      pot: fmt(s.pot),
      situation: SITUATION_LABEL[situation],
      app_chart_note: ans.note ?? '',
    },
  };
}
