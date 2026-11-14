import { rngNext } from './rng';
import type { GameState } from './types';

export function offerScore(state: GameState): number {
  return (
    (state.flags.deck === 'tight' ? 1 : 0) +
    (state.flags.list === 'warm' ? 1 : 0) +
    (state.flags.build ? 1 : 0)
  );
}

export function hasFund(state: GameState): boolean {
  return offerScore(state) >= 2 || state.flags.coffeeLead || state.flags.fundArrived;
}

export interface AngelOffer {
  name: string;
  amount: number;
  lowCap: number;
  highCap: number;
}

export interface FundOffer {
  name: string;
  amount: number;
  cap: number;
}

export function angelOffer(state: GameState): AngelOffer {
  const strong = hasFund(state);
  return {
    name: 'Harbor',
    amount: strong ? 200_000 : 150_000,
    lowCap: 6_000_000,
    highCap: 8_000_000,
  };
}

export function fundOffer(): FundOffer {
  return { name: 'Northline', amount: 500_000, cap: 8_000_000 };
}

export function rollMeeting(state: GameState): GameState {
  const { value, next } = rngNext(state.rng);
  const score = offerScore(state);
  let meeting: GameState['flags']['meeting'];
  if (score >= 2) meeting = value < 0.62 ? 'yes' : value < 0.84 ? 'coffee' : 'ghost';
  else if (score === 1) meeting = value < 0.34 ? 'yes' : value < 0.67 ? 'coffee' : 'ghost';
  else meeting = value < 0.2 ? 'yes' : value < 0.55 ? 'coffee' : 'ghost';
  return { ...state, rng: next, flags: { ...state.flags, meeting } };
}

export function rollCoffee(state: GameState): GameState {
  const { value, next } = rngNext(state.rng);
  return {
    ...state,
    rng: next,
    flags: { ...state.flags, coffeeLead: value < 0.28 },
  };
}

export interface PricedOffer {
  preMoney: number;
  newMoney: number;
  poolAsk: number;
  variant: 'A' | 'B';
}

/** Term-sheet economics. fastSheet and thin prep get a smaller round. */
export function priceTermSheet(state: GameState): { state: GameState; offer: PricedOffer } {
  const { value, next } = rngNext(state.rng);
  const variant: 'A' | 'B' = value < 0.5 ? 'A' : 'B';
  const quality = offerScore(state);
  let offer: PricedOffer;
  if (state.flags.fastSheet) {
    offer = { preMoney: 10_000_000, newMoney: 1_800_000, poolAsk: 0.15, variant };
  } else if (quality >= 3 && state.flags.hired) {
    offer = { preMoney: 14_000_000, newMoney: 2_500_000, poolAsk: 0.1, variant };
  } else if (quality >= 2) {
    offer = { preMoney: 12_000_000, newMoney: 2_500_000, poolAsk: 0.15, variant };
  } else {
    offer = { preMoney: 9_000_000, newMoney: 1_500_000, poolAsk: 0.15, variant };
  }
  if (state.flags.vesting === 'none') {
    offer = { ...offer, newMoney: Math.round(offer.newMoney * 0.85) };
  }
  return { state: { ...state, rng: next }, offer };
}
