import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../engine/achievements';
import { endingKind, greatBlockers } from '../engine/flow';
import { computeCapTable, money, pct } from '../engine/math';
import { getScene, sceneBody, sceneChoices } from '../engine/reducer';
import { scoreGame } from '../engine/score';
import { SLOT_IDS } from '../engine/storage';
import type { GameState } from '../engine/types';
import { DOCUMENTS, FOLDERS } from '../data/documents';
import { GLOSSARY, glossaryMap } from '../data/glossary';
import { untakenPaths } from '../data/paths';
import { CapTablePanel, DeltaBanner, Disclaimer, LootModal, Meters } from './Chrome';
import { ConversionMath, RedPen, RedPenResult, ShufflePreview, StackReveal, WireChecklist } from './Mechanics';
import { Sprite } from './Sprites';

export function TitleScreen({
  saves,
  onStart,
  onContinue,
  onDelete,
}: {
  saves: GameState[];
  onStart: (slotId: string) => void;
  onContinue: (slotId: string) => void;
  onDelete: (slotId: string) => void;
}) {
  return (
    <main className="title-screen">
      <p className="kicker">A fundraising adventure</p>
      <h1>Seed Quest</h1>
      <p className="subtitle">From Napkin to Wire</p>
      <Sprite id="founder" />
      <p className="lede">
        Four meters. Real documents. A pre-seed, then a priced seed. Choices move the numbers, and a few of them come due in diligence.
      </p>
      <ol className="slots">
        {SLOT_IDS.map((slotId, index) => {
          const save = saves.find((item) => item.slotId === slotId) ?? null;
          return (
            <li key={slotId}>
              {save ? (
                <>
                  <button type="button" className="primary" onClick={() => onContinue(slotId)}>
                    Slot {index + 1}: {save.sceneId === 'ending' ? 'Debrief' : save.sceneId.replaceAll('_', ' ')} · {save.runway.toFixed(1)} mo
                  </button>
                  <button type="button" onClick={() => onStart(slotId)}>
                    New run
                  </button>
                  <button type="button" onClick={() => onDelete(slotId)}>
                    Delete
                  </button>
                </>
              ) : (
                <button type="button" className="primary" onClick={() => onStart(slotId)}>
                  Slot {index + 1}: Start
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <p className="keys">Keys 1–9 choose. D data room. G glossary. Esc back. M sound.</p>
      <Disclaimer />
    </main>
  );
}

export function PlayScreen({
  state,
  onChoose,
  onRedpen,
  onWireFail,
  onWireClose,
  onLootClose,
  onOpenTerm,
}: {
  state: GameState;
  onChoose: (id: string) => void;
  onRedpen: (ids: string[]) => void;
  onWireFail: (missing: string[]) => void;
  onWireClose: () => void;
  onLootClose: () => void;
  onOpenTerm: (id: string) => void;
}) {
  const scene = getScene(state.sceneId);
  const choices = sceneChoices(scene, state);
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    setFocusId(null);
  }, [state.eventId]);
  const showLoot = state.pendingLoot.length > 0 && state.sceneId !== 'ending';
  return (
    <div className="play">
      <div className="play-top">
        <Meters state={state} />
        <CapTablePanel state={state} highlight={state.sceneId === 'safe_result' || state.sceneId === 'pool_shuffle'} />
      </div>
      <article className={`story tone-${scene.tone ?? 'neutral'}`} aria-labelledby="scene-title">
        <p className="kicker">
          Act {scene.act} · {scene.act === 1 ? 'Pre-seed' : 'Seed'}
          {scene.kicker ? ` · ${scene.kicker}` : ''}
        </p>
        <div className="story-head">
          <Sprite id={scene.sprite} />
          <h1 id="scene-title" tabIndex={-1}>
            {scene.title}
          </h1>
        </div>
        {state.lastDelta && !showLoot && <DeltaBanner delta={state.lastDelta} />}
        <p className="body-copy">{sceneBody(scene, state)}</p>
        {scene.kind === 'stack' && <StackReveal state={state} />}
        {scene.kind === 'shuffle' && <ShufflePreview state={state} choices={choices} focusId={focusId} />}
        {scene.kind === 'conversion' && <ConversionMath state={state} />}
        {scene.id === 'redpen_result' && <RedPenResult state={state} />}
        {scene.kind === 'redpen' && <RedPen state={state} onSubmit={onRedpen} />}
        {scene.kind === 'wire' && <WireChecklist onFail={onWireFail} onClose={onWireClose} />}
        {scene.kind === 'ending' ? null : (
          <ol className="choices">
            {choices.map((choice, index) => (
              <li key={choice.id}>
                <button
                  type="button"
                  className="choice"
                  onClick={() => onChoose(choice.id)}
                  onFocus={() => setFocusId(choice.id)}
                  onMouseEnter={() => setFocusId(choice.id)}
                >
                  <span className="num">{index + 1}</span>
                  <span>{choice.label}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </article>
      {showLoot && <LootModal state={state} onClose={onLootClose} onOpen={onOpenTerm} />}
    </div>
  );
}

export function DataRoomScreen({ state, onBack }: { state: GameState; onBack: () => void }) {
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState<(typeof FOLDERS)[number] | 'All'>('All');
  const needle = query.trim().toLowerCase();
  const docs = DOCUMENTS.filter((doc) => {
    if (folder !== 'All' && doc.folder !== folder) return false;
    if (!needle) return true;
    return `${doc.name} ${doc.what} ${doc.why} ${doc.gotcha}`.toLowerCase().includes(needle);
  });
  const collected = DOCUMENTS.filter((doc) => state.docs.includes(doc.id)).length;
  return (
    <main className="reference">
      <header className="ref-head">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <div>
          <p className="kicker">Data room</p>
          <h1>What a pre-seed and seed room holds</h1>
          <p>
            {collected} of {DOCUMENTS.length} collected. Missing critical documents slow Act 2 diligence. The rest are here so you can see the whole room.
          </p>
        </div>
      </header>
      <div className="ref-tools">
        <label>
          Search
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="SAFE, 83(b), charter…" />
        </label>
        <div className="folders" role="tablist">
          <button type="button" className={folder === 'All' ? 'on' : ''} onClick={() => setFolder('All')}>
            All
          </button>
          {FOLDERS.map((name) => (
            <button key={name} type="button" className={folder === name ? 'on' : ''} onClick={() => setFolder(name)}>
              {name}
            </button>
          ))}
        </div>
      </div>
      <ul className="doc-list">
        {docs.map((doc) => {
          const have = state.docs.includes(doc.id);
          return (
            <li key={doc.id} className={have ? 'have' : 'missing'}>
              <div className="doc-top">
                <h2>{doc.name}</h2>
                <span>{have ? 'Collected' : 'Missing'}</span>
              </div>
              <p className="meta">
                {doc.folder} · {doc.round}
                {doc.critical ? ' · Critical' : ''}
              </p>
              <p>
                <strong>What it is. </strong>
                {doc.what}
              </p>
              <p>
                <strong>Why investors ask. </strong>
                {doc.why}
              </p>
              <p>
                <strong>Used for. </strong>
                {doc.usedFor}
              </p>
              <p>
                <strong>Gotcha. </strong>
                {doc.gotcha}
              </p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export function GlossaryScreen({ state, onBack }: { state: GameState; onBack: () => void }) {
  const [query, setQuery] = useState('');
  const unlocked = GLOSSARY.filter((entry) => state.terms.includes(entry.id));
  const shown = unlocked.filter((entry) => `${entry.term} ${entry.definition}`.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    if (!state.glossaryFocus) return;
    document.getElementById(`term-${state.glossaryFocus}`)?.scrollIntoView({ block: 'start' });
  }, [state.glossaryFocus]);
  return (
    <main className="reference">
      <header className="ref-head">
        <button type="button" onClick={onBack}>
          Back
        </button>
        <div>
          <p className="kicker">Glossary / codex</p>
          <h1>Terms you have actually met</h1>
          <p>
            {unlocked.length} unlocked. {GLOSSARY.length - unlocked.length} still out in the world, waiting for a scene.
          </p>
        </div>
      </header>
      <label>
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="cap, preference, SAFE…" />
      </label>
      <ul className="doc-list">
        {shown.map((entry) => (
          <li key={entry.id} id={`term-${entry.id}`} className={state.glossaryFocus === entry.id ? 'have' : ''}>
            <h2>{entry.term}</h2>
            <p>{entry.definition}</p>
            <p>
              <strong>Why it matters. </strong>
              {entry.why}
            </p>
            <p>
              <strong>Example. </strong>
              {entry.example}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function EndingScreen({
  state,
  onTitle,
  onData,
  onTerm,
}: {
  state: GameState;
  onTitle: () => void;
  onData: () => void;
  onTerm: (id: string) => void;
}) {
  const kind = endingKind(state);
  const score = scoreGame(state);
  const table = computeCapTable(state);
  const paths = untakenPaths(state).slice(0, 6);
  const blockers = kind === 'okay' ? greatBlockers(state) : [];
  return (
    <main className="ending">
      {state.deal.closed && <p className="stamp">Wire received</p>}
      {kind === 'bridge' && <p className="stamp alt">Bridge wired</p>}
      <p className="kicker">{kindLabel(kind)}</p>
      <h1>{kindTitle(kind)}</h1>
      <p className="lede">{kindCopy(kind, state)}</p>
      {state.failReason && <p className="fail-reason">{state.failReason}</p>}
      <ol className="grades">
        {score.grades.map((grade) => (
          <li key={grade.meter}>
            <strong>
              {grade.meter} · {grade.letter}
            </strong>
            <span>{grade.detail}</span>
          </li>
        ))}
      </ol>
      <p className="score-total">Score {score.total}</p>
      <CapTablePanel state={state} />
      <TermChips state={state} />
      {blockers.length > 0 && (
        <p className="fine">
          This close is real. It is not the great-round ending because of: {blockers.join(', ')}.
        </p>
      )}
      <section>
        <h2>Roads you did not take</h2>
        <ul className="paths">
          {paths.map((path) => (
            <li key={path.id}>
              <button type="button" onClick={() => onTerm(path.glossaryId)}>
                {path.title}
              </button>
              <p>
                {path.lesson}{' '}
                <button type="button" className="text-button" onClick={() => onTerm(path.glossaryId)}>
                  {glossaryMap.get(path.glossaryId)?.term ?? 'Glossary'}
                </button>
              </p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Badges</h2>
        <ul className="badges">
          {ACHIEVEMENTS.filter((badge) => state.achievements.includes(badge.id)).map((badge) => (
            <li key={badge.id}>
              <strong>{badge.name}</strong>
              <span>{badge.description}</span>
            </li>
          ))}
        </ul>
      </section>
      <p className="fine">
        Founders {pct(table.foundersPct, 1)}
        {table.postMoney ? ` · post-money ${money(table.postMoney)}` : ''}
        {table.effectivePre ? ` · effective pre-money ${money(table.effectivePre)}` : ''}
      </p>
      <div className="row">
        <button type="button" className="primary" onClick={onTitle}>
          Title
        </button>
        <button type="button" onClick={onData}>
          Data room
        </button>
      </div>
      <Disclaimer />
    </main>
  );
}

function TermChips({ state }: { state: GameState }) {
  const chips: string[] = [];
  if (state.deal.liqPref === '1x-p') chips.push('Participating preference is still in. They get paid back and then share again.');
  if (state.deal.liqPref === '2x-np') chips.push('2x preference is still in. They take twice their money before common.');
  if (state.deal.liqPref === '1x-np' && state.deal.closed) chips.push('Liquidation preference: 1x non-participating, the seed norm.');
  if (state.deal.antidilution === 'full-ratchet') chips.push('Full ratchet is still in. A cheap later share can reprice this round.');
  if (state.deal.antidilution === 'bbwa' && state.deal.closed) chips.push('Anti-dilution: broad-based weighted average.');
  if (state.deal.board === 'investor-control') chips.push('Investors appoint 2 of 3 directors. That is control.');
  if (state.deal.protective === 'hire-veto') chips.push('Preferred can veto ordinary hires. That is not a standard protective provision.');
  if (state.missed83b) chips.push('The 83(b) was missed. Vesting can be taxed later, at a higher value.');
  if (state.flags.pete === 'ghost') chips.push('Pete never assigned the prototype. The IP rep is not clean.');
  if (state.safes.some((safe) => safe.sideLetter)) chips.push('A pro rata side letter survived into this round.');
  if (state.safes.some((safe) => safe.mfn)) chips.push('An MFN clause is still in a SAFE.');
  if (!chips.length) return null;
  return (
    <ul className="flags">
      {chips.map((chip) => (
        <li key={chip}>{chip}</li>
      ))}
    </ul>
  );
}

function kindLabel(kind: ReturnType<typeof endingKind>): string {
  if (kind === 'great') return 'Great round';
  if (kind === 'okay') return 'Okay round';
  if (kind === 'bridge') return 'Bridge round';
  return 'Out of runway';
}

function kindTitle(kind: ReturnType<typeof endingKind>): string {
  if (kind === 'great') return 'The wire is in';
  if (kind === 'okay') return 'You closed';
  if (kind === 'bridge') return 'The bridge is in';
  return 'The months ran out';
}

function kindCopy(kind: ReturnType<typeof endingKind>, state: GameState): string {
  if (kind === 'great') {
    return 'You closed a priced seed on market terms: 1x non-participating, broad-based weighted average, a balanced board, and a data room that matched the story.';
  }
  if (kind === 'okay') {
    return 'The company is funded. A clause, a document, or the pool came due along the way. The cap table is the honest recap, not a trophy case.';
  }
  if (kind === 'bridge') {
    return 'You bought time with another post-money SAFE. Earlier SAFE percents stayed put. Founders took the dilution. There is still no lead and no NVCA closing.';
  }
  return state.failReason ?? 'Runway hit zero before a closing wire. A verbal yes never replaced cash.';
}
