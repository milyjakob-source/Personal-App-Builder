import { Briefcase, CalendarPlus, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { anKalender } from '../aktionen';
import { kurzesDatum, lies, tagKey, tagName, uhrzeit } from '../lib/datum';
import { euro } from '../lib/sparplan';
import { alsWann, findeZeit } from '../lib/zeit';
import { aendere, neueId, useDaten } from '../store';
import type { Schicht } from '../types';
import { Blatt, Gruppe, Kopf, Leer, toast, useJetzt, Zeile } from '../ui/ui';

const stunden = (s: Schicht) => (lies(s.ende).getTime() - lies(s.start).getTime()) / 3600000;

export function Job() {
  const d = useDaten();
  const jetzt = useJetzt();
  const [einrichten, setEinrichten] = useState(false);
  const [plan, setPlan] = useState(false);
  const [neu, setNeu] = useState({ tag: tagKey(jetzt), von: '09:00', bis: '17:00' });

  if (!d.job.aktiv) {
    return (
      <div className="seite">
        <Kopf titel="Job" zurueck="mehr" />
        <div className="karte">
          <Leer titel="Noch kein Job eingetragen">
            Sobald du den Job hast, richtest du ihn hier ein. Deine Schichten erscheinen dann in Heute und Woche, dazu Stunden und Verdienst pro Monat.
          </Leer>
          <div style={{ padding: '0 16px 16px' }}>
            <button className="knopf voll" onClick={() => setEinrichten(true)}>
              <Briefcase size={18} /> Job einrichten
            </button>
          </div>
        </div>
        {einrichten && <JobBlatt onClose={() => setEinrichten(false)} />}
      </div>
    );
  }

  const monat = tagKey(jetzt).slice(0, 7);
  const imMonat = d.job.schichten.filter((s) => s.start.startsWith(monat));
  const h = imMonat.reduce((a, s) => a + stunden(s), 0);
  const kommend = d.job.schichten.filter((s) => s.ende >= tagKey(jetzt)).sort((a, b) => a.start.localeCompare(b.start));

  function schichtHinzu() {
    if (!neu.tag || !neu.von || !neu.bis) return;
    let ende = `${neu.tag}T${neu.bis}`;
    if (neu.bis <= neu.von) {
      const morgen = new Date(lies(neu.tag).getTime() + 86400000);
      ende = `${tagKey(morgen)}T${neu.bis}`;
    }
    aendere((x) => { x.job.schichten.push({ id: neueId(), start: `${neu.tag}T${neu.von}`, ende }); });
    toast('Schicht eingetragen');
  }

  return (
    <div className="seite">
      <Kopf titel={d.job.name || 'Job'} zurueck="mehr" aktionen={<button className="knopf klein grau" onClick={() => setEinrichten(true)}>Bearbeiten</button>} />

      <Gruppe>
        <div className="karte">
          <div className="zahlen" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
            <div><div className="wert">{h.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.</div><div className="was">diesen Monat</div></div>
            <div><div className="wert plus">{euro(Math.round(h * d.job.stundenlohn))}</div><div className="was">brutto, geschätzt</div></div>
          </div>
        </div>
      </Gruppe>

      <Gruppe titel="Nächste Schichten" mehr={{ text: 'Dienstplan einfügen', onClick: () => setPlan(true) }}>
        <div className="karte">
          {kommend.length === 0 && <Leer titel="Keine Schichten eingetragen" />}
          {kommend.map((s) => (
            <Zeile
              key={s.id}
              titel={`${tagName(lies(s.start), jetzt)}, ${kurzesDatum(s.start)}`}
              neben={`${uhrzeit(s.start)} bis ${uhrzeit(s.ende)} · ${stunden(s).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Std.`}
              rechts={
                <>
                  <button className="rund" aria-label="An Kalender senden" onClick={() => anKalender({ titel: d.job.name || 'Arbeit', start: s.start, ende: s.ende, ganztag: false })}>
                    <CalendarPlus size={16} />
                  </button>
                  <button className="rund" aria-label="Löschen" onClick={() => aendere((x) => { x.job.schichten = x.job.schichten.filter((y) => y.id !== s.id); })}>
                    <Trash size={15} />
                  </button>
                </>
              }
            />
          ))}
        </div>
      </Gruppe>

      <Gruppe titel="Schicht eintragen">
        <div className="karte innen formular">
          <input className="feld" type="date" value={neu.tag} onChange={(e) => setNeu({ ...neu, tag: e.target.value })} aria-label="Tag" />
          <div className="zwei">
            <input className="feld" type="time" value={neu.von} onChange={(e) => setNeu({ ...neu, von: e.target.value })} aria-label="Von" />
            <input className="feld" type="time" value={neu.bis} onChange={(e) => setNeu({ ...neu, bis: e.target.value })} aria-label="Bis" />
          </div>
          <button className="knopf zweit" onClick={schichtHinzu}>Eintragen</button>
        </div>
      </Gruppe>

      {einrichten && <JobBlatt onClose={() => setEinrichten(false)} />}
      {plan && <DienstplanBlatt onClose={() => setPlan(false)} />}
    </div>
  );
}

function JobBlatt({ onClose }: { onClose: () => void }) {
  const d = useDaten();
  const [name, setName] = useState(d.job.name);
  const [lohn, setLohn] = useState(d.job.stundenlohn ? String(d.job.stundenlohn / 100).replace('.', ',') : '');
  return (
    <Blatt
      titel="Job"
      offen
      onClose={onClose}
      fertigText="Sichern"
      fertig={() => {
        aendere((x) => {
          x.job.aktiv = true;
          x.job.name = name.trim();
          x.job.stundenlohn = Math.round((parseFloat(lohn.replace(',', '.')) || 0) * 100);
        });
        onClose();
      }}
    >
      <div className="formular">
        <div>
          <label className="label">Wo arbeitest du?</label>
          <input className="feld" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Café Blum" />
        </div>
        <div>
          <label className="label">Stundenlohn in €</label>
          <input className="feld" inputMode="decimal" value={lohn} onChange={(e) => setLohn(e.target.value)} placeholder="z. B. 13,90" />
        </div>
        {d.job.aktiv && (
          <button className="knopf rot" onClick={() => { aendere((x) => { x.job.aktiv = false; }); onClose(); }}>
            Job-Bereich ausblenden
          </button>
        )}
      </div>
    </Blatt>
  );
}

/** Dienstplan als Text, eine Schicht pro Zeile: "Mo 12.10. 14-22 Uhr", "Freitag 9:00 bis 17:30". */
function DienstplanBlatt({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('');
  const zeilen = text
    .split(/\r?\n/)
    .map((z) => z.trim())
    .filter(Boolean)
    .map((z) => ({ z, ...alsWann(findeZeit(z)) }));
  const gueltig = zeilen.filter((z) => z.wann && z.ende);
  return (
    <Blatt
      titel="Dienstplan"
      offen
      onClose={onClose}
      fertigText={`${gueltig.length} eintragen`}
      fertig={() => {
        aendere((x) => {
          for (const g of gueltig) x.job.schichten.push({ id: neueId(), start: g.wann!, ende: g.ende! });
        });
        toast(`${gueltig.length} Schichten eingetragen`);
        onClose();
      }}
    >
      <div className="formular">
        <p className="leise klein" style={{ margin: 0 }}>Eine Schicht pro Zeile, mit Tag und Uhrzeit von bis. Zum Beispiel „Mo 12.10. 14-22 Uhr“.</p>
        <textarea className="feld" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Di 13.10. 9-17 Uhr\nDo 15.10. 14:00 bis 22:00'} />
        {zeilen.length > 0 && (
          <div className="karte">
            {zeilen.map((z) => (
              <Zeile
                key={z.z}
                titel={z.z}
                neben={z.wann && z.ende ? `${tagName(lies(z.wann))}, ${uhrzeit(z.wann)} bis ${uhrzeit(z.ende)}` : <span style={{ color: 'var(--rot)' }}>Nicht erkannt</span>}
              />
            ))}
          </div>
        )}
      </div>
    </Blatt>
  );
}
