import { useRef } from 'react';
import { fromISO } from '../dates';
import { demoState } from '../demo';
import { emptyState, isState } from '../store';
import type { Partner } from '../types';
import type { ViewProps } from './ui';

export function SettingsView({ store, today, notify }: ViewProps) {
  const { state, updateSettings, replaceAll } = store;
  const { partners, tone, anniversary } = state.settings;
  const file = useRef<HTMLInputElement>(null);

  const setPartner = (i: 0 | 1, patch: Partial<Partner>) => {
    const next = [...partners] as [Partner, Partner];
    next[i] = { ...next[i], ...patch };
    updateSettings({ partners: next });
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fred-${today}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text());
      if (!isState(parsed)) throw new Error('geen Fred-bestand');
      replaceAll({ ...parsed, settings: { ...parsed.settings, me: state.settings.me } });
      notify('Gegevens geladen.');
    } catch {
      notify('Dat bestand snapt Fred niet.', 'alarm');
    }
  };

  const askNotifications = async () => {
    if (!('Notification' in window)) return notify('Je browser ondersteunt geen meldingen.', 'alarm');
    const res = await Notification.requestPermission();
    notify(res === 'granted' ? 'Fred geeft voortaan een seintje als er iets af moet.' : 'Geen meldingen. Ook goed.');
  };

  return (
    <section className="view">
      <h2>Instellingen</h2>

      <div className="card">
        <h3>Wie zijn jullie?</h3>
        {partners.map((p, i) => (
          <div key={p.id} className="row">
            <input type="color" value={p.color} onChange={(e) => setPartner(i as 0 | 1, { color: e.target.value })} aria-label={`Kleur ${p.name}`} />
            <input className="grow" value={p.name} onChange={(e) => setPartner(i as 0 | 1, { name: e.target.value })} aria-label={`Naam partner ${i + 1}`} />
          </div>
        ))}
        <label>
          Trouwdag / samen sinds
          <input type="date" value={anniversary ?? ''} onChange={(e) => updateSettings({ anniversary: e.target.value || undefined })} />
        </label>
        <p className="muted small">Fred waarschuwt twee weken van tevoren. Graag gedaan.</p>
      </div>

      <div className="card">
        <h3>Hoe eerlijk mag Fred zijn?</h3>
        <div className="segmented">
          <button className={tone === 'mild' ? 'active' : ''} onClick={() => updateSettings({ tone: 'mild' })}>😇 Mild</button>
          <button className={tone === 'eerlijk' ? 'active' : ''} onClick={() => updateSettings({ tone: 'eerlijk' })}>🤨 Keihard eerlijk</button>
        </div>
        <p className="muted small">{tone === 'mild' ? '„Pak jij de volgende op?”' : '„Je hebt deze week geen flikker gedaan, terwijl…”'}</p>
      </div>

      <div className="card">
        <h3>Meldingen</h3>
        <button className="btn" onClick={askNotifications}>Seintjes aanzetten</button>
        <p className="muted small">Fred meldt één keer per dag wat er vandaag af moet of te laat is, als de app open staat.</p>
      </div>

      <div className="card">
        <h3>Delen tussen jullie twee</h3>
        <p className="muted small">Alles staat op dit apparaat. Exporteer en stuur het bestand naar je partner, of gebruik samen één tablet in de keuken.</p>
        <div className="row wrap">
          <button className="btn" onClick={exportData}>Exporteren</button>
          <button className="btn" onClick={() => file.current?.click()}>Importeren</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
        </div>
      </div>

      <div className="card">
        <h3>Opnieuw beginnen</h3>
        <div className="row wrap">
          <button className="btn" onClick={() => confirm('Voorbeeldgezin laden? Je huidige gegevens worden vervangen.') && replaceAll(demoState(fromISO(today)))}>Voorbeeldgezin laden</button>
          <button className="btn ghost danger" onClick={() => confirm('Alles wissen?') && replaceAll(emptyState())}>Alles wissen</button>
        </div>
      </div>
    </section>
  );
}
