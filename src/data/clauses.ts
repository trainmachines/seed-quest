import type { Deal } from '../engine/types';

export interface Clause {
  id: string;
  title: string;
  text: string;
  scary: boolean;
  termId: string;
  whyScary?: string;
  whyNormal?: string;
  fixed?: Partial<Deal>;
  left?: Partial<Deal>;
}

export const VARIANT_A: Clause[] = [
  {
    id: 'participating',
    title: 'Liquidation preference',
    text: '1x participating preferred. Investors get their money back and then share again as if converted.',
    scary: true,
    termId: 'participating-preferred',
    whyScary: 'Seed norm is 1x non-participating: their money back or their percent of the sale, not both.',
    fixed: { liqPref: '1x-np' },
    left: { liqPref: '1x-p' },
  },
  {
    id: 'ratchet-a',
    title: 'Anti-dilution',
    text: 'Full ratchet. If you later sell shares cheaper, their conversion price drops all the way to that price.',
    scary: true,
    termId: 'full-ratchet',
    whyScary: 'Market at seed is broad-based weighted average. Full ratchet reprices the whole round.',
    fixed: { antidilution: 'bbwa' },
    left: { antidilution: 'full-ratchet' },
  },
  {
    id: 'info',
    title: 'Information rights',
    text: 'Major investors receive quarterly financials, an annual budget, and an updated cap table.',
    scary: false,
    termId: 'information-rights',
    whyNormal: 'Quarterly information rights are ordinary. Save the argument for the clauses that change economics.',
  },
  {
    id: 'board',
    title: 'Board',
    text: 'The investor appoints 2 of 3 directors.',
    scary: true,
    termId: 'board-seat',
    whyScary: 'Two of three seats is control. A seed board is usually balanced, with the investor in one seat or as an observer.',
    fixed: { board: 'balanced' },
    left: { board: 'investor-control' },
  },
];

export const VARIANT_B: Clause[] = [
  {
    id: 'two-x',
    title: 'Liquidation preference',
    text: '2x non-participating preferred. Investors take two times their money back before common receives anything.',
    scary: true,
    termId: 'liquidation-preference',
    whyScary: 'A 2x multiple is a red flag at seed. The norm is 1x non-participating.',
    fixed: { liqPref: '1x-np' },
    left: { liqPref: '2x-np' },
  },
  {
    id: 'hire-veto',
    title: 'Protective provisions',
    text: 'Preferred stockholders must approve any hire with a salary over $80,000.',
    scary: true,
    termId: 'protective-provisions',
    whyScary: 'A veto on ordinary hiring is not a standard protective provision. Those cover sales, the charter, and senior stock.',
    fixed: { protective: 'standard' },
    left: { protective: 'hire-veto' },
  },
  {
    id: 'pro-rata',
    title: 'Pro rata',
    text: 'Investors who invest at least $100,000 may purchase their pro rata share of the next round.',
    scary: false,
    termId: 'pro-rata',
    whyNormal: 'Pro rata for major investors is a market term. A side letter for a tiny check is the version that causes trouble.',
  },
  {
    id: 'ratchet-b',
    title: 'Anti-dilution',
    text: 'Full-ratchet anti-dilution on the preferred stock.',
    scary: true,
    termId: 'full-ratchet',
    whyScary: 'Market at seed is broad-based weighted average. Full ratchet is a down-round punishment.',
    fixed: { antidilution: 'bbwa' },
    left: { antidilution: 'full-ratchet' },
  },
];

export function clausesFor(variant: 'A' | 'B' | null): Clause[] {
  return variant === 'B' ? VARIANT_B : VARIANT_A;
}
