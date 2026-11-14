import { BALANCE } from '../engine/balance';
import { DILIGENCE_CHAIN, gapDocIds, nextDiligence, routeAfterTimeJump, routeToTermSheet } from '../engine/flow';
import { angelOffer, fundOffer, hasFund, offerScore, rollCoffee, rollMeeting } from '../engine/offers';
import type { Choice, GameState, Scene } from '../engine/types';
import { PREPARABLE_DOC_IDS } from './documents';

const CORPORATE = ['coi', 'bylaws', 'incorporator', 'board-consent', 'stockholder-consent', 'good-standing', 'minute-book'];

function after(from: string): string[] {
  const index = DILIGENCE_CHAIN.indexOf(from as (typeof DILIGENCE_CHAIN)[number]);
  return DILIGENCE_CHAIN.slice(index + 1);
}

function meetingDest(state: GameState): string {
  if (state.flags.meeting === 'coffee') return 'meeting_coffee';
  if (state.flags.meeting === 'ghost') return 'meeting_ghost';
  return 'meeting_yes';
}

function nvcaChoices(current: string): Choice[] {
  const destinations = after(current);
  const next = (state: GameState) => nextDiligence(current, state);
  return [
    {
      id: 'read',
      label: 'Read the clause that actually binds you.',
      because: 'The term sheet was a summary. This document is the one that will still be true later.',
      effects: { reputation: 2, morale: -2 },
      next,
      destinations,
    },
    {
      id: 'skim',
      label: 'Skim it and trust the summary.',
      because: 'Skimming is faster until counsel reopens a rep you did not read.',
      effects: { morale: 3, reputation: -3 },
      resolve: (draft) => {
        draft.flags.skimCount += 1;
        if (draft.flags.skimCount >= 3) draft.runway -= 0.4;
        return draft;
      },
      next,
      destinations,
    },
  ];
}

function bridgeChoice(): Choice {
  return {
    id: 'bridge',
    label: 'Sign a $400k bridge SAFE at a $7M post-money cap.',
    because: 'The bridge wires. Earlier post-money SAFEs keep their percent. Founders take the new dilution. There is no lead in this ending.',
    effects: {
      morale: -3,
      reputation: -4,
      bankNewSafes: true,
      safes: [
        {
          id: 'bridge',
          name: 'Bridge SAFE',
          amount: 400_000,
          cap: 7_000_000,
          mfn: false,
          sideLetter: false,
          homemade: false,
        },
      ],
    },
    deal: { bridge: true },
    terms: ['bridge-round'],
    next: 'ending',
  };
}

function safeChoices(state: GameState): Choice[] {
  const angel = angelOffer(state);
  const fund = hasFund(state) ? fundOffer() : null;
  const choices: Choice[] = [];
  if (fund) {
    choices.push({
      id: 'clean',
      label: 'Both checks on one $8M post-money SAFE. No MFN, no discount, no side letter.',
      because: 'One standard form. Harbor’s percent will not move when Northline’s SAFE stacks on top.',
      effects: {
        reputation: 6,
        morale: 1,
        noteFirstSale: true,
        safes: [
          { id: 'harbor', name: 'Harbor', amount: angel.amount, cap: angel.highCap, mfn: false, sideLetter: false, homemade: false },
          { id: 'northline', name: 'Northline', amount: fund.amount, cap: fund.cap, mfn: false, sideLetter: false, homemade: false },
        ],
      },
      docs: ['safes'],
      next: 'safe_result',
    });
    choices.push({
      id: 'offered',
      label: 'Take both as offered. Harbor keeps the lower cap, the MFN, and the side letter.',
      because: 'You take the money as written. The side letter and MFN will wake up in the priced round.',
      effects: {
        morale: 4,
        reputation: -3,
        noteFirstSale: true,
        safes: [
          { id: 'harbor', name: 'Harbor', amount: angel.amount, cap: angel.lowCap, mfn: true, sideLetter: true, homemade: false },
          { id: 'northline', name: 'Northline', amount: fund.amount, cap: fund.cap, mfn: false, sideLetter: false, homemade: false },
        ],
      },
      docs: ['safes'],
      terms: ['mfn', 'side-letter', 'pro-rata'],
      next: 'safe_result',
    });
    choices.push({
      id: 'fund-only',
      label: 'Only Northline. Walk away from Harbor’s side letter.',
      because: 'You leave Harbor’s check behind so the next round has one clean SAFE.',
      effects: {
        reputation: 3,
        morale: -5,
        noteFirstSale: true,
        safes: [
          { id: 'northline', name: 'Northline', amount: fund.amount, cap: fund.cap, mfn: false, sideLetter: false, homemade: false },
        ],
      },
      docs: ['safes'],
      next: 'safe_result',
    });
  } else {
    choices.push({
      id: 'clean',
      label: 'Push Harbor to an $8M cap. No MFN, no discount, no side letter.',
      because: 'Less ownership sold, and nothing extra hiding beside the SAFE. The check is still the small one.',
      effects: {
        reputation: 3,
        morale: -3,
        noteFirstSale: true,
        safes: [
          { id: 'harbor', name: 'Harbor', amount: angel.amount, cap: angel.highCap, mfn: false, sideLetter: false, homemade: false },
        ],
      },
      docs: ['safes'],
      next: 'safe_result',
    });
    choices.push({
      id: 'offered',
      label: 'Accept Harbor’s $6M cap, MFN, and pro rata side letter.',
      because: 'The cash is real. So is the clause that can copy a cheaper cap later.',
      effects: {
        morale: 3,
        reputation: -3,
        noteFirstSale: true,
        safes: [
          { id: 'harbor', name: 'Harbor', amount: angel.amount, cap: angel.lowCap, mfn: true, sideLetter: true, homemade: false },
        ],
      },
      docs: ['safes'],
      terms: ['mfn', 'side-letter', 'pro-rata'],
      next: 'safe_result',
    });
    if (!state.flags.waitedFund) {
      choices.push({
        id: 'wait',
        label: 'Wait a month and try to bring a fund in.',
        because: 'A month of burn buys a chance at a lead check. It does not guarantee one.',
        effects: { runway: -1, morale: -4, reputation: 1 },
        flags: { waitedFund: true },
        next: (current) => (offerScore(current) >= 1 ? 'fund_arrives' : 'fund_nope'),
        destinations: ['fund_arrives', 'fund_nope'],
      });
    }
  }
  return choices;
}

function shuffleChoices(state: GameState): Choice[] {
  const ask = state.deal.poolAsk ?? 0.15;
  if (ask <= 0.1) {
    return [
      {
        id: 'hold',
        label: 'Hold the unissued pool at 10% of post-money.',
        because: 'Ten percent is already a market pool. A bigger one would lower effective pre-money for no new cash.',
        effects: { reputation: 2, morale: 2 },
        deal: { poolTarget: 0.1 },
        next: 'redpen',
      },
      {
        id: 'volunteer',
        label: 'Volunteer a 15% pool to look easy.',
        because: 'The extra empty pool comes out of the pre-money. The lead is not diluted. You are.',
        effects: { reputation: 1, morale: -6 },
        deal: { poolTarget: 0.15 },
        next: 'redpen',
      },
    ];
  }
  return [
    {
      id: 'push',
      label: 'Push the unissued pool down to 10%.',
      because: 'A smaller pool raises effective pre-money. New investors are not diluted by it. Founders are.',
      effects: { reputation: -2, morale: 3, runway: -0.3 },
      deal: { poolTarget: 0.1 },
      resolve: (draft) => {
        if (draft.reputation < 36) draft.runway -= 0.4;
        return draft;
      },
      next: 'redpen',
    },
    {
      id: 'accept',
      label: 'Accept the larger pool on the sheet.',
      because: 'The close gets easier. Those pool dollars sit inside the pre-money, so founders pay for shares nobody has earned.',
      effects: { reputation: 3, morale: -5 },
      deal: { poolTarget: ask },
      next: 'redpen',
    },
  ];
}

export const SCENES: Scene[] = [
  {
    id: 'napkin',
    act: 1,
    title: 'The napkin',
    sprite: 'founder',
    body: 'Your co-founder taps the napkin. Biscuit is pet insurance that pays. Before anyone quits a job, what are you, legally? Savings cover seven months of rent and noodles.',
    choices: [
      {
        id: 'delaware',
        label: 'Incorporate as a Delaware C-corp.',
        because: 'You pick the shape US seed investors expect. Next you will pay for doing it properly.',
        effects: { reputation: 3, morale: -2 },
        flags: { entity: 'delaware' },
        terms: ['pre-seed', 'runway', 'delaware-c-corp', 'qsbs'],
        next: 'counsel',
      },
      {
        id: 'llc',
        label: 'Stay an LLC until a check arrives.',
        because: 'You keep the filing cheap. Most seed funds will not invest in an LLC.',
        effects: { morale: 5, reputation: -6 },
        flags: { entity: 'llc', startedAsLlc: true },
        terms: ['pre-seed', 'runway', 'delaware-c-corp', 'qsbs'],
        next: 'llc_wall',
      },
      {
        id: 'wyoming',
        label: 'Have a cousin file a Wyoming company tonight.',
        because: 'It feels fast. A lead will still ask for Delaware, and the cleanup lands in diligence.',
        effects: { morale: 6, reputation: -10, runway: -0.2 },
        flags: { entity: 'wyoming', messyDocs: true, counsel: 'none' },
        docs: ['coi'],
        terms: ['pre-seed', 'runway', 'delaware-c-corp', 'qsbs'],
        next: 'founder_stock',
      },
    ],
  },
  {
    id: 'counsel',
    act: 1,
    title: 'Who files it',
    sprite: 'counsel',
    body: 'Delaware is a decision. The charter, bylaws, and first consents are the next one. Investors can tell a minute book that was finished from one that was downloaded at 2 a.m.',
    choices: [
      {
        id: 'pro',
        label: 'Hire startup counsel and do the full set.',
        because: 'Counsel costs about a month of noodles. Clean consents are cheaper than a redo during diligence.',
        effects: { runway: -1, reputation: 8, morale: -4 },
        flags: { counsel: 'pro', messyDocs: false },
        docs: CORPORATE,
        next: 'founder_stock',
      },
      {
        id: 'service',
        label: 'Use a formation service, then pay a lawyer to review.',
        because: 'You save some cash and still get a human to read the consents.',
        effects: { runway: -0.5, reputation: 4, morale: -2 },
        flags: { counsel: 'service', messyDocs: false },
        docs: CORPORATE,
        next: 'founder_stock',
      },
      {
        id: 'template',
        label: 'File from a free template tonight.',
        because: 'You keep the cash. Missing bylaws and consents become diligence homework.',
        effects: { runway: -0.1, reputation: -6, morale: 4 },
        flags: { counsel: 'template', messyDocs: true },
        docs: ['coi'],
        next: 'founder_stock',
      },
    ],
  },
  {
    id: 'llc_wall',
    act: 1,
    title: 'Keep me posted',
    sprite: 'investor',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'An angel likes the demo, then asks if Biscuit is a Delaware C-corp. It is an LLC. The meeting ends with a kind “keep me posted.”',
    choices: [
      {
        id: 'convert',
        label: 'Convert to a Delaware C-corp now.',
        because: 'Conversion burns cash and time. It also unlocks the round you actually want.',
        effects: { runway: -1.2, reputation: 5, morale: -5 },
        flags: { entity: 'delaware' },
        next: 'counsel',
      },
      {
        id: 'friends',
        label: 'Raise from friends and stay an LLC for now.',
        because: 'Friends may fund you. A priced seed on NVCA paper will not close like this.',
        effects: { morale: 4, reputation: -5 },
        next: 'friends_round',
      },
    ],
  },
  {
    id: 'friends_round',
    act: 1,
    title: 'The friends’ note',
    sprite: 'document',
    body: 'Three friends will wire $120k on a homemade note that looks a bit like a SAFE. SAFEs are built for corporations. This paper will need a redo.',
    termsOnEnter: ['convertible-note', 'safe'],
    choices: [
      {
        id: 'take',
        label: 'Take the $120k and promise to clean it up later.',
        because: 'The wire is fast. The instrument is not a post-money SAFE, and the cap table is already shaky.',
        effects: {
          morale: 5,
          reputation: -6,
          bankNewSafes: true,
          noteFirstSale: true,
          safes: [
            {
              id: 'friends',
              name: 'Friends’ note',
              amount: 120_000,
              cap: 5_000_000,
              mfn: true,
              sideLetter: true,
              homemade: true,
            },
          ],
        },
        flags: { sloppySheet: true },
        docs: ['cap-table', 'safes'],
        terms: ['mfn', 'side-letter'],
        next: 'form_d',
      },
    ],
  },
  {
    id: 'founder_stock',
    act: 1,
    title: 'Founder stock',
    sprite: 'document',
    termsOnEnter: ['vesting', 'cliff', 'founder-stock', 'par-value'],
    body: 'You can buy common stock for a tiny par value. The usual deal vests over four years with a one-year cliff. If the shares vest, the 83(b) clock starts the day you buy them.',
    choices: [
      {
        id: 'vest',
        label: 'Sign, with four-year vesting and a one-year cliff.',
        because: 'Vesting makes a lead comfortable. It also means the IRS clock is running from today.',
        effects: { reputation: 4, morale: -3, issueStock: true },
        flags: { vesting: 'standard' },
        docs: ['founder-spa', 'cap-table', 'bios', 'org-chart', 'domain'],
        next: 'eightyb',
      },
      {
        id: 'no-vest',
        label: 'No vesting. These shares are fully ours.',
        because: 'Fully vested cheap stock skips the 83(b) problem and creates a vesting problem. Leads notice.',
        effects: { morale: 6, reputation: -8 },
        flags: { vesting: 'none' },
        docs: ['founder-spa', 'cap-table', 'bios', 'org-chart', 'domain'],
        next: 'contractor',
      },
    ],
  },
  {
    id: 'eightyb',
    act: 1,
    title: 'Day 0 of 30',
    sprite: 'document',
    kicker: '83(b) clock',
    termsOnEnter: ['83b', 'fmv'],
    body: 'An 83(b) tells the IRS to tax the stock now, while it is nearly worthless, instead of later as it vests. It is due 30 days after issuance. There is no extension.',
    choices: [
      {
        id: 'file',
        label: 'File today and keep the proof.',
        because: 'You spend an hour on the filing. Future-you does not get a surprise tax bill when the shares vest.',
        effects: { reputation: 6, morale: 2, file83b: true, advanceDays: 1 },
        docs: ['eighty-three-b'],
        next: 'contractor',
      },
      {
        id: 'offsite',
        label: 'File after the customer offsite.',
        because: 'The offsite feels productive. Twenty-one days disappear. The deadline does not care.',
        effects: { morale: 4, runway: -0.7, advanceDays: 21 },
        next: 'eightyb_day21',
      },
      {
        id: 'spring',
        label: 'Deal with taxes in the spring.',
        because: 'Spring is too late. The window is 30 days from issuance, and this choice spends all of them.',
        effects: { morale: 3, reputation: -3, advanceDays: 31 },
        next: 'eightyb_missed',
      },
    ],
  },
  {
    id: 'eightyb_day21',
    act: 1,
    title: 'Day 21 of 30',
    sprite: 'document',
    kicker: '83(b) clock',
    tone: 'consequence',
    body: 'Nine days are left. The offsite ran long. The mailbox did not. Filing is still possible. Next week is not a plan.',
    choices: [
      {
        id: 'file',
        label: 'File this morning.',
        because: 'You are inside the 30 days. Proof of filing is the whole prize.',
        effects: { reputation: 5, morale: -2, file83b: true, advanceDays: 1 },
        docs: ['eighty-three-b'],
        next: 'contractor',
      },
      {
        id: 'week',
        label: 'Give it one more week.',
        because: 'Seven extra days walk you past day 30. The IRS does not take late 83(b) elections.',
        effects: { morale: 2, reputation: -4, advanceDays: 10 },
        next: 'eightyb_missed',
      },
    ],
  },
  {
    id: 'eightyb_missed',
    act: 1,
    title: 'The window closed',
    sprite: 'document',
    kicker: 'Consequence',
    tone: 'consequence',
    body: 'Day 30 passed. There is no extension. As the shares vest, the IRS can tax the gain as ordinary income, even if you have no cash from those shares. The bill shows up later, when the stock is worth more.',
    choices: [
      {
        id: 'own-it',
        label: 'Write it down and keep building.',
        because: 'You cannot un-miss it. The tax reserve waits for a higher valuation, and diligence will ask.',
        effects: { morale: -8, reputation: -2 },
        next: 'contractor',
      },
    ],
  },
  {
    id: 'contractor',
    act: 1,
    title: 'Pete’s commits',
    sprite: 'pete',
    termsOnEnter: ['ciiaa', 'ip-assignment'],
    body: 'The prototype was written by Pete, a contractor now backpacking. He never signed an IP assignment. Investors will ask who owns the code. Your own CIIAA does not answer that.',
    choices: [
      {
        id: 'chase',
        label: 'Track Pete down and get the signature.',
        because: 'A month of chasing is cheaper than a diligence surprise. The repo and the paperwork finally match.',
        effects: { runway: -1, morale: -6, reputation: 6 },
        flags: { pete: 'signed' },
        docs: ['founder-ciiaa', 'prior-inventions', 'contractor-ip', 'contractor-agreements'],
        next: (state) => (state.safes.some((safe) => safe.homemade) ? 'deck' : 'pool'),
        destinations: ['deck', 'pool'],
      },
      {
        id: 'rewrite',
        label: 'Rewrite the prototype without Pete’s code.',
        because: 'You spend time and cash so the company owns every line. That memo is the proof.',
        effects: { runway: -1.5, morale: -8, reputation: 5 },
        flags: { pete: 'rewrite' },
        docs: ['founder-ciiaa', 'prior-inventions', 'clean-room-memo'],
        next: (state) => (state.safes.some((safe) => safe.homemade) ? 'deck' : 'pool'),
        destinations: ['deck', 'pool'],
      },
      {
        id: 'later',
        label: 'He’ll sign when he has Wi-Fi.',
        because: 'You keep momentum. Pete’s unsigned commits stay in the history diligence will read.',
        effects: { morale: 5, reputation: -3 },
        flags: { pete: 'ghost' },
        docs: ['founder-ciiaa', 'prior-inventions'],
        next: (state) => (state.safes.some((safe) => safe.homemade) ? 'deck' : 'pool'),
        destinations: ['deck', 'pool'],
      },
    ],
  },
  {
    id: 'pool',
    act: 1,
    title: 'The option pool',
    sprite: 'sheet',
    termsOnEnter: ['option-pool', 'fully-diluted', '409a'],
    body: 'An unissued pool lowers your fully diluted percent now. A seed lead will resize whatever you have not granted. A real grant stays. A verbal promise does not belong in the margin.',
    choices: [
      {
        id: 'grant',
        label: 'Reserve 10% and grant 3% to your first hire.',
        because: 'The grant is real dilution. It also means someone is building Biscuit with you.',
        effects: { reputation: 4, morale: 2, shares: { founders: 9_000_000, granted: 300_000, pool: 700_000 } },
        flags: { hired: true, advisor: 'none' },
        docs: ['equity-plan', 'option-grants', 'offer-letters', 'employee-ciiaa'],
        next: 'focus',
      },
      {
        id: 'reserve',
        label: 'Reserve 10% and grant nothing yet.',
        because: 'The empty pool shows up in the fully diluted count. A lead can resize it. You cannot hire with it yet.',
        effects: { reputation: 2, morale: -2, shares: { founders: 9_000_000, granted: 0, pool: 1_000_000 } },
        flags: { hired: false, advisor: 'none' },
        docs: ['equity-plan'],
        next: 'focus',
      },
      {
        id: 'verbal',
        label: 'Promise an advisor 5% in a chat. Skip the paperwork.',
        because: 'The advisor is happy. The spreadsheet is now fiction, and fiction shows up in diligence.',
        effects: { morale: 5, reputation: -6 },
        flags: { advisor: 'off-sheet', hired: false },
        next: 'focus',
      },
    ],
  },
  {
    id: 'focus',
    act: 1,
    title: 'Build or raise',
    sprite: 'founder',
    body: 'You can spend two months with design partners, or start raising on the story you have. The deck will have to match whichever one you pick.',
    choices: [
      {
        id: 'build',
        label: 'Spend two months with design partners.',
        because: 'Runway drops. The next lead has customers to call, not only a napkin.',
        effects: { runway: -2, reputation: 8, morale: 3 },
        flags: { build: true },
        docs: ['model', 'customer-lois', 'metrics', 'roadmap', 'burn-memo'],
        next: 'targets',
      },
      {
        id: 'raise-now',
        label: 'Raise now, on the story.',
        because: 'You save the product months and walk in with a thinner trail of evidence.',
        effects: { runway: -0.4, reputation: -2, morale: -3 },
        flags: { build: false },
        next: 'targets',
      },
    ],
  },
  {
    id: 'targets',
    act: 1,
    title: 'The list',
    sprite: 'investor',
    body: 'A round is a list of people who can actually say yes, in an order, with a reason to take the meeting. It is not a blast.',
    choices: [
      {
        id: 'warm',
        label: 'Twenty warm names, tiered.',
        because: 'Warm intros take patience and raise the odds a partner reads the deck.',
        effects: { reputation: 5, morale: -2 },
        flags: { list: 'warm' },
        next: 'deck',
      },
      {
        id: 'spray',
        label: 'Spray 200 cold emails.',
        because: 'Volume feels like work. Most of it teaches strangers to ignore you.',
        effects: { morale: -8, reputation: -4 },
        flags: { list: 'spray' },
        next: 'deck',
      },
    ],
  },
  {
    id: 'deck',
    act: 1,
    title: 'The deck',
    sprite: 'document',
    body: 'Ten slides can carry a problem, a product, and an ask. Forty slides of market size mostly carry themselves to the archive.',
    choices: [
      {
        id: 'tight',
        label: 'Ten slides and a clear ask.',
        because: 'A short deck respects the meeting. The data room will have to back up every number.',
        effects: { reputation: 4, morale: -1 },
        flags: { deck: 'tight' },
        docs: ['pitch-deck'],
        resolve: (state) => (state.safes.some((safe) => safe.homemade) ? state : rollMeeting(state)),
        next: (state) => (state.safes.some((safe) => safe.homemade) ? 'time_jump' : meetingDest(state)),
        destinations: ['time_jump', 'meeting_yes', 'meeting_coffee', 'meeting_ghost'],
      },
      {
        id: 'bloated',
        label: 'Forty slides, mostly the market.',
        because: 'The market is huge. The reader still cannot find the ask, and some will not look.',
        effects: { morale: 2, reputation: -5 },
        flags: { deck: 'bloated' },
        docs: ['pitch-deck'],
        resolve: (state) => (state.safes.some((safe) => safe.homemade) ? state : rollMeeting(state)),
        next: (state) => (state.safes.some((safe) => safe.homemade) ? 'time_jump' : meetingDest(state)),
        destinations: ['time_jump', 'meeting_yes', 'meeting_coffee', 'meeting_ghost'],
      },
    ],
  },
  {
    id: 'meeting_yes',
    act: 1,
    title: 'A real meeting',
    sprite: 'investor',
    body: (state) =>
      hasFund(state)
        ? 'Northline, a pre-seed fund, wants a standard post-money SAFE. Harbor, an angel, wants a lower cap and clipped a side letter to the PDF.'
        : 'Harbor wants a post-money SAFE. The cap is low, and a side letter is clipped on. No fund is in the room yet.',
    choices: [
      {
        id: 'open',
        label: 'Open the SAFEs and do the math.',
        because: 'You stop collecting vibes and start reading purchase amount divided by cap.',
        effects: { reputation: 2, morale: -1 },
        next: 'safe_angel',
      },
    ],
  },
  {
    id: 'meeting_coffee',
    act: 1,
    title: 'Let’s grab coffee',
    sprite: 'coffee',
    body: 'They say the sentence founders learn early: let’s grab coffee. Coffee can be a kindness. It is not a term sheet.',
    choices: [
      {
        id: 'go',
        label: 'Go, and keep it to thirty minutes.',
        because: 'You buy a lesson and a latte. Sometimes that is the whole deal. Sometimes it is an intro.',
        effects: { runway: -0.4, morale: 3 },
        resolve: rollCoffee,
        next: 'coffee_result',
      },
      {
        id: 'decline',
        label: 'Decline, and write the people who can wire.',
        because: 'You protect the calendar. Serious checks rarely require a third coffee.',
        effects: { reputation: 4, morale: -2 },
        flags: { declinedCoffee: true },
        next: 'safe_angel',
      },
    ],
  },
  {
    id: 'coffee_result',
    act: 1,
    title: 'The latte',
    sprite: 'coffee',
    tone: 'consequence',
    body: (state) =>
      state.flags.coffeeLead
        ? 'This coffee turned into a warm intro to Northline. Most lattes do not. Enjoy the exception, then get the SAFE in writing.'
        : 'The latte was excellent. No check is coming from that table. The round is still the list you have not finished.',
    choices: [
      {
        id: 'onward',
        label: 'Back to people who write checks.',
        because: 'You spent the calendar slot. The next hour has to be a SAFE or a better meeting.',
        effects: { morale: -1, reputation: 1 },
        next: 'safe_angel',
      },
    ],
  },
  {
    id: 'meeting_ghost',
    act: 1,
    title: 'Seen',
    sprite: 'ghost',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'The partner said they were in on Thursday. By the next Thursday the thread is only you. A verbal yes is not a wire.',
    choices: [
      {
        id: 'move-on',
        label: 'Follow up once, then keep the process moving.',
        because: 'It stings. Parking the round in one inbox is how months disappear.',
        effects: { morale: -6, reputation: 3 },
        next: 'safe_angel',
      },
      {
        id: 'wait',
        label: 'Wait by the inbox.',
        because: 'Hope feels free. A month of waiting is burn, and the verbal yes can stay verbal.',
        effects: { runway: -1, morale: -4 },
        next: 'safe_angel',
      },
    ],
  },
  {
    id: 'fund_arrives',
    act: 1,
    title: 'Northline replies',
    sprite: 'investor',
    body: 'The extra month worked. Northline will read a SAFE. That does not erase the angel’s draft. It gives you a second number.',
    choices: [
      {
        id: 'onward',
        label: 'Put both offers on one page.',
        because: 'A second check is leverage only if you actually compare the caps.',
        effects: { reputation: 3, morale: 2 },
        flags: { fundArrived: true },
        next: 'safe_angel',
      },
    ],
  },
  {
    id: 'fund_nope',
    act: 1,
    title: 'No fund this month',
    sprite: 'ghost',
    tone: 'consequence',
    body: 'You spent the month. No fund joined. Harbor is still the check on the table. The cap and the side letter did not improve while you waited.',
    choices: [
      {
        id: 'onward',
        label: 'Read Harbor’s SAFE as it stands.',
        because: 'Waiting spent runway. The decision in front of you is the same PDF.',
        effects: { morale: -3, reputation: -1 },
        next: 'safe_angel',
      },
    ],
  },
  {
    id: 'safe_angel',
    act: 1,
    title: 'Post-money SAFEs',
    sprite: 'sheet',
    termsOnEnter: ['safe', 'post-money-safe', 'valuation-cap', 'discount', 'convertible-note'],
    body: 'On a post-money SAFE, ownership is the check divided by the cap. A discount, if you add one, is an alternative, not a bonus on top of the cap. MFN and pro rata are extras.',
    choices: safeChoices,
  },
  {
    id: 'safe_result',
    act: 1,
    title: 'The stack',
    sprite: 'sheet',
    kind: 'stack',
    body: 'Read the stack from the top. A post-money SAFE percent is the check divided by its cap. A later SAFE does not move an earlier SAFE. It moves the founders.',
    choices: [
      {
        id: 'onward',
        label: 'Write the percents down and send signature requests.',
        because: 'The stack is only real if the PDFs match it. Requests go out the same day.',
        effects: { reputation: 2, morale: -1 },
        next: 'form_d',
      },
    ],
  },
  {
    id: 'form_d',
    act: 1,
    title: 'Fifteen days',
    sprite: 'document',
    kicker: 'Form D',
    termsOnEnter: ['form-d', 'accredited-investor'],
    body: 'The first sale is today. Form D is a notice due within 15 days. It is not an approval. It tells the SEC you sold to accredited investors.',
    choices: [
      {
        id: 'file',
        label: 'File Form D this week.',
        because: 'A notice on time is boring. Boring is the goal. The wire is a separate problem.',
        effects: { reputation: 4, runway: -0.2, advanceDays: 2, fileFormD: true },
        docs: ['form-d'],
        next: (state) => (state.safes.some((safe) => safe.homemade) ? 'contractor' : 'cap_table'),
        destinations: ['contractor', 'cap_table'],
      },
      {
        id: 'delay',
        label: 'Let the portal wait.',
        because: 'You slip past day 15. States and diligence lawyers notice late notices.',
        effects: { morale: 2, reputation: -4, advanceDays: 18, forceMissFormD: true },
        next: (state) => (state.safes.some((safe) => safe.homemade) ? 'contractor' : 'cap_table'),
        destinations: ['contractor', 'cap_table'],
      },
    ],
  },
  {
    id: 'cap_table',
    act: 1,
    title: 'Does it add up?',
    sprite: 'sheet',
    termsOnEnter: ['cap-table'],
    body: (state) =>
      state.flags.advisor === 'off-sheet'
        ? 'The sheet shows 100%, and a chat still promises an advisor 5%. Both cannot be true. Post-money SAFEs will not be the ones who absorb a late fix.'
        : 'Add a SUM row. Fully diluted ownership has to land on 100%, including the pool and every SAFE.',
    choices: (state) => {
      if (state.flags.advisor === 'off-sheet') {
        return [
          {
            id: 'fix',
            label: 'Put the 5% in writing and take it from the pool.',
            because: 'A written grant keeps one cap table. If the pool is empty, the shares come from the founders now.',
            effects: { reputation: 4, morale: -3 },
            docs: ['cap-table', 'advisor-agreements'],
            resolve: (draft) => {
              const take = Math.min(BALANCE.advisorShares, draft.poolShares);
              const rest = BALANCE.advisorShares - take;
              draft.poolShares -= take;
              draft.grantedShares += take;
              draft.foundersShares -= rest;
              draft.flags.advisor = 'in-pool';
              draft.flags.sloppySheet = false;
              return draft;
            },
            next: 'signatures',
          },
          {
            id: 'sloppy',
            label: 'Leave the promise off the sheet.',
            because: 'You close the pre-seed faster. Diligence will try to make the numbers true without you.',
            effects: { reputation: -6, morale: 2 },
            flags: { sloppySheet: true },
            next: 'signatures',
          },
        ];
      }
      return [
        {
          id: 'fix',
          label: 'Reconcile to 100% and save a PDF.',
          because: 'A cap table that adds up is a document. You will want that PDF when the seed lawyer asks.',
          effects: { reputation: 3, morale: -1 },
          flags: { sloppySheet: false },
          docs: ['cap-table'],
          next: 'signatures',
        },
        {
          id: 'sloppy',
          label: 'Call it close enough.',
          because: 'Rounding feels harmless. A sheet that does not tie out becomes a seed delay.',
          effects: { reputation: -5, morale: 2 },
          flags: { sloppySheet: true },
          next: 'signatures',
        },
      ];
    },
  },
  {
    id: 'signatures',
    act: 1,
    title: 'Still viewing',
    sprite: 'document',
    body: 'Three signature blocks are still open. The money cannot move on a thumbs-up. DocuSign says “viewed,” which is not “signed.”',
    choices: [
      {
        id: 'nudge',
        label: 'Nudge every signer today.',
        because: 'Nagging is part of closing. Signed pages are how a SAFE becomes a wire.',
        effects: { morale: -3, reputation: 3, runway: -0.2 },
        next: 'preseed_wire',
      },
      {
        id: 'wait',
        label: 'Wait for them to notice the email.',
        because: 'Silence feels polite. Weeks of it are burn, and payroll does not ghost you back.',
        effects: { runway: -0.8, morale: -4 },
        next: 'preseed_wire',
      },
    ],
  },
  {
    id: 'preseed_wire',
    act: 1,
    title: 'Pre-seed wire',
    sprite: 'bank',
    tone: 'win',
    body: 'The SAFEs are signed. The wire hits the company account. Update the cap table the same day, while the number still matches the PDF.',
    choices: [
      {
        id: 'bank',
        label: 'Book the cash and update the sheet.',
        because: 'Runway jumps by the SAFE cash divided by monthly burn. A signature was not cash until this moment.',
        effects: { bankNewSafes: true, morale: 4, reputation: 2 },
        next: 'time_jump',
      },
    ],
  },
  {
    id: 'time_jump',
    act: 1,
    title: 'Ten months later',
    sprite: 'founder',
    termsOnEnter: ['burn-rate', 'seed-round'],
    body: 'Ten months pass. You ship, you hire, you learn what burn means. A seed fund named Kindling replies. A reply is not a term sheet.',
    choices: [
      {
        id: 'open',
        label: 'Open Kindling’s reply.',
        because: 'Ten months of burn come off the runway. You only read the email if the company is still alive.',
        effects: { runway: -BALANCE.timeJumpMonths, morale: -2, reputation: 1 },
        next: routeAfterTimeJump,
        destinations: ['ending', 'seed_llc_wall', 'lead_hunt'],
      },
    ],
  },
  {
    id: 'seed_llc_wall',
    act: 2,
    title: 'Not into an LLC',
    sprite: 'counsel',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'Kindling will talk about a priced round. They will not lead it into an LLC. You convert to a Delaware C-corp now, or this story ends in a bridge.',
    choices: [
      {
        id: 'convert',
        label: 'Reincorporate to Delaware before the process.',
        because: 'You pay for the conversion you postponed. The new stock starts a new 83(b) clock.',
        effects: { runway: -2, reputation: 4, morale: -5 },
        flags: { entity: 'delaware', messyDocs: false },
        docs: CORPORATE,
        next: 'rushed_83b',
      },
      {
        id: 'bridge',
        label: 'Skip the lead and bridge instead.',
        because: 'You avoid the conversion this month. You also avoid a priced seed.',
        effects: { morale: -2, reputation: -3 },
        next: 'party_final',
      },
    ],
  },
  {
    id: 'rushed_83b',
    act: 2,
    title: 'A new clock',
    sprite: 'document',
    kicker: '83(b) clock',
    termsOnEnter: ['vesting', 'cliff', 'founder-stock', 'par-value', '83b', 'fmv'],
    body: 'The Delaware stock is issued today, with four-year vesting. The 83(b) is due 30 days from this issuance, not from the old LLC. The seed process will not pause for a calm month.',
    choices: [
      {
        id: 'file',
        label: 'File the 83(b) before you leave the lawyer’s office.',
        because: 'Same-day filing keeps the new vesting from becoming a tax surprise.',
        effects: { reputation: 4, morale: -2, runway: -0.2, issueStock: true, file83b: true, advanceDays: 1 },
        flags: { vesting: 'standard' },
        docs: ['founder-spa', 'founder-ciiaa', 'eighty-three-b', 'cap-table'],
        next: 'lead_hunt',
      },
      {
        id: 'later',
        label: 'Finish the conversion paperwork first.',
        because: 'The paperwork eats the 30 days. The election is late before the round even starts.',
        effects: { morale: 2, reputation: -4, issueStock: true, advanceDays: 31 },
        flags: { vesting: 'standard' },
        docs: ['founder-spa', 'founder-ciiaa', 'cap-table'],
        next: 'lead_hunt',
      },
    ],
  },
  {
    id: 'lead_hunt',
    act: 2,
    title: 'Find a lead',
    sprite: 'investor',
    termsOnEnter: ['lead-investor', 'party-round'],
    body: 'A lead sets the price, runs diligence, and signs the NVCA documents. A pile of small SAFEs can be a bridge. It is not a lead.',
    choices: [
      {
        id: 'process',
        label: 'Run a two-week process.',
        because: 'A process costs a couple of weeks and is how you see more than one sheet.',
        effects: { runway: -0.5, reputation: 4, morale: -2 },
        flags: { fastSheet: false },
        next: routeToTermSheet,
        destinations: ['seed_llc_wall', 'retrovest', 'term_headline'],
      },
      {
        id: 'fast',
        label: 'Take the first term sheet tonight.',
        because: 'Speed feels like relief. The first sheet is rarely the gentlest one.',
        effects: { morale: 4, reputation: -5, runway: -0.2 },
        flags: { fastSheet: true },
        next: routeToTermSheet,
        destinations: ['seed_llc_wall', 'retrovest', 'term_headline'],
      },
      {
        id: 'party',
        label: 'Skip the lead and stack another SAFE.',
        because: 'Another SAFE can keep the lights on. It does not give you a board or a priced round.',
        effects: { morale: 2, reputation: -5 },
        next: 'party_round',
      },
    ],
  },
  {
    id: 'retrovest',
    act: 2,
    title: 'Vesting, late',
    sprite: 'counsel',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'Kindling wants four-year vesting before they send final numbers. Adding it now, after the stock has value, is a tax conversation you could have had on day one.',
    choices: [
      {
        id: 'add',
        label: 'Add vesting and file the 83(b) today.',
        because: 'You take the restriction and the filing together. The lead prices a normal check.',
        effects: { runway: -0.6, morale: -5, reputation: 4, issueStock: true, file83b: true },
        flags: { vesting: 'standard' },
        docs: ['eighty-three-b'],
        next: 'term_headline',
      },
      {
        id: 'refuse',
        label: 'Refuse vesting and live with a smaller check.',
        because: 'You keep the shares unrestricted. Kindling prices that risk into a smaller round.',
        effects: { morale: 3, reputation: -8 },
        next: 'term_headline',
      },
    ],
  },
  {
    id: 'party_round',
    act: 2,
    title: 'No lead',
    sprite: 'coffee',
    body: 'No one is setting terms. Angels will do another post-money SAFE. That can be a bridge. Stacking it dilutes founders, not the SAFEs you already signed.',
    choices: [
      bridgeChoice(),
      {
        id: 'month',
        label: 'Hunt one more month for a lead.',
        because: 'The month costs burn. A lead appears only if the story was already strong enough.',
        effects: { runway: -1, morale: -4, reputation: 1 },
        next: (state) => (offerScore(state) >= 2 && state.flags.entity === 'delaware' ? 'last_look' : 'party_final'),
        destinations: ['last_look', 'party_final'],
      },
    ],
  },
  {
    id: 'last_look',
    act: 2,
    title: 'One reply',
    sprite: 'investor',
    body: 'One fund answers. It is not a dream sheet. It is a lead, which you did not have yesterday. The pool and the markup are still ahead.',
    choices: [
      {
        id: 'take',
        label: 'Take the meeting and open the sheet.',
        because: 'You spent the month. Walking into the only lead you have is the point of the wait.',
        effects: { reputation: 2, morale: 3 },
        next: routeToTermSheet,
        destinations: ['retrovest', 'term_headline', 'seed_llc_wall'],
      },
    ],
  },
  {
    id: 'party_final',
    act: 2,
    title: 'Bridge or stop',
    sprite: 'bank',
    tone: 'consequence',
    body: 'There is still no lead. The angels will wire a bridge SAFE. That ending keeps the company alive and stacks more dilution on the founders.',
    choices: [bridgeChoice()],
  },
  {
    id: 'term_headline',
    act: 2,
    title: 'Pre-money, post-money',
    sprite: 'sheet',
    termsOnEnter: ['pre-money', 'post-money'],
    docsOnEnter: ['term-sheet', 'pro-forma'],
    body: 'Kindling’s term sheet is in. Pre-money is the value before their new check. Post-money is pre-money plus that check. Your SAFE cap is a different number. Do not mix them up.',
    choices: [
      {
        id: 'read-price',
        label: 'Say the two valuations out loud, then look at the pool.',
        because: 'Naming them separately keeps the option pool from hiding inside a single headline.',
        effects: { reputation: 2, morale: -1 },
        next: 'pool_shuffle',
      },
    ],
  },
  {
    id: 'pool_shuffle',
    act: 2,
    title: 'The pool shuffle',
    sprite: 'sheet',
    kind: 'shuffle',
    termsOnEnter: ['option-pool-shuffle', 'effective-pre-money'],
    body: 'The option pool is added before the new money, so it comes out of the pre-money. Headline pre-money is not what the founders keep. Watch effective pre-money and your percent move.',
    choices: shuffleChoices,
  },
  {
    id: 'redpen',
    act: 2,
    title: 'Red pen',
    sprite: 'sheet',
    kind: 'redpen',
    body: 'Four clauses. Mark the ones that are off-market at seed. Leave the ordinary ones alone. Fighting a normal term spends the goodwill you need for the scary ones.',
    choices: [],
  },
  {
    id: 'redpen_result',
    act: 2,
    title: 'Markup sent',
    sprite: 'document',
    body: 'Kindling reads the marks. What you left in the draft is now the deal. What you marked comes back to the seed norm, if it was actually off-market.',
    choices: [
      {
        id: 'onward',
        label: 'Start diligence with the terms you kept.',
        because: 'Diligence starts when the economics are real enough to paper. The clock is still runway.',
        effects: { reputation: 1, morale: -2, runway: -0.2 },
        next: (state) => (state.safes.some((safe) => safe.mfn) ? 'mfn_spring' : 'conversion'),
        destinations: ['mfn_spring', 'conversion'],
      },
    ],
  },
  {
    id: 'mfn_spring',
    act: 2,
    title: 'MFN wakes up',
    sprite: 'sheet',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'A mentor offers $50k at a $5M cap. Harbor’s MFN can copy that cheaper cap. Harbor’s percent would rise. A later post-money SAFE would not dilute Harbor. It would dilute you.',
    choices: [
      {
        id: 'amend',
        label: 'Amend the MFN off, and skip the mentor SAFE.',
        because: 'You pay for a small amendment and keep the earlier cap where you wrote it.',
        effects: { runway: -0.4, reputation: 4, morale: -2 },
        resolve: (draft) => {
          draft.safes = draft.safes.map((safe) => ({ ...safe, mfn: false }));
          return draft;
        },
        next: 'conversion',
      },
      {
        id: 'mina',
        label: 'Sign Mina’s cheaper SAFE.',
        because: 'Mina’s cap is friendlier to Mina. Harbor’s MFN copies it. Neither SAFE dilutes the other. You do.',
        effects: {
          reputation: -4,
          morale: 2,
          bankNewSafes: true,
          safes: [
            { id: 'mina', name: 'Mina', amount: 50_000, cap: 5_000_000, mfn: false, sideLetter: false, homemade: false },
          ],
        },
        next: 'conversion',
      },
      {
        id: 'leave',
        label: 'Issue nothing new and leave the MFN in.',
        because: 'It stays asleep only because you did not issue a cheaper SAFE. The clause is still loaded.',
        effects: { reputation: -2, morale: -2 },
        next: 'conversion',
      },
    ],
  },
  {
    id: 'conversion',
    act: 2,
    title: 'SAFEs convert',
    sprite: 'sheet',
    kind: 'conversion',
    body: 'The SAFEs convert in this round. Each one keeps purchase amount divided by its cap, then the new money dilutes everyone, including those SAFE holders. The pool still comes out of the founders.',
    choices: (state) => {
      if (state.safes.some((safe) => safe.sideLetter)) {
        return [
          {
            id: 'waive',
            label: 'Ask Harbor to waive the side letter.',
            because: 'The waiver costs a little time and gives the lead their allocation back.',
            effects: { runway: -0.4, reputation: 3, morale: -2 },
            resolve: (draft) => {
              draft.safes = draft.safes.map((safe) => ({ ...safe, sideLetter: false }));
              return draft;
            },
            next: 'diligence_intro',
          },
          {
            id: 'honor',
            label: 'Make room for Harbor’s pro rata.',
            because: 'Harbor is pleased. The lead’s allocation shrinks, and the relationship takes the dent.',
            effects: { reputation: -4, morale: -3 },
            next: 'diligence_intro',
          },
        ];
      }
      return [
        {
          id: 'onward',
          label: 'Send the pro forma with the conversion math.',
          because: 'The percents are checkable. That is the point of a post-money SAFE.',
          effects: { reputation: 2, morale: 2 },
          next: 'diligence_intro',
        },
      ];
    },
  },
  {
    id: 'diligence_intro',
    act: 2,
    title: 'The room opens',
    sprite: 'document',
    termsOnEnter: ['diligence'],
    body: 'Diligence counsel opens the data room. Critical holes get their own scenes. A tidy folder cannot invent an 83(b) or a signature you never collected.',
    choices: [
      {
        id: 'sprint',
        label: 'Spend two weeks filling the ordinary folders.',
        because: 'A fuller room answers boring questions. It does not repair a missed election or an unsigned contractor.',
        effects: { runway: -0.5, morale: -4, reputation: 4 },
        docs: PREPARABLE_DOC_IDS,
        next: (state) => nextDiligence('diligence_intro', state),
        destinations: after('diligence_intro'),
      },
      {
        id: 'send',
        label: 'Send the room you already have.',
        because: 'You keep the two weeks. Anything critical and missing still comes due.',
        effects: { morale: 3, reputation: -2 },
        next: (state) => nextDiligence('diligence_intro', state),
        destinations: after('diligence_intro'),
      },
    ],
  },
  {
    id: 'diligence_pete',
    act: 2,
    title: 'Git blame',
    sprite: 'pete',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'Counsel searches the repo and finds Pete. There is still no assignment. The lead likes the product and does not like buying code the company may not own.',
    choices: [
      {
        id: 'pay',
        label: 'Pay to get Pete’s signature now.',
        because: 'The signature arrives late and expensive. The IP rep can finally be true.',
        effects: { runway: -1.5, morale: -5, reputation: 4 },
        flags: { pete: 'signed' },
        docs: ['contractor-ip', 'contractor-agreements'],
        next: (state) => nextDiligence('diligence_pete', state),
        destinations: after('diligence_pete'),
      },
      {
        id: 'grant',
        label: 'Grant Pete 0.5% to sign this week.',
        because: 'The signature lands. The shares are new, so founders move and the SAFEs do not.',
        effects: { runway: -0.3, morale: -2, reputation: 1 },
        flags: { pete: 'signed' },
        docs: ['contractor-ip'],
        resolve: (draft) => {
          draft.grantedShares += BALANCE.peteGrantShares;
          return draft;
        },
        next: (state) => nextDiligence('diligence_pete', state),
        destinations: after('diligence_pete'),
      },
      {
        id: 'indemnity',
        label: 'Close on an IP indemnity instead.',
        because: 'The lead may still wire. You keep the risk that someone else owns the prototype.',
        effects: { runway: -0.4, reputation: -8, morale: -6 },
        flags: { ipIndemnity: true },
        next: (state) => nextDiligence('diligence_pete', state),
        destinations: after('diligence_pete'),
      },
    ],
  },
  {
    id: 'diligence_83b',
    act: 2,
    title: 'The tax hit',
    sprite: 'document',
    tone: 'consequence',
    kicker: 'Consequence',
    termsOnEnter: ['409a'],
    body: 'The 409A is no longer par value. Because the 83(b) was missed, value that vests can be ordinary income. Your accountant sets aside cash for a tax bill you cannot file away.',
    choices: [
      {
        id: 'reserve',
        label: 'Reserve the cash and disclose the miss.',
        because: 'You cannot backdate an 83(b). The reserve is runway leaving before you ever see that value.',
        effects: { runway: -1.5, morale: -8, reputation: -3 },
        docs: ['tax-note'],
        next: (state) => nextDiligence('diligence_83b', state),
        destinations: after('diligence_83b'),
      },
    ],
  },
  {
    id: 'diligence_cap',
    act: 2,
    title: 'The sheet doesn’t tie',
    sprite: 'sheet',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'Counsel adds the rows. A promise or a sloppy sum means the capitalization rep is not true yet. Post-money SAFEs keep their percent. New shares come out of the common.',
    choices: [
      {
        id: 'issue',
        label: 'Issue what you promised and send a clean sheet.',
        because: 'The late shares dilute founders. The SAFE percents stay where the caps put them.',
        effects: { runway: -0.6, reputation: -2, morale: -4 },
        docs: ['cap-table'],
        resolve: (draft) => {
          if (draft.flags.advisor === 'off-sheet') {
            draft.grantedShares += BALANCE.advisorShares;
            draft.flags.advisor = 'issued-late';
          }
          draft.flags.sloppySheet = false;
          return draft;
        },
        next: (state) => nextDiligence('diligence_cap', state),
        destinations: after('diligence_cap'),
      },
      {
        id: 'fight',
        label: 'Argue the promise, then issue it anyway.',
        because: 'The email was a promise. Arguing costs fees, and the shares still come out of the founders.',
        effects: { runway: -1.2, reputation: -6, morale: -5 },
        docs: ['cap-table'],
        resolve: (draft) => {
          if (draft.flags.advisor === 'off-sheet') {
            draft.grantedShares += BALANCE.advisorShares;
            draft.flags.advisor = 'issued-late';
          }
          draft.flags.sloppySheet = false;
          return draft;
        },
        next: (state) => nextDiligence('diligence_cap', state),
        destinations: after('diligence_cap'),
      },
    ],
  },
  {
    id: 'diligence_formd',
    act: 2,
    title: 'Late notice',
    sprite: 'document',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'Form D was due 15 days after the first sale. It is still a notice, not a permission slip. Late is better than silent, and it is not the same as on time.',
    choices: [
      {
        id: 'late',
        label: 'File it late and tell the states the truth.',
        because: 'You pay the awkwardness now. Diligence would rather see a late filing than a blank folder.',
        effects: { reputation: -2, morale: -3, runway: -0.3 },
        docs: ['form-d'],
        next: (state) => nextDiligence('diligence_formd', state),
        destinations: after('diligence_formd'),
      },
    ],
  },
  {
    id: 'diligence_wyoming',
    act: 2,
    title: 'Wrong state',
    sprite: 'counsel',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'Kindling’s counsel will not close preferred stock into the Wyoming company. Reincorporating to Delaware is the night-one shortcut, arriving with a bill.',
    choices: [
      {
        id: 'convert',
        label: 'Reincorporate and rebuild the minute book.',
        because: 'You pay the cleanup in cash and weeks. The seed can proceed in Delaware.',
        effects: { runway: -2, reputation: 3, morale: -6 },
        flags: { entity: 'delaware', messyDocs: false, counsel: 'pro' },
        docs: CORPORATE,
        next: (state) => nextDiligence('diligence_wyoming', state),
        destinations: after('diligence_wyoming'),
      },
      {
        id: 'walk',
        label: 'Ask them to close in Wyoming anyway.',
        because: 'They will not. The lead steps back, and the bridge is what is left.',
        effects: { reputation: -8, morale: -4, runway: -0.4 },
        next: 'lead_walks',
      },
    ],
  },
  {
    id: 'lead_walks',
    act: 2,
    title: 'Kindling passes',
    sprite: 'ghost',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'Kindling passes. The fund leads Delaware C-corps. The angels who remain will still wire a bridge. That is the round you have now.',
    choices: [
      {
        id: 'to-bridge',
        label: 'Go talk to the angels about a bridge.',
        because: 'You lost the lead. The bridge is a real choice, and it is not the same ending.',
        effects: { morale: -4, reputation: -3 },
        next: 'party_final',
      },
    ],
  },
  {
    id: 'diligence_gaps',
    act: 2,
    title: 'Missing pages',
    sprite: 'document',
    tone: 'consequence',
    kicker: 'Consequence',
    body: 'The index has holes counsel will not ignore: charter pieces, a stock purchase, a CIIAA, a deck. You can paper the fixable ones now or disclose the gaps and keep going.',
    choices: [
      {
        id: 'paper',
        label: 'Paper the missing corporate documents now.',
        because: 'You spend runway to make the reps true. A missed 83(b) still cannot be backdated.',
        effects: { runway: -0.8, reputation: 3, morale: -3 },
        flags: { messyDocs: false },
        resolve: (draft) => {
          for (const id of gapDocIds(draft)) {
            if (!draft.docs.includes(id)) draft.docs.push(id);
          }
          draft.flags.messyDocs = false;
          return draft;
        },
        next: (state) => nextDiligence('diligence_gaps', state),
        destinations: after('diligence_gaps'),
      },
      {
        id: 'disclose',
        label: 'Disclose the gaps and try to close anyway.',
        because: 'Honesty keeps the deal alive. The missing pages still sit on the disclosure schedule.',
        effects: { reputation: -5, morale: -3 },
        flags: { disclosedGaps: true },
        next: (state) => nextDiligence('diligence_gaps', state),
        destinations: after('diligence_gaps'),
      },
    ],
  },
  {
    id: 'nvca_spa',
    act: 2,
    title: 'Stock Purchase Agreement',
    sprite: 'document',
    docsOnEnter: ['spa', 'disclosure-schedule'],
    termsOnEnter: ['stock-purchase-agreement', 'representations', 'disclosure-schedule'],
    body: 'The Stock Purchase Agreement is the sale itself: price, representations, and closing conditions. The disclosure schedule is where a known problem is allowed to be true.',
    choices: nvcaChoices('nvca_spa'),
  },
  {
    id: 'nvca_coi',
    act: 2,
    title: 'The charter',
    sprite: 'document',
    docsOnEnter: ['amended-coi'],
    termsOnEnter: ['certificate-of-incorporation'],
    body: 'The Amended and Restated Certificate of Incorporation is filed in Delaware. Liquidation preference, conversion, and anti-dilution live here, not only on the term sheet.',
    choices: nvcaChoices('nvca_coi'),
  },
  {
    id: 'nvca_ira',
    act: 2,
    title: 'Investors’ Rights Agreement',
    sprite: 'document',
    docsOnEnter: ['ira', 'management-rights'],
    termsOnEnter: ['investors-rights-agreement', 'major-investor', 'pro-rata', 'information-rights'],
    body: 'The Investors’ Rights Agreement holds information rights, pro rata for major investors, and registration rights. A management rights letter may sit beside it for the fund.',
    choices: nvcaChoices('nvca_ira'),
  },
  {
    id: 'nvca_voting',
    act: 2,
    title: 'Voting Agreement',
    sprite: 'document',
    docsOnEnter: ['voting-agreement'],
    termsOnEnter: ['voting-agreement', 'drag-along'],
    body: 'The Voting Agreement sets the board and the drag-along. If the agreed group approves a sale, everyone else has to vote for it too.',
    choices: nvcaChoices('nvca_voting'),
  },
  {
    id: 'nvca_rofr',
    act: 2,
    title: 'ROFR and co-sale',
    sprite: 'document',
    docsOnEnter: ['rofr-cosale'],
    termsOnEnter: ['rofr', 'co-sale'],
    body: 'The Right of First Refusal and Co-Sale Agreement lets the company buy founder shares first, and lets investors sell alongside a founder who is selling.',
    choices: nvcaChoices('nvca_rofr'),
  },
  {
    id: 'wire_day',
    act: 2,
    title: 'Wire day',
    sprite: 'wire',
    kind: 'wire',
    termsOnEnter: ['wire'],
    body: 'The wire moves when the blocking pages are signed, not when someone says they are excited. Form D is a 15-day notice after the sale. It does not release the money.',
    choices: [],
  },
  {
    id: 'ending',
    act: 2,
    title: 'Debrief',
    sprite: 'wire',
    kind: 'ending',
    body: 'The round is over. The cap table, the grades, and the roads you did not take are the debrief.',
    choices: [],
  },
];

export const sceneMap = new Map(SCENES.map((scene) => [scene.id, scene]));
