# Seed Quest: From Napkin to Wire

A retro, choose-your-own-adventure about US pre-seed and seed fundraising. You incorporate, file an 83(b), chase a missing IP assignment, stack post-money SAFEs, negotiate a seed term sheet, survive diligence, and try to get the wire in the bank.

It is a game for first-time founders, accelerator cohorts, and classrooms. The hassles are played for laughs. The documents and the math are the real ones people trip over.

**Educational only. Not legal, tax, or investment advice.** The story is a fictional US example: a Delaware C-corp, YC-style post-money SAFEs, and the NVCA model documents. Laws and market terms change. A real round needs a lawyer.

## Play

Meters:

- **Runway** — months of cash.
- **Founders’ equity** — fully diluted, from the cap table.
- **Morale** — how much process you have left in you.
- **Reputation** — how the next lead will hear the story.

Every choice moves at least one of them. Some Act 1 choices come back during Act 2 diligence: a missed 83(b), a contractor who never assigned the code, a cap table that does not add up, a side letter, an MFN.

There are four endings: a great priced round, an okay priced round, a bridge, and running out of runway.

Keys: `1`–`9` choose, `D` data room, `G` glossary, `Esc` back, `M` sound. Sound is off until you turn it on.

Progress is stored in this browser, in three save slots. Nothing is uploaded. The save layer is a small repository interface so accounts and a leaderboard can be added later without rewriting the story engine.

## Run it locally

```bash
npm install
npm test
npm run dev
```

Open http://localhost:5173/seed-quest/

The production base path is `/seed-quest/`, which matches GitHub Pages at `https://trainmachines.github.io/seed-quest/`.

```bash
npm run build
npm run preview
```

## Add a scene

Story content lives in `src/data/scenes.ts`. The engine in `src/engine/` owns state, SAFE math, deadlines, and endings.

1. Add a scene object with a unique `id`, an `act`, a short `body` (keep it at or under 80 words), and `choices`.
2. Each choice needs a `because` line and an effect that changes runway, morale, reputation, the cap table, or the cash you bank.
3. Point `next` at another scene id. If `next` is a function, list every possible id in `destinations`.
4. Grant documents with `docs` or `docsOnEnter` using ids from `src/data/documents.ts`.
5. Unlock glossary terms with `terms` or `termsOnEnter` using ids from `src/data/glossary.ts`. The first time a term appears, the player gets a codex card.

`npm test` checks that scenes stay under 80 words, choices move a meter, links resolve, and referenced documents and terms exist.

Do not hard-code diluted percentages in scene copy. `src/engine/math.ts` is the cap table:

- Post-money SAFE ownership = purchase amount ÷ post-money cap.
- A later post-money SAFE dilutes founders, not earlier SAFE holders.
- In the priced round, the option-pool increase dilutes SAFE holders and founders. New investors are not diluted by that pool.
- If the pre-money is below a SAFE cap, the SAFE converts at the round price (the cap is a ceiling).
- Priced-round post-money = pre-money + new money.
- Effective pre-money = headline pre-money − (pool % × post-money).

## Add a data room document

Add an entry to `DOCUMENTS` in `src/data/documents.ts` with the folder, round, what it is, why investors ask, what it is used for, and a gotcha. Set `critical` if missing it should be able to slow diligence, and `preparable` if the Act 2 “fill the room” choice can collect it. Then grant that id from the scene where the player actually creates it.

## Add a glossary term

Add an entry to `GLOSSARY` in `src/data/glossary.ts` with a plain definition, why it matters, and an example. Unlock it from a scene or choice, or from a “road not taken” in `src/data/paths.ts`. A story term that is never unlocked fails the content test.

Acronyms live in `src/data/acronyms.ts`. Each one has the expansion, a one-line meaning, and why a founder cares. Story text and data room documents spell a term out the first time it appears in that scene or document, and every acronym can be hovered, focused, or tapped for the same definition. `npm test` scans content for uppercase tokens of two or more letters and fails if a new one is missing from that list or the allowlist.

## Deploy

Pushes to `main` run `.github/workflows/pages.yml`. The workflow tests, builds, and deploys with GitHub Actions.

One repo setting has to be turned on by hand: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Until that is set, the workflow can succeed at building and still have nowhere to publish.

## What’s in v1

- Act 1, pre-seed: entity choice, founder stock and vesting, a visible 83(b) 30-day clock, the ghost contractor, the option pool, the raise, post-money SAFE stacking, Form D’s 15-day notice, signatures, and the wire.
- Act 2, priced seed: a lead or a bridge, pre-money vs post-money, the option pool shuffle, a red-pen pass on the term sheet, SAFE conversion, confirmatory diligence, the five NVCA documents, and a wire-day checklist.
- Data room, glossary, endings with a cap table and per-meter grades, badges, and local save slots.
