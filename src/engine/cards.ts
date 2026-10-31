// Cards are two-character strings: rank + suit, e.g. "As", "Td", "7c".
export const RANKS = '23456789TJQKA' as const;
export const SUITS = 'shdc' as const;
export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];
export type Card = `${Rank}${Suit}`;

export const FULL_DECK: Card[] = [...RANKS].flatMap((r) => [...SUITS].map((s) => `${r}${s}` as Card));

export const rankValue = (c: Card | Rank): number => RANKS.indexOf(c[0] as Rank) + 2; // 2..14
export const suitOf = (c: Card): Suit => c[1] as Suit;
export const rankOf = (c: Card): Rank => c[0] as Rank;

export const RANK_NAMES: Record<Rank, string> = {
  '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight',
  '9': 'Nine', T: 'Ten', J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace',
};
export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAME: Record<Suit, string> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };

export const isCard = (x: string): x is Card => x.length === 2 && RANKS.includes(x[0] as Rank) && SUITS.includes(x[1] as Suit);

export function parseCards(s: string): Card[] {
  const out = s.trim().split(/\s+/).filter(Boolean);
  for (const c of out) if (!isCard(c)) throw new Error(`Bad card: ${c}`);
  return out as Card[];
}

/** Human readable, e.g. "A♠ K♥". Rank shown as 10 instead of T. */
export const showCard = (c: Card) => `${c[0] === 'T' ? '10' : c[0]}${SUIT_SYMBOL[suitOf(c)]}`;
export const showCards = (cs: Card[]) => cs.map(showCard).join(' ');

// ---------- Random helpers (injectable RNG for deterministic tests) ----------
export type Rng = () => number;

export function shuffled<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = <T,>(arr: readonly T[], rng: Rng = Math.random): T => arr[Math.floor(rng() * arr.length)];

export function remainingDeck(used: Card[]): Card[] {
  const u = new Set(used);
  return FULL_DECK.filter((c) => !u.has(c));
}

/** Mulberry32 – tiny seeded PRNG for reproducible tests. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Starting-hand classes ("AKs", "QJo", "77") ----------
export type HandClass = string;

/** All 169 starting-hand classes in 13x13 grid order (row = first rank, high to low). */
export const GRID_RANKS = [...RANKS].reverse() as Rank[]; // A K Q ... 2

export function gridClass(row: number, col: number): HandClass {
  const r1 = GRID_RANKS[row];
  const r2 = GRID_RANKS[col];
  if (row === col) return `${r1}${r2}`;
  // Above the diagonal = suited, below = offsuit (standard chart layout).
  return row < col ? `${r1}${r2}s` : `${r2}${r1}o`;
}

export const ALL_CLASSES: HandClass[] = Array.from({ length: 169 }, (_, i) => gridClass(Math.floor(i / 13), i % 13));

/** Hand class for two hole cards. */
export function classOf(a: Card, b: Card): HandClass {
  const [hi, lo] = rankValue(a) >= rankValue(b) ? [a, b] : [b, a];
  if (rankOf(hi) === rankOf(lo)) return `${rankOf(hi)}${rankOf(lo)}`;
  return `${rankOf(hi)}${rankOf(lo)}${suitOf(hi) === suitOf(lo) ? 's' : 'o'}`;
}

/** Number of card combinations in a class: pairs 6, suited 4, offsuit 12. */
export const combosIn = (hc: HandClass) => (hc.length === 2 ? 6 : hc[2] === 's' ? 4 : 12);

/** Deal a concrete pair of cards for a hand class (random suits). */
export function dealClass(hc: HandClass, rng: Rng = Math.random): [Card, Card] {
  const r1 = hc[0] as Rank;
  const r2 = hc[1] as Rank;
  const suits = shuffled([...SUITS], rng);
  if (hc.length === 2) return [`${r1}${suits[0]}` as Card, `${r2}${suits[1]}` as Card];
  if (hc[2] === 's') return [`${r1}${suits[0]}` as Card, `${r2}${suits[0]}` as Card];
  return [`${r1}${suits[0]}` as Card, `${r2}${suits[1]}` as Card];
}

/** Friendly name, e.g. "ace-king suited", "pair of sevens". */
export function describeClass(hc: HandClass): string {
  const n1 = RANK_NAMES[hc[0] as Rank].toLowerCase();
  const n2 = RANK_NAMES[hc[1] as Rank].toLowerCase();
  if (hc.length === 2) return `a pair of ${n1 === 'six' ? 'sixes' : n1 + 's'}`;
  return `${n1}-${n2} ${hc[2] === 's' ? 'suited' : 'offsuit'}`;
}

export const combinations = (n: number, k: number): number => {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
};
