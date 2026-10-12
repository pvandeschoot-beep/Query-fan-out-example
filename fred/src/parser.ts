import { CATEGORY_BY_ID, detectCategory } from './categories';
import { addDays, startOfDay, startOfWeek, toISO } from './dates';
import type { Partner, PartnerId, Source, Suggestion, Who } from './types';

const MONTHS: Record<string, number> = {
  januari: 0, jan: 0, februari: 1, feb: 1, maart: 2, mrt: 2, april: 3, apr: 3, mei: 4,
  juni: 5, jun: 5, juli: 6, jul: 6, augustus: 7, aug: 7, september: 8, sept: 8, sep: 8,
  oktober: 9, okt: 9, november: 10, nov: 10, december: 11, dec: 11,
};
const MONTH_RE = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const WEEKDAYS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
const PREP = String.raw`(?:(?:uiterlijk|vóór|voor|op|tot|per|vanaf|deadline:?)\s+)?`;

const pad = (n: number) => String(n).padStart(2, '0');
const hm = (h: string, m?: string) => {
  const H = Number(h);
  const M = Number(m ?? 0);
  return H <= 23 && M <= 59 ? `${pad(H)}:${pad(M)}` : undefined;
};

export interface TimeInfo {
  start?: string;
  end?: string;
  rest: string;
}

export function extractTime(text: string): TimeInfo {
  const range = /\b(?:van\s+)?(\d{1,2})[:.](\d{2})\s*(?:-|–|tot)\s*(\d{1,2})[:.](\d{2})(?:\s*uur)?/i;
  let m = text.match(range);
  if (m) {
    const start = hm(m[1], m[2]);
    const end = hm(m[3], m[4]);
    if (start && end) return { start, end, rest: text.replace(m[0], ' ') };
  }
  // "19:30", "om 19.30", "19.30 uur" — maar niet "€ 12.50"
  const single = /(om\s+|vanaf\s+)?\b(\d{1,2})([:.])(\d{2})(\s*uur)?\b/gi;
  for (const s of text.matchAll(single)) {
    const before = text.slice(0, s.index);
    if (/€\s*$/.test(before)) continue;
    if (s[3] !== ':' && !s[1] && !s[5]) continue;
    const start = hm(s[2], s[4]);
    if (start) return { start, rest: text.replace(s[0], ' ') };
  }
  m = text.match(/\b(?:om|vanaf)\s+(\d{1,2})\s*uur\b/i);
  if (m) {
    const start = hm(m[1]);
    if (start) return { start, rest: text.replace(m[0], ' ') };
  }
  return { rest: text };
}

export interface DateInfo {
  date?: string;
  /** De gevonden datumtekst, zodat die uit de titel kan. */
  match?: string;
  /** Dagdeel uit "vanavond", "morgenochtend" etc. */
  daypart?: 'ochtend' | 'middag' | 'avond';
}

function build(day: number, month: number, year: number | undefined, today: Date): string | undefined {
  if (month < 0 || month > 11 || day < 1 || day > 31) return undefined;
  const d = new Date(year ?? today.getFullYear(), month, day);
  if (d.getMonth() !== month) return undefined;
  if (year === undefined && d < startOfDay(today)) d.setFullYear(d.getFullYear() + 1);
  return toISO(d);
}

const daypartOf = (s?: string): DateInfo['daypart'] =>
  !s ? undefined : /avond/.test(s) ? 'avond' : /middag/.test(s) ? 'middag' : /ochtend|morgen/.test(s) ? 'ochtend' : undefined;

export function extractDate(text: string, today: Date): DateInfo {
  const t = text.toLowerCase();
  let m: RegExpMatchArray | null;

  m = t.match(new RegExp(String.raw`${PREP}\b(\d{1,2})[-/](\d{1,2})(?:[-/](\d{2,4}))?\b`));
  if (m) {
    const y = m[3] ? (Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])) : undefined;
    const date = build(Number(m[1]), Number(m[2]) - 1, y, today);
    if (date) return { date, match: m[0] };
  }

  m = t.match(new RegExp(String.raw`${PREP}\b(?:(?:${WEEKDAYS.join('|')})\s+)?(\d{1,2})\s+(${MONTH_RE})\.?(?:\s+(\d{4}))?\b`));
  if (m) {
    const date = build(Number(m[1]), MONTHS[m[2]], m[3] ? Number(m[3]) : undefined, today);
    if (date) return { date, match: m[0] };
  }

  m = t.match(new RegExp(String.raw`${PREP}\beind(?:e)?\s+(?:van\s+)?(?:de(?:ze)?\s+maand|(${MONTH_RE}))\b`));
  if (m) {
    const month = m[1] ? MONTHS[m[1]] : today.getMonth();
    const d = new Date(today.getFullYear(), month + 1, 0);
    if (d < startOfDay(today)) d.setFullYear(d.getFullYear() + 1, month + 1, 0);
    return { date: toISO(d), match: m[0] };
  }

  m = t.match(new RegExp(String.raw`${PREP}\bovermorgen(ochtend|middag|avond)?\b`));
  if (m) return { date: toISO(addDays(today, 2)), match: m[0], daypart: daypartOf(m[1]) };

  m = t.match(new RegExp(String.raw`${PREP}\b(vandaag|vanochtend|vanmorgen|vanmiddag|vanavond)\b`));
  if (m) return { date: toISO(today), match: m[0], daypart: daypartOf(m[1].replace(/^van/, '')) };

  m = t.match(new RegExp(String.raw`${PREP}\bmorgen(ochtend|middag|avond|vroeg)?\b`));
  if (m) return { date: toISO(addDays(today, 1)), match: m[0], daypart: daypartOf(m[1]) };

  m = t.match(new RegExp(String.raw`${PREP}\bover\s+(\d+|een|twee|drie|vier)\s+(dag|dagen|week|weken)\b`));
  if (m) {
    const n = { een: 1, twee: 2, drie: 3, vier: 4 }[m[1]] ?? Number(m[1]);
    return { date: toISO(addDays(today, m[2].startsWith('dag') ? n : n * 7)), match: m[0] };
  }

  const wd = WEEKDAYS.join('|');
  m = t.match(new RegExp(String.raw`${PREP}\b(volgende\s+week\s+|komende\s+|volgende\s+|aanstaande\s+)?(${wd})(ochtend|middag|avond)?\b`));
  if (m) {
    const target = WEEKDAYS.indexOf(m[2]);
    let date: Date;
    if (m[1] && /week/.test(m[1])) {
      date = addDays(startOfWeek(today), 7 + ((target + 6) % 7));
    } else {
      let diff = (target - today.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      date = addDays(today, diff);
    }
    return { date: toISO(date), match: m[0], daypart: daypartOf(m[3]) };
  }

  m = t.match(new RegExp(String.raw`${PREP}\bvolgende\s+week\b`));
  if (m) return { date: toISO(addDays(startOfWeek(today), 7 + 4)), match: m[0] };

  m = t.match(new RegExp(String.raw`${PREP}\bdeze\s+week\b`));
  if (m) {
    const friday = addDays(startOfWeek(today), 4);
    return { date: toISO(friday < startOfDay(today) ? startOfDay(today) : friday), match: m[0] };
  }

  return {};
}

const ACTION_RE = /\b(moet|moeten|graag|vergeet|vergeten|uiterlijk|deadline|inleveren|meenemen|meegeven|aanmelden|opgeven|inschrijven|betalen|verlengen|regelen|kopen|halen|ophalen|brengen|wegbrengen|bellen|maken|plannen|inplannen|afspraak|herinnering|let op|nodig|verzoeken|vragen wij|wilt u|kunt u|denk aan|niet vergeten|zorg dat|zorgen dat|op tijd|verwacht)\b|\b(is|zijn)\s+(bijna\s+)?op\b/i;
const EVENT_RE = /\b(afspraak|musical|voorstelling|uitvoering|wedstrijd|toernooi|avondvierdaagse|feest\w*|verjaardag\w*|studiedag|kamp|schoolkamp|schoolreis\w*|ouderavond|10[- ]?minutengesprek\w*|padel\w*|tennis|training|etentje|borrel|diner|bruiloft|concert|vergadering|vlucht|uitje|sportdag)\b/i;
const TASK_VERB_RE = /\b(maken|inplannen|plannen|regelen|kopen|bestellen|aanmelden|opgeven|inleveren|betalen|verlengen|bellen|opzoeken|inpakken|meenemen|meegeven)\b/i;
const FAMILY_RE = /\b(kinderen|kids|school|musical|avondvierdaagse|studiedag|kamp|schoolkamp|schoolreis\w*|ouderavond|10[- ]?minutengesprek\w*|verjaardag\w*|feest\w*|uitvoering|sportdag|gezin|familie|bruiloft)\b/i;
const SKIP_LINE_RE = /^\s*(van|aan|cc|bcc|datum|date|verzonden|sent|from|to|subject|onderwerp)\s*:|^\s*(beste|hoi|hallo|hey|lieve|geachte|dag)\b.{0,40}[,!]?\s*$|^\s*(met\s+)?(vriendelijke\s+)?groet(en)?\b|^\s*(mvg|groetjes|liefs|cheers|bedankt|dank je)\b|^\s*>/i;

function splitChunks(text: string, source: Source): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•–]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);
  if (source !== 'mail') return lines;
  return lines
    .filter((l) => !SKIP_LINE_RE.test(l))
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý"'‘(])/))
    .map((l) => l.trim())
    .filter((l) => l.length > 3);
}

const LEADING_FILLER = /^(?:(?:p\.?s\.?|n\.?b\.?|let op|herinnering|reminder|todo|to do|taak|graag|vergeet niet(?: om)?|niet vergeten(?: om)?|denk (?:er )?aan(?: om)?|zorg dat|zorg ervoor dat|wil je|kun je|kan je|kunt u|wilt u)\s*[:,!-]?\s*)+/i;

function cleanTitle(raw: string, remove: (string | undefined)[]): string {
  let t = raw;
  for (const r of remove) {
    if (!r) continue;
    const idx = t.toLowerCase().indexOf(r.toLowerCase());
    if (idx >= 0) t = t.slice(0, idx) + ' ' + t.slice(idx + r.length);
  }
  t = t
    .replace(LEADING_FILLER, '')
    .replace(/\s+([,.!?:;])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s,.;:!?-]+$/, '')
    .trim();
  if (t.length > 90) t = t.slice(0, 87).replace(/\s+\S*$/, '') + '…';
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function findPartner(text: string, partners: Partner[]): PartnerId | null {
  for (const p of partners) {
    if (!p.name.trim()) continue;
    const name = p.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(String.raw`(^|[^\p{L}])${name}([^\p{L}]|$)`, 'iu').test(text)) return p.id;
  }
  return null;
}

const DAYPART_START = { ochtend: '09:00', middag: '14:00', avond: '19:00' } as const;

export interface ParseOptions {
  today: Date;
  partners: Partner[];
  source: Source;
}

/** Zet vrije tekst (mail, spraak, notitie) om in voorstellen voor taken en agenda-items. */
export function parseInput(text: string, { today, partners, source }: ParseOptions): Suggestion[] {
  const chunks = splitChunks(text, source);
  const out: Suggestion[] = [];

  for (const chunk of chunks) {
    const time = extractTime(chunk);
    const dateInfo = extractDate(time.rest, today);
    const isActionable = ACTION_RE.test(chunk) || !!dateInfo.date || !!time.start;
    if (source === 'mail' && !isActionable) continue;

    const empty = chunk.match(/^(?:(?:het|de|onze|ons|alle)\s+)?(.+?)\s+(?:is|zijn)\s+(?:bijna\s+)?op\b/i);
    const start = time.start ?? (dateInfo.daypart && EVENT_RE.test(chunk) ? DAYPART_START[dateInfo.daypart] : undefined);
    const isEvent = !!dateInfo.date && !empty && (!!start || EVENT_RE.test(chunk)) && !TASK_VERB_RE.test(chunk);

    const title = empty
      ? cleanTitle(`${empty[1].replace(LEADING_FILLER, '')} kopen`, [])
      : cleanTitle(time.rest, [dateInfo.match]);
    if (!title) continue;

    const category = empty ? 'boodschappen' : detectCategory(chunk);
    const assignee = findPartner(chunk, partners);
    const who: Who = assignee ?? (FAMILY_RE.test(chunk) ? 'family' : 'both');
    const points = CATEGORY_BY_ID[category].points + (dateInfo.date ? 1 : 0);

    out.push({
      kind: isEvent ? 'event' : 'task',
      title,
      category,
      date: dateInfo.date,
      start: isEvent ? start : undefined,
      end: isEvent ? time.end : undefined,
      assignee,
      who,
      points,
      raw: chunk,
    });
  }
  return out;
}
