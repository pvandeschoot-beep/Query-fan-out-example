import { useMemo, useState } from 'react';
import { addDays, fromISO, toISO } from '../dates';
import { isOpen } from '../fred';
import type { Task } from '../types';
import { TaskRow } from './TaskRow';
import type { ViewProps } from './ui';

type Filter = 'open' | 'mine' | 'partner' | 'nobody' | 'done';

export function TasksView({ store, today, notify }: ViewProps) {
  const { state } = store;
  const { partners, me } = state.settings;
  const other = me === 'a' ? 'b' : 'a';
  const [filter, setFilter] = useState<Filter>('open');
  const [project, setProject] = useState<string>('');

  const projects = useMemo(() => [...new Set(state.tasks.map((t) => t.project).filter(Boolean) as string[])].sort(), [state.tasks]);

  const filtered = state.tasks.filter((t) => {
    if (project && t.project !== project) return false;
    switch (filter) {
      case 'open': return isOpen(t);
      case 'mine': return isOpen(t) && t.assignee === me;
      case 'partner': return isOpen(t) && t.assignee === other;
      case 'nobody': return isOpen(t) && !t.assignee;
      case 'done': return !isOpen(t);
    }
  });

  const weekEnd = toISO(addDays(fromISO(today), 7));
  const groups: [string, Task[]][] = filter === 'done'
    ? [['Gedaan', [...filtered].sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))]]
    : [
        ['Te laat', filtered.filter((t) => t.due && t.due < today)],
        ['Vandaag', filtered.filter((t) => t.due === today)],
        ['Komende week', filtered.filter((t) => t.due && t.due > today && t.due <= weekEnd)],
        ['Later', filtered.filter((t) => t.due && t.due > weekEnd)],
        ['Zonder deadline', filtered.filter((t) => !t.due)],
      ].map(([k, v]) => [k as string, (v as Task[]).sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''))]);

  const name = (id: 'a' | 'b') => partners.find((p) => p.id === id)!.name;
  const FILTERS: [Filter, string][] = [['open', 'Alles open'], ['mine', name(me)], ['partner', name(other)], ['nobody', 'Van niemand'], ['done', 'Gedaan']];

  return (
    <section className="view">
      <h2>Taken</h2>
      <div className="chips">
        {FILTERS.map(([f, label]) => (
          <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{label}</button>
        ))}
      </div>
      {projects.length > 0 && (
        <div className="chips">
          <button className={`chip small ${project === '' ? 'active' : ''}`} onClick={() => setProject('')}>Alle projecten</button>
          {projects.map((p) => (
            <button key={p} className={`chip small ${project === p ? 'active' : ''}`} onClick={() => setProject(p)}>📁 {p}</button>
          ))}
        </div>
      )}
      <p className="muted small">Tik op het rondje rechts om een taak toe te wijzen, op de taak zelf om hem aan te passen.</p>

      {filtered.length === 0 && <p className="empty">Niks hier. {filter === 'nobody' ? 'Alles heeft een eigenaar 👏' : ''}</p>}
      {groups.filter(([, items]) => items.length).map(([label, items]) => (
        <div key={label}>
          <h3>{label} <span className="count">{items.length}</span></h3>
          <ul className="tasks">
            {items.map((t) => (
              <TaskRow key={t.id} task={t} store={store} today={today} projects={projects} onDone={(t) => notify(`+${t.points} punten voor „${t.title}”`, 'ok')} />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
