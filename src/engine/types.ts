export type SpriteId =
  | 'founder'
  | 'counsel'
  | 'investor'
  | 'pete'
  | 'coffee'
  | 'document'
  | 'bank'
  | 'ghost'
  | 'sheet'
  | 'wire';

export type SceneKind = 'story' | 'stack' | 'shuffle' | 'redpen' | 'wire' | 'conversion' | 'ending';

export type Screen = 'play' | 'dataroom' | 'glossary';

export interface Flags {
  entity: 'unknown' | 'delaware' | 'llc' | 'wyoming';
  startedAsLlc: boolean;
  counsel: 'none' | 'pro' | 'service' | 'template';
  vesting: 'unknown' | 'standard' | 'none';
  pete: 'unknown' | 'signed' | 'rewrite' | 'ghost';
  hired: boolean;
  build: boolean;
  list: 'none' | 'warm' | 'spray';
  deck: 'none' | 'tight' | 'bloated';
  meeting: 'yes' | 'coffee' | 'ghost';
  coffeeLead: boolean;
  declinedCoffee: boolean;
  advisor: 'none' | 'in-pool' | 'off-sheet' | 'issued-late';
  sloppySheet: boolean;
  fastSheet: boolean;
  messyDocs: boolean;
  disclosedGaps: boolean;
  broke: boolean;
  redPenPerfect: boolean;
  wireDelayed: boolean;
  fundArrived: boolean;
  waitedFund: boolean;
  foughtStandard: boolean;
  skimCount: number;
  ipIndemnity: boolean;
}

export interface Deal {
  preMoney: number | null;
  newMoney: number | null;
  poolAsk: number | null;
  poolTarget: number | null;
  variant: 'A' | 'B' | null;
  liqPref: 'unset' | '1x-np' | '1x-p' | '2x-np';
  antidilution: 'unset' | 'bbwa' | 'full-ratchet';
  board: 'unset' | 'balanced' | 'investor-control';
  protective: 'unset' | 'standard' | 'hire-veto';
  closed: boolean;
  bridge: boolean;
}

export interface SafeNote {
  id: string;
  name: string;
  amount: number;
  cap: number;
  mfn: boolean;
  sideLetter: boolean;
  homemade: boolean;
  order: number;
}

export interface Effects {
  runway?: number;
  morale?: number;
  reputation?: number;
  advanceDays?: number;
  issueStock?: boolean;
  file83b?: boolean;
  noteFirstSale?: boolean;
  fileFormD?: boolean;
  forceMissFormD?: boolean;
  safes?: Array<Omit<SafeNote, 'order'>>;
  shares?: { founders?: number; granted?: number; pool?: number };
  bankNewSafes?: boolean;
  bankRound?: boolean;
}

export interface Choice {
  id: string;
  label: string;
  because: string;
  effects?: Effects;
  flags?: Partial<Flags>;
  deal?: Partial<Deal>;
  docs?: string[];
  terms?: string[];
  /** Mutate the already-copied draft. Used for pricing, waivers, and share grants. */
  resolve?: (state: GameState) => GameState;
  next: string | ((state: GameState) => string);
  destinations?: string[];
}

export interface Scene {
  id: string;
  act: 1 | 2;
  title: string;
  kicker?: string;
  tone?: 'neutral' | 'consequence' | 'win';
  sprite: SpriteId;
  body: string | ((state: GameState) => string);
  termsOnEnter?: string[];
  docsOnEnter?: string[];
  choices?: Choice[] | ((state: GameState) => Choice[]);
  kind?: SceneKind;
}

export interface Delta {
  runway: number;
  morale: number;
  reputation: number;
  founders: number;
  because: string;
  docs: string[];
  terms: string[];
  unchangedSafeIds: string[];
  shiftedSafeIds: string[];
}

export interface GameState {
  version: 1;
  slotId: string;
  seed: number;
  rng: number;
  sceneId: string;
  screen: Screen;
  day: number;
  stockIssuedDay: number | null;
  firstSaleDay: number | null;
  filed83b: boolean;
  missed83b: boolean;
  filedFormD: boolean;
  missedFormD: boolean;
  runway: number;
  morale: number;
  reputation: number;
  foundersShares: number;
  grantedShares: number;
  poolShares: number;
  unbanked: number;
  flags: Flags;
  deal: Deal;
  safes: SafeNote[];
  docs: string[];
  terms: string[];
  history: { scene: string; choice: string }[];
  achievements: string[];
  pendingLoot: string[];
  lastDelta: Delta | null;
  failReason: string | null;
  eventId: number;
  updatedAt: string;
  glossaryFocus: string | null;
}

export function defaultFlags(): Flags {
  return {
    entity: 'unknown',
    startedAsLlc: false,
    counsel: 'none',
    vesting: 'unknown',
    pete: 'unknown',
    hired: false,
    build: false,
    list: 'none',
    deck: 'none',
    meeting: 'yes',
    coffeeLead: false,
    declinedCoffee: false,
    advisor: 'none',
    sloppySheet: false,
    fastSheet: false,
    messyDocs: false,
    disclosedGaps: false,
    broke: false,
    redPenPerfect: false,
    wireDelayed: false,
    fundArrived: false,
    waitedFund: false,
    foughtStandard: false,
    skimCount: 0,
    ipIndemnity: false,
  };
}

export function defaultDeal(): Deal {
  return {
    preMoney: null,
    newMoney: null,
    poolAsk: null,
    poolTarget: null,
    variant: null,
    liqPref: 'unset',
    antidilution: 'unset',
    board: 'unset',
    protective: 'unset',
    closed: false,
    bridge: false,
  };
}
