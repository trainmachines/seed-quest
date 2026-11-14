import { glossaryMap } from '../data/glossary';
import { documentMap } from '../data/documents';
import { computeCapTable, eightyThreeBStatus, formDStatus, money, pct, type CapTableResult } from '../engine/math';
import type { Delta, GameState } from '../engine/types';

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <p className={compact ? 'disclaimer compact' : 'disclaimer'}>
      Educational only. Not legal, tax, or investment advice. This is a fictional US example: a Delaware C-corp, YC-style
      post-money SAFEs, and NVCA model documents. Real deals need a lawyer.
    </p>
  );
}

export function Meters({ state }: { state: GameState }) {
  const table = computeCapTable(state);
  const b = eightyThreeBStatus(state);
  const formd = formDStatus(state);
  return (
    <aside className="meters" aria-label="Company meters">
      <Meter name="Runway" value={`${state.runway.toFixed(1)} mo`} width={Math.max(0, Math.min(100, (state.runway / 24) * 100))} tone={state.runway < 4 ? 'bad' : 'good'} />
      <Meter name="Founders" value={pct(table.foundersPct, 1)} width={Math.max(0, table.foundersPct * 100)} tone="amber" />
      <Meter name="Morale" value={`${Math.round(state.morale)}`} width={state.morale} tone={state.morale < 35 ? 'bad' : 'good'} />
      <Meter name="Reputation" value={`${Math.round(state.reputation)}`} width={state.reputation} tone="blue" />
      {b.kind !== 'inactive' && (
        <p className={`clock clock-${b.kind}`}>
          83(b) {b.kind === 'open' ? `day ${b.elapsed} of 30 · ${b.left} left` : b.kind === 'filed' ? 'filed' : 'missed'}
        </p>
      )}
      {formd.kind !== 'inactive' && (
        <p className={`clock clock-${formd.kind}`}>
          Form D {formd.kind === 'open' ? `${formd.left} days left` : formd.kind === 'filed' ? 'filed' : 'late'}
        </p>
      )}
    </aside>
  );
}

function Meter({ name, value, width, tone }: { name: string; value: string; width: number; tone: string }) {
  return (
    <div className="meter">
      <div className="meter-top">
        <span>{name}</span>
        <strong>{value}</strong>
      </div>
      <div className="meter-track" aria-hidden="true">
        <div className={`meter-fill tone-${tone}`} style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
      </div>
    </div>
  );
}

export function CapTablePanel({ state, highlight = false }: { state: GameState; highlight?: boolean }) {
  const table = computeCapTable(state);
  return (
    <div className={`cap-panel ${highlight ? 'cap-hot' : ''}`}>
      <div className="cap-head">
        <h2>Cap table</h2>
        <span className={table.totalDisplayed > 1.001 ? 'sum-bad' : 'sum-ok'}>
          {table.totalDisplayed > 1.001 ? `Shows ${pct(table.totalDisplayed, 0)}` : 'Sums to 100%'}
        </span>
      </div>
      <Stacked table={table} unchanged={state.lastDelta?.unchangedSafeIds ?? []} shifted={state.lastDelta?.shiftedSafeIds ?? []} />
      <ul className="cap-rows">
        <Row name="Founders" value={table.foundersPct} />
        {table.grantedPct > 0.0005 && <Row name="Granted" value={table.grantedPct} />}
        <Row name="Unissued pool" value={table.poolPct} />
        {table.safeDetails.map((safe) => (
          <li key={safe.id} className={rowClass(safe.id, state.lastDelta)}>
            <span>
              {safe.name}
              {safe.homemade ? ' · redo' : ''}
              <small>
                {' '}
                {money(safe.amount)} ÷ {money(safe.cap)}
                {safe.mfnApplied ? ' · MFN cap' : ''}
              </small>
            </span>
            <strong>{pct(safe.pctNow)}</strong>
          </li>
        ))}
        {table.newMoneyPct > 0 && <Row name="New investors" value={table.newMoneyPct} />}
        {table.offSheetPct > 0 && (
          <li className="off-sheet">
            <span>Advisor, off the sheet</span>
            <strong>{pct(table.offSheetPct)}</strong>
          </li>
        )}
      </ul>
      {table.effectivePre != null && table.headlinePre != null && table.postMoney != null && table.poolTarget != null && (
        <p className="effective">
          Effective pre-money {money(table.effectivePre)} = {money(table.headlinePre)} − ({pct(table.poolTarget, 0)} × {money(table.postMoney)})
        </p>
      )}
    </div>
  );
}

function Row({ name, value }: { name: string; value: number }) {
  return (
    <li>
      <span>{name}</span>
      <strong>{pct(value)}</strong>
    </li>
  );
}

function rowClass(id: string, delta: Delta | null): string {
  if (delta?.unchangedSafeIds.includes(id)) return 'unchanged';
  if (delta?.shiftedSafeIds.includes(id)) return 'shifted';
  return '';
}

export function Stacked({
  table,
  unchanged,
  shifted,
}: {
  table: CapTableResult;
  unchanged: string[];
  shifted: string[];
}) {
  const parts = [
    { key: 'founders', label: 'Founders', pct: table.foundersPct, className: 'seg-founders' },
    { key: 'granted', label: 'Granted', pct: table.grantedPct, className: 'seg-granted' },
    { key: 'pool', label: 'Pool', pct: table.poolPct, className: 'seg-pool' },
    ...table.safeDetails.map((safe) => ({
      key: safe.id,
      label: safe.name,
      pct: safe.pctNow,
      className: unchanged.includes(safe.id) ? 'seg-safe unchanged' : shifted.includes(safe.id) ? 'seg-safe shifted' : 'seg-safe',
    })),
    { key: 'new', label: 'New', pct: table.newMoneyPct, className: 'seg-new' },
  ].filter((part) => part.pct > 0.001);
  return (
    <div className="stack" aria-hidden="true">
      {parts.map((part) => (
        <div key={part.key} className={part.className} style={{ width: `${part.pct * 100}%` }} title={`${part.label} ${pct(part.pct)}`} />
      ))}
    </div>
  );
}

export function DeltaBanner({ delta }: { delta: Delta }) {
  const chips = [
    chip('Runway', delta.runway, ' mo', 0.05),
    chip('Founders', delta.founders * 100, ' pts', 0.05),
    chip('Morale', delta.morale, '', 0.5),
    chip('Reputation', delta.reputation, '', 0.5),
  ].filter(Boolean) as string[];
  return (
    <div className="delta" role="status">
      <div className="chips">
        {chips.map((item) => (
          <span key={item}>{item}</span>
        ))}
        {delta.unchangedSafeIds.length > 0 && <span className="chip-still">Earlier SAFE unchanged</span>}
        {delta.shiftedSafeIds.length > 0 && <span className="chip-shift">MFN moved a cap</span>}
      </div>
      <p>{delta.because}</p>
      {delta.docs.length > 0 && (
        <p className="loot-line">Data room + {delta.docs.slice(0, 4).map((id) => documentMap.get(id)?.name ?? id).join(', ')}{delta.docs.length > 4 ? ` and ${delta.docs.length - 4} more` : ''}</p>
      )}
    </div>
  );
}

function chip(label: string, value: number, suffix: string, epsilon: number): string | null {
  if (Math.abs(value) < epsilon) return null;
  const sign = value > 0 ? '+' : '−';
  const shown = Math.abs(value) >= 10 ? Math.abs(value).toFixed(0) : Math.abs(value).toFixed(1);
  return `${label} ${sign}${shown}${suffix}`;
}

export function LootModal({ state, onClose, onOpen }: { state: GameState; onClose: () => void; onOpen: (id: string) => void }) {
  const [primary, ...rest] = state.pendingLoot;
  const entry = primary ? glossaryMap.get(primary) : undefined;
  if (!entry) return null;
  return (
    <div className="modal-back" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="loot-title">
        <p className="kicker">Codex loot</p>
        <h2 id="loot-title">{entry.term}</h2>
        <p>{entry.definition}</p>
        {state.lastDelta && <DeltaBanner delta={{ ...state.lastDelta, docs: [], terms: [] }} />}
        {rest.length > 0 && (
          <p className="also">
            Also unlocked:{' '}
            {rest.map((id) => (
              <button key={id} type="button" className="text-button" onClick={() => onOpen(id)}>
                {glossaryMap.get(id)?.term ?? id}
              </button>
            ))}
          </p>
        )}
        <div className="row">
          <button type="button" className="primary" onClick={onClose} autoFocus>
            Stash it
          </button>
          <button type="button" onClick={() => onOpen(primary)}>
            Open glossary
          </button>
        </div>
      </div>
    </div>
  );
}
