import { useCallback, useEffect, useState } from 'react';
import { AgendaView } from './components/AgendaView';
import { BalanceView } from './components/BalanceView';
import { InboxView } from './components/InboxView';
import { SettingsView } from './components/SettingsView';
import { TasksView } from './components/TasksView';
import { TodayView } from './components/TodayView';
import { Avatar } from './components/ui';
import { toISO } from './dates';
import { demoState } from './demo';
import { isOpen, nudges } from './fred';
import { useFredStore } from './store';
import type { Partner } from './types';

type Tab = 'vandaag' | 'inbox' | 'taken' | 'agenda' | 'balans' | 'instellingen';
const TABS: [Tab, string, string][] = [
  ['vandaag', '🏠', 'Vandaag'],
  ['inbox', '➕', 'Inbox'],
  ['taken', '✅', 'Taken'],
  ['agenda', '📅', 'Agenda'],
  ['balans', '⚖️', 'Balans'],
  ['instellingen', '⚙️', 'Meer'],
];

interface Toast {
  id: number;
  text: string;
  level: 'alarm' | 'ok' | 'info';
}

function useToday() {
  const [today, setToday] = useState(() => toISO(new Date()));
  useEffect(() => {
    const t = setInterval(() => setToday(toISO(new Date())), 60_000);
    return () => clearInterval(t);
  }, []);
  return today;
}

export default function App() {
  const store = useFredStore();
  const { state, updateSettings, replaceAll } = store;
  const today = useToday();
  const [tab, setTab] = useState<Tab>('vandaag');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { partners, me } = state.settings;

  const notify = useCallback((text: string, level: 'alarm' | 'ok' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, level }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), level === 'alarm' ? 9000 : 3500);
  }, []);

  // Eén systeemmelding per dag met wat er speelt.
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted' || state.settings.lastNotified === today) return;
    const urgent = nudges(state, today).filter((n) => n.level === 'alarm' || n.level === 'let-op');
    if (urgent.length) {
      new Notification('Fred', { body: urgent.slice(0, 3).map((n) => n.text).join('\n') });
    }
    updateSettings({ lastNotified: today });
  }, [state, today, updateSettings]);

  const isFresh = state.tasks.length === 0 && state.events.length === 0 && partners[0].name === 'Partner 1';
  const [names, setNames] = useState(['', '']);

  if (isFresh) {
    const start = () => {
      const next = partners.map((p, i) => ({ ...p, name: names[i].trim() || p.name })) as [Partner, Partner];
      updateSettings({ partners: next });
      setTab('inbox');
    };
    return (
      <div className="onboarding">
        <div className="logo big-logo">Fred<span>.</span></div>
        <p className="tagline">Eindelijk een man die aan alles denkt.</p>
        <p>Zwemles, belastingaangifte, gymkleren, het juffencadeau. Fred onthoudt het, verdeelt het en geeft een seintje. Zodat het niet meer in het hoofd van één van jullie zit.</p>
        <div className="card">
          <label>Jouw naam<input value={names[0]} onChange={(e) => setNames([e.target.value, names[1]])} placeholder="Bijv. Job" autoFocus /></label>
          <label>Je partner<input value={names[1]} onChange={(e) => setNames([names[0], e.target.value])} placeholder="Bijv. Karin" /></label>
          <button className="btn primary wide" disabled={!names[0].trim() || !names[1].trim()} onClick={start}>Aan de slag</button>
        </div>
        <button className="btn ghost wide" onClick={() => replaceAll(demoState(new Date()))}>Eerst rondkijken met een voorbeeldgezin</button>
      </div>
    );
  }

  const openCount = state.tasks.filter((t) => isOpen(t) && t.due && t.due < today).length;
  const props = { store, today, notify };

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">Fred<span>.</span></div>
        <div className="me-switch" role="group" aria-label="Wie gebruikt de app nu?">
          <span className="small muted">Ik ben</span>
          {partners.map((p) => (
            <button key={p.id} className={me === p.id ? 'active' : ''} onClick={() => updateSettings({ me: p.id })} aria-pressed={me === p.id}>
              <Avatar partner={p} size={22} /> {p.name}
            </button>
          ))}
        </div>
      </header>

      <main>
        {tab === 'vandaag' && <TodayView {...props} />}
        {tab === 'inbox' && <InboxView {...props} />}
        {tab === 'taken' && <TasksView {...props} />}
        {tab === 'agenda' && <AgendaView {...props} />}
        {tab === 'balans' && <BalanceView {...props} />}
        {tab === 'instellingen' && <SettingsView {...props} />}
      </main>

      <nav className="tabbar">
        {TABS.map(([id, icon, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            <span className="tab-icon">{icon}{id === 'taken' && openCount > 0 && <span className="badge-count">{openCount}</span>}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast toast-${t.level}`} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>{t.text}</div>)}
      </div>
    </div>
  );
}
