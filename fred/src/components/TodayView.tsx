import { useState } from 'react';
import { acceptSuggestions } from '../actions';
import { formatLongNL, fromISO } from '../dates';
import { fredVerdict, isOpen, nudges } from '../fred';
import { parseInput } from '../parser';
import { TaskRow } from './TaskRow';
import { type ViewProps, WhoDot } from './ui';

const MOOD_FACE = { feest: '🥳', ok: '🙂', boos: '🤨', rustig: '😴' } as const;

export function TodayView({ store, today, notify }: ViewProps) {
  const { state } = store;
  const { partners, me } = state.settings;
  const [quick, setQuick] = useState('');
  const verdict = fredVerdict(state, today);
  const list = nudges(state, today);
  const todayEvents = state.events.filter((e) => e.date === today).sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));
  const mine = state.tasks
    .filter((t) => isOpen(t) && (t.assignee === me || (!t.assignee && t.due && t.due <= today)))
    .sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'))
    .slice(0, 6);
  const meName = partners.find((p) => p.id === me)!.name;

  const addQuick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quick.trim()) return;
    const sugg = parseInput(quick, { today: fromISO(today), partners, source: 'handmatig' });
    const res = acceptSuggestions(store, sugg, 'handmatig');
    notify(res.events ? 'In de agenda gezet.' : 'Genoteerd. Fred onthoudt het.');
    res.warnings.forEach((w) => notify(`⚠️ ${w}`, 'alarm'));
    setQuick('');
  };

  return (
    <section className="view">
      <p className="date-line">{formatLongNL(today)}</p>

      <div className={`fred-card mood-${verdict.mood}`}>
        <span className="fred-face" aria-hidden>{MOOD_FACE[verdict.mood]}</span>
        <div>
          <strong>Fred zegt</strong>
          <p>{verdict.text}</p>
        </div>
      </div>

      <form className="quick" onSubmit={addQuick}>
        <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Wat moet er gebeuren? Bijv. „Paspoort verlengen voor 1 maart”" />
        <button className="btn primary" disabled={!quick.trim()}>+</button>
      </form>

      {list.length > 0 && (
        <>
          <h3>Seintjes</h3>
          <ul className="nudges">
            {list.map((n) => <li key={n.id} className={`nudge nudge-${n.level}`}>{n.text}</li>)}
          </ul>
        </>
      )}

      <h3>Vandaag in de agenda</h3>
      {todayEvents.length === 0 ? (
        <p className="muted">Niks gepland. Geniet ervan.</p>
      ) : (
        <ul className="events">
          {todayEvents.map((e) => (
            <li key={e.id} className="event">
              <span className="event-time">{e.start ? `${e.start}${e.end ? `–${e.end}` : ''}` : 'hele dag'}</span>
              <span className="grow">{e.title}</span>
              <WhoDot who={e.who} partners={partners} />
            </li>
          ))}
        </ul>
      )}

      <h3>Voor jou, {meName}</h3>
      {mine.length === 0 ? (
        <p className="muted">Niks op jouw naam. Kijk eens bij <em>Taken</em> wat er nog van niemand is.</p>
      ) : (
        <ul className="tasks">
          {mine.map((t) => <TaskRow key={t.id} task={t} store={store} today={today} onDone={(t) => notify(`+${t.points} punten. Lekker bezig!`, 'ok')} />)}
        </ul>
      )}
    </section>
  );
}
