import { useState } from 'react';
import { sheetClauses } from '../data/clauses';
import { computeCapTable, describeShuffle, money, pct, previewPricedRound } from '../engine/math';
import type { Choice, GameState } from '../engine/types';

export function StackReveal({ state }: { state: GameState }) {
  const full = computeCapTable(state);
  if (state.safes.length < 2) {
    const only = full.safeDetails[0];
    return (
      <div className="mechanic">
        <p className="formula">
          {only ? `${only.name}: ${money(only.amount)} ÷ ${money(only.cap)} = ${pct(only.pctPreRound)}` : 'No SAFE signed yet.'}
        </p>
        <p>A second post-money SAFE would leave that percent where it is and move the founders.</p>
      </div>
    );
  }
  const earlier = computeCapTable({
    ...state,
    safes: state.safes.slice(0, -1).map((safe, index) => ({ ...safe, order: index })),
  });
  const first = earlier.safeDetails[0];
  const same = full.safeDetails.find((safe) => safe.id === first.id);
  return (
    <div className="mechanic">
      <div className="compare">
        <Column title="Before the latest SAFE" table={earlier} />
        <Column title="After it stacks" table={full} mark={same && Math.abs(same.pctPreRound - first.pctPreRound) < 1e-9 ? first.id : undefined} />
      </div>
      {same && Math.abs(same.pctPreRound - first.pctPreRound) < 1e-9 && (
        <p className="formula">{first.name} stays at {pct(first.pctPreRound)}. Founders absorb the new SAFE.</p>
      )}
      {same && Math.abs(same.pctPreRound - first.pctPreRound) >= 1e-9 && (
        <p className="formula">{first.name} moved to {pct(same.pctPreRound)} because MFN copied a cheaper cap. That is not ordinary stacking.</p>
      )}
    </div>
  );
}

function Column({ title, table, mark }: { title: string; table: ReturnType<typeof computeCapTable>; mark?: string }) {
  return (
    <div>
      <h3>{title}</h3>
      <ul className="cap-rows">
        <li>
          <span>Founders</span>
          <strong>{pct(table.foundersPct)}</strong>
        </li>
        {table.safeDetails.map((safe) => (
          <li key={safe.id} className={safe.id === mark ? 'unchanged' : ''}>
            <span>{safe.name}</span>
            <strong>{pct(safe.pctNow)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShufflePreview({ state, choices, focusId }: { state: GameState; choices: Choice[]; focusId: string | null }) {
  const focused = choices.find((choice) => choice.id === focusId) ?? choices[0];
  const pool = focused?.deal?.poolTarget ?? state.deal.poolAsk ?? 0.1;
  const pre = state.deal.preMoney ?? 0;
  const invested = state.deal.newMoney ?? 0;
  const shuffle = describeShuffle(pre, invested, pool);
  const preview = previewPricedRound(state, pool);
  return (
    <div className="mechanic">
      <dl className="price-grid">
        <div>
          <dt>Headline pre-money</dt>
          <dd>{money(pre)}</dd>
        </div>
        <div>
          <dt>New money</dt>
          <dd>{money(invested)}</dd>
        </div>
        <div>
          <dt>Post-money</dt>
          <dd>{money(shuffle.post)}</dd>
        </div>
        <div>
          <dt>Pool inside the pre-money</dt>
          <dd>{pct(pool, 0)} · {money(shuffle.poolDollars)}</dd>
        </div>
        <div>
          <dt>Effective pre-money</dt>
          <dd>{money(shuffle.effectivePre)}</dd>
        </div>
        <div>
          <dt>Founders after the round</dt>
          <dd>{pct(preview.foundersPct, 1)}</dd>
        </div>
      </dl>
      <p className="formula">
        New investors own {pct(shuffle.newPct)} either way. They are not diluted by the pool. {money(shuffle.effectivePre)} = {money(pre)} − ({pct(pool, 0)} × {money(shuffle.post)}).
      </p>
    </div>
  );
}

export function RedPen({ state, onSubmit }: { state: GameState; onSubmit: (ids: string[]) => void }) {
  const clauses = sheetClauses(state);
  const [marked, setMarked] = useState<string[]>([]);
  function toggle(id: string) {
    setMarked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }
  return (
    <form
      className="mechanic"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(marked);
      }}
    >
      <ul className="clauses">
        {clauses.map((clause) => (
          <li key={clause.id}>
            <label>
              <input type="checkbox" checked={marked.includes(clause.id)} onChange={() => toggle(clause.id)} />
              <span>
                <strong>{clause.title}</strong>
                <span>{clause.text}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button type="submit" className="primary">
        Send the markup
      </button>
    </form>
  );
}

export function RedPenResult({ state }: { state: GameState }) {
  const entry = [...state.history].reverse().find((item) => item.choice.startsWith('redpen:'));
  const marked = entry ? entry.choice.replace('redpen:', '').split('+').filter(Boolean) : [];
  const clauses = sheetClauses(state);
  return (
    <ul className="result-list">
      {clauses.map((clause) => {
        const on = marked.includes(clause.id);
        const good = clause.scary ? on : !on;
        return (
          <li key={clause.id} className={good ? 'result-good' : 'result-cost'}>
            <strong>{on ? 'Marked' : 'Left in'}: {clause.title}</strong>
            <span>{clause.scary ? clause.whyScary : clause.whyNormal}</span>
          </li>
        );
      })}
    </ul>
  );
}

export interface WireItem {
  id: string;
  label: string;
  blocking: boolean;
  decoy?: boolean;
  done?: boolean;
  hint: string;
}

export function wireItems(state: GameState): WireItem[] {
  const nudged = state.history.some((item) => item.choice === 'nudge');
  const items: WireItem[] = [
    {
      id: 'cofounder',
      label: 'Co-founder signature on the Stock Purchase Agreement',
      blocking: true,
      done: nudged,
      hint: nudged ? 'They signed when you nudged the packet.' : 'DocuSign still says viewed. You waited on this one.',
    },
    { id: 'lead', label: 'Lead investor signature page is in', blocking: true, hint: 'The lead does not wire on a verbal yes.' },
    {
      id: 'charter',
      label: 'Amended and Restated Certificate of Incorporation is filed in Delaware',
      blocking: true,
      done: state.docs.includes('amended-coi'),
      hint: 'Preferred stock has to exist before the money moves.',
    },
    { id: 'consent', label: 'Board and stockholder consents are signed', blocking: true, hint: 'A Slack yes is not a consent.' },
    {
      id: 'funds',
      label: 'Funds-flow matches the wires, and you confirmed instructions by a phone number you already had',
      blocking: true,
      hint: 'Do not trust wire instructions that arrived only by email.',
    },
  ];
  if (state.flags.pete === 'ghost') {
    items.push({
      id: 'pete',
      label: 'Pete’s IP assignment is in the closing packet',
      blocking: true,
      hint: 'The repo still has Pete’s commits and no signature.',
    });
  }
  items.push({
    id: 'formd',
    label: 'Calendar reminder: Form D is due within 15 days of this sale',
    blocking: false,
    done: state.filedFormD,
    hint: 'This notice does not release the wire. Signatures do.',
  });
  items.push({
    id: 'fraud',
    label: 'New wire instructions from kindling-capital.co',
    blocking: false,
    decoy: true,
    hint: 'The real firm is not this domain. A lookalike email is a fraud.',
  });
  return items;
}

export function WireChecklist({
  state,
  onFail,
  onFraud,
  onClose,
}: {
  state: GameState;
  onFail: (missing: string[]) => void;
  onFraud: () => void;
  onClose: () => void;
}) {
  const items = wireItems(state);
  const [checked, setChecked] = useState<string[]>(items.filter((item) => item.done).map((item) => item.id));
  const [celebrating, setCelebrating] = useState(false);
  const [ready, setReady] = useState(false);
  const [misses, setMisses] = useState<string[]>([]);
  function toggle(id: string) {
    setChecked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }
  function release() {
    if (checked.includes('fraud')) {
      setMisses(['That email is not your bank.']);
      onFraud();
      setChecked((current) => current.filter((id) => id !== 'fraud'));
      return;
    }
    const missing = items.filter((item) => item.blocking && !checked.includes(item.id)).map((item) => item.label);
    if (missing.length) {
      setMisses(missing);
      onFail(missing);
      return;
    }
    setMisses([]);
    setCelebrating(true);
    window.setTimeout(() => setReady(true), 3200);
  }
  return (
    <form
      className="mechanic"
      onSubmit={(event) => {
        event.preventDefault();
        if (!celebrating) release();
      }}
    >
      <ul className="clauses">
        {items.map((item) => (
          <li key={item.id} className={item.decoy ? 'decoy' : misses.some((miss) => miss === item.label) ? 'result-cost' : ''}>
            <label>
              <input type="checkbox" checked={checked.includes(item.id)} onChange={() => toggle(item.id)} />
              <span>
                <strong>{item.label}</strong>
                {item.hint && <span>{item.hint}</span>}
                {item.decoy && <span>Do not treat this as a closing item.</span>}
                {!item.blocking && !item.decoy && <span>Does not hold the wire.</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {celebrating ? (
        <div className="wire-payoff" role="status">
          <div className="wire-track" aria-hidden="true">
            <span className="wire-dot" />
          </div>
          <p className="stamp">{ready ? 'Wire received' : 'Wire in transit'}</p>
          {ready ? (
            <button type="button" className="primary" onClick={onClose}>
              Count the money
            </button>
          ) : (
            <p>The bank is still moving the money.</p>
          )}
        </div>
      ) : (
        <button type="submit" className="primary">
          Release the wire
        </button>
      )}
    </form>
  );
}

export function ConversionMath({ state }: { state: GameState }) {
  const pool = state.deal.poolTarget ?? state.deal.poolAsk ?? 0.1;
  const preview = state.deal.preMoney && state.deal.newMoney ? previewPricedRound(state, pool) : computeCapTable(state);
  return (
    <div className="mechanic">
      <ul className="cap-rows">
        {preview.safeDetails.map((safe) => (
          <li key={safe.id}>
            <span>
              {safe.name} {money(safe.amount)} ÷ {money(safe.cap)} = {pct(safe.pctPreRound)} before the new money
              {preview.stage === 'post-round' ? `, then ${pct(safe.pctNow)} after it` : ''}
              {safe.homemade ? ' · this paper still needs a redo' : ''}
            </span>
          </li>
        ))}
      </ul>
      {preview.effectivePre != null && preview.headlinePre != null && (
        <p className="formula">
          Headline pre-money {money(preview.headlinePre)}. Effective pre-money {money(preview.effectivePre)} after the pool. New investors own {pct(preview.newMoneyPct)}.
        </p>
      )}
    </div>
  );
}
