const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

export const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  r.setDate(Math.min(day, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
  return r;
};

/** Aantal dagen van a naar b (positief als b later is). */
export const daysBetween = (a: string, b: string) =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);

/** Maandag van de week waarin d valt. */
export const startOfWeek = (d: Date) => {
  const s = startOfDay(d);
  return addDays(s, -((s.getDay() + 6) % 7));
};

export const formatNL = (iso: string) =>
  fromISO(iso).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });

export const formatLongNL = (iso: string) =>
  fromISO(iso).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });

export function relativeNL(iso: string, today: string): string {
  const diff = daysBetween(today, iso);
  if (diff === 0) return 'vandaag';
  if (diff === 1) return 'morgen';
  if (diff === 2) return 'overmorgen';
  if (diff === -1) return 'gisteren';
  if (diff < 0) return `${-diff} dagen te laat`;
  if (diff < 7) return `over ${diff} dagen`;
  return formatNL(iso);
}

export const toMinutes = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
};
