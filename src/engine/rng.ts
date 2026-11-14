/** Mulberry32. The seed lives on the save so a slot replays the same rolls. */
export function rngNext(seed: number): { value: number; next: number } {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const next = (t ^ (t >>> 14)) >>> 0;
  return { value: next / 4294967296, next };
}
