import { useEffect, useMemo, useState } from 'react';
import { isMuted, loadMutePreference, playTone, setMuted } from './audio';
import { DataRoomScreen, EndingScreen, GlossaryScreen, PlayScreen, TitleScreen } from './components/Screens';
import { Disclaimer } from './components/Chrome';
import {
  choose,
  closeWire,
  createGame,
  dismissLoot,
  failWire,
  getScene,
  noteWireFraud,
  openScreen,
  sceneChoices,
  submitRedpen,
} from './engine/reducer';
import { browserSaves, type SaveRepository } from './engine/storage';
import type { GameState } from './engine/types';

export function App() {
  const repo = useMemo<SaveRepository>(() => browserSaves(), []);
  const [saves, setSaves] = useState<GameState[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    loadMutePreference();
    setSoundOn(!isMuted());
    setSaves(repo.list());
  }, [repo]);

  useEffect(() => {
    if (!state?.lastDelta) return;
    if (state.pendingLoot.length) playTone('loot');
    else if (state.sceneId === 'ending' && state.deal.closed) playTone('wire');
    else if (state.lastDelta.runway < -0.2 || state.lastDelta.morale < -2) playTone('bad');
    else playTone('blip');
  }, [state?.eventId]);

  function commit(next: GameState | null) {
    if (next) {
      repo.save(next);
      setSaves(repo.list());
    }
    setState(next);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!state) return;
        if (state.pendingLoot.length) commit(dismissLoot(state));
        else if (state.screen !== 'play') commit(openScreen(state, 'play'));
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'm' || event.key === 'M') {
        const turningOn = isMuted();
        setMuted(!turningOn);
        setSoundOn(turningOn);
        return;
      }
      if (!state) return;
      if (event.key === 'd' || event.key === 'D') {
        commit(openScreen(state, state.screen === 'dataroom' ? 'play' : 'dataroom'));
        return;
      }
      if (event.key === 'g' || event.key === 'G') {
        commit(openScreen(state, state.screen === 'glossary' ? 'play' : 'glossary'));
        return;
      }
      if (state.screen !== 'play' || state.pendingLoot.length || state.sceneId === 'ending') return;
      const scene = getScene(state.sceneId);
      if (scene.kind === 'redpen' || scene.kind === 'wire') return;
      const index = Number(event.key) - 1;
      const choices = sceneChoices(scene, state);
      if (index >= 0 && index < choices.length) {
        event.preventDefault();
        commit(choose(state, choices[index].id));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, repo]);

  function toggleSound() {
    const next = !soundOn;
    setMuted(!next);
    setSoundOn(next);
  }

  if (!state) {
    return (
      <TitleScreen
        saves={saves}
        onStart={(slotId) => commit(createGame(slotId, Math.floor(Math.random() * 1_000_000) + 1))}
        onContinue={(slotId) => {
          const loaded = repo.load(slotId);
          if (loaded) setState(loaded);
        }}
        onDelete={(slotId) => {
          repo.delete(slotId);
          setSaves(repo.list());
        }}
      />
    );
  }

  return (
    <>
      <header className="topbar">
        <button type="button" onClick={() => setState(null)}>
          Menu
        </button>
        <strong>Seed Quest</strong>
        <nav>
          <button type="button" onClick={() => commit(openScreen(state, 'dataroom'))}>
            Data room
          </button>
          <button type="button" onClick={() => commit(openScreen(state, 'glossary'))}>
            Glossary
          </button>
          <button type="button" onClick={toggleSound} aria-pressed={soundOn}>
            Sound {soundOn ? 'on' : 'off'}
          </button>
        </nav>
      </header>
      {state.screen === 'dataroom' && <DataRoomScreen state={state} onBack={() => commit(openScreen(state, 'play'))} />}
      {state.screen === 'glossary' && <GlossaryScreen state={state} onBack={() => commit(openScreen(state, 'play'))} />}
      {state.screen === 'play' && state.sceneId === 'ending' && (
        <EndingScreen
          state={state}
          onTitle={() => setState(null)}
          onData={() => commit(openScreen(state, 'dataroom'))}
          onTerm={(id) => commit(openScreen(state, 'glossary', id))}
        />
      )}
      {state.screen === 'play' && state.sceneId !== 'ending' && (
        <PlayScreen
          state={state}
          onChoose={(id) => commit(choose(state, id))}
          onRedpen={(ids) => commit(submitRedpen(state, ids))}
          onWireFail={(missing) => commit(failWire(state, missing))}
          onWireFraud={() => commit(noteWireFraud(state))}
          onWireClose={() => commit(closeWire(state))}
          onLootClose={() => commit(dismissLoot(state))}
          onOpenTerm={(id) => commit(openScreen({ ...state, pendingLoot: [] }, 'glossary', id))}
        />
      )}
      <footer>
        <Disclaimer compact />
      </footer>
    </>
  );
}
