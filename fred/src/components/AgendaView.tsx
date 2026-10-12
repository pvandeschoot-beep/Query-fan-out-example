import { useState } from 'react';
import { CATEGORIES } from '../categories';
import { addDays, formatLongNL, fromISO, relativeNL, toISO } from '../dates';
import { allConflicts, conflictMessage, conflictsFor, isOpen } from '../fred';
import { uid } from '../store';
import type { CategoryId, FamEvent, Who } from '../types';
import { type ViewProps, WhoDot, whoLabel } from './ui';

export function AgendaView({ store, today, notify }: ViewProps) {
  const { state, addEvents, deleteEvent } = store;
  const { partners, me } = state.settings;
  const names = { a: partners[0].name, b: partners[1].name };
  const [days, setDays] = useState(30);
  const [form, setForm] = useState({ title: '', date: today, start: '', end: '', who: 'family' as Who, category: 'overig' as CategoryId });

  const until = toISO(addDays(fromISO(today), days));
  const events = state.events.filter((e) => e.date >= today && e.date <= until);
  const tasks = state.tasks.filter((t) => isOpen(t) && t.due && t.due >= today && t.due <= until);
  const clashIds = new Set(allConflicts(events).flatMap(([a, b]) => [a.id, b.id]));
  const dates = [...new Set([...events.map((e) => e.date), ...tasks.map((t) => t.due!)])].sort();

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    const ev: FamEvent = { id: uid(), title: form.title.trim(), date: form.date, start: form.start || undefined, end: form.end || undefined, who: form.who, category: form.category, createdBy: me, source: 'handmatig' };
    const clashes = conflictsFor(ev, state.events);
    addEvents([ev]);
    if (clashes.length) clashes.forEach((c) => notify(`⚠️ ${conflictMessage(ev, c, names)}`, 'alarm'));
    else notify('In de agenda gezet.');
    setForm((f) => ({ ...f, title: '', start: '', end: '' }));
  };

  return (
    <section className="view">
      <h2>Agenda</h2>
      <form className="card add-event" onSubmit={add}>
        <input placeholder="Wat? Bijv. Padel, Schoolmusical, Studiedag" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="row wrap">
          <label>Datum<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
          <label>Van<input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></label>
          <label>Tot<input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></label>
          <label>
            Voor
            <select value={form.who} onChange={(e) => setForm({ ...form, who: e.target.value as Who })}>
              <option value="family">Gezin</option>
              <option value="both">Samen</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label>
            Soort
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as CategoryId })}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
            </select>
          </label>
        </div>
        <div className="row end"><button className="btn primary" disabled={!form.title.trim()}>Toevoegen</button></div>
        <p className="muted small">„Gezin” = iets waar je bij hoort te zijn (musical, avondvierdaagse, studiedag). Fred waarschuwt als iemand daar iets anders overheen plant.</p>
      </form>

      {dates.length === 0 && <p className="empty">De komende {days} dagen is het leeg.</p>}
      {dates.map((date) => (
        <div key={date} className="day">
          <h3>{formatLongNL(date)} <span className="muted small">{relativeNL(date, today)}</span></h3>
          <ul className="events">
            {events.filter((e) => e.date === date).sort((a, b) => (a.start ?? '').localeCompare(b.start ?? '')).map((e) => (
              <li key={e.id} className={`event ${clashIds.has(e.id) ? 'clash' : ''}`}>
                <span className="event-time">{e.start ? `${e.start}${e.end ? `–${e.end}` : ''}` : 'hele dag'}</span>
                <span className="grow">{e.title}{clashIds.has(e.id) && <span className="clash-tag">botst!</span>}</span>
                <span className="muted small">{whoLabel(e.who, partners)}</span>
                <WhoDot who={e.who} partners={partners} />
                <button className="icon-btn" aria-label="Verwijderen" onClick={() => deleteEvent(e.id)}>×</button>
              </li>
            ))}
            {tasks.filter((t) => t.due === date).map((t) => (
              <li key={t.id} className="event event-task">
                <span className="event-time">deadline</span>
                <span className="grow">{t.title}</span>
                <span className="muted small">{t.assignee ? names[t.assignee] : 'niemand'}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {days < 365 && <button className="btn ghost wide" onClick={() => setDays((d) => d + 60)}>Verder vooruit kijken</button>}
    </section>
  );
}
