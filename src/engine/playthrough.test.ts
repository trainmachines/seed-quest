import { describe, expect, it } from 'vitest';
import { clausesFor, sheetClauses } from '../data/clauses';
import { documentMap } from '../data/documents';
import { GLOSSARY } from '../data/glossary';
import { UNTAKEN_PATHS } from '../data/paths';
import { SCENES } from '../data/scenes';
import { endingKind, greatBlockers } from './flow';
import { wordCount } from './math';
import { rngNext } from './rng';
import { choose, closeWire, createGame, getScene, sceneBody, sceneChoices, submitRedpen } from './reducer';
import { MemorySaveRepository } from './storage';
import type { Choice, GameState } from './types';

function moves(choice: Choice): boolean {
  const effects = choice.effects;
  if (!effects) return false;
  return (
    (effects.runway ?? 0) !== 0 ||
    (effects.morale ?? 0) !== 0 ||
    (effects.reputation ?? 0) !== 0 ||
    (effects.safes?.length ?? 0) > 0 ||
    !!effects.shares ||
    !!effects.bankNewSafes ||
    !!effects.bankRound
  );
}

function richState(): GameState {
  const state = createGame('rich', 2);
  state.flags.entity = 'delaware';
  state.flags.vesting = 'standard';
  state.flags.build = true;
  state.flags.hired = true;
  state.flags.list = 'warm';
  state.flags.deck = 'tight';
  state.flags.pete = 'ghost';
  state.flags.advisor = 'off-sheet';
  state.safes = [
    { id: 'harbor', name: 'Harbor', amount: 200_000, cap: 6_000_000, mfn: true, sideLetter: true, homemade: false, order: 0 },
    { id: 'northline', name: 'Northline', amount: 500_000, cap: 8_000_000, mfn: false, sideLetter: false, homemade: false, order: 1 },
  ];
  state.deal = {
    ...state.deal,
    preMoney: 12_000_000,
    newMoney: 2_500_000,
    poolAsk: 0.15,
    poolTarget: 0.1,
    variant: 'A',
    liqPref: '1x-np',
    antidilution: 'bbwa',
    board: 'balanced',
    protective: 'standard',
  };
  return state;
}

describe('story content', () => {
  const fixtures = [createGame('base', 1), richState()];

  it('keeps every scene under 80 words and points at real scenes', () => {
    const ids = new Set(SCENES.map((scene) => scene.id));
    expect(ids.size).toBe(SCENES.length);
    for (const scene of SCENES) {
      for (const fixture of fixtures) {
        const text = sceneBody(scene, fixture);
        const words = wordCount(text);
        expect(words, `${scene.id} has ${words} words`).toBeLessThanOrEqual(80);
        expect(words, scene.id).toBeGreaterThan(0);
        for (const choice of sceneChoices(scene, fixture)) {
          expect(moves(choice), `${scene.id}:${choice.id}`).toBe(true);
          expect(choice.because.length).toBeGreaterThan(10);
          const destinations = typeof choice.next === 'string' ? [choice.next] : choice.destinations ?? [];
          expect(destinations.length, `${scene.id}:${choice.id}`).toBeGreaterThan(0);
          for (const destination of destinations) expect(ids.has(destination), destination).toBe(true);
          const landed = typeof choice.next === 'string' ? choice.next : choice.next(fixture);
          expect(destinations, `${scene.id}:${choice.id} -> ${landed}`).toContain(landed);
          for (const doc of choice.docs ?? []) expect(documentMap.has(doc), doc).toBe(true);
        }
      }
      for (const doc of scene.docsOnEnter ?? []) expect(documentMap.has(doc), doc).toBe(true);
    }
  });

  it('can unlock every glossary entry somewhere in the game', () => {
    const unlocked = new Set<string>();
    for (const scene of SCENES) {
      for (const term of scene.termsOnEnter ?? []) unlocked.add(term);
      for (const fixture of fixtures) {
        for (const choice of sceneChoices(scene, fixture)) {
          for (const term of choice.terms ?? []) unlocked.add(term);
        }
      }
    }
    for (const clause of clausesFor('A').concat(clausesFor('B'))) unlocked.add(clause.termId);
    for (const term of ['liquidation-preference', 'participating-preferred', 'anti-dilution', 'non-participating', 'broad-based-weighted-average']) {
      unlocked.add(term);
    }
    for (const path of UNTAKEN_PATHS) unlocked.add(path.glossaryId);
    const missing = GLOSSARY.map((entry) => entry.id).filter((id) => !unlocked.has(id));
    expect(missing).toEqual([]);
  });
});

function run(seed: number, pick: (state: GameState) => string, redpen: (state: GameState) => string[]): GameState {
  let state = createGame('slot-1', seed);
  for (let step = 0; step < 60; step += 1) {
    if (state.sceneId === 'ending') return state;
    const scene = getScene(state.sceneId);
    if (scene.kind === 'redpen') {
      state = submitRedpen(state, redpen(state));
      continue;
    }
    if (scene.kind === 'wire') {
      state = closeWire(state);
      continue;
    }
    const choices = sceneChoices(scene, state);
    let id = pick(state);
    if (!choices.some((choice) => choice.id === id)) {
      const fallback = ['hold', 'push', 'send', 'ship', 'phone', 'onward', 'read', 'stay', 'rest', 'file', 'open'].find((name) =>
        choices.some((choice) => choice.id === name),
      );
      if (!fallback) {
        throw new Error(`${state.sceneId} has no "${id}". Choices: ${choices.map((choice) => choice.id).join(', ')}`);
      }
      id = fallback;
    }
    state = choose(state, id);
  }
  throw new Error(`stuck on ${state.sceneId}`);
}

const sharedEarly = (state: GameState, late83: boolean, pete: string, pool: string, list: string, deck: string) => {
  const map: Record<string, string> = {
    napkin: 'delaware',
    counsel: 'pro',
    founder_stock: 'vest',
    eightyb: late83 ? 'spring' : 'file',
    eightyb_missed: 'own-it',
    contractor: pete,
    pool,
    focus: 'build',
    targets: list,
    deck,
    meeting_yes: 'open',
    meeting_coffee: 'decline',
    meeting_ghost: 'move-on',
    coffee_result: 'onward',
    safe_angel: 'clean',
    safe_result: 'send',
    form_d: 'file',
    cap_table: 'fix',
    signatures: 'nudge',
    preseed_wire: 'phone',
    time_jump: 'ship',
    burn_2: 'ship',
    burn_3: 'ship',
    cofounder_wobble: 'stay',
    week_off: 'rest',
  };
  return map[state.sceneId];
};

describe('endings', () => {
  it('plays a great round when the clean path is taken', () => {
    const state = run(
      1,
      (current) =>
        sharedEarly(current, false, 'chase', 'grant', 'warm', 'tight') ??
        (
          {
            lead_hunt: 'process',
            term_headline: 'read-price',
            pool_shuffle: 'hold',
            redpen_result: 'onward',
            conversion: 'onward',
            diligence_intro: 'send',
            nvca_spa: 'read',
            nvca_coi: 'read',
            nvca_ira: 'read',
            nvca_voting: 'read',
            nvca_rofr: 'read',
          } as Record<string, string>
        )[current.sceneId],
      (current) => sheetClauses(current).filter((clause) => clause.scary).map((clause) => clause.id),
    );
    expect(state.sceneId).toBe('ending');
    expect(greatBlockers(state), greatBlockers(state).join(', ')).toEqual([]);
    expect(endingKind(state)).toBe('great');
    expect(state.deal.liqPref).toBe('1x-np');
    expect(state.deal.antidilution).toBe('bbwa');
    expect(state.filed83b).toBe(true);
    expect(state.flags.pete).toBe('signed');
  });

  it('plays an okay round when Act 1 problems come due', () => {
    const state = run(
      11,
      (current) => {
        const early: Record<string, string> = {
          napkin: 'delaware',
          counsel: 'pro',
          founder_stock: 'vest',
          eightyb: 'spring',
          eightyb_missed: 'own-it',
          contractor: 'later',
          pool: 'verbal',
          focus: 'build',
          targets: 'warm',
          deck: 'tight',
          meeting_yes: 'open',
          meeting_coffee: 'decline',
          meeting_ghost: 'move-on',
          coffee_result: 'onward',
          safe_angel: 'offered',
          safe_result: 'send',
          form_d: 'file',
          cap_table: 'sloppy',
          signatures: 'nudge',
          preseed_wire: 'phone',
          time_jump: 'ship',
          burn_2: 'ship',
          burn_3: 'ship',
          cofounder_wobble: 'cliff',
          week_off: 'rest',
          lead_hunt: 'process',
          term_headline: 'read-price',
          pool_shuffle: 'accept',
          redpen_result: 'onward',
          mfn_spring: 'leave',
          conversion: 'honor',
          diligence_intro: 'send',
          diligence_pete: 'indemnity',
          diligence_83b: 'reserve',
          diligence_cap: 'issue',
          diligence_formd: 'late',
          diligence_gaps: 'disclose',
          nvca_spa: 'read',
          nvca_coi: 'read',
          nvca_ira: 'read',
          nvca_voting: 'read',
          nvca_rofr: 'read',
        };
        return early[current.sceneId];
      },
      (current) =>
        clausesFor(current.deal.variant)
          .filter((clause) => clause.scary && clause.id !== 'participating' && clause.id !== 'two-x')
          .map((clause) => clause.id),
    );
    expect(endingKind(state)).toBe('okay');
    expect(state.deal.closed).toBe(true);
    expect(state.missed83b).toBe(true);
    expect(state.flags.pete).toBe('ghost');
  });

  it('plays a bridge when you skip the lead', () => {
    const state = run(
      4,
      (current) =>
        sharedEarly(current, false, 'chase', 'reserve', 'warm', 'tight') ??
        ({ lead_hunt: 'party', party_round: 'bridge' } as Record<string, string>)[current.sceneId],
      () => [],
    );
    expect(endingKind(state)).toBe('bridge');
    expect(state.deal.closed).toBe(false);
    expect(state.safes.some((entry) => entry.id === 'bridge')).toBe(true);
    const bridge = state.safes.find((entry) => entry.id === 'bridge');
    const earlier = state.safes.find((entry) => entry.id === 'harbor');
    expect(bridge?.amount).toBe(400_000);
    expect(earlier && bridge).toBeTruthy();
  });

  it('runs out of runway when the pre-seed is small and slow', () => {
    const state = run(
      3,
      (current) => {
        const map: Record<string, string> = {
          napkin: 'wyoming',
          founder_stock: 'vest',
          eightyb: 'offsite',
          eightyb_day21: 'file',
          contractor: 'rewrite',
          pool: 'reserve',
          focus: 'build',
          targets: 'spray',
          deck: 'bloated',
          meeting_yes: 'open',
          meeting_coffee: 'decline',
          meeting_ghost: 'move-on',
          coffee_result: 'onward',
          safe_angel: 'offered',
          safe_result: 'send',
          form_d: 'delay',
          cap_table: 'sloppy',
          signatures: 'wait',
          preseed_wire: 'phone',
          time_jump: 'ship',
          burn_2: 'ship',
          burn_3: 'ship',
          cofounder_wobble: 'cliff',
          week_off: 'rest',
        };
        return map[current.sceneId];
      },
      () => [],
    );
    expect(endingKind(state)).toBe('runway');
    expect(state.flags.broke).toBe(true);
    expect(state.deal.closed).toBe(false);
  });
});

describe('replays', () => {
  it('reaches an ending from random choices', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      let state = createGame('fuzz', seed);
      for (let step = 0; step < 80 && state.sceneId !== 'ending'; step += 1) {
        const scene = getScene(state.sceneId);
        const roll = rngNext(state.rng);
        state = { ...state, rng: roll.next };
        if (scene.kind === 'redpen') {
          const clauses = clausesFor(state.deal.variant);
          state = submitRedpen(
            state,
            clauses.filter((_, index) => (roll.value + index) % 1 > 0.45).map((clause) => clause.id),
          );
          continue;
        }
        if (scene.kind === 'wire') {
          state = closeWire(state);
          continue;
        }
        const choices = sceneChoices(scene, state);
        expect(choices.length, state.sceneId).toBeGreaterThan(0);
        state = choose(state, choices[Math.floor(roll.value * choices.length)].id);
      }
      expect(state.sceneId, `seed ${seed} stuck on ${state.sceneId}`).toBe('ending');
    }
  });
});

describe('llc clock', () => {
  it('can reach the rushed 83(b) scene by cutting burn', () => {
    const state = run(
      5,
      (current) => {
        const map: Record<string, string> = {
          napkin: 'llc',
          llc_wall: 'friends',
          friends_round: 'take',
          form_d: 'file',
          contractor: 'later',
          deck: 'tight',
          time_jump: 'cut',
          burn_2: 'cut',
          burn_3: 'cut',
          cofounder_wobble: 'stay',
          week_off: 'rest',
          seed_llc_wall: 'convert',
          rushed_83b: 'file',
          lead_hunt: 'party',
          party_round: 'bridge',
        };
        return map[current.sceneId];
      },
      () => [],
    );
    expect(state.history.some((item) => item.scene === 'rushed_83b')).toBe(true);
  });
});

describe('saves', () => {
  it('round-trips a slot without calling a network', () => {
    const repo = new MemorySaveRepository();
    const state = createGame('slot-2', 9);
    repo.save(state);
    const loaded = repo.load('slot-2');
    expect(loaded?.sceneId).toBe('napkin');
    expect(repo.list()).toHaveLength(1);
    repo.delete('slot-2');
    expect(repo.load('slot-2')).toBeNull();
  });
});
