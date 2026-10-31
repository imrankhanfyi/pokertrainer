export type Format = 'fullring' | 'sixmax';

export const FORMAT_LABEL: Record<Format, string> = { fullring: 'Full ring (home game)', sixmax: '6-max' };
export const FORMAT_SHORT: Record<Format, string> = { fullring: 'Full ring', sixmax: '6-max' };

/** Seat names in preflop action order (first to act → big blind). */
export type Pos = 'UTG' | 'UTG+1' | 'UTG+2' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export function positionsFor(format: Format, players?: number): Pos[] {
  if (format === 'sixmax') return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  if (players === 8) return ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  return ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
}

/** Post-flop action order: SB first, BB, then UTG ... BTN last. */
export function postflopOrder(preflop: Pos[]): Pos[] {
  const blinds = preflop.filter((p) => p === 'SB' || p === 'BB');
  return [...blinds, ...preflop.filter((p) => p !== 'SB' && p !== 'BB')];
}

export const POS_NAME: Record<Pos, string> = {
  UTG: 'Under the gun',
  'UTG+1': 'Under the gun +1',
  'UTG+2': 'Under the gun +2',
  LJ: 'Lojack',
  HJ: 'Hijack',
  CO: 'Cutoff',
  BTN: 'Button',
  SB: 'Small blind',
  BB: 'Big blind',
};

export type Zone = 'early' | 'middle' | 'late' | 'blinds';

export function zoneOf(format: Format, pos: Pos): Zone {
  if (pos === 'SB' || pos === 'BB') return 'blinds';
  if (pos === 'CO' || pos === 'BTN') return 'late';
  if (format === 'sixmax') return pos === 'UTG' ? 'early' : 'middle';
  return pos === 'LJ' || pos === 'HJ' ? 'middle' : 'early';
}

/** Which chart a seat uses. Full ring groups the three earliest seats and LJ/HJ together. */
export type ChartPos = 'EP' | 'MP' | 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export function chartPos(format: Format, pos: Pos): ChartPos {
  if (format === 'sixmax') return pos as ChartPos;
  if (pos === 'UTG' || pos === 'UTG+1' || pos === 'UTG+2') return 'EP';
  if (pos === 'LJ' || pos === 'HJ') return 'MP';
  return pos as ChartPos;
}

export const CHART_POS_LABEL: Record<ChartPos, string> = {
  EP: 'Early (UTG–UTG+2)',
  MP: 'Middle (LJ, HJ)',
  UTG: 'UTG',
  HJ: 'Hijack',
  CO: 'Cutoff',
  BTN: 'Button',
  SB: 'Small blind',
  BB: 'Big blind',
};

export const chartPositions = (format: Format): ChartPos[] =>
  format === 'sixmax' ? ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] : ['EP', 'MP', 'CO', 'BTN', 'SB', 'BB'];
