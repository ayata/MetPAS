/* Deterministic helpers for synthetic data. Every demo renders the same records. */

export function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function gen(seed: number) {
  const r = rng(seed);
  return {
    r,
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)],
    int: (min: number, max: number) => Math.floor(min + r() * (max - min + 1)),
    chance: (p: number) => r() < p,
  };
}

const DAY = 86400000;
export const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
export const isoAgo = (minutes: number) => new Date(Date.now() - minutes * 60000).toISOString();

export const PEOPLE_FIRST = ['Alicia', 'Brandon', 'Carmen', 'Derek', 'Elise', 'Felix', 'Gwen', 'Hector', 'Irene', 'Jasper', 'Kara', 'Liam', 'Maya', 'Nolan', 'Paige', 'Quentin', 'Rosa', 'Simon', 'Tessa', 'Usman'];
export const PEOPLE_LAST = ['Archer', 'Bishop', 'Carver', 'Dalton', 'Ellison', 'Foster', 'Garrison', 'Hale', 'Irving', 'Jensen', 'Keller', 'Lowell', 'Marsh', 'Norwood', 'Prescott', 'Quinlan', 'Rhodes', 'Sterling', 'Tate', 'Underwood'];
export const STATES = ['CT', 'NC', 'FL', 'TX', 'OH', 'CO', 'AZ', 'NY', 'CA', 'IL'];
