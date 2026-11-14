import { computeCapTable } from './math';
import type { GameState } from './types';

export const DILIGENCE_CHAIN = [
  'diligence_intro',
  'diligence_pete',
  'diligence_83b',
  'diligence_cap',
  'diligence_formd',
  'diligence_wyoming',
  'diligence_gaps',
  'nvca_spa',
  'nvca_coi',
  'nvca_ira',
  'nvca_voting',
  'nvca_rofr',
  'wire_day',
] as const;

function applies(id: string, state: GameState): boolean {
  switch (id) {
    case 'diligence_pete':
      return state.flags.pete === 'ghost';
    case 'diligence_83b':
      return state.missed83b;
    case 'diligence_cap':
      return state.flags.advisor === 'off-sheet' || state.flags.sloppySheet;
    case 'diligence_formd':
      return state.missedFormD;
    case 'diligence_wyoming':
      return state.flags.entity === 'wyoming';
    case 'diligence_gaps':
      return gapDocIds(state).length > 0;
    default:
      return true;
  }
}

export function nextDiligence(from: string, state: GameState): string {
  const start = DILIGENCE_CHAIN.indexOf(from as (typeof DILIGENCE_CHAIN)[number]);
  for (let i = start + 1; i < DILIGENCE_CHAIN.length; i += 1) {
    const id = DILIGENCE_CHAIN[i];
    if (applies(id, state)) return id;
  }
  return 'wire_day';
}

/** Documents a careful pre-seed / seed room has to have, given the path you played. */
export function criticalDocIds(state: GameState): string[] {
  const ids = ['coi', 'bylaws', 'board-consent', 'founder-spa', 'founder-ciiaa', 'cap-table', 'pitch-deck'];
  if (state.flags.vesting === 'standard') ids.push('eighty-three-b');
  if (state.safes.length > 0) ids.push('safes');
  if (state.flags.pete === 'signed' || state.flags.pete === 'ghost') ids.push('contractor-ip');
  if (state.flags.pete === 'rewrite') ids.push('clean-room-memo');
  if (state.flags.hired) ids.push('equity-plan');
  if (state.firstSaleDay != null) ids.push('form-d');
  return ids;
}

export function gapDocIds(state: GameState): string[] {
  return criticalDocIds(state).filter((id) => {
    if (state.docs.includes(id)) return false;
    if (id === 'eighty-three-b' || id === 'form-d') return false;
    if (id === 'contractor-ip' && state.flags.pete === 'ghost') return false;
    return true;
  });
}

export type EndingKind = 'great' | 'okay' | 'bridge' | 'runway';

export function greatBlockers(state: GameState): string[] {
  const blockers: string[] = [];
  const table = computeCapTable(state);
  if (!state.deal.closed) blockers.push('round-not-closed');
  if (state.deal.liqPref !== '1x-np') blockers.push('liq-pref');
  if (state.deal.antidilution !== 'bbwa') blockers.push('antidilution');
  if (state.deal.board !== 'balanced') blockers.push('board');
  if (state.deal.protective !== 'standard') blockers.push('protective');
  if (state.flags.foughtStandard) blockers.push('fought-standard');
  if (state.flags.vesting !== 'standard') blockers.push('vesting');
  if (!state.filed83b || state.missed83b) blockers.push('83b');
  if (state.flags.pete === 'ghost') blockers.push('pete');
  if (state.flags.advisor === 'off-sheet' || state.flags.advisor === 'issued-late') blockers.push('advisor');
  if (state.flags.sloppySheet) blockers.push('cap-table');
  if (state.flags.messyDocs) blockers.push('messy-docs');
  if (state.flags.entity !== 'delaware') blockers.push('entity');
  if (state.safes.some((safe) => safe.sideLetter)) blockers.push('side-letter');
  if (state.safes.some((safe) => safe.mfn)) blockers.push('mfn');
  if (!state.flags.build) blockers.push('build');
  if (state.flags.deck !== 'tight') blockers.push('deck');
  if ((state.deal.poolTarget ?? 1) > 0.1) blockers.push('pool');
  if ((state.deal.newMoney ?? 0) < 2_000_000) blockers.push('check-size');
  if (state.runway < 18) blockers.push('runway');
  if (state.reputation < 48) blockers.push('reputation');
  if (table.foundersPct < 0.6) blockers.push('equity');
  if (state.missedFormD) blockers.push('form-d');
  if (state.flags.skimCount >= 3) blockers.push('skim');
  if (state.flags.ipIndemnity) blockers.push('indemnity');
  const missing = criticalDocIds(state).filter((id) => !state.docs.includes(id));
  if (missing.length) blockers.push(`docs:${missing.join(',')}`);
  return blockers;
}

export function endingKind(state: GameState): EndingKind {
  if (state.flags.broke || (state.runway <= 0 && !state.deal.closed)) return 'runway';
  if (state.deal.bridge && !state.deal.closed) return 'bridge';
  if (!state.deal.closed) return 'runway';
  return greatBlockers(state).length === 0 ? 'great' : 'okay';
}

export function routeAfterTimeJump(state: GameState): string {
  if (state.runway <= 0) return 'ending';
  if (state.flags.entity === 'llc') return 'seed_llc_wall';
  return 'lead_hunt';
}

export function routeToTermSheet(state: GameState): string {
  if (state.flags.entity === 'llc') return 'seed_llc_wall';
  if (state.flags.vesting === 'none') return 'retrovest';
  return 'term_headline';
}
