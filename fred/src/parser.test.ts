import { describe, expect, it } from 'vitest';
import { extractDate, extractTime, parseInput } from './parser';
import type { Partner } from './types';

// Maandag 12 oktober 2026
const today = new Date(2026, 9, 12);
const partners: Partner[] = [
  { id: 'a', name: 'Job', color: '' },
  { id: 'b', name: 'Karin', color: '' },
];
const parse = (text: string, source: 'mail' | 'spraak' | 'handmatig' = 'handmatig') =>
  parseInput(text, { today, partners, source });

describe('extractDate', () => {
  it.each([
    ['voor 1 februari', '2027-02-01'],
    ['op 20 oktober', '2026-10-20'],
    ['uiterlijk 3-11', '2026-11-03'],
    ['op 05/01/2027', '2027-01-05'],
    ['morgen', '2026-10-13'],
    ['overmorgen', '2026-10-14'],
    ['vanavond', '2026-10-12'],
    ['vrijdag', '2026-10-16'],
    ['maandag', '2026-10-19'],
    ['volgende week dinsdag', '2026-10-20'],
    ['over 3 dagen', '2026-10-15'],
    ['over twee weken', '2026-10-26'],
    ['eind van de maand', '2026-10-31'],
  ])('%s → %s', (text, expected) => {
    expect(extractDate(text, today).date).toBe(expected);
  });

  it('geeft niets bij geen datum', () => {
    expect(extractDate('afwasmiddel kopen', today).date).toBeUndefined();
  });
});

describe('extractTime', () => {
  it('leest tijden en bereiken', () => {
    expect(extractTime('om 19:30 padel').start).toBe('19:30');
    expect(extractTime('van 18.00 tot 20.30 uur').end).toBe('20:30');
    expect(extractTime('om 8 uur').start).toBe('08:00');
  });
  it('ziet bedragen niet als tijd', () => {
    expect(extractTime('ouderbijdrage € 12.50 betalen').start).toBeUndefined();
  });
});

describe('parseInput', () => {
  it('maakt van "is op" een boodschap', () => {
    const [s] = parse('het toiletpapier is op!', 'spraak');
    expect(s.kind).toBe('task');
    expect(s.title).toBe('Toiletpapier kopen');
    expect(s.category).toBe('boodschappen');
  });

  it('haalt de deadline uit een taak en uit de titel', () => {
    const [s] = parse('Het energiecontract moet voor 1 februari verlengd worden.');
    expect(s.date).toBe('2027-02-01');
    expect(s.title).toBe('Het energiecontract moet verlengd worden');
    expect(s.category).toBe('admin');
  });

  it('herkent agenda-items met tijd en wie', () => {
    const [s] = parse('Job padel donderdag om 19:30');
    expect(s.kind).toBe('event');
    expect(s.date).toBe('2026-10-15');
    expect(s.start).toBe('19:30');
    expect(s.who).toBe('a');
  });

  it('pakt actiepunten uit een schoolmail', () => {
    const mail = `Van: juf Annelies
Onderwerp: Schoolkamp groep 7

Beste ouders,

Wat hebben we een leuke week gehad! De kinderen hebben hard gewerkt.
Graag de toestemmingsformulieren voor vrijdag inleveren. Het schoolkamp is van 2 november tot en met 4 november.
Vergeet niet om de ouderbijdrage van € 45.00 uiterlijk 25 oktober te betalen.

Met vriendelijke groet,
Juf Annelies`;
    const out = parse(mail, 'mail');
    const titles = out.map((s) => s.title);
    expect(titles).toContain('Graag de toestemmingsformulieren inleveren'.replace(/^Graag /, '').replace(/^d/, 'D'));
    expect(out.find((s) => /ouderbijdrage/.test(s.title))?.date).toBe('2026-10-25');
    expect(out.find((s) => /schoolkamp/i.test(s.title))).toMatchObject({ kind: 'event', date: '2026-11-02', who: 'family' });
    expect(titles.some((t) => /leuke week/.test(t))).toBe(false);
  });
});
