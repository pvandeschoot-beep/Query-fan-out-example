import { addDays, fromISO, toISO } from '../dates';
import { fredVerdict, weekStats } from '../fred';
import { BADGES, doneBy, levelFor, parentOfTheMonth, pointsOf } from '../gamification';
import { Avatar, type ViewProps } from './ui';

export function BalanceView({ store, today, notify }: ViewProps) {
  const { state } = store;
  const { partners } = state.settings;
  const week = weekStats(state, today);
  const verdict = fredVerdict(state, today);
  const total = week.points.a + week.points.b;
  const createdTotal = week.created.a + week.created.b;
  const potm = parentOfTheMonth(state, today);

  const history = [3, 2, 1, 0].map((i) => {
    const end = toISO(addDays(fromISO(today), -7 * i));
    const s = weekStats(state, end);
    return { label: i === 0 ? 'nu' : `${i} wk terug`, a: s.points.a, b: s.points.b };
  });
  const maxPts = Math.max(1, ...history.flatMap((h) => [h.a, h.b]));

  const share = async (text: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ text });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // gebruiker annuleerde
    }
    try {
      await navigator.clipboard.writeText(text);
      notify('Gekopieerd. Plak het in de groepsapp!');
    } catch {
      notify(text);
    }
  };

  return (
    <section className="view">
      <h2>Balans</h2>
      <p className="muted small">De afgelopen 7 dagen.</p>

      <div className="card">
        <div className="split-bar" role="img" aria-label={`Punten: ${partners[0].name} ${week.points.a}, ${partners[1].name} ${week.points.b}`}>
          {total === 0 ? <div className="split-empty">nog geen punten</div> : partners.map((p) => (
            <div key={p.id} style={{ flex: week.points[p.id] || 0.0001, background: p.color }}>
              {week.points[p.id] > 0 && `${p.name} ${Math.round((week.points[p.id] / total) * 100)}%`}
            </div>
          ))}
        </div>
        <table className="stats">
          <thead><tr><th></th>{partners.map((p) => <th key={p.id}><Avatar partner={p} size={20} /> {p.name}</th>)}</tr></thead>
          <tbody>
            <tr><td>Punten</td>{partners.map((p) => <td key={p.id}>{week.points[p.id]}</td>)}</tr>
            <tr><td>Taken gedaan</td>{partners.map((p) => <td key={p.id}>{week.done[p.id].length}</td>)}</tr>
            <tr><td title="Wie zette de taak in Fred? Dat is wie eraan dacht.">Taken bedacht 🧠</td>{partners.map((p) => <td key={p.id}>{week.created[p.id]}{createdTotal > 0 && <span className="muted small"> ({Math.round((week.created[p.id] / createdTotal) * 100)}%)</span>}</td>)}</tr>
            <tr><td>Nog open op naam</td>{partners.map((p) => <td key={p.id}>{week.open[p.id]}</td>)}</tr>
          </tbody>
        </table>
        <p className="muted small">Nog van niemand: {week.open.none}</p>
      </div>

      <div className={`fred-card mood-${verdict.mood}`}>
        <span className="fred-face" aria-hidden>🧠</span>
        <div><strong>Fred zegt</strong><p>{verdict.text}</p></div>
      </div>

      <h3>Laatste weken</h3>
      <div className="card history">
        {history.map((h) => (
          <div key={h.label} className="hist-col">
            <div className="hist-bars">
              {partners.map((p) => (
                <div key={p.id} className="hist-bar" style={{ height: `${(h[p.id] / maxPts) * 100}%`, background: p.color }} title={`${p.name}: ${h[p.id]}`} />
              ))}
            </div>
            <span className="small muted">{h.label}</span>
          </div>
        ))}
      </div>

      {potm && (
        <div className="card potm">
          🏆 <strong>Parent of the month:</strong> {partners.find((p) => p.id === potm.id)!.name} met {potm.points} punten.
          {' '}<button className="btn ghost small" onClick={() => share(`🏆 ${partners.find((p) => p.id === potm.id)!.name} is Parent of the month in Fred met ${potm.points} punten. Wie doet beter?`)}>Opscheppen</button>
        </div>
      )}

      <h3>Levels & badges</h3>
      <div className="players">
        {partners.map((p) => {
          const done = doneBy(state, p.id);
          const pts = pointsOf(done);
          const lvl = levelFor(pts);
          return (
            <div key={p.id} className="card player">
              <div className="row">
                <Avatar partner={p} size={40} />
                <div className="grow">
                  <strong>{p.name}</strong>
                  <div className="small">Level {lvl.level}: {lvl.title}</div>
                </div>
                <span className="big">{pts}</span>
              </div>
              <div className="progress"><div style={{ width: `${lvl.progress * 100}%`, background: p.color }} /></div>
              {lvl.next && <p className="small muted">Nog {lvl.toGo} punten tot „{lvl.next}”</p>}
              <div className="badges">
                {BADGES.map((b) => {
                  const got = b.test(done);
                  return <span key={b.id} className={`badge ${got ? 'got' : ''}`} title={`${b.label}: ${b.desc}`}>{b.emoji}<span>{b.label}</span></span>;
                })}
              </div>
              <button className="btn ghost small" onClick={() => share(`${p.name} is in Fred „${lvl.title}” (level ${lvl.level}) met ${pts} punten 💪`)}>Delen</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
