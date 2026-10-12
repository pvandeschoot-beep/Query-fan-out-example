import { useState } from 'react';
import { CATEGORIES } from '../categories';
import { relativeNL } from '../dates';
import type { FredStore } from '../store';
import type { CategoryId, PartnerId, Repeat, Task } from '../types';
import { Avatar, CategoryTag, partnerById } from './ui';

interface Props {
  task: Task;
  store: FredStore;
  today: string;
  projects?: string[];
  onDone?: (t: Task) => void;
}

const REPEAT_LABEL: Record<Repeat, string> = { none: 'Eenmalig', week: 'Elke week', month: 'Elke maand', year: 'Elk jaar' };

export function TaskRow({ task, store, today, projects = [], onDone }: Props) {
  const { state, toggleDone, updateTask, deleteTask } = store;
  const { partners, me } = state.settings;
  const [open, setOpen] = useState(false);
  const late = !task.doneAt && task.due && task.due < today;

  const cycleAssignee = () => {
    const order: (PartnerId | null)[] = [null, 'a', 'b'];
    updateTask(task.id, { assignee: order[(order.indexOf(task.assignee) + 1) % order.length] });
  };

  return (
    <li className={`task ${task.doneAt ? 'done' : ''} ${late ? 'late' : ''}`}>
      <div className="task-main">
        <button
          className="check"
          aria-label={task.doneAt ? 'Markeer als niet gedaan' : 'Afvinken'}
          onClick={() => {
            toggleDone(task.id, me, today);
            if (!task.doneAt) onDone?.(task);
          }}
        >
          {task.doneAt ? '✓' : ''}
        </button>
        <button className="task-body" onClick={() => setOpen((o) => !o)}>
          <span className="task-title">{task.title}</span>
          <span className="task-meta">
            <CategoryTag id={task.category} />
            {task.due && <span className={`due ${late ? 'due-late' : ''}`}>📅 {relativeNL(task.due, today)}</span>}
            {task.repeat !== 'none' && <span className="tag">🔁 {REPEAT_LABEL[task.repeat]}</span>}
            {task.project && <span className="tag tag-project">📁 {task.project}</span>}
            <span className="pts">+{task.points}</span>
            {task.doneBy && <span className="tag">gedaan door {partnerById(partners, task.doneBy).name}</span>}
          </span>
        </button>
        <button className="assignee" onClick={cycleAssignee} title="Klik om toe te wijzen">
          <Avatar partner={task.assignee ? partnerById(partners, task.assignee) : undefined} size={30} />
        </button>
      </div>

      {open && (
        <div className="task-edit">
          <label>
            Wat
            <input value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })} />
          </label>
          <div className="row">
            <label>
              Deadline
              <input type="date" value={task.due ?? ''} onChange={(e) => updateTask(task.id, { due: e.target.value || undefined })} />
            </label>
            <label>
              Wie
              <select value={task.assignee ?? ''} onChange={(e) => updateTask(task.id, { assignee: (e.target.value || null) as PartnerId | null })}>
                <option value="">Nog niemand</option>
                {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Soort
              <select value={task.category} onChange={(e) => updateTask(task.id, { category: e.target.value as CategoryId })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </label>
            <label>
              Herhalen
              <select value={task.repeat} onChange={(e) => updateTask(task.id, { repeat: e.target.value as Repeat })}>
                {Object.entries(REPEAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
          </div>
          <div className="row">
            <label>
              Project
              <input list="projects" value={task.project ?? ''} placeholder="bijv. Schoolkamp" onChange={(e) => updateTask(task.id, { project: e.target.value || undefined })} />
              <datalist id="projects">{projects.map((p) => <option key={p} value={p} />)}</datalist>
            </label>
            <label>
              Punten (moeite)
              <input type="number" min={1} max={10} value={task.points} onChange={(e) => updateTask(task.id, { points: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} />
            </label>
          </div>
          <label>
            Notitie
            <textarea rows={2} value={task.notes ?? ''} onChange={(e) => updateTask(task.id, { notes: e.target.value || undefined })} />
          </label>
          <div className="row end">
            <button className="btn ghost danger" onClick={() => deleteTask(task.id)}>Verwijderen</button>
            <button className="btn" onClick={() => setOpen(false)}>Klaar</button>
          </div>
        </div>
      )}
    </li>
  );
}
