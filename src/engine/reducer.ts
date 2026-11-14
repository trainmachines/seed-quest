import { earnedAchievements } from './achievements';
import { BALANCE } from './balance';
import { drawClauses, sheetClauses } from '../data/clauses';
import { sceneMap } from '../data/scenes';
import { untakenPaths } from '../data/paths';
import { unresolvedIssues } from './flow';
import { computeCapTable } from './math';
import { priceTermSheet } from './offers';
import { rngNext } from './rng';
import type { Choice, Delta, Effects, GameState, Scene } from './types';
import { defaultDeal, defaultFlags } from './types';

export function createGame(slotId: string, seed = 1): GameState {
  const state: GameState = {
    version: 1,
    slotId,
    seed: seed >>> 0 || 1,
    rng: seed >>> 0 || 1,
    sceneId: 'napkin',
    screen: 'play',
    day: 0,
    stockIssuedDay: null,
    firstSaleDay: null,
    filed83b: false,
    missed83b: false,
    filedFormD: false,
    missedFormD: false,
    runway: BALANCE.startingRunway,
    morale: BALANCE.startingMorale,
    reputation: BALANCE.startingReputation,
    foundersShares: BALANCE.authorized,
    grantedShares: 0,
    poolShares: 0,
    departedShares: 0,
    unbanked: 0,
    flags: defaultFlags(),
    deal: defaultDeal(),
    safes: [],
    docs: [],
    terms: [],
    history: [],
    achievements: [],
    pendingLoot: [],
    lastDelta: null,
    failReason: null,
    eventId: 1,
    updatedAt: new Date().toISOString(),
    glossaryFocus: null,
  };
  return finish(enterScene(state, 'napkin'), state);
}

export function getScene(id: string): Scene {
  const scene = sceneMap.get(id);
  if (!scene) throw new Error(`Missing scene: ${id}`);
  return scene;
}

export function sceneChoices(scene: Scene, state: GameState): Choice[] {
  if (!scene.choices) return [];
  return typeof scene.choices === 'function' ? scene.choices(state) : scene.choices;
}

export function sceneBody(scene: Scene, state: GameState): string {
  return typeof scene.body === 'function' ? scene.body(state) : scene.body;
}

export function choose(state: GameState, choiceId: string): GameState {
  const scene = getScene(state.sceneId);
  const choice = sceneChoices(scene, state).find((item) => item.id === choiceId);
  if (!choice) throw new Error(`Missing choice ${choiceId} on ${state.sceneId}`);
  return applyChoice(state, choice);
}

export function dismissLoot(state: GameState): GameState {
  return { ...state, pendingLoot: [] };
}

export function openScreen(state: GameState, screen: GameState['screen'], glossaryFocus: string | null = null): GameState {
  return { ...state, screen, glossaryFocus };
}

export function submitRedpen(state: GameState, redlined: string[]): GameState {
  const before = snapshot(state);
  const draft = clone(state);
  const clauses = sheetClauses(draft);
  let scary = 0;
  let caught = 0;
  let foughtNormal = 0;
  for (const clause of clauses) {
    const marked = redlined.includes(clause.id);
    if (clause.scary) {
      scary += 1;
      if (marked) {
        caught += 1;
        if (clause.fixed) draft.deal = { ...draft.deal, ...clause.fixed };
        addReputation(draft, 3);
        draft.morale += 2;
      } else {
        if (clause.left) draft.deal = { ...draft.deal, ...clause.left };
        addReputation(draft, -5);
        draft.morale -= 4;
      }
    } else if (marked) {
      foughtNormal += 1;
      draft.flags.foughtStandard = true;
      addReputation(draft, -6);
      draft.morale -= 2;
      draft.runway -= 0.3;
    } else {
      addReputation(draft, 2);
    }
  }
  draft.morale = clamp(draft.morale, 0, 100);
  draft.flags.redPenPerfect = caught === scary && foughtNormal === 0;
  const because = draft.flags.redPenPerfect
    ? 'You marked the red flags and left the ordinary terms alone.'
    : caught === scary
      ? 'The scary clauses are out. Fighting a market term still cost goodwill.'
      : 'A clause you left in sits outside the seed norm. The codex has the name and the consequence.';
  for (const clause of clauses) addTerm(draft, clause.termId);
  addTerm(draft, 'liquidation-preference');
  addTerm(draft, 'participating-preferred');
  addTerm(draft, 'anti-dilution');
  addTerm(draft, 'non-participating');
  addTerm(draft, 'broad-based-weighted-average');
  draft.history.push({ scene: state.sceneId, choice: `redpen:${redlined.slice().sort().join('+') || 'none'}` });
  const withDelta = stampDelta(before, draft, because);
  return finish(enterScene(withDelta, 'redpen_result'), before);
}

export function failWire(state: GameState, missing: string[]): GameState {
  const before = snapshot(state);
  const draft = clone(state);
  draft.runway -= 0.6;
  draft.morale = clamp(draft.morale - 4, 0, 100);
  draft.flags.wireDelayed = true;
  draft.day += 14;
  const list = missing.length ? missing.join(', ') : 'a signature';
  const because = `The wire stays put until ${list} is done. Two weeks of runway burn while you chase the page.`;
  draft.history.push({ scene: 'wire_day', choice: 'delay' });
  let next = stampDelta(before, draft, because);
  if (next.runway <= 0 && !next.deal.closed) {
    next.flags.broke = true;
    next.failReason = 'The wire sat unsigned until the company ran out of months.';
    next = enterScene(next, 'ending');
  }
  return finish(next, before);
}

export function noteWireFraud(state: GameState): GameState {
  const before = snapshot(state);
  const draft = clone(state);
  draft.runway -= 1.5;
  draft.morale = clamp(draft.morale - 8, 0, 100);
  addReputation(draft, -6);
  draft.flags.wireFraud = true;
  const because = 'That domain is not your bank. The fake instructions cost a month and a half, and the real wire has not moved.';
  draft.history.push({ scene: 'wire_day', choice: 'fraud' });
  let next = stampDelta(before, draft, because);
  if (next.runway <= 0 && !next.deal.closed) {
    next.flags.broke = true;
    next.failReason = 'A lookalike wire email emptied the last of the runway.';
    next = enterScene(next, 'ending');
  }
  return finish(next, before);
}

export function closeWire(state: GameState): GameState {
  const before = snapshot(state);
  const draft = clone(state);
  draft.flags.runwayBeforeWire = draft.runway;
  const issues = unresolvedIssues(draft);
  if (draft.deal.preMoney && issues >= 2) {
    draft.deal.preMoney = Math.max(1_000_000, draft.deal.preMoney - 1_000_000);
  }
  if (draft.deal.newMoney) {
    draft.deal.newMoney = Math.max(250_000, draft.deal.newMoney - issues * 250_000);
    draft.runway += draft.deal.newMoney / BALANCE.seedBurn;
  }
  draft.deal.closed = true;
  draft.morale = clamp(draft.morale + 6, 0, 100);
  addReputation(draft, 4);
  addDoc(draft, 'funds-flow');
  addDoc(draft, 'do-insurance');
  addTerm(draft, 'wire');
  draft.history.push({ scene: 'wire_day', choice: 'close' });
  const because = 'Every blocking signature is in. The wire hits, and runway jumps by the new money divided by burn.';
  return finish(enterScene(stampDelta(before, draft, because), 'ending'), before);
}

function applyChoice(state: GameState, choice: Choice): GameState {
  const before = snapshot(state);
  const draft = clone(state);
  const effects = choice.effects ?? {};
  if (effects.runway) draft.runway += effects.runway;
  if (effects.morale) draft.morale += effects.morale;
  if (effects.reputation) addReputation(draft, effects.reputation);
  applyClock(draft, effects);
  if (effects.shares) {
    if (effects.shares.founders != null) draft.foundersShares = effects.shares.founders;
    if (effects.shares.granted != null) draft.grantedShares = effects.shares.granted;
    if (effects.shares.pool != null) draft.poolShares = effects.shares.pool;
  }
  if (effects.safes?.length) {
    for (const safe of effects.safes) {
      draft.safes.push({ ...safe, order: draft.safes.length });
      draft.unbanked += safe.amount;
    }
  }
  if (choice.flags) draft.flags = { ...draft.flags, ...choice.flags };
  if (choice.deal) draft.deal = { ...draft.deal, ...choice.deal };
  for (const id of choice.docs ?? []) addDoc(draft, id);
  for (const id of choice.terms ?? []) addTerm(draft, id);
  if (effects.bankNewSafes && draft.unbanked > 0) {
    draft.runway += draft.unbanked / BALANCE.preSeedBurn;
    draft.unbanked = 0;
  }
  if (effects.bankRound && draft.deal.newMoney) {
    draft.runway += draft.deal.newMoney / BALANCE.seedBurn;
    draft.deal.closed = true;
    draft.unbanked = 0;
  }
  const resolved = choice.resolve ? choice.resolve(draft) : draft;
  resolved.morale = clamp(resolved.morale, 0, 100);
  resolved.reputation = clamp(resolved.reputation, 0, 85);
  resolved.history.push({ scene: state.sceneId, choice: choice.id });
  let next = stampDelta(before, resolved, choice.because);
  let dest = typeof choice.next === 'function' ? choice.next(next) : choice.next;
  dest = divertForMorale(next, dest);
  if (next.runway <= 0 && !next.deal.closed) {
    next.flags.broke = true;
    next.failReason = runwayFailReason(state.sceneId, next.unbanked);
    dest = 'ending';
  }
  return finish(enterScene(next, dest), before);
}

export function applyClock(state: GameState, effects: Effects): void {
  if (effects.noteFirstSale && state.firstSaleDay == null && (state.safes.length > 0 || effects.safes?.length)) {
    state.firstSaleDay = state.day;
  }
  if (effects.issueStock && state.stockIssuedDay == null) state.stockIssuedDay = state.day;
  if (effects.file83b && !state.missed83b && state.stockIssuedDay != null) {
    const elapsed = state.day - state.stockIssuedDay;
    if (elapsed <= 30) state.filed83b = true;
  }
  if (effects.fileFormD && !state.missedFormD && state.firstSaleDay != null) {
    const elapsed = state.day - state.firstSaleDay;
    if (elapsed <= 15) state.filedFormD = true;
  }
  if (effects.advanceDays) state.day += effects.advanceDays;
  if (effects.forceMissFormD) state.missedFormD = true;
  if (!state.filed83b && !state.missed83b && state.stockIssuedDay != null && state.day - state.stockIssuedDay > 30) {
    state.missed83b = true;
  }
  if (
    !state.filedFormD &&
    !state.missedFormD &&
    state.firstSaleDay != null &&
    state.day - state.firstSaleDay > 15
  ) {
    state.missedFormD = true;
  }
}

function enterScene(state: GameState, id: string): GameState {
  const scene = getScene(id);
  const next = clone(state);
  next.sceneId = id;
  next.screen = 'play';
  if ((id === 'pool_shuffle' || id === 'term_headline') && next.deal.preMoney == null) {
    const priced = priceTermSheet(next);
    next.rng = priced.state.rng;
    next.deal = {
      ...next.deal,
      preMoney: priced.offer.preMoney,
      newMoney: priced.offer.newMoney,
      poolAsk: priced.offer.poolAsk,
      variant: priced.offer.variant,
      liqPref: '1x-np',
      antidilution: 'bbwa',
      board: 'balanced',
      protective: 'standard',
    };
    const drawn = drawClauses(next, priced.offer.scaryCount);
    next.rng = drawn.state.rng;
    next.deal = { ...next.deal, clauseIds: drawn.clauses.map((clause) => clause.id) };
  }
  if (id === 'burn_2' && !next.flags.churnSeen) {
    const rolled = rngNext(next.rng);
    next.rng = rolled.next;
    next.flags.churnSeen = true;
    next.flags.churnHit = rolled.value < 0.4;
  }
  for (const term of scene.termsOnEnter ?? []) addTerm(next, term);
  for (const doc of scene.docsOnEnter ?? []) addDoc(next, doc);
  if (id === 'ending') {
    for (const path of untakenPaths(next).slice(0, 6)) addTerm(next, path.glossaryId);
  }
  return next;
}

function finish(state: GameState, before: GameState): GameState {
  const terms = state.terms.filter((id) => !before.terms.includes(id));
  const docs = state.docs.filter((id) => !before.docs.includes(id));
  state.pendingLoot = terms;
  if (state.lastDelta) {
    state.lastDelta = { ...state.lastDelta, terms, docs };
  }
  state.achievements = earnedAchievements(state);
  state.updatedAt = new Date().toISOString();
  state.eventId = before.eventId + 1;
  if (state.sceneId === 'ending') state.pendingLoot = [];
  return state;
}

function snapshot(state: GameState): GameState {
  return clone(state);
}

function stampDelta(before: GameState, after: GameState, because: string): GameState {
  const prev = computeCapTable(before);
  const nextTable = computeCapTable(after);
  const added = after.safes.length > before.safes.length;
  const unchangedSafeIds: string[] = [];
  const shiftedSafeIds: string[] = [];
  if (added) {
    for (const prior of prev.safeDetails) {
      const now = nextTable.safeDetails.find((detail) => detail.id === prior.id);
      if (!now) continue;
      if (Math.abs(now.pctPreRound - prior.pctPreRound) < 1e-9) unchangedSafeIds.push(prior.id);
      else shiftedSafeIds.push(prior.id);
    }
  }
  const delta: Delta = {
    runway: after.runway - before.runway,
    morale: after.morale - before.morale,
    reputation: after.reputation - before.reputation,
    founders: nextTable.foundersPct - prev.foundersPct,
    because,
    docs: [],
    terms: [],
    unchangedSafeIds,
    shiftedSafeIds,
  };
  return { ...after, lastDelta: delta };
}

function clone(state: GameState): GameState {
  return {
    ...state,
    flags: { ...state.flags },
    deal: { ...state.deal },
    safes: state.safes.map((safe) => ({ ...safe })),
    docs: [...state.docs],
    terms: [...state.terms],
    history: state.history.map((entry) => ({ ...entry })),
    achievements: [...state.achievements],
    pendingLoot: [...state.pendingLoot],
    lastDelta: state.lastDelta ? { ...state.lastDelta } : null,
  };
}

function addDoc(state: GameState, id: string): void {
  if (!state.docs.includes(id)) state.docs.push(id);
}

function addTerm(state: GameState, id: string): void {
  if (!state.terms.includes(id)) state.terms.push(id);
}

function sceneTitle(id: string): string {
  return sceneMap.get(id)?.title ?? id;
}

function addReputation(state: GameState, delta: number): void {
  const applied = delta > 0 ? delta * 0.22 : delta;
  state.reputation = clamp(state.reputation + applied, 0, 85);
}

function divertForMorale(state: GameState, dest: string): string {
  if (dest === 'ending' || state.flags.broke) return dest;
  if (
    !state.flags.cofounderWobble &&
    state.morale < 35 &&
    state.flags.vesting !== 'unknown' &&
    state.history.length > 3 &&
    dest !== 'cofounder_wobble' &&
    dest !== 'week_off'
  ) {
    state.flags.cofounderWobble = true;
    state.flags.resumeScene = dest;
    return 'cofounder_wobble';
  }
  if (!state.flags.weekOff && state.morale < 20 && dest !== 'week_off' && dest !== 'cofounder_wobble') {
    state.flags.weekOff = true;
    state.flags.resumeScene = dest;
    return 'week_off';
  }
  return dest;
}

function runwayFailReason(sceneId: string, unbanked: number): string {
  if (unbanked > 0) return 'Runway hit zero. A signed SAFE is not cash until it wires.';
  if (sceneId.startsWith('burn_')) {
    return 'Runway hit zero during the months after the pre-seed. The seed meeting never got a chance.';
  }
  return `Runway hit zero after ${sceneTitle(sceneId)}. The next meeting never got a chance.`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
