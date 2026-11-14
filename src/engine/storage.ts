import { sceneMap } from '../data/scenes';
import type { GameState } from './types';

/**
 * SaveRepository is the only persistence boundary.
 * v1 ships a localStorage implementation with three slots.
 * A future account backend can implement the same interface and
 * upload an EndingScore for a leaderboard. Components should not
 * touch localStorage themselves.
 */
export interface SaveRepository {
  list(): GameState[];
  load(slotId: string): GameState | null;
  save(state: GameState): void;
  delete(slotId: string): void;
}

const KEY = 'seed-quest.saves.v1';

export class MemorySaveRepository implements SaveRepository {
  private slots = new Map<string, string>();

  list(): GameState[] {
    return [...this.slots.values()]
      .map((raw) => parseState(raw))
      .filter((state): state is GameState => state != null)
      .sort((a, b) => a.slotId.localeCompare(b.slotId));
  }

  load(slotId: string): GameState | null {
    const raw = this.slots.get(slotId);
    return raw ? parseState(raw) : null;
  }

  save(state: GameState): void {
    this.slots.set(state.slotId, JSON.stringify(state));
  }

  delete(slotId: string): void {
    this.slots.delete(slotId);
  }
}

export class LocalSaveRepository implements SaveRepository {
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {}

  list(): GameState[] {
    const raw = this.storage.getItem(KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== 'object') return [];
      return Object.values(parsed as Record<string, unknown>)
        .map((value) => (typeof value === 'string' ? parseState(value) : parseState(JSON.stringify(value))))
        .filter((state): state is GameState => state != null)
        .sort((a, b) => a.slotId.localeCompare(b.slotId));
    } catch {
      return [];
    }
  }

  load(slotId: string): GameState | null {
    return this.list().find((state) => state.slotId === slotId) ?? null;
  }

  save(state: GameState): void {
    const all = readMap(this.storage);
    all[state.slotId] = state;
    this.storage.setItem(KEY, JSON.stringify(all));
  }

  delete(slotId: string): void {
    const all = readMap(this.storage);
    delete all[stateKey(slotId)];
    delete all[slotId];
    this.storage.setItem(KEY, JSON.stringify(all));
  }
}

function stateKey(slotId: string): string {
  return slotId;
}

function readMap(storage: Pick<Storage, 'getItem'>): Record<string, GameState> {
  const raw = storage.getItem(KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Record<string, GameState>;
  } catch {
    return {};
  }
}

function parseState(raw: string): GameState | null {
  try {
    const value = JSON.parse(raw) as GameState;
    if (!value || value.version !== 1 || typeof value.slotId !== 'string' || typeof value.sceneId !== 'string') {
      return null;
    }
    if (!sceneMap.has(value.sceneId)) return null;
    return value;
  } catch {
    return null;
  }
}

export function browserSaves(): SaveRepository {
  return new LocalSaveRepository(window.localStorage);
}

export const SLOT_IDS = ['slot-1', 'slot-2', 'slot-3'] as const;
