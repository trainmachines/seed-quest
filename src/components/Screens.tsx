import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../engine/achievements';
import { blockerBlurb, endingKind, greatBlockers } from '../engine/flow';
import { computeCapTable, money, pct } from '../engine/math';
import { getScene, sceneBody, sceneChoices } from '../engine/reducer';
import { scoreGame } from '../engine/score';
import { SLOT_IDS } from '../engine/storage';
import type { GameState } from '../engine/types';
import { DOCUMENTS, FOLDERS } from '../data/documents';
import { GLOSSARY, glossaryMap } from '../data/glossary';
import { untakenPaths } from '../data/paths';
import { ACRONYMS } from '../data/acronyms';
import { CapTablePanel, DeltaBanner, Disclaimer, LootModal, Meters } from './Chrome';
import { ConversionMath, RedPen, RedPenResult, ShufflePreview, StackReveal, WireChecklist } from './Mechanics';
import { Sprite } from './Sprites';
import { AcronymScope, AcronymText } from './AcronymText';

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
        <AcronymText text="Four meters. Real documents. A pre-seed, then a priced seed. Choices move the numbers, and a few of them come due in diligence." />
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
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Replace this save with a new run?')) onStart(slotId);
                    }}
                  >
                    New run
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this save?')) onDelete(slotId);
                    }}
                  >
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
  onWireFraud,
  onWireClose,
  onLootClose,
  onOpenTerm,
}: {
  state: GameState;
  onChoose: (id: string) => void;
  onRedpen: (ids: string[]) => void;
  onWireFail: (missing: string[]) => void;
  onWireFraud: () => void;
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
  const kicker = `Act ${scene.act} · ${scene.act === 1 ? 'Pre-seed' : 'Seed'}${scene.kicker ? ` · ${scene.kicker}` : ''}`;
  return (
    <div className="play">
      <div className="play-top">
        <Meters state={state} />
        <CapTablePanel state={state} highlight={state.sceneId === 'safe_result' || state.sceneId === 'pool_shuffle'} />
      </div>
      <AcronymScope>
      <article className={`story tone-${scene.tone ?? 'neutral'}`} aria-labelledby="scene-title">
        <p className="kicker">
          <AcronymText text={kicker} expand={false} />
        </p>
        <div className="story-head">
          <Sprite id={scene.sprite} />
          <h1 id="scene-title" tabIndex={-1}>
            <AcronymText text={scene.title} expand={false} />
          </h1>
        </div>
        {state.lastDelta && !showLoot && <DeltaBanner delta={state.lastDelta} />}
        <p className="body-copy">
          <AcronymText text={sceneBody(scene, state)} />
        </p>
        {scene.kind === 'stack' && <StackReveal state={state} />}
        {scene.kind === 'shuffle' && <ShufflePreview state={state} choices={choices} focusId={focusId} />}
        {scene.kind === 'conversion' && <ConversionMath state={state} />}
        {scene.id === 'redpen_result' && <RedPenResult state={state} />}
        {scene.kind === 'redpen' && <RedPen state={state} onSubmit={onRedpen} />}
        {scene.kind === 'wire' && (
          <WireChecklist state={state} onFail={onWireFail} onFraud={onWireFraud} onClose={onWireClose} />
        )}
        {scene.kind === 'ending' ? null : (
          <ol className="choices">
            {choices.map((choice, index) => (
              <li key={choice.id}>
                <div
                  className="choice"
                  role="button"
                  tabIndex={0}
                  onClick={() => onChoose(choice.id)}
                  onFocus={() => setFocusId(choice.id)}
                  onMouseEnter={() => setFocusId(choice.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onChoose(choice.id);
                    }
                  }}
                >
                  <span className="num">{index + 1}</span>
                  <span>
                    <AcronymText text={choice.label} />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </article>
      </AcronymScope>
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
            <div
              key={name}
              role="tab"
              tabIndex={0}
              aria-selected={folder === name}
              className={folder === name ? 'tab on' : 'tab'}
              onClick={() => setFolder(name)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFolder(name);
                }
              }}
            >
              <AcronymText text={name} expand={false} activateParent />
            </div>
          ))}
        </div>
      </div>
      <ul className="doc-list">
        {docs.map((doc) => {
          const have = state.docs.includes(doc.id);
          return (
            <li key={doc.id} className={have ? 'have' : 'missing'}>
              <AcronymScope>
              <div className="doc-top">
                <h2>
                  <AcronymText text={doc.name} expand={false} />
                </h2>
                <span>{have ? 'Collected' : 'Missing'}</span>
              </div>
              <p className="meta">
                <AcronymText text={`${doc.folder} · ${doc.round}${doc.critical ? ' · Critical' : ''}`} expand={false} />
              </p>
              <p>
                <strong>What it is. </strong>
                <AcronymText text={doc.what} />
              </p>
              <p>
                <strong>Why investors ask. </strong>
                <AcronymText text={doc.why} />
              </p>
              <p>
                <strong>Used for. </strong>
                <AcronymText text={doc.usedFor} />
              </p>
              <p>
                <strong>Gotcha. </strong>
                <AcronymText text={doc.gotcha} />
              </p>
              </AcronymScope>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

export function GlossaryScreen({ state, onBack }: { state: GameState; onBack: () => void }) {
  const [query, setQuery] = useState('');
  const needle = query.trim().toLowerCase();
  const acronymIds = new Set(ACRONYMS.map((item) => item.id));
  const story = GLOSSARY.filter((entry) => !acronymIds.has(entry.id));
  const unlocked = story.filter((entry) => state.terms.includes(entry.id));
  const shown = unlocked.filter((entry) => `${entry.term} ${entry.definition} ${entry.why}`.toLowerCase().includes(needle));
  const acronyms = ACRONYMS.filter((item) => `${item.token} ${item.expansion} ${item.plain} ${item.why}`.toLowerCase().includes(needle));
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
            {unlocked.length} unlocked. {story.length - unlocked.length} still out in the world, waiting for a scene.
          </p>
        </div>
      </header>
      <label>
        Search
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="cap, preference, SAFE…" />
      </label>
      <h2>Acronyms</h2>
      <p>Spelled out for a first read. The same words in the story can be tapped, focused, or hovered.</p>
      <ul className="doc-list">
        {acronyms.map((item) => {
          const entry = glossaryMap.get(item.id);
          return (
            <li key={item.id} id={`term-${item.id}`} className={state.glossaryFocus === item.id ? 'have' : ''}>
              <AcronymScope>
                <h2>
                  <AcronymText text={item.token} expand={false} />
                  {state.terms.includes(item.id) ? ' · met' : ''}
                </h2>
                <p>
                  <AcronymText text={entry?.definition ?? `${item.expansion}. ${item.plain}`} />
                </p>
                <p>
                  <strong>Why it matters. </strong>
                  <AcronymText text={entry?.why ?? item.why} />
                </p>
                <p>
                  <strong>Example. </strong>
                  <AcronymText text={entry?.example ?? item.example} />
                </p>
              </AcronymScope>
            </li>
          );
        })}
      </ul>
      <h2>From your run</h2>
      <ul className="doc-list">
        {shown.map((entry) => (
          <li key={entry.id} id={`term-${entry.id}`} className={state.glossaryFocus === entry.id ? 'have' : ''}>
            <AcronymScope>
              <h2>
                <AcronymText text={entry.term} expand={false} />
              </h2>
              <p>
                <AcronymText text={entry.definition} />
              </p>
              <p>
                <strong>Why it matters. </strong>
                <AcronymText text={entry.why} />
              </p>
              <p>
                <strong>Example. </strong>
                <AcronymText text={entry.example} />
              </p>
            </AcronymScope>
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
    <AcronymScope>
    <main className="ending">
      {state.deal.closed && <p className="stamp">Wire received</p>}
      {kind === 'bridge' && <p className="stamp alt">Bridge wired</p>}
      <p className="kicker">{kindLabel(kind)}</p>
      <h1>{kindTitle(kind)}</h1>
      <p className="lede">
        <AcronymText text={kindCopy(kind, state)} />
      </p>
      {state.failReason && (
        <p className="fail-reason">
          <AcronymText text={state.failReason} />
        </p>
      )}
      <ol className="grades">
        {score.grades.map((grade) => (
          <li key={grade.meter}>
            <strong>
              {grade.meter} · {grade.letter}
            </strong>
            <span>
              <AcronymText text={grade.detail} />
            </span>
          </li>
        ))}
      </ol>
      <p className="score-total">
        Score {score.total} · grades {score.parts.grades} + docs {score.parts.docs} + badges {score.parts.badges} + ending {score.parts.bonus}
      </p>
      <CapTablePanel state={state} />
      <TermChips state={state} />
      {blockers.length > 0 && (
        <div className="fine">
          <p>This close is real. It is not the great-round ending because:</p>
          <ul>
            {blockers.slice(0, 3).map((id) => (
              <li key={id}>
                <AcronymText text={blockerBlurb(id)} />
              </li>
            ))}
          </ul>
          {blockers.length > 3 && <p>And {blockers.length - 3} more.</p>}
        </div>
      )}
      <section>
        <h2>Roads you did not take</h2>
        <ul className="paths">
          {paths.map((path) => (
            <li key={path.id}>
              <p>
                <AcronymText text={path.title} />
              </p>
              <p>
                <AcronymText text={path.lesson} />{' '}
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
              <span>
                <AcronymText text={badge.description} />
              </span>
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
    </AcronymScope>
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
        <li key={chip}>
          <AcronymText text={chip} />
        </li>
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
