import { Briefcase, Cake, GearSix, MusicNotes, ShoppingCart, ShareNetwork } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { backupDatei } from '../aktionen';
import { naechsteFristen } from '../lib/agenda';
import { ersetze, leer, useDaten } from '../store';
import type { Daten } from '../types';
import { geh, Gruppe, Kopf, toast, Zeile } from '../ui/ui';

export function Mehr() {
  const d = useDaten();
  const einkauf = d.einkauf.filter((e) => !e.erledigt).length;
  const frist = naechsteFristen(d)[0];
  return (
    <div className="seite">
      <Kopf titel="Mehr" />
      <Gruppe>
        <div className="karte">
          <Zeile icon={<ShoppingCart size={17} />} titel="Einkaufsliste" rechts={einkauf ? String(einkauf) : undefined} onClick={() => geh('mehr/einkauf')} pfeil />
          <Zeile icon={<Cake size={17} />} titel="Geburtstage" rechts={d.geburtstage.length ? String(d.geburtstage.length) : undefined} onClick={() => geh('mehr/geburtstage')} pfeil />
        </div>
      </Gruppe>
      <Gruppe>
        <div className="karte">
          <Zeile icon={<MusicNotes size={17} />} titel="Musik und Studium" neben={frist ? `Als Nächstes: ${frist.titel}` : 'SRH Berlin, News'} onClick={() => geh('mehr/musik')} pfeil />
          <Zeile icon={<Briefcase size={17} />} titel="Job" neben={d.job.aktiv ? d.job.name || 'eingerichtet' : 'Noch nicht eingerichtet'} onClick={() => geh('mehr/job')} pfeil />
        </div>
      </Gruppe>
      <Gruppe>
        <div className="karte">
          <Zeile icon={<ShareNetwork size={17} />} titel="Kurzbefehle" neben={d.einstellungen.kurzbefehleAktiv ? 'Kalender und Erinnerungen verbunden' : 'Kalender und Erinnerungen verbinden'} onClick={() => geh('mehr/kurzbefehle')} pfeil />
          <Zeile icon={<GearSix size={17} />} titel="Einstellungen" neben="Farbe, Backup" onClick={() => geh('mehr/einstellungen')} pfeil />
        </div>
      </Gruppe>
    </div>
  );
}

const AKZENTE: [string, string, string][] = [
  ['blau', 'Blau', '#0a6cff'],
  ['graphit', 'Graphit', '#3a3a3c'],
  ['gruen', 'Grün', '#24875a'],
  ['orange', 'Orange', '#d9731a'],
  ['rot', 'Rot', '#d23f57'],
];

export function akzentSetzen(a: string) {
  if (a === 'blau') delete document.documentElement.dataset.akzent;
  else document.documentElement.dataset.akzent = a;
  try {
    localStorage.setItem('mili-akzent', a);
  } catch {
    /* egal */
  }
}

export function Einstellungen() {
  const datei = useRef<HTMLInputElement>(null);
  const [akzent, setAkzent] = useState(() => {
    try {
      return localStorage.getItem('mili-akzent') ?? 'blau';
    } catch {
      return 'blau';
    }
  });

  async function sichern() {
    const f = backupDatei();
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [f] })) {
      try {
        await nav.share({ files: [f], title: 'MILI Backup' });
        return;
      } catch {
        /* abgebrochen, unten herunterladen */
      }
    }
    const url = URL.createObjectURL(f);
    const a = document.createElement('a');
    a.href = url;
    a.download = f.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="seite">
      <Kopf titel="Einstellungen" zurueck="mehr" />
      <Gruppe titel="Akzentfarbe" fuss="Hell und Dunkel richten sich nach deinem iPhone.">
        <div className="karte innen">
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {AKZENTE.map(([k, name, farbe]) => (
              <button
                key={k}
                className={`chip${akzent === k ? ' an' : ''}`}
                onClick={() => {
                  akzentSetzen(k);
                  setAkzent(k);
                  toast(`Akzent: ${name}`);
                }}
              >
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: farbe, marginRight: 6, verticalAlign: 'middle' }} />
                {name}
              </button>
            ))}
          </div>
        </div>
      </Gruppe>

      <Gruppe titel="Deine Daten" fuss="Alles liegt nur auf diesem Gerät. Sicher ab und zu ein Backup, z. B. in iCloud Drive. Damit kannst du MILI auch auf dem MacBook mit denselben Daten öffnen.">
        <div className="karte">
          <Zeile titel="Backup sichern" onClick={sichern} pfeil />
          <Zeile titel="Backup laden" onClick={() => datei.current?.click()} pfeil />
          <input
            ref={datei}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const neu = JSON.parse(await f.text()) as Daten;
                if (neu.version !== 1 || !Array.isArray(neu.termine)) throw new Error();
                if (confirm('Backup laden? Die Daten auf diesem Gerät werden ersetzt.')) {
                  ersetze(neu);
                  toast('Backup geladen');
                }
              } catch {
                toast('Das ist kein MILI-Backup');
              }
              e.target.value = '';
            }}
          />
        </div>
      </Gruppe>

      <Gruppe>
        <div className="karte">
          <button
            className="zeile"
            onClick={() => {
              if (confirm('Wirklich alles löschen? Das geht nicht rückgängig.')) {
                ersetze(leer());
                toast('Alles gelöscht');
              }
            }}
          >
            <span style={{ color: 'var(--rot)' }}>Alle Daten löschen</span>
          </button>
        </div>
      </Gruppe>
      <p className="gruppe-fuss" style={{ textAlign: 'center' }}>MILI · nur für dich</p>
    </div>
  );
}
