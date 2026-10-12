import { addDays, addMonths, daysBetween, fromISO, toISO, toMinutes } from './dates';
import type { FamEvent, PartnerId, State, Task } from './types';

const DEFAULT_DURATION = 90; // minuten, als er geen eindtijd is

function interval(e: FamEvent): [number, number] | null {
  if (!e.start) return null; // hele dag
  const s = toMinutes(e.start);
  const end = e.end ? toMinutes(e.end) : s + DEFAULT_DURATION;
  return [s, Math.max(end, s + 1)];
}

/** Twee items botsen als ze overlappen en niet allebei het eigen ding van een andere partner zijn. */
export function clashes(a: FamEvent, b: FamEvent): boolean {
  if (a.id === b.id || a.date !== b.date) return false;
  const personal = (w: FamEvent['who']) => w === 'a' || w === 'b';
  if (personal(a.who) && personal(b.who) && a.who !== b.who) return false;
  const ia = interval(a);
  const ib = interval(b);
  if (!ia || !ib) {
    // Een hele-dag-item botst alleen als er een gezinsmoment bij betrokken is.
    return a.who === 'family' || b.who === 'family';
  }
  return ia[0] < ib[1] && ib[0] < ia[1];
}

export function conflictsFor(ev: FamEvent, events: FamEvent[]): FamEvent[] {
  return events.filter((o) => clashes(ev, o));
}

export function allConflicts(events: FamEvent[]): [FamEvent, FamEvent][] {
  const out: [FamEvent, FamEvent][] = [];
  for (let i = 0; i < events.length; i++)
    for (let j = i + 1; j < events.length; j++) if (clashes(events[i], events[j])) out.push([events[i], events[j]]);
  return out;
}

export function conflictMessage(newEv: FamEvent, other: FamEvent, names: Record<PartnerId, string>): string {
  const who = newEv.who === 'a' || newEv.who === 'b' ? names[newEv.who] : 'Jullie';
  const when = other.start ? `om ${other.start}` : 'die dag';
  return `${who} ${newEv.who === 'a' || newEv.who === 'b' ? 'heeft' : 'hebben'} „${newEv.title}” gepland, maar ${when} staat „${other.title}” al in de agenda. Dat gaat niet samen.`;
}

export interface Nudge {
  id: string;
  level: 'alarm' | 'let-op' | 'info' | 'feest';
  text: string;
  taskId?: string;
}

export const isOpen = (t: Task) => !t.doneAt;

export function nudges(state: State, todayISO: string): Nudge[] {
  const { tasks, events, settings } = state;
  const names = { a: settings.partners[0].name, b: settings.partners[1].name };
  const out: Nudge[] = [];

  for (const t of tasks.filter(isOpen)) {
    if (!t.due) continue;
    const d = daysBetween(todayISO, t.due);
    const owner = t.assignee ? names[t.assignee] : null;
    if (d < 0) {
      out.push({ id: `late-${t.id}`, level: 'alarm', taskId: t.id, text: `„${t.title}” is ${-d} ${-d === 1 ? 'dag' : 'dagen'} over de deadline${owner ? `, ${owner}` : ''}.` });
    } else if (d === 0) {
      out.push({ id: `today-${t.id}`, level: 'let-op', taskId: t.id, text: `Vandaag: „${t.title}”${owner ? ` (${owner})` : ' — nog van niemand!'}` });
    } else if (d <= 3 && !t.assignee) {
      out.push({ id: `nobody-${t.id}`, level: 'let-op', taskId: t.id, text: `„${t.title}” moet ${d === 1 ? 'morgen' : `over ${d} dagen`} af en niemand heeft hem opgepakt.` });
    } else if (d <= 2) {
      out.push({ id: `soon-${t.id}`, level: 'info', taskId: t.id, text: `${owner}, „${t.title}” moet ${d === 1 ? 'morgen' : 'overmorgen'} af.` });
    }
  }

  const horizon = toISO(addDays(fromISO(todayISO), 30));
  const upcoming = events.filter((e) => e.date >= todayISO && e.date <= horizon);
  for (const [a, b] of allConflicts(upcoming)) {
    out.push({ id: `clash-${a.id}-${b.id}`, level: 'alarm', text: conflictMessage(a, b, names) });
  }

  if (settings.anniversary) {
    const ann = fromISO(settings.anniversary);
    const today = fromISO(todayISO);
    const next = new Date(today.getFullYear(), ann.getMonth(), ann.getDate());
    if (next < today) next.setFullYear(next.getFullYear() + 1);
    const d = daysBetween(todayISO, toISO(next));
    if (d <= 14) {
      const years = next.getFullYear() - ann.getFullYear();
      out.push({ id: 'anniversary', level: d <= 3 ? 'alarm' : 'let-op', text: d === 0 ? `Het is vandaag jullie trouwdag (${years} jaar)! Gefeliciteerd 💍` : `Over ${d} dagen is het jullie trouwdag (${years} jaar). Cadeau, bloemen, oppas? Fred zegt het maar even.` });
    }
  }

  const unassigned = tasks.filter((t) => isOpen(t) && !t.assignee).length;
  if (unassigned >= 3) out.push({ id: 'unassigned', level: 'info', text: `Er liggen ${unassigned} taken waar nog niemand z'n naam aan heeft gehangen.` });

  const order = { alarm: 0, 'let-op': 1, info: 2, feest: 3 };
  return out.sort((x, y) => order[x.level] - order[y.level]);
}

export interface WeekStats {
  points: Record<PartnerId, number>;
  done: Record<PartnerId, Task[]>;
  created: Record<PartnerId, number>;
  open: Record<PartnerId | 'none', number>;
  openDueThisWeek: number;
}

/** Statistieken over de 7 dagen t/m endISO. Open taken tellen mee als ze binnen 7 dagen na endISO moeten. */
export function weekStats(state: State, endISO: string): WeekStats {
  const from = toISO(addDays(fromISO(endISO), -6));
  const to = endISO;
  const horizon = toISO(addDays(fromISO(endISO), 7));
  const inWeek = (iso?: string) => !!iso && iso.slice(0, 10) >= from && iso.slice(0, 10) <= to;
  const s: WeekStats = {
    points: { a: 0, b: 0 },
    done: { a: [], b: [] },
    created: { a: 0, b: 0 },
    open: { a: 0, b: 0, none: 0 },
    openDueThisWeek: 0,
  };
  for (const t of state.tasks) {
    if (t.doneAt && t.doneBy && inWeek(t.doneAt)) {
      s.points[t.doneBy] += t.points;
      s.done[t.doneBy].push(t);
    }
    if (inWeek(t.createdAt)) s.created[t.createdBy]++;
    if (isOpen(t)) {
      s.open[t.assignee ?? 'none']++;
      if (t.due && t.due <= horizon) s.openDueThisWeek++;
    }
  }
  return s;
}

const list = (items: string[]) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} én ${items[items.length - 1]}`;

/** Fred's oordeel over de week. Bij toon 'eerlijk' neemt Fred geen blad voor de mond. */
export function fredVerdict(state: State, todayISO: string): { text: string; mood: 'feest' | 'ok' | 'boos' | 'rustig' } {
  const s = weekStats(state, todayISO);
  const [pa, pb] = state.settings.partners;
  const honest = state.settings.tone === 'eerlijk';
  const total = s.points.a + s.points.b;

  if (total === 0) {
    return { mood: 'rustig', text: s.openDueThisWeek ? `Nog niks afgevinkt deze week, en er moeten er de komende week nog ${s.openDueThisWeek} af. Wie begint?` : 'Nog niks afgevinkt deze week. Rustig aan, of gewoon vergeten af te vinken?' };
  }

  const [busy, lazy] = s.points.a >= s.points.b ? [pa, pb] : [pb, pa];
  const share = s.points[busy.id] / total;
  const busyTitles = s.done[busy.id].slice(0, 3).map((t) => t.title.charAt(0).toLowerCase() + t.title.slice(1));

  if (share <= 0.6) {
    const allDone = s.openDueThisWeek === 0;
    return { mood: allDone ? 'feest' : 'ok', text: `${pa.name} ${s.points.a} punten, ${pb.name} ${s.points.b}. Mooi verdeeld.${allDone ? ' Niks dringends meer open: we did it! Samen! 🎉' : ''}` };
  }

  const createdTotal = s.created.a + s.created.b;
  const thinker = s.created.a >= s.created.b ? pa : pb;
  const other = thinker.id === pa.id ? pb : pa;
  const mentalLoad = createdTotal >= 4 && s.created[thinker.id] / createdTotal >= 0.75
    ? ` Bovendien bedacht ${thinker.name} ${s.created[thinker.id]} van de ${createdTotal} nieuwe taken. Dát is de mental load, ${other.name}.`
    : '';

  if (honest) {
    const did = s.points[lazy.id] === 0 ? 'geen flikker gedaan' : `maar ${s.points[lazy.id]} ${s.points[lazy.id] === 1 ? 'punt' : 'punten'} gehaald`;
    return { mood: 'boos', text: `${lazy.name}, je hebt deze week ${did}, terwijl ${busy.name} ${list(busyTitles)} heeft gedaan.${mentalLoad}` };
  }
  return { mood: 'ok', text: `${busy.name} deed deze week het meeste (${list(busyTitles)}). ${lazy.name}, pak jij de volgende op?${mentalLoad}` };
}

/** Bij afvinken van een terugkerende taak: de volgende alvast klaarzetten. */
export function nextOccurrence(t: Task, todayISO: string): string | undefined {
  if (t.repeat === 'none') return undefined;
  const base = fromISO(t.due ?? todayISO);
  if (t.repeat === 'week') return toISO(addDays(base, 7));
  return toISO(addMonths(base, t.repeat === 'month' ? 1 : 12));
}
