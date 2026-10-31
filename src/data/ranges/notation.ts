import { type HandClass, RANKS, type Rank } from '../../engine/cards';

/**
 * Parse standard range shorthand into a set of hand classes.
 *   "77+"      pairs 77 and up          "22-66"    pairs 22 through 66
 *   "ATs+"     ATs, AJs, AQs, AKs        "A2s-A9s"  A2s through A9s
 *   "KQs"      one class                "AK"       AKs and AKo
 *   "96s+"     96s, 97s, 98s (raise the kicker up to one below the top card)
 */
export function parseRange(spec: string): Set<HandClass> {
  const out = new Set<HandClass>();
  const idx = (r: string) => RANKS.indexOf(r as Rank);
  for (const raw of spec.split(',').map((s) => s.trim()).filter(Boolean)) {
    let m: RegExpMatchArray | null;
    if ((m = raw.match(/^([2-9TJQKA])\1\+$/))) {
      for (let i = idx(m[1]); i < 13; i++) out.add(RANKS[i] + RANKS[i]);
    } else if ((m = raw.match(/^([2-9TJQKA])\1-([2-9TJQKA])\2$/))) {
      const [a, b] = [idx(m[1]), idx(m[2])].sort((x, y) => x - y);
      for (let i = a; i <= b; i++) out.add(RANKS[i] + RANKS[i]);
    } else if ((m = raw.match(/^([2-9TJQKA])\1$/))) {
      out.add(raw);
    } else if ((m = raw.match(/^([2-9TJQKA])([2-9TJQKA])([so])\+$/))) {
      const hi = idx(m[1]);
      for (let k = idx(m[2]); k < hi; k++) out.add(m[1] + RANKS[k] + m[3]);
    } else if ((m = raw.match(/^([2-9TJQKA])([2-9TJQKA])([so])-\1([2-9TJQKA])\3$/))) {
      const [a, b] = [idx(m[2]), idx(m[4])].sort((x, y) => x - y);
      for (let k = a; k <= b; k++) out.add(m[1] + RANKS[k] + m[3]);
    } else if ((m = raw.match(/^([2-9TJQKA])([2-9TJQKA])([so])$/))) {
      out.add(raw);
    } else if ((m = raw.match(/^([2-9TJQKA])([2-9TJQKA])$/))) {
      out.add(raw + 's');
      out.add(raw + 'o');
    } else {
      throw new Error(`Unrecognised range token: "${raw}"`);
    }
  }
  for (const h of out) if (h.length === 3 && idx(h[0]) <= idx(h[1])) throw new Error(`Bad hand order in range: ${h}`);
  return out;
}
