import { describe, expect, it } from 'vitest';
import { createGame, applyClock } from './reducer';
import { computeCapTable, describeShuffle, previewPricedRound } from './math';
import type { SafeNote } from './types';

function safe(partial: Omit<SafeNote, 'order'> & { order: number }): SafeNote {
  return partial;
}

describe('post-money SAFE math', () => {
  it('sets ownership to purchase amount divided by the post-money cap', () => {
    const state = createGame('math', 1);
    state.foundersShares = 9_000_000;
    state.poolShares = 1_000_000;
    state.safes = [safe({ id: 'a', name: 'Harbor', amount: 200_000, cap: 8_000_000, mfn: false, sideLetter: false, homemade: false, order: 0 })];
    const table = computeCapTable(state);
    expect(table.safeDetails[0].pctPreRound).toBeCloseTo(0.025, 8);
    expect(table.foundersPct).toBeCloseTo(0.9 * 0.975, 8);
  });

  it('does not dilute an earlier post-money SAFE when a later one stacks', () => {
    const state = createGame('math', 1);
    state.foundersShares = 9_000_000;
    state.poolShares = 1_000_000;
    state.safes = [safe({ id: 'a', name: 'Harbor', amount: 200_000, cap: 8_000_000, mfn: false, sideLetter: false, homemade: false, order: 0 })];
    const before = computeCapTable(state);
    state.safes.push(safe({ id: 'b', name: 'Northline', amount: 500_000, cap: 8_000_000, mfn: false, sideLetter: false, homemade: false, order: 1 }));
    const after = computeCapTable(state);
    expect(after.safeDetails[0].pctPreRound).toBeCloseTo(before.safeDetails[0].pctPreRound, 8);
    expect(after.safeDetails[1].pctPreRound).toBeCloseTo(0.0625, 8);
    expect(after.foundersPct).toBeLessThan(before.foundersPct);
    expect(after.foundersPct).toBeCloseTo(0.9 * (1 - 0.0875), 8);
  });

  it('lets MFN raise an earlier cap percent instead of diluting that holder', () => {
    const state = createGame('math', 1);
    state.safes = [
      safe({ id: 'a', name: 'Harbor', amount: 200_000, cap: 8_000_000, mfn: true, sideLetter: false, homemade: false, order: 0 }),
      safe({ id: 'b', name: 'Mina', amount: 50_000, cap: 5_000_000, mfn: false, sideLetter: false, homemade: false, order: 1 }),
    ];
    const table = computeCapTable(state);
    expect(table.safeDetails[0].cap).toBe(5_000_000);
    expect(table.safeDetails[0].pctPreRound).toBeCloseTo(0.04, 8);
    expect(table.safeDetails[1].pctPreRound).toBeCloseTo(0.01, 8);
    expect(table.safeDetails[0].pctPreRound).not.toBeCloseTo(0.025 * 0.99, 4);
  });
});

describe('option pool shuffle', () => {
  it('computes effective pre-money as headline pre minus pool percent times post-money', () => {
    const shuffle = describeShuffle(12_000_000, 2_500_000, 0.1);
    expect(shuffle.post).toBe(14_500_000);
    expect(shuffle.poolDollars).toBe(1_450_000);
    expect(shuffle.effectivePre).toBe(10_550_000);
    expect(shuffle.newPct).toBeCloseTo(2.5 / 14.5, 8);
    const bigger = describeShuffle(12_000_000, 2_500_000, 0.15);
    expect(bigger.effectivePre).toBe(9_825_000);
    expect(bigger.effectivePre).toBeLessThan(shuffle.effectivePre);
  });

  it('takes the pool from founders, not from new investors or post-money SAFEs', () => {
    const state = createGame('math', 1);
    state.foundersShares = 9_000_000;
    state.grantedShares = 0;
    state.poolShares = 1_000_000;
    state.safes = [safe({ id: 'a', name: 'Harbor', amount: 750_000, cap: 8_000_000, mfn: false, sideLetter: false, homemade: false, order: 0 })];
    state.deal = { ...state.deal, preMoney: 12_000_000, newMoney: 2_500_000, poolAsk: 0.15, poolTarget: 0.1, variant: 'A', liqPref: '1x-np', antidilution: 'bbwa', board: 'balanced', protective: 'standard' };
    const low = previewPricedRound(state, 0.1);
    const high = previewPricedRound(state, 0.15);
    expect(low.safeDetails[0].pctNow).toBeCloseTo(high.safeDetails[0].pctNow, 8);
    expect(low.newMoneyPct).toBeCloseTo(high.newMoneyPct, 8);
    expect(low.newMoneyPct).toBeCloseTo(2.5 / 14.5, 8);
    expect(low.foundersPct).toBeGreaterThan(high.foundersPct);
    expect(low.foundersPct).toBeCloseTo(0.65, 2);
    expect(low.effectivePre).toBe(10_550_000);
  });
});

describe('deadlines', () => {
  it('treats day 30 as still inside the 83(b) window and day 31 as missed', () => {
    const filed = createGame('clock', 1);
    filed.stockIssuedDay = 0;
    filed.day = 30;
    applyClock(filed, { file83b: true, advanceDays: 1 });
    expect(filed.filed83b).toBe(true);
    expect(filed.missed83b).toBe(false);

    const missed = createGame('clock', 1);
    missed.stockIssuedDay = 0;
    applyClock(missed, { advanceDays: 31 });
    expect(missed.filed83b).toBe(false);
    expect(missed.missed83b).toBe(true);
    expect(missed.day).toBe(31);
  });

  it('treats day 15 as on time for Form D and day 16 as late', () => {
    const onTime = createGame('form', 1);
    onTime.firstSaleDay = 0;
    onTime.day = 15;
    applyClock(onTime, { fileFormD: true });
    expect(onTime.filedFormD).toBe(true);
    expect(onTime.missedFormD).toBe(false);

    const late = createGame('form', 1);
    late.firstSaleDay = 0;
    applyClock(late, { advanceDays: 16 });
    expect(late.filedFormD).toBe(false);
    expect(late.missedFormD).toBe(true);
  });
});
