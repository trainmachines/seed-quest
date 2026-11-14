import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { annotateAcronyms } from '../data/acronyms';

const AcronymScopeContext = createContext<Set<string> | null>(null);

/** One first-use expansion per scene, document, or other block. */
export function AcronymScope({ children }: { children: ReactNode }) {
  const seen = new Set<string>();
  return <AcronymScopeContext.Provider value={seen}>{children}</AcronymScopeContext.Provider>;
}

export function AcronymText({
  text,
  expand = true,
  activateParent = false,
}: {
  text: string;
  /** Spell the acronym out the first time this scope sees it. Headings stay tight. */
  expand?: boolean;
  /** Let the click reach a parent tab. Choice rows keep the click on the acronym. */
  activateParent?: boolean;
}) {
  const scoped = useContext(AcronymScopeContext);
  const parts = annotateAcronyms(text, scoped ?? new Set(), expand && scoped != null);
  return (
    <>
      {parts.map((part, index) =>
        part.kind === 'text' ? (
          <span key={index}>{part.text}</span>
        ) : (
          <AcronymMark key={`${part.token}-${index}`} part={part} activateParent={activateParent} />
        ),
      )}
    </>
  );
}

function AcronymMark({
  part,
  activateParent,
}: {
  part: Extract<ReturnType<typeof annotateAcronyms>[number], { kind: 'acronym' }>;
  activateParent: boolean;
}) {
  const tipId = useId();
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const open = !suppressed && (hover || pinned);
  return (
    <>
      <button
        type="button"
        className="acronym"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={() => {
          setSuppressed(false);
          setHover(true);
        }}
        onMouseLeave={() => setHover(false)}
        onFocus={() => {
          setSuppressed(false);
          setHover(true);
        }}
        onBlur={() => {
          setHover(false);
          setPinned(false);
          setSuppressed(false);
        }}
        onClick={(event) => {
          event.preventDefault();
          if (!activateParent) event.stopPropagation();
          setSuppressed(false);
          setPinned((value) => !value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            if (!open) return;
            event.preventDefault();
            event.stopPropagation();
            setPinned(false);
            setHover(false);
            setSuppressed(true);
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            setSuppressed(false);
            setPinned((value) => !value);
          }
        }}
      >
        {part.shown}
        {open && (
          <span role="tooltip" id={tipId} className="acronym-tip">
            <strong>{part.token}</strong>
            <span>
              {part.expansion}. {part.plain} {part.why}
            </span>
          </span>
        )}
      </button>
      {part.spellOut && <span className="acronym-exp"> ({part.expansion})</span>}
    </>
  );
}
