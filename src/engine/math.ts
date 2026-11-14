import type { GameState, SafeNote } from './types';

/**
 * Fundraising math for Seed Quest.
 *
 * Post-money SAFE: ownership = purchase amount / post-money cap.
 * A later post-money SAFE does not dilute an earlier one. Founders
 * (and the option pool / granted equity) absorb it.
 * MFN can lower an earlier cap if a later SAFE has a cheaper cap.
 * That raises the earlier SAFE's ownership. It does not shrink it.
 *
 * Priced round: post-money = pre-money + new money.
 * New investors own new money / post-money. They are not diluted by the pool.
 * The unissued pool is resized inside the pre-money (the option pool shuffle).
 * Effective pre-money = headline pre-money − (pool % × post-money).
 * In the priced round, a pool increase is not in the SAFE's company
 * capitalization, so the top-up dilutes SAFE holders and founders together.
 * New investors still own new money / post-money. They are not diluted by the pool.
 * The cap is a ceiling on price: if the pre-money is below the cap, the SAFE
 * converts at the round price instead (min of cap price and round price).
 */

export interface SafeDetail {
  id: string;
  name: string;
  amount: number;
  statedCap: number;
  cap: number;
  homemade: boolean;
  mfnApplied: boolean;
  pctPreRound: number;
  pctNow: number;
}

export interface CapTableResult {
  stage: 'pre-round' | 'post-round';
  foundersPct: number;
  grantedPct: number;
  departedPct: number;
  poolPct: number;
  safePct: number;
  newMoneyPct: number;
  safeDetails: SafeDetail[];
  offSheetPct: number;
  totalDisplayed: number;
  headlinePre: number | null;
  newMoney: number | null;
  postMoney: number | null;
  poolTarget: number | null;
  effectivePre: number | null;
  poolDollars: number | null;
}

export function effectiveCap(safe: SafeNote, safes: SafeNote[]): { cap: number; mfnApplied: boolean } {
  let cap = safe.cap;
  let mfnApplied = false;
  if (safe.mfn) {
    for (const other of safes) {
      if (other.order > safe.order && other.cap < cap) {
        cap = other.cap;
        mfnApplied = true;
      }
    }
  }
  return { cap, mfnApplied };
}

export function describeShuffle(pre: number, invested: number, pool: number): {
  post: number;
  poolDollars: number;
  effectivePre: number;
  newPct: number;
} {
  const post = pre + invested;
  const poolDollars = Math.round(pool * post);
  return {
    post,
    poolDollars,
    effectivePre: pre - poolDollars,
    newPct: invested / post,
  };
}

export function computeCapTable(state: GameState): CapTableResult {
  const details: SafeDetail[] = state.safes.map((safe) => {
    const { cap, mfnApplied } = effectiveCap(safe, state.safes);
    const pct = cap > 0 ? safe.amount / cap : 0;
    return {
      id: safe.id,
      name: safe.name,
      amount: safe.amount,
      statedCap: safe.cap,
      cap,
      homemade: safe.homemade,
      mfnApplied,
      pctPreRound: pct,
      pctNow: pct,
    };
  });
  const p = details.reduce((sum, detail) => sum + detail.pctPreRound, 0);
  const departed = state.departedShares ?? 0;
  const base = state.foundersShares + state.grantedShares + state.poolShares + departed;
  const remain = Math.max(0, 1 - p);
  const foundersShare = base > 0 ? state.foundersShares / base : 1;
  const grantedShare = base > 0 ? state.grantedShares / base : 0;
  const departedShare = base > 0 ? departed / base : 0;
  const poolShare = base > 0 ? state.poolShares / base : 0;

  const deal = state.deal;
  const priced =
    deal.closed &&
    deal.preMoney != null &&
    deal.newMoney != null &&
    deal.poolTarget != null &&
    deal.preMoney > 0;

  const offSheetPct = state.flags.advisor === 'off-sheet' ? 0.05 : 0;

  if (!priced) {
    const foundersPct = foundersShare * remain;
    const grantedPct = grantedShare * remain;
    const departedPct = departedShare * remain;
    const poolPct = poolShare * remain;
    return {
      stage: 'pre-round',
      foundersPct,
      grantedPct,
      departedPct,
      poolPct,
      safePct: p,
      newMoneyPct: 0,
      safeDetails: details,
      offSheetPct,
      totalDisplayed: foundersPct + grantedPct + departedPct + poolPct + p + offSheetPct,
      headlinePre: deal.preMoney,
      newMoney: deal.newMoney,
      postMoney: deal.preMoney != null && deal.newMoney != null ? deal.preMoney + deal.newMoney : null,
      poolTarget: deal.poolTarget,
      effectivePre:
        deal.preMoney != null && deal.newMoney != null && deal.poolTarget != null
          ? describeShuffle(deal.preMoney, deal.newMoney, deal.poolTarget).effectivePre
          : null,
      poolDollars:
        deal.preMoney != null && deal.newMoney != null && deal.poolTarget != null
          ? describeShuffle(deal.preMoney, deal.newMoney, deal.poolTarget).poolDollars
          : null,
    };
  }

  const pre = deal.preMoney as number;
  const invested = deal.newMoney as number;
  const poolTarget = deal.poolTarget as number;
  const shuffle = describeShuffle(pre, invested, poolTarget);
  const allocation = allocatePricedRound({
    founders: state.foundersShares,
    granted: state.grantedShares,
    departed,
    pool: state.poolShares,
    safes: details.map((detail) => ({
      id: detail.id,
      amount: detail.amount,
      cap: detail.cap,
      discount: state.safes.find((safe) => safe.id === detail.id)?.discount ?? 0,
    })),
    pre,
    invested,
    poolTarget,
  });
  const diluted = details.map((detail) => ({
    ...detail,
    pctNow: (allocation.safeShares[detail.id] ?? 0) / allocation.total,
  }));
  const safePct = diluted.reduce((sum, detail) => sum + detail.pctNow, 0);
  const newMoneyPct = shuffle.newPct;
  const foundersPct = state.foundersShares / allocation.total;
  const grantedPct = state.grantedShares / allocation.total;
  const departedPct = departed / allocation.total;

  return {
    stage: 'post-round',
    foundersPct,
    grantedPct,
    departedPct,
    poolPct: poolTarget,
    safePct,
    newMoneyPct,
    safeDetails: diluted,
    offSheetPct,
    totalDisplayed: foundersPct + grantedPct + departedPct + poolTarget + safePct + newMoneyPct + offSheetPct,
    headlinePre: pre,
    newMoney: invested,
    postMoney: shuffle.post,
    poolTarget,
    effectivePre: shuffle.effectivePre,
    poolDollars: shuffle.poolDollars,
  };
}

export function previewPricedRound(state: GameState, poolTarget: number): CapTableResult {
  return computeCapTable({
    ...state,
    flags: { ...state.flags, advisor: state.flags.advisor === 'off-sheet' ? 'none' : state.flags.advisor },
    deal: {
      ...state.deal,
      poolTarget,
      closed: true,
    },
  });
}

export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  const v = Math.abs(Math.round(n));
  if (v >= 1_000_000) return `${sign}$${trim(v / 1_000_000)}M`;
  if (v >= 10_000) return `${sign}$${Math.round(v / 1000)}k`;
  return `${sign}$${v.toLocaleString('en-US')}`;
}

export function pct(fraction: number, digits = 2): string {
  return `${trim(fraction * 100, digits)}%`;
}

function trim(n: number, digits = 2): string {
  const text = n.toFixed(digits);
  return digits > 0 ? text.replace(/\.?0+$/, '') : text;
}

/**
 * Share counts once a priced round is closed.
 * Cap-binding SAFEs convert on the pre-increase capitalization (amount / cap).
 * A pool top-up is outside that capitalization, so it dilutes SAFE holders too.
 * If the pre-money is below a cap, that SAFE converts at the round price
 * (or the discounted round price), which is min(cap price, round price).
 */
export function allocatePricedRound(input: {
  founders: number;
  granted: number;
  departed: number;
  pool: number;
  safes: { id: string; amount: number; cap: number; discount: number }[];
  pre: number;
  invested: number;
  poolTarget: number;
}): { total: number; safeShares: Record<string, number> } {
  const people = input.founders + input.granted + input.departed;
  const E = people + Math.max(0, input.pool);
  const capSafes = input.safes.filter((safe) => safe.cap > 0 && safe.cap <= input.pre);
  const floatSafes = input.safes.filter((safe) => !(safe.cap > 0 && safe.cap <= input.pre));
  const sold = capSafes.reduce((sum, safe) => sum + safe.amount / safe.cap, 0);
  const C = sold < 0.95 ? E / (1 - sold) : E;
  const capShares: Record<string, number> = {};
  for (const safe of capSafes) capShares[safe.id] = (safe.amount / safe.cap) * C;
  const fixed = people + Object.values(capShares).reduce((sum, shares) => sum + shares, 0);
  const adjusted = floatSafes.reduce((sum, safe) => sum + safe.amount / Math.max(0.05, 1 - safe.discount), 0);
  const k = 1 - adjusted / input.pre - (input.poolTarget * (input.pre + input.invested)) / input.pre;
  const preFD = k > 0.02 ? fixed / k : fixed;
  const total = (preFD * (input.pre + input.invested)) / input.pre;
  const roundPrice = input.pre / preFD;
  const safeShares = { ...capShares };
  for (const safe of floatSafes) {
    safeShares[safe.id] = safe.amount / (roundPrice * Math.max(0.05, 1 - safe.discount));
  }
  return { total, safeShares };
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export interface ClockView {
  kind: 'inactive' | 'open' | 'filed' | 'missed';
  elapsed: number;
  left: number;
}

export function eightyThreeBStatus(state: GameState): ClockView {
  if (state.missed83b) return { kind: 'missed', elapsed: 31, left: 0 };
  if (state.filed83b) return { kind: 'filed', elapsed: 0, left: 0 };
  if (state.stockIssuedDay == null) return { kind: 'inactive', elapsed: 0, left: 30 };
  const elapsed = state.day - state.stockIssuedDay;
  return { kind: 'open', elapsed, left: 30 - elapsed };
}

export function formDStatus(state: GameState): ClockView {
  if (state.missedFormD) return { kind: 'missed', elapsed: 16, left: 0 };
  if (state.filedFormD) return { kind: 'filed', elapsed: 0, left: 0 };
  if (state.firstSaleDay == null) return { kind: 'inactive', elapsed: 0, left: 15 };
  const elapsed = state.day - state.firstSaleDay;
  return { kind: 'open', elapsed, left: 15 - elapsed };
}
