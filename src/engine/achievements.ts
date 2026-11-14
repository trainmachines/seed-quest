import { endingKind } from './flow';
import type { GameState } from './types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'delaware', name: 'Delaware', description: 'You incorporated as a Delaware C-corp.' },
  { id: 'clockwatcher', name: 'Clockwatcher', description: 'You filed an 83(b) within 30 days of issuance.' },
  { id: 'ghostbuster', name: 'Ghostbuster', description: 'The contractor’s IP assignment was signed before diligence.' },
  { id: 'clean-sheet', name: 'It Adds Up', description: 'The cap table reconciles, with no off-sheet promise.' },
  { id: 'fifteen-days', name: 'Fifteen Days', description: 'Form D went in within 15 days of the first sale.' },
  { id: 'standard-safe', name: 'Standard SAFE', description: 'Your SAFEs have no MFN clause and no pro rata side letter.' },
  { id: 'no-latte', name: 'No Third Latte', description: 'You declined a coffee that was not a process.' },
  { id: 'red-pen', name: 'Red Pen', description: 'You marked every non-standard clause and left the market terms.' },
  { id: 'market', name: 'Market Standard', description: '1x non-participating, broad-based weighted average, balanced board.' },
  { id: 'wire-in', name: 'Wire In', description: 'The priced round closed and the wire arrived.' },
  { id: 'great-round', name: 'Napkin to Wire', description: 'You landed the great-round ending.' },
  { id: 'bridge', name: 'Bridge Builder', description: 'You extended with a bridge instead of a lead.' },
  { id: 'out-of-months', name: 'Out of Months', description: 'Runway hit zero before a closing wire.' },
  { id: 'room-ready', name: 'Room Is Ready', description: 'Every critical document was in the room before the NVCA set.' },
];

export function earnedAchievements(state: GameState): string[] {
  const ids: string[] = [];
  const kind = state.sceneId === 'ending' ? endingKind(state) : null;
  if (state.history.some((item) => item.scene === 'napkin' && item.choice === 'delaware') && state.docs.includes('bylaws')) {
    ids.push('delaware');
  }
  if (state.filed83b && !state.missed83b) ids.push('clockwatcher');
  if (state.flags.pete === 'signed' || state.flags.pete === 'rewrite') ids.push('ghostbuster');
  if (state.docs.includes('cap-table') && state.flags.advisor !== 'off-sheet' && !state.flags.sloppySheet && state.history.some((item) => item.choice === 'fix')) {
    ids.push('clean-sheet');
  }
  if (state.filedFormD && !state.missedFormD) ids.push('fifteen-days');
  if (state.safes.length > 0 && state.safes.every((safe) => !safe.mfn && !safe.sideLetter && !safe.homemade)) {
    ids.push('standard-safe');
  }
  if (state.flags.declinedCoffee) ids.push('no-latte');
  if (state.flags.redPenPerfect) ids.push('red-pen');
  if (
    state.deal.liqPref === '1x-np' &&
    state.deal.antidilution === 'bbwa' &&
    state.deal.board === 'balanced' &&
    state.deal.protective === 'standard' &&
    state.deal.closed
  ) {
    ids.push('market');
  }
  if (state.deal.closed) ids.push('wire-in');
  if (kind === 'great') ids.push('great-round');
  if (kind === 'bridge') ids.push('bridge');
  if (kind === 'runway') ids.push('out-of-months');
  if (state.history.some((item) => item.scene === 'nvca_spa') && state.flags.pete !== 'ghost' && state.filed83b) {
    ids.push('room-ready');
  }
  return ids;
}
