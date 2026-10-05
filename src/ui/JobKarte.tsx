import { Briefcase, Plus } from '@phosphor-icons/react';
import { useState, type CSSProperties } from 'react';
import { stundenEintragen } from '../aktionen';
import { tagKey } from '../lib/datum';
import { jobBild, MINIJOB_GRENZE, stundenText } from '../lib/job';
import { euro } from '../lib/sparplan';
import { aendere, useDaten } from '../store';
import { Icon, toast, useJetzt } from './ui';

const centAus = (s: string) => Math.round((parseFloat(s.replace(',', '.')) || 0) * 100);
const alsText = (cent: number) => (cent ? String(cent / 100).replace('.', ',') : '');

/** Job auf einen Blick: Stundenlohn, Stunden eintragen, Verdienst und Hochrechnung für den Monat. */
export function JobKarte() {
  const d = useDaten();
  const jetzt = useJetzt();
  const job = d.job;
  const [tag, setTag] = useState(tagKey(jetzt));
  const [stunden, setStunden] = useState('');
  const [name, setName] = useState(job.name);
  const [lohn, setLohn] = useState(alsText(job.stundenlohn));
  const [proWoche, setProWoche] = useState(job.stundenProWoche ? String(job.stundenProWoche) : '');

  if (!job.aktiv) {
    return (
      <div className="karte innen formular">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Icon farbe="var(--indigo)">
            <Briefcase size={17} weight="fill" />
          </Icon>
          <div>
            <div className="fett">Job eintragen</div>
            <div className="leise klein">MILI rechnet dann deinen Verdienst hoch und plant damit.</div>
          </div>
        </div>
        <input className="feld" placeholder="Wo? (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="zwei-spalten">
          <input className="feld" inputMode="decimal" placeholder="€ pro Stunde" value={lohn} onChange={(e) => setLohn(e.target.value)} />
          <input className="feld" inputMode="decimal" placeholder="Std. pro Woche" value={proWoche} onChange={(e) => setProWoche(e.target.value)} />
        </div>
        <button
          className="knopf"
          onClick={() => {
            if (!centAus(lohn)) {
              toast('Trag deinen Stundenlohn ein', true);
              return;
            }
            aendere((x) => {
              x.job.aktiv = true;
              x.job.name = name.trim();
              x.job.stundenlohn = centAus(lohn);
              x.job.stundenProWoche = parseFloat(proWoche.replace(',', '.')) || undefined;
            });
            toast('Job eingetragen');
          }}
        >
          Job speichern
        </button>
      </div>
    );
  }

  const bild = jobBild(job, jetzt);
  return (
    <div className="karte">
      <div className="job-kopf">
        <Icon farbe="var(--indigo)">
          <Briefcase size={17} weight="fill" />
        </Icon>
        <div style={{ flex: 1 }}>
          <div className="fett">{job.name || 'Job'}</div>
          <div className="leise klein">
            {euro(job.stundenlohn, true)} pro Stunde{job.stundenProWoche ? ` · ${job.stundenProWoche} Std. pro Woche geplant` : ''}
          </div>
        </div>
      </div>
      <div className="zahlen">
        <div>
          <div className="wert">{stundenText(bild.stundenBisher)}</div>
          <div className="was">gearbeitet</div>
        </div>
        <div>
          <div className="wert plus">{euro(bild.verdienstBisher)}</div>
          <div className="was">verdient</div>
        </div>
        <div>
          <div className="wert">{euro(bild.hochrechnung)}</div>
          <div className="was">im Monat erwartet</div>
        </div>
      </div>
      {bild.ueberMinijob && (
        <p className="leise klein" style={{ margin: '10px 16px 0' }}>
          Achtung: über der Minijob-Grenze von {euro(MINIJOB_GRENZE)} im Monat (Stand 2026).
        </p>
      )}
      <form
        className="stunden-eingabe"
        onSubmit={(e) => {
          e.preventDefault();
          const h = parseFloat(stunden.replace(',', '.'));
          if (!h || h <= 0 || h > 24) {
            toast('Wie viele Stunden? z. B. 6 oder 4,5', true);
            return;
          }
          stundenEintragen(tag, h);
          setStunden('');
          toast(`${stundenText(h)} eingetragen, ${euro(Math.round(h * job.stundenlohn), true)}`);
        }}
      >
        <input className="feld" type="date" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag" />
        <input className="feld" inputMode="decimal" placeholder="Std." value={stunden} onChange={(e) => setStunden(e.target.value)} aria-label="Stunden" style={{ maxWidth: 90 }} />
        <button className="knopf klein" type="submit" aria-label="Stunden eintragen">
          <Plus size={16} weight="bold" />
        </button>
      </form>
      <div className="chips" style={{ padding: '0 16px 14px' }}>
        {[2, 4, 6, 8].map((h) => (
          <button key={h} className="chip" style={{ '--farbe': 'var(--indigo)' } as CSSProperties} onClick={() => setStunden(String(h))}>
            {h} Std.
          </button>
        ))}
      </div>
    </div>
  );
}
