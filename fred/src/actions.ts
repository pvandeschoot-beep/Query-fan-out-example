import { conflictMessage, conflictsFor } from './fred';
import { uid, type FredStore } from './store';
import type { FamEvent, Source, Suggestion, Task } from './types';

/** Zet geaccepteerde voorstellen om in taken en agenda-items. Geeft Fred's waarschuwingen terug. */
export function acceptSuggestions(store: FredStore, suggestions: Suggestion[], source: Source): { tasks: number; events: number; warnings: string[] } {
  const { settings } = store.state;
  const names = { a: settings.partners[0].name, b: settings.partners[1].name };
  const now = new Date().toISOString();
  const tasks: Task[] = [];
  const events: FamEvent[] = [];
  const warnings: string[] = [];

  for (const s of suggestions) {
    if (s.kind === 'event' && s.date) {
      const ev: FamEvent = { id: uid(), title: s.title, date: s.date, start: s.start, end: s.end, who: s.who, category: s.category, createdBy: settings.me, source };
      for (const other of conflictsFor(ev, [...store.state.events, ...events])) warnings.push(conflictMessage(ev, other, names));
      events.push(ev);
    } else {
      tasks.push({
        id: uid(), title: s.title, category: s.category, assignee: s.assignee, due: s.date, createdAt: now,
        createdBy: settings.me, source, points: s.points, repeat: 'none',
      });
    }
  }
  if (tasks.length) store.addTasks(tasks);
  if (events.length) store.addEvents(events);
  return { tasks: tasks.length, events: events.length, warnings };
}
