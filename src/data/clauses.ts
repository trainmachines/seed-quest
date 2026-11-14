import { rngNext } from '../engine/rng';
import type { Deal, GameState } from '../engine/types';

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

const SCARY: Clause[] = [
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
    id: 'ratchet',
    title: 'Anti-dilution',
    text: 'Full ratchet. If you later sell shares cheaper, their conversion price drops all the way to that price.',
    scary: true,
    termId: 'full-ratchet',
    whyScary: 'Market at seed is broad-based weighted average. Full ratchet reprices the whole round.',
    fixed: { antidilution: 'bbwa' },
    left: { antidilution: 'full-ratchet' },
  },
  {
    id: 'board',
    title: 'Board',
    text: 'The investor appoints 2 of 3 directors.',
    scary: true,
    termId: 'board-seat',
    whyScary: 'Two of three seats is control. A seed board is usually balanced.',
    fixed: { board: 'balanced' },
    left: { board: 'investor-control' },
  },
  {
    id: 'hire-veto',
    title: 'Protective provisions',
    text: 'Preferred stockholders must approve any hire with a salary over $80,000.',
    scary: true,
    termId: 'protective-provisions',
    whyScary: 'A veto on ordinary hiring is not a standard protective provision.',
    fixed: { protective: 'standard' },
    left: { protective: 'hire-veto' },
  },
];

const NORMAL: Clause[] = [
  {
    id: 'one-x',
    title: 'Liquidation preference',
    text: '1x non-participating preferred. On a sale, investors take the greater of their money back or their as-converted share.',
    scary: false,
    termId: 'non-participating',
    whyNormal: 'This is the seed norm. It sounds stern and it is the clause you want to keep.',
  },
  {
    id: 'bbwa',
    title: 'Anti-dilution',
    text: 'Broad-based weighted average anti-dilution if a later round is cheaper.',
    scary: false,
    termId: 'broad-based-weighted-average',
    whyNormal: 'Weighted average is the market compromise. It is not full ratchet.',
  },
  {
    id: 'protect',
    title: 'Protective provisions',
    text: 'Preferred must approve a sale of the company, a new senior security, or a change to the charter.',
    scary: false,
    termId: 'protective-provisions',
    whyNormal: 'Vetoes on extraordinary actions are ordinary. A veto on Tuesday’s hire is not.',
  },
  {
    id: 'drag',
    title: 'Drag-along',
    text: 'If the board, a founder majority, and the preferred approve a sale, every stockholder votes for it.',
    scary: false,
    termId: 'drag-along',
    whyNormal: 'A drag-along with that threshold is how a buyer can actually close. It is market.',
  },
  {
    id: 'noshop',
    title: 'Exclusivity',
    text: 'For 30 days you will not shop the company to other leads.',
    scary: false,
    termId: 'lead-investor',
    whyNormal: 'A short no-shop is how a lead spends diligence money. Fighting it usually wastes the week.',
  },
  {
    id: 'info',
    title: 'Information rights',
    text: 'Major investors receive quarterly financials, an annual budget, and an updated cap table.',
    scary: false,
    termId: 'information-rights',
    whyNormal: 'Quarterly information rights are ordinary. Save the argument for economics.',
  },
  {
    id: 'pro-rata',
    title: 'Pro rata',
    text: 'Investors who invest at least $100,000 may purchase their pro rata share of the next round.',
    scary: false,
    termId: 'pro-rata',
    whyNormal: 'Pro rata for major investors is market. A side letter for a tiny check is the version that crowds a round.',
  },
];

export const CLAUSE_POOL = [...SCARY, ...NORMAL];

export function clausesFor(variant: 'A' | 'B' | null): Clause[] {
  if (variant === 'B') return [SCARY[1], SCARY[2], SCARY[4], NORMAL[5], NORMAL[6]];
  return [SCARY[0], SCARY[2], SCARY[3], NORMAL[5], NORMAL[6]];
}

export function sheetClauses(state: GameState): Clause[] {
  const ids = state.deal.clauseIds;
  if (ids && ids.length) {
    return ids.map((id) => CLAUSE_POOL.find((clause) => clause.id === id)).filter((clause): clause is Clause => !!clause);
  }
  return clausesFor(state.deal.variant);
}

/** Draw 1–3 scary clauses and fill the sheet to 5 or 6. One liquidation preference at most. */
export function drawClauses(state: GameState, scaryCount: number): { state: GameState; clauses: Clause[] } {
  let rng = state.rng;
  const next = () => {
    const rolled = rngNext(rng);
    rng = rolled.next;
    return rolled.value;
  };
  const count = Math.max(1, Math.min(3, scaryCount));
  const scary = shuffle(SCARY, next).slice(0, count);
  const hasLiq = scary.some((clause) => clause.fixed?.liqPref || clause.left?.liqPref);
  const normals = shuffle(
    NORMAL.filter((clause) => !(hasLiq && clause.id === 'one-x')),
    next,
  );
  const size = count >= 3 ? 6 : 5;
  const clauses = [...scary, ...normals.slice(0, size - scary.length)];
  return { state: { ...state, rng }, clauses: shuffle(clauses, next) };
}

function shuffle<T>(items: T[], next: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
