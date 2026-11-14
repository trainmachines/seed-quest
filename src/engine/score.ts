import { endingKind, type EndingKind } from './flow';
import { computeCapTable, pct } from './math';
import type { GameState } from './types';

export interface MeterGrade {
  meter: string;
  letter: 'A' | 'B' | 'C' | 'D' | 'F';
  detail: string;
}

export interface EndingScore {
  total: number;
  ending: EndingKind;
  grades: MeterGrade[];
}

export function scoreGame(state: GameState): EndingScore {
  const ending = endingKind(state);
  const table = computeCapTable(state);
  const grades = [
    gradeRunway(state.runway, ending),
    gradeEquity(table.foundersPct),
    gradeHundred('Morale', state.morale, 'The human budget for another process.'),
    gradeHundred('Reputation', state.reputation, 'How the next lead will hear the story.'),
  ];
  const docs = Math.min(state.docs.length, 36) * 4;
  const badges = state.achievements.length * 20;
  const endingBonus = ending === 'great' ? 120 : ending === 'okay' ? 70 : ending === 'bridge' ? 30 : 0;
  const total = Math.max(0, Math.round(grades.reduce((sum, grade) => sum + letterValue(grade.letter), 0) + docs + badges + endingBonus));
  return { total, ending, grades };
}

function gradeRunway(months: number, ending: EndingKind): MeterGrade {
  if (ending === 'runway' || months <= 0) {
    return { meter: 'Runway', letter: 'F', detail: `${months.toFixed(1)} months. The clock won.` };
  }
  if (months >= 24) return { meter: 'Runway', letter: 'A', detail: `${months.toFixed(1)} months after the money landed.` };
  if (months >= 18) return { meter: 'Runway', letter: 'B', detail: `${months.toFixed(1)} months. Enough to work, not to drift.` };
  if (months >= 10) return { meter: 'Runway', letter: 'C', detail: `${months.toFixed(1)} months. The next raise starts soon.` };
  if (months >= 4) return { meter: 'Runway', letter: 'D', detail: `${months.toFixed(1)} months. Payroll is already on the calendar.` };
  return { meter: 'Runway', letter: 'F', detail: `${months.toFixed(1)} months. This is a sprint you did not choose.` };
}

function gradeEquity(founders: number): MeterGrade {
  const label = pct(founders, 1);
  if (founders >= 0.63) return { meter: 'Founders’ equity', letter: 'A', detail: `${label} fully diluted. The pool and the SAFEs took a measured bite.` };
  if (founders >= 0.55) return { meter: 'Founders’ equity', letter: 'B', detail: `${label} fully diluted. Real dilution, still a founder-led company.` };
  if (founders >= 0.45) return { meter: 'Founders’ equity', letter: 'C', detail: `${label} fully diluted. The stack or the pool took a lot.` };
  if (founders >= 0.35) return { meter: 'Founders’ equity', letter: 'D', detail: `${label} fully diluted. Control gets harder from here.` };
  return { meter: 'Founders’ equity', letter: 'F', detail: `${label} fully diluted. The cap table is doing the talking.` };
}

function gradeHundred(meter: string, value: number, why: string): MeterGrade {
  const shown = `${Math.round(value)} / 100. ${why}`;
  if (value >= 75) return { meter, letter: 'A', detail: shown };
  if (value >= 60) return { meter, letter: 'B', detail: shown };
  if (value >= 45) return { meter, letter: 'C', detail: shown };
  if (value >= 30) return { meter, letter: 'D', detail: shown };
  return { meter, letter: 'F', detail: shown };
}

function letterValue(letter: MeterGrade['letter']): number {
  return { A: 100, B: 80, C: 60, D: 40, F: 15 }[letter];
}
