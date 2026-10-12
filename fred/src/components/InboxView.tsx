import { useEffect, useRef, useState } from 'react';
import { acceptSuggestions } from '../actions';
import { CATEGORIES } from '../categories';
import { fromISO } from '../dates';
import { parseInput } from '../parser';
import type { CategoryId, PartnerId, Source, Suggestion, Who } from '../types';
import type { ViewProps } from './ui';

const EXAMPLES: Record<Source, string> = {
  mail: `Van: juf Annelies
Onderwerp: Schoolkamp groep 7

Beste ouders,

Wat een leuke week! Graag de toestemmingsformulieren voor vrijdag inleveren.
Het schoolkamp is van 2 november tot en met 4 november.
Vergeet niet de ouderbijdrage van € 45.00 uiterlijk 25 oktober te betalen.
Let op: woensdag is er een studiedag.

Met vriendelijke groet,
Juf Annelies`,
  spraak: 'het toiletpapier is op!',
  handmatig: `Het energiecontract moet voor 1 februari verlengd worden
Sportschoenen kopen voor Noor
Padel donderdag om 19:30`,
};

// Web Speech API zit (nog) niet in de standaard TypeScript-typen.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void;
  onend: () => void;
  onerror: (e: { error: string }) => void;
};
const SpeechRecognitionImpl: (new () => Recognition) | undefined =
  typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : undefined;

interface Draft extends Suggestion {
  include: boolean;
}

export function InboxView({ store, today, notify }: ViewProps) {
  const { partners } = store.state.settings;
  const [source, setSource] = useState<Source>('mail');
  const [text, setText] = useState('');
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  const read = () => {
    const out = parseInput(text, { today: fromISO(today), partners, source });
    setDrafts(out.map((s) => ({ ...s, include: true })));
  };

  const toggleListen = () => {
    if (!SpeechRecognitionImpl) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new SpeechRecognitionImpl();
    r.lang = 'nl-NL';
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      const said = Array.from(e.results)
        .filter((res) => res.isFinal)
        .map((res) => res[0].transcript.trim())
        .join('\n');
      setText(said);
    };
    r.onend = () => setListening(false);
    r.onerror = (e) => {
      setListening(false);
      notify(e.error === 'not-allowed' ? 'Fred mag de microfoon niet gebruiken.' : `Spraak lukte niet (${e.error}).`, 'alarm');
    };
    rec.current = r;
    setText('');
    setListening(true);
    r.start();
  };

  const patch = (i: number, p: Partial<Draft>) => setDrafts((d) => d && d.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const accept = () => {
    if (!drafts) return;
    const chosen = drafts.filter((d) => d.include && d.title.trim());
    const res = acceptSuggestions(store, chosen, source);
    const parts = [res.tasks && `${res.tasks} ${res.tasks === 1 ? 'taak' : 'taken'}`, res.events && `${res.events} agenda-${res.events === 1 ? 'item' : 'items'}`].filter(Boolean);
    notify(parts.length ? `Fred onthoudt ${parts.join(' en ')}.` : 'Niks toegevoegd.');
    res.warnings.forEach((w) => notify(`⚠️ ${w}`, 'alarm'));
    setDrafts(null);
    setText('');
  };

  return (
    <section className="view">
      <h2>Gooi het bij Fred</h2>
      <p className="muted">Plak een mail van school, de huisarts of de sportclub, spreek iets in of typ gewoon wat er moet gebeuren. Fred haalt er de taken, deadlines en afspraken uit.</p>

      <div className="segmented">
        {(['mail', 'spraak', 'handmatig'] as Source[]).map((s) => (
          <button key={s} className={source === s ? 'active' : ''} onClick={() => { setSource(s); setDrafts(null); }}>
            {s === 'mail' ? '✉️ Mail' : s === 'spraak' ? '🎙️ Inspreken' : '⌨️ Typen'}
          </button>
        ))}
      </div>

      {source === 'spraak' && (
        <div className="voice">
          {SpeechRecognitionImpl ? (
            <button className={`mic ${listening ? 'on' : ''}`} onClick={toggleListen} aria-label={listening ? 'Stop opnemen' : 'Start opnemen'}>
              {listening ? '■' : '🎙️'}
            </button>
          ) : (
            <p className="muted small">Je browser kan geen spraak herkennen. Gebruik de microfoon-knop van je toetsenbord en dicteer in het vak hieronder.</p>
          )}
          <span className="muted small">{listening ? 'Fred luistert… zeg bijvoorbeeld „het toiletpapier is op”' : 'Tik en praat. Elke zin wordt een taak.'}</span>
        </div>
      )}

      <textarea
        className="inbox-text"
        rows={source === 'mail' ? 10 : 4}
        value={text}
        placeholder={EXAMPLES[source]}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row end">
        <button className="btn ghost" onClick={() => setText(EXAMPLES[source])}>Voorbeeld</button>
        <button className="btn primary" disabled={!text.trim()} onClick={read}>Laat Fred lezen</button>
      </div>

      {drafts && (
        <div className="drafts">
          <h3>{drafts.length ? `Fred vond ${drafts.length} ${drafts.length === 1 ? 'ding' : 'dingen'}` : 'Fred vond niks om te doen'}</h3>
          {drafts.length === 0 && <p className="muted">Probeer het concreter: „Paspoort verlengen voor 1 maart”.</p>}
          {drafts.map((d, i) => (
            <div key={i} className={`draft ${d.include ? '' : 'excluded'}`}>
              <div className="row">
                <input type="checkbox" checked={d.include} onChange={(e) => patch(i, { include: e.target.checked })} aria-label="Meenemen" />
                <div className="segmented small">
                  <button className={d.kind === 'task' ? 'active' : ''} onClick={() => patch(i, { kind: 'task' })}>Taak</button>
                  <button className={d.kind === 'event' ? 'active' : ''} onClick={() => patch(i, { kind: 'event' })}>Agenda</button>
                </div>
                <input className="grow" value={d.title} onChange={(e) => patch(i, { title: e.target.value })} />
              </div>
              <div className="row wrap">
                <label>
                  {d.kind === 'event' ? 'Datum' : 'Deadline'}
                  <input type="date" value={d.date ?? ''} onChange={(e) => patch(i, { date: e.target.value || undefined })} />
                </label>
                {d.kind === 'event' && (
                  <>
                    <label>Van<input type="time" value={d.start ?? ''} onChange={(e) => patch(i, { start: e.target.value || undefined })} /></label>
                    <label>Tot<input type="time" value={d.end ?? ''} onChange={(e) => patch(i, { end: e.target.value || undefined })} /></label>
                  </>
                )}
                {d.kind === 'task' ? (
                  <label>
                    Wie
                    <select value={d.assignee ?? ''} onChange={(e) => patch(i, { assignee: (e.target.value || null) as PartnerId | null })}>
                      <option value="">Nog niemand</option>
                      {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                ) : (
                  <label>
                    Voor
                    <select value={d.who} onChange={(e) => patch(i, { who: e.target.value as Who })}>
                      <option value="family">Gezin</option>
                      <option value="both">Samen</option>
                      {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                )}
                <label>
                  Soort
                  <select value={d.category} onChange={(e) => patch(i, { category: e.target.value as CategoryId })}>
                    {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                  </select>
                </label>
              </div>
              {d.kind === 'event' && !d.date && <p className="warn small">Een agenda-item heeft een datum nodig, anders wordt het een taak.</p>}
              <p className="raw small">„{d.raw}”</p>
            </div>
          ))}
          {drafts.length > 0 && (
            <div className="row end">
              <button className="btn ghost" onClick={() => setDrafts(null)}>Annuleren</button>
              <button className="btn primary" onClick={accept}>Toevoegen ({drafts.filter((d) => d.include).length})</button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
