import type { SpriteId } from '../engine/types';

export function Sprite({ id }: { id: SpriteId }) {
  return (
    <svg className="sprite" viewBox="0 0 16 16" role="img" aria-label={label(id)}>
      <rect width="16" height="16" fill="#1a1410" />
      {pixels(id)}
    </svg>
  );
}

function label(id: SpriteId): string {
  switch (id) {
    case 'founder':
      return 'Founder with a napkin';
    case 'counsel':
      return 'Counsel with a folder';
    case 'investor':
      return 'Investor';
    case 'pete':
      return 'Contractor with a backpack';
    case 'coffee':
      return 'Coffee cup';
    case 'ghost':
      return 'An unread email';
    case 'bank':
      return 'Bank';
    case 'wire':
      return 'Wire transfer';
    case 'sheet':
      return 'Cap table';
    default:
      return 'Document';
  }
}

function pixels(id: SpriteId) {
  const skin = '#f0c9a0';
  const ink = '#1a1410';
  const amber = '#ffbf47';
  const paper = '#f6edd8';
  const green = '#8fce6b';
  const blue = '#8fd0ff';
  if (id === 'coffee') {
    return (
      <>
        <rect x="5" y="4" width="6" height="2" fill={paper} />
        <rect x="4" y="6" width="8" height="6" fill={amber} />
        <rect x="12" y="7" width="2" height="3" fill={amber} />
        <rect x="6" y="12" width="4" height="1" fill={ink} />
      </>
    );
  }
  if (id === 'ghost') {
    return (
      <>
        <rect x="4" y="3" width="8" height="2" fill={paper} />
        <rect x="3" y="5" width="10" height="6" fill={paper} />
        <rect x="5" y="7" width="2" height="2" fill={ink} />
        <rect x="9" y="7" width="2" height="2" fill={ink} />
        <rect x="3" y="11" width="2" height="2" fill={paper} />
        <rect x="7" y="11" width="2" height="2" fill={paper} />
        <rect x="11" y="11" width="2" height="2" fill={paper} />
      </>
    );
  }
  if (id === 'bank' || id === 'wire') {
    return (
      <>
        <rect x="2" y="6" width="12" height="7" fill={blue} />
        <rect x="4" y="3" width="8" height="3" fill={paper} />
        <rect x="7" y="8" width="2" height="3" fill={ink} />
        <rect x="3" y="13" width="10" height="1" fill={amber} />
      </>
    );
  }
  if (id === 'sheet' || id === 'document') {
    return (
      <>
        <rect x="4" y="2" width="8" height="12" fill={paper} />
        <rect x="6" y="4" width="4" height="1" fill={ink} />
        <rect x="6" y="6" width="5" height="1" fill={amber} />
        <rect x="6" y="8" width="5" height="1" fill={green} />
        <rect x="6" y="10" width="3" height="1" fill={ink} />
      </>
    );
  }
  const shirt = id === 'investor' ? '#355c7d' : id === 'counsel' ? '#6b4c7a' : id === 'pete' ? '#3d6b4f' : '#c45c26';
  const hair = id === 'investor' ? ink : id === 'counsel' ? '#2a1c33' : id === 'pete' ? '#5a3a22' : '#3a2414';
  return (
    <>
      <rect x="5" y="1" width="6" height="2" fill={hair} />
      <rect x="4" y="2" width="2" height="2" fill={hair} />
      <rect x="10" y="2" width="2" height="2" fill={hair} />
      <rect x="5" y="3" width="6" height="4" fill={skin} />
      <rect x="6" y="4" width="1" height="1" fill={ink} />
      <rect x="9" y="4" width="1" height="1" fill={ink} />
      <rect x="7" y="6" width="2" height="1" fill="#a56b4a" />
      {id === 'investor' && (
        <>
          <rect x="5" y="4" width="6" height="1" fill="#1a1a1a" />
          <rect x="6" y="4" width="1" height="1" fill={blue} />
          <rect x="9" y="4" width="1" height="1" fill={blue} />
        </>
      )}
      <rect x="6" y="7" width="4" height="1" fill={skin} />
      <rect x="4" y="8" width="8" height="4" fill={shirt} />
      <rect x="3" y="8" width="1" height="3" fill={shirt} />
      <rect x="12" y="8" width="1" height="3" fill={shirt} />
      <rect x="5" y="12" width="2" height="3" fill={ink} />
      <rect x="9" y="12" width="2" height="3" fill={ink} />
      {id === 'founder' && <rect x="12" y="9" width="3" height="3" fill={paper} />}
      {id === 'pete' && <rect x="12" y="6" width="3" height="4" fill={amber} />}
      {id === 'counsel' && <rect x="12" y="8" width="3" height="4" fill={paper} />}
    </>
  );
}
