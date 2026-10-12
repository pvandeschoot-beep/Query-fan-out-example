import { useCallback, useEffect, useState } from 'react';
import { nextOccurrence } from './fred';
import type { FamEvent, PartnerId, Settings, State, Task } from './types';

const KEY = 'fred-state-v1';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const emptyState = (): State => ({
  version: 1,
  tasks: [],
  events: [],
  settings: {
    partners: [
      { id: 'a', name: 'Partner 1', color: '#e07a5f' },
      { id: 'b', name: 'Partner 2', color: '#3d85c6' },
    ],
    me: 'a',
    tone: 'mild',
  },
});

export function isState(x: unknown): x is State {
  const s = x as State;
  return !!s && s.version === 1 && Array.isArray(s.tasks) && Array.isArray(s.events) && !!s.settings?.partners;
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isState(parsed)) return parsed;
    }
  } catch {
    /* geen opslag beschikbaar: begin leeg */
  }
  return emptyState();
}

export function useFredStore() {
  const [state, setState] = useState<State>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* opslag vol of geblokkeerd */
    }
  }, [state]);

  // Andere tab (bijv. partner op dezelfde computer) heeft iets gewijzigd.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (isState(parsed)) setState(parsed);
        } catch {
          /* negeren */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addTasks = useCallback((tasks: Task[]) => setState((s) => ({ ...s, tasks: [...tasks, ...s.tasks] })), []);
  const addEvents = useCallback((events: FamEvent[]) => setState((s) => ({ ...s, events: [...s.events, ...events] })), []);

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) =>
      setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
    [],
  );
  const deleteTask = useCallback((id: string) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })), []);

  const toggleDone = useCallback((id: string, by: PartnerId, todayISO: string) => {
    setState((s) => {
      const t = s.tasks.find((x) => x.id === id);
      if (!t) return s;
      if (t.doneAt) {
        return { ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, doneAt: undefined, doneBy: undefined } : x)) };
      }
      const done = { ...t, doneAt: new Date().toISOString(), doneBy: by };
      const nextDue = nextOccurrence(t, todayISO);
      const next: Task[] = nextDue
        ? [{ ...t, id: uid(), due: nextDue, doneAt: undefined, doneBy: undefined, createdAt: new Date().toISOString() }]
        : [];
      return { ...s, tasks: [...next, ...s.tasks.map((x) => (x.id === id ? done : x))] };
    });
  }, []);

  const updateEvent = useCallback(
    (id: string, patch: Partial<FamEvent>) =>
      setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    [],
  );
  const deleteEvent = useCallback((id: string) => setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) })), []);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    [],
  );

  const replaceAll = useCallback((next: State) => setState(next), []);

  return { state, addTasks, addEvents, updateTask, deleteTask, toggleDone, updateEvent, deleteEvent, updateSettings, replaceAll };
}

export type FredStore = ReturnType<typeof useFredStore>;
