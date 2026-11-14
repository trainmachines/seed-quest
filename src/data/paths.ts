import type { GameState } from '../engine/types';

export interface UntakenPath {
  id: string;
  title: string;
  lesson: string;
  glossaryId: string;
  when: (state: GameState) => boolean;
}

export const UNTAKEN_PATHS: UntakenPath[] = [
  {
    id: 'llc',
    title: 'Staying an LLC',
    lesson: 'An LLC can wait. A priced NVCA round usually will not. Conversion later costs months, fees, and a fresh 83(b) clock.',
    glossaryId: 'delaware-c-corp',
    when: (s) => s.flags.entity === 'delaware' && !s.flags.startedAsLlc,
  },
  {
    id: 'wyoming',
    title: 'A same-night Wyoming filing',
    lesson: 'Speed feels like progress. Lead counsel still asks for Delaware, and the cleanup lands in diligence.',
    glossaryId: 'delaware-c-corp',
    when: (s) => s.flags.entity === 'delaware' && s.flags.counsel !== 'none',
  },
  {
    id: 'missed-83b',
    title: 'Missing the 83(b)',
    lesson: 'The election is due 30 days after issuance. There is no extension. A miss becomes ordinary income as the shares vest.',
    glossaryId: '83b',
    when: (s) => s.filed83b && !s.missed83b,
  },
  {
    id: 'pete',
    title: 'Leaving the contractor unsigned',
    lesson: 'Code from a contractor who never assigned it is not clearly the company’s. Diligence reads the git history.',
    glossaryId: 'ip-assignment',
    when: (s) => s.flags.pete === 'signed' || s.flags.pete === 'rewrite',
  },
  {
    id: 'verbal',
    title: 'A verbal equity promise',
    lesson: 'If it is not on the cap table, the table does not add up. Post-money SAFEs keep their percent. Late shares come out of the founders.',
    glossaryId: 'cap-table',
    when: (s) => s.flags.advisor === 'none' || s.flags.advisor === 'in-pool',
  },
  {
    id: 'side',
    title: 'A pro rata side letter',
    lesson: 'The standard SAFE does not include pro rata. A side letter can give a small check a claim on the next round’s allocation.',
    glossaryId: 'side-letter',
    when: (s) => s.safes.length > 0 && s.safes.every((safe) => !safe.sideLetter),
  },
  {
    id: 'mfn',
    title: 'An MFN clause',
    lesson: 'Most favored nation lets an early SAFE copy a later, cheaper cap. That raises the early percent. Founders absorb it.',
    glossaryId: 'mfn',
    when: (s) => s.safes.length > 0 && s.safes.every((safe) => !safe.mfn),
  },
  {
    id: 'pref',
    title: 'Participating or 2x preference',
    lesson: 'Seed norm is 1x non-participating. Participating preferred is two bites. A 2x multiple takes twice the money back first.',
    glossaryId: 'liquidation-preference',
    when: (s) => s.deal.liqPref === '1x-np',
  },
  {
    id: 'ratchet',
    title: 'Full-ratchet anti-dilution',
    lesson: 'Market is broad-based weighted average. Full ratchet reprices the round down to the cheapest later share.',
    glossaryId: 'full-ratchet',
    when: (s) => s.deal.antidilution === 'bbwa',
  },
  {
    id: 'board',
    title: 'Investor control of the board',
    lesson: 'Two of three seats is control. Your draft either avoided that clause or you marked it. A seed board should stay balanced.',
    glossaryId: 'board-seat',
    when: (s) => s.deal.board === 'balanced' && s.deal.variant != null,
  },
  {
    id: 'hire-veto',
    title: 'A veto on ordinary hiring',
    lesson: 'Protective provisions cover extraordinary actions. A veto on everyday hires is a red flag, even if it was not on your draft.',
    glossaryId: 'protective-provisions',
    when: (s) => s.deal.variant === 'A' && s.deal.protective === 'standard',
  },
  {
    id: 'pool',
    title: 'Accepting the bigger option pool',
    lesson: 'The pool is carved from the pre-money. A bigger pool lowers effective pre-money. Founders pay. New investors do not.',
    glossaryId: 'option-pool-shuffle',
    when: (s) => (s.deal.poolTarget ?? 1) <= 0.1 && (s.deal.poolAsk ?? 0) > 0.1,
  },
  {
    id: 'party',
    title: 'Another party round',
    lesson: 'A bridge SAFE adds runway and dilution. It does not add a lead. Earlier post-money SAFEs keep their percent.',
    glossaryId: 'bridge-round',
    when: (s) => s.deal.closed && !s.deal.bridge,
  },
  {
    id: 'coffee',
    title: 'Taking the coffee meeting',
    lesson: 'Coffee is sometimes a real intro and often a calendar with no check. A target list is what turns meetings into a round.',
    glossaryId: 'lead-investor',
    when: (s) => s.flags.declinedCoffee,
  },
];

export function untakenPaths(state: GameState): UntakenPath[] {
  return UNTAKEN_PATHS.filter((path) => path.when(state));
}
