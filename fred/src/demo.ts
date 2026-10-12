import { addDays, toISO } from './dates';
import { uid } from './store';
import type { CategoryId, FamEvent, PartnerId, Repeat, State, Task, Who } from './types';

/** Voorbeeldgezin, recht uit de column: zwemles, belastingaangifte, avondvierdaagse en een padelbaan. */
export function demoState(today: Date): State {
  const d = (n: number) => toISO(addDays(today, n));
  const now = today.getTime();
  const ts = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();

  const task = (
    title: string, category: CategoryId, points: number, assignee: PartnerId | null, due?: number,
    extra: { done?: [PartnerId, number]; by?: PartnerId; project?: string; repeat?: Repeat } = {},
  ): Task => ({
    id: uid(), title, category, points, assignee, due: due === undefined ? undefined : d(due),
    createdAt: ts(3), createdBy: extra.by ?? 'b', source: 'handmatig', repeat: extra.repeat ?? 'none', project: extra.project,
    ...(extra.done ? { doneBy: extra.done[0], doneAt: ts(extra.done[1]) } : {}),
  });

  const ev = (title: string, date: number, who: Who, category: CategoryId, start?: string, end?: string): FamEvent => ({
    id: uid(), title, date: d(date), start, end, who, category, createdBy: 'b', source: 'handmatig',
  });

  return {
    version: 1,
    settings: {
      partners: [
        { id: 'a', name: 'Job', color: '#e07a5f' },
        { id: 'b', name: 'Karin', color: '#3d85c6' },
      ],
      me: 'a',
      tone: 'eerlijk',
      anniversary: toISO(new Date(today.getFullYear() - 6, today.getMonth(), today.getDate() + 10)),
    },
    tasks: [
      task('Kinderen naar zwemles brengen', 'kinderen', 2, 'a', 1, { repeat: 'week' }),
      task('Belastingaangifte doen', 'admin', 4, null, 12),
      task('Auto naar de garage voor APK', 'auto', 4, 'a', 5),
      task('Energiecontract verlengen', 'admin', 4, null, 2),
      task('Afspraak huisarts maken voor Noor', 'gezondheid', 3, 'b', 0),
      task('Sportschoenen kopen', 'kinderen', 2, null, 4),
      task('Afwasmiddel kopen', 'boodschappen', 1, null),
      task('Kat laten vaccineren', 'huisdieren', 3, null, 9),
      task('Paspoort verlengen', 'admin', 4, 'a', -2),
      task('Juffencadeau regelen', 'sociaal', 3, null, 6, { project: 'Einde schooljaar' }),
      task('Kliko buitenzetten', 'huishouden', 1, null, 1, { repeat: 'week', by: 'a' }),
      task('Gymkleren wassen', 'huishouden', 1, 'b', -1, { done: ['b', 1] }),
      task('Lunchtrommels klaarmaken', 'school', 2, 'b', -1, { done: ['b', 1] }),
      task('10-minutengesprek inplannen', 'school', 3, 'b', -2, { done: ['b', 2] }),
      task('Bandenspanning checken', 'auto', 3, 'b', -3, { done: ['b', 3] }),
      task('Sinterklaassurprises maken', 'sociaal', 3, 'b', -1, { done: ['b', 1] }),
      task('Toiletpapier kopen', 'boodschappen', 1, 'a', -1, { done: ['a', 1], by: 'a' }),
      task('Koffers van zolder halen', 'vakantie', 2, null, 20, { project: 'Zomervakantie' }),
    ],
    events: [
      ev('Avondvierdaagse', 3, 'family', 'kinderen', '18:00', '20:30'),
      ev('Padel met Mark', 3, 'a', 'overig', '19:30', '21:00'),
      ev('Schoolmusical groep 8', 8, 'family', 'school', '19:00', '21:00'),
      ev('Studiedag (kinderen vrij)', 11, 'family', 'school'),
      ev('Muziekschool', 2, 'b', 'kinderen', '16:00', '17:00'),
      ev('Verjaardag neefje Daan', 14, 'family', 'sociaal', '15:00'),
    ],
  };
}
