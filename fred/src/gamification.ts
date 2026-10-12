import { daysBetween } from './dates';
import type { PartnerId, State, Task } from './types';

export const LEVELS = [
  { min: 0, title: 'Lanterfanter' },
  { min: 10, title: 'Meedenker' },
  { min: 30, title: 'Klusjesmaker' },
  { min: 60, title: 'Regelaar' },
  { min: 100, title: 'Huishoudheld' },
  { min: 160, title: 'Mental-load-meester' },
  { min: 250, title: 'Ome Fred' },
];

export function levelFor(points: number) {
  const idx = LEVELS.reduce((acc, l, i) => (points >= l.min ? i : acc), 0);
  const next = LEVELS[idx + 1];
  return {
    level: idx + 1,
    title: LEVELS[idx].title,
    next: next?.title,
    progress: next ? (points - LEVELS[idx].min) / (next.min - LEVELS[idx].min) : 1,
    toGo: next ? next.min - points : 0,
  };
}

export interface Badge {
  id: string;
  emoji: string;
  label: string;
  desc: string;
  test: (done: Task[]) => boolean;
}

const count = (done: Task[], re: RegExp) => done.filter((t) => re.test(t.title)).length;

export const BADGES: Badge[] = [
  { id: 'eerste', emoji: '✅', label: 'Eerste vinkje', desc: 'Je eerste taak afgevinkt', test: (d) => d.length >= 1 },
  { id: 'tien', emoji: '🔟', label: 'Op dreef', desc: '10 taken afgevinkt', test: (d) => d.length >= 10 },
  { id: 'laundry', emoji: '🧺', label: 'Chief Laundry Officer', desc: '5 keer de was, strijk of gymkleren', test: (d) => count(d, /\b(was|wassen|strijk\w*|gymkleren|wasmachine)\b/i) >= 5 },
  { id: 'kliko', emoji: '🗑️', label: 'Kliko-koning(in)', desc: '3 keer de kliko of het afval', test: (d) => count(d, /\b(kliko|container|afval|vuilnis|glasbak|papierbak)\b/i) >= 3 },
  { id: 'cadeau', emoji: '🎁', label: 'Cadeau-genie', desc: 'Aan een verjaardag of cadeau gedacht', test: (d) => count(d, /\b(verjaardag\w*|cadeau\w*|surprise\w*|juffencadeau)\b/i) >= 1 },
  { id: 'admin', emoji: '🗂️', label: 'Admin-ninja', desc: '3 administratieve klussen', test: (d) => d.filter((t) => t.category === 'admin').length >= 3 },
  { id: 'dokter', emoji: '🩺', label: 'Huisarts-held', desc: '2 zorgtaken (arts, tandarts, apotheek)', test: (d) => d.filter((t) => t.category === 'gezondheid').length >= 2 },
  { id: 'school', emoji: '🎒', label: 'Schoolplein-strateeg', desc: '5 schooltaken', test: (d) => d.filter((t) => t.category === 'school').length >= 5 },
  { id: 'vroeg', emoji: '🐦', label: 'Vroege vogel', desc: '3 taken ruim vóór de deadline af', test: (d) => d.filter((t) => t.due && t.doneAt && daysBetween(t.doneAt.slice(0, 10), t.due) >= 3).length >= 3 },
];

export const doneBy = (state: State, id: PartnerId) => state.tasks.filter((t) => t.doneBy === id && t.doneAt);

export const pointsOf = (tasks: Task[]) => tasks.reduce((s, t) => s + t.points, 0);

export function parentOfTheMonth(state: State, todayISO: string): { id: PartnerId; points: number } | null {
  const month = todayISO.slice(0, 7);
  const pts = { a: 0, b: 0 };
  for (const t of state.tasks) if (t.doneBy && t.doneAt?.startsWith(month)) pts[t.doneBy] += t.points;
  if (pts.a === pts.b) return null;
  const id: PartnerId = pts.a > pts.b ? 'a' : 'b';
  return { id, points: pts[id] };
}
