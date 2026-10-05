import { CalendarBlank, DotsThreeCircle, House, Microphone, Tray, Wallet } from '@phosphor-icons/react';
import { useEffect, useState, type ReactNode } from 'react';
import { schliesseAbladen, useAbladen, oeffneAbladen } from './abladen';
import { Eingang } from './screens/Eingang';
import { Geld } from './screens/Geld';
import { Heute } from './screens/Heute';
import { Job } from './screens/Job';
import { Kurzbefehle } from './screens/Kurzbefehle';
import { Einkauf, Geburtstage } from './screens/Listen';
import { Einstellungen, Mehr } from './screens/Mehr';
import { Musik } from './screens/Musik';
import { Woche } from './screens/Woche';
import { useDaten, useGeladen } from './store';
import { Erfassen } from './ui/Erfassen';
import { Blatt, geh, tageszeit, Toast, useJetzt, usePfad } from './ui/ui';

const TABS: [string, string, (an: boolean) => ReactNode][] = [
  ['heute', 'Heute', (an) => <House size={24} weight={an ? 'fill' : 'regular'} />],
  ['woche', 'Woche', (an) => <CalendarBlank size={24} weight={an ? 'fill' : 'regular'} />],
  ['eingang', 'Eingang', (an) => <Tray size={24} weight={an ? 'fill' : 'regular'} />],
  ['geld', 'Geld', (an) => <Wallet size={24} weight={an ? 'fill' : 'regular'} />],
  ['mehr', 'Mehr', (an) => <DotsThreeCircle size={24} weight={an ? 'fill' : 'regular'} />],
];

export function App() {
  const geladen = useGeladen();
  const d = useDaten();
  const jetzt = useJetzt();
  const pfad = usePfad().split('?')[0];
  const [haupt, unter, unter2] = pfad.split('/');
  const offen = d.anfragen.filter((a) => a.status === 'offen').length;
  const ab = useAbladen();

  const zeit = tageszeit(jetzt);
  useEffect(() => {
    const r = document.documentElement.style;
    zeit.farben.forEach((f, i) => r.setProperty(`--t${i + 1}`, f));
  }, [zeit.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const aktiv = Math.max(0, TABS.findIndex(([z]) => z === (haupt || 'heute')));
  // Die Linse springt sofort beim Tippen, nicht erst nach dem Seitenwechsel
  const [linse, setLinse] = useState(aktiv);
  useEffect(() => setLinse(aktiv), [aktiv]);

  if (!geladen) return <div className="app" />;

  let seite: ReactNode;
  switch (haupt) {
    case 'woche':
      seite = <Woche />;
      break;
    case 'eingang':
      seite = <Eingang />;
      break;
    case 'geld':
      seite = <Geld unter={unter} />;
      break;
    case 'mehr':
      seite =
        unter === 'einkauf' ? <Einkauf /> :
        unter === 'geburtstage' ? <Geburtstage /> :
        unter === 'musik' ? <Musik unter={unter2} /> :
        unter === 'job' ? <Job /> :
        unter === 'kurzbefehle' ? <Kurzbefehle /> :
        unter === 'einstellungen' ? <Einstellungen /> :
        <Mehr />;
      break;
    default:
      seite = <Heute />;
  }

  return (
    <div className="app">
      <div className="hintergrund" aria-hidden>
        <i />
        <i />
        <i />
      </div>
      <main key={pfad}>{seite}</main>

      <div className="leiste-unten">
        <nav className="tabbar glas" aria-label="Bereiche">
          <span className="tab-linse" style={{ transform: `translateX(${linse * 100}%)` }} />
          {TABS.map(([ziel, name, icon], i) => {
            const an = i === linse;
            return (
              <button
                key={ziel}
                className={`tab${an ? ' aktiv' : ''}`}
                onClick={() => {
                  setLinse(i);
                  geh(ziel);
                }}
                aria-current={an ? 'page' : undefined}
              >
                <span className="badge-wrap">
                  {icon(an)}
                  {ziel === 'eingang' && offen > 0 && <span className="zahl">{offen}</span>}
                </span>
                {name}
              </button>
            );
          })}
        </nav>
        <button className="fab" onClick={() => oeffneAbladen()} aria-label="Gedanken abladen">
          <Microphone size={28} weight="fill" />
        </button>
      </div>

      <Blatt titel="Gedanken abladen" offen={ab.offen} onClose={schliesseAbladen}>
        <Erfassen key={ab.nr} gross orb start={ab.start} />
        <p className="gruppe-fuss" style={{ textAlign: 'center' }}>
          Sag oder schreib einfach alles, was dir durch den Kopf geht. MILI sortiert es in Termine, Aufgaben, Einkäufe und mehr.
        </p>
      </Blatt>
      <Toast />
    </div>
  );
}
