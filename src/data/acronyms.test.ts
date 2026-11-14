import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACRONYM_ALLOWLIST, ACRONYMS, annotateAcronyms } from './acronyms';
import { GLOSSARY, glossaryMap } from './glossary';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

const CONTENT_FILES = [
  'src/data/scenes.ts',
  'src/data/documents.ts',
  'src/data/glossary.ts',
  'src/data/paths.ts',
  'src/data/clauses.ts',
  'src/data/acronyms.ts',
  'src/engine/achievements.ts',
  'src/engine/flow.ts',
  'src/engine/score.ts',
  'src/components/Screens.tsx',
  'src/components/Chrome.tsx',
  'src/components/Mechanics.tsx',
  'src/App.tsx',
];

const REQUIRED: Array<[string, string]> = [
  ['NVCA', 'National Venture Capital Association'],
  ['QSBS', 'Qualified Small Business Stock'],
  ['SAFE', 'Simple Agreement for Future Equity'],
  ['MFN', 'Most favored nation'],
  ['ROFR', 'Right of first refusal'],
  ['SPA', 'Stock Purchase Agreement'],
  ['IRA', 'Investors’ Rights Agreement'],
  ['83(b)', 'Section 83(b) election'],
  ['Form D', 'SEC Form D'],
  ['SEC', 'Securities and Exchange Commission'],
  ['IRS', 'Internal Revenue Service'],
  ['LLC', 'Limited liability company'],
  ['C-corp', 'C corporation'],
  ['IP', 'Intellectual property'],
  ['CIIAA', 'Confidential Information and Invention Assignment Agreement'],
  ['PIIA', 'Proprietary Information and Invention Assignment Agreement'],
  ['KYC', 'Know Your Customer'],
  ['ESOP', 'Employee stock ownership plan'],
  ['FMV', 'Fair market value'],
  ['409A', 'Section 409A'],
  ['VC', 'Venture capital'],
  ['LP', 'Limited partner'],
  ['GP', 'General partner'],
  ['ARR', 'Annual recurring revenue'],
  ['MRR', 'Monthly recurring revenue'],
  ['TAM', 'Total addressable market'],
  ['ACV', 'Annual contract value'],
  ['EIN', 'Employer Identification Number'],
  ['DE', 'Delaware'],
];

function quotedStrings(source: string): string[] {
  const found: string[] = [];
  const re = /`(?:\\[\s\S]|[^\\`])*`|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;
  for (const match of source.matchAll(re)) found.push(match[0].slice(1, -1));
  return found;
}

describe('acronyms', () => {
  it('defines every uppercase token in the game content', () => {
    const known = new Set(ACRONYMS.map((entry) => entry.token));
    const missing = new Map<string, string[]>();
    for (const file of CONTENT_FILES) {
      const source = readFileSync(join(root, file), 'utf8');
      for (const value of quotedStrings(source)) {
        for (const token of value.match(/[A-Z]{2,}/g) ?? []) {
          if (known.has(token) || ACRONYM_ALLOWLIST.has(token)) continue;
          const where = missing.get(token) ?? [];
          if (!where.includes(file)) where.push(file);
          missing.set(token, where);
        }
      }
    }
    const report = [...missing.entries()].map(([token, files]) => `${token} (${files.join(', ')})`).join('\n');
    expect(report, `uppercase tokens missing from the glossary or allowlist:\n${report}`).toBe('');
  });

  it('spells out the acronyms a first-time founder has to know', () => {
    for (const [token, expansion] of REQUIRED) {
      const entry = ACRONYMS.find((item) => item.token === token);
      expect(entry, token).toBeTruthy();
      expect(entry?.expansion, token).toBe(expansion);
      expect(entry?.plain.length, token).toBeGreaterThan(20);
      expect(entry?.why.length, token).toBeGreaterThan(20);
      expect(glossaryMap.has(entry?.id ?? ''), token).toBe(true);
    }
    const qsbs = glossaryMap.get('qsbs');
    expect(qsbs?.definition).toContain('Qualified Small Business Stock');
    expect(qsbs?.definition).toContain('Section 1202');
    const nvca = glossaryMap.get('nvca');
    expect(nvca?.definition).toContain('National Venture Capital Association');
    expect(new Set(GLOSSARY.map((entry) => entry.id)).size).toBe(GLOSSARY.length);
    expect(new Set(ACRONYMS.map((entry) => entry.token)).size).toBe(ACRONYMS.length);
  });

  it('spells an acronym out once per scope, including a trailing plural', () => {
    const seen = new Set<string>();
    const first = annotateAcronyms('Kindling sends NVCA documents, then more NVCA paper.', seen, true);
    const marks = first.filter((part) => part.kind === 'acronym');
    expect(marks).toHaveLength(2);
    expect(marks[0]).toMatchObject({ token: 'NVCA', spellOut: true, expansion: 'National Venture Capital Association' });
    expect(marks[1]).toMatchObject({ spellOut: false });
    const again = annotateAcronyms('NVCA', seen, true);
    expect(again[0]).toMatchObject({ kind: 'acronym', spellOut: false });

    const plural = annotateAcronyms('Post-money SAFEs stack.', new Set(), true);
    expect(plural.filter((part) => part.kind === 'acronym')[0]).toMatchObject({ shown: 'SAFEs', spellOut: true });
    expect(annotateAcronyms('SAFELY does not count.', new Set(), true).every((part) => part.kind === 'text')).toBe(true);
    expect(annotateAcronyms('File the 83(b) and Form D.', new Set(), true).filter((part) => part.kind === 'acronym')).toHaveLength(2);
  });
});
