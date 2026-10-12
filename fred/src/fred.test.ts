import { describe, expect, it } from 'vitest';
import { demoState } from './demo';
import { clashes, fredVerdict, nudges, weekStats } from './fred';
import { toISO } from './dates';
import type { FamEvent } from './types';

const ev = (p: Partial<FamEvent>): FamEvent => ({
  id: Math.random().toString(), title: 'x', date: '2026-10-15', who: 'both', category: 'overig', createdBy: 'a', source: 'handmatig', ...p,
});

describe('clashes', () => {
  it('padel op de avond van de avondvierdaagse botst', () => {
    expect(clashes(ev({ who: 'family', start: '18:00', end: '20:30' }), ev({ who: 'a', start: '19:30' }))).toBe(true);
  });
  it('ieder z’n eigen ding botst niet', () => {
    expect(clashes(ev({ who: 'a', start: '19:30' }), ev({ who: 'b', start: '19:30' }))).toBe(false);
  });
  it('geen overlap, geen probleem', () => {
    expect(clashes(ev({ who: 'family', start: '10:00', end: '11:00' }), ev({ who: 'a', start: '19:30' }))).toBe(false);
  });
  it('hele-dag gezinsmoment botst met alles die dag', () => {
    expect(clashes(ev({ who: 'family' }), ev({ who: 'a', start: '09:00' }))).toBe(true);
  });
});

describe('demo', () => {
  const today = new Date(2026, 9, 12);
  const state = demoState(today);
  const iso = toISO(today);

  it('waarschuwt voor de padelbaan', () => {
    expect(nudges(state, iso).some((n) => /Padel/.test(n.text) && n.level === 'alarm')).toBe(true);
  });

  it('telt punten per partner', () => {
    const s = weekStats(state, iso);
    expect(s.points.b).toBeGreaterThan(s.points.a);
  });

  it('Fred zegt het eerlijk', () => {
    const v = fredVerdict(state, iso);
    expect(v.text).toMatch(/^Job, je hebt deze week/);
    expect(v.text).toMatch(/Karin/);
  });
});
