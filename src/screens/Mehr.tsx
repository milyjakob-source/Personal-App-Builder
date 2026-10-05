import { Briefcase, Cake, GearSix, MusicNotes, ShoppingCart, ShareNetwork } from '@phosphor-icons/react';
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { backupDatei } from '../aktionen';
import { naechsteFristen } from '../lib/agenda';
import { aendere, ersetze, leer, useDaten } from '../store';
import type { Daten } from '../types';
import { geh, Gruppe, Kopf, toast, Zeile } from '../ui/ui';

export function Mehr() {
  const d = useDaten();
  const einkauf = d.einkauf.filter((e) => !e.erledigt).length;
  const frist = naechsteFristen(d)[0];
  const ordner: [string, ReactNode, string, string, [string, string]][] = [
    ['mehr/einkauf', <ShoppingCart size={22} weight="fill" />, 'Einkauf', einkauf ? `${einkauf} offen` : 'Alles da', ['#ffb340', '#ff7a1a']],
    ['mehr/geburtstage', <Cake size={22} weight="fill" />, 'Geburtstage', d.geburtstage.length ? `${d.geburtstage.length} gespeichert` : 'Noch keine', ['#ff5c8a', '#ff375f']],
    ['mehr/musik', <MusicNotes size={22} weight="fill" />, 'Musik & Studium', frist ? frist.titel.replace('SRH: ', '') : 'SRH Berlin, News', ['#c86bfa', '#7d5cf0']],
    ['mehr/job', <Briefcase size={22} weight="fill" />, 'Job', d.job.aktiv ? d.job.name || 'Eingerichtet' : 'Noch nicht da', ['#6e7bff', '#4a4adf']],
  ];
  return (
    <div className="seite">
      <div className="rein">
        <Kopf titel="Mehr" ueber="Alles andere" />
      </div>
      <div className="ordner">
        {ordner.map(([ziel, icon, name, info, [a, b]], i) => (
          <button key={ziel} className="rein" style={{ '--a': a, '--b': b, '--i': i + 1 } as CSSProperties} onClick={() => geh(ziel)}>
            <span className="o-icon">{icon}</span>
            <span>
              <div className="o-name">{name}</div>
              <div className="o-info">{info}</div>
            </span>
          </button>
        ))}
      </div>
      <div className="rein" style={{ '--i': 5 } as CSSProperties}>
        <Gruppe>
          <div className="karte">
            <Zeile icon={<ShareNetwork size={17} weight="bold" />} farbe="var(--teal)" titel="Kurzbefehle" neben={d.einstellungen.kurzbefehleAktiv ? 'Kalender und Erinnerungen verbunden' : 'Kalender und Erinnerungen verbinden'} onClick={() => geh('mehr/kurzbefehle')} pfeil />
            <Zeile icon={<GearSix size={17} weight="fill" />} farbe="#8e8e93" titel="Einstellungen" neben="Name, Farbe, Backup" onClick={() => geh('mehr/einstellungen')} pfeil />
          </div>
        </Gruppe>
      </div>
    </div>
  );
}

const AKZENTE: [string, string, string][] = [
  ['blau', 'Blau', '#0a84ff'],
  ['lila', 'Lila', '#bf5af2'],
  ['pink', 'Pink', '#ff375f'],
  ['orange', 'Orange', '#ff9f0a'],
  ['gruen', 'Grün', '#30d158'],
  ['indigo', 'Indigo', '#5e5ce6'],
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
  const d = useDaten();
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
      <Gruppe titel="Wie heißt du?" fuss="Für die Begrüßung auf der Startseite.">
        <div className="karte">
          <label className="zeile">
            <div className="haupt">Vorname</div>
            <input
              className="ohne"
              placeholder="Name"
              value={d.einstellungen.name ?? ''}
              onChange={(e) => aendere((x) => { x.einstellungen.name = e.target.value; })}
              style={{ width: 180 }}
            />
          </label>
        </div>
      </Gruppe>

      <Gruppe titel="Akzentfarbe" fuss="Für Knöpfe, Mikrofon und Markierungen. Hell und Dunkel richten sich nach deinem iPhone.">
        <div className="karte innen">
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {AKZENTE.map(([k, name, farbe]) => (
              <button
                key={k}
                className={`chip${akzent === k ? ' an' : ''}`}
                style={{ '--farbe': farbe } as CSSProperties}
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
