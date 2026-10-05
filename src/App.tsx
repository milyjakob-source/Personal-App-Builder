import { CalendarBlank, DotsThreeCircle, House, Tray, Wallet } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
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
import { geh, Toast, usePfad } from './ui/ui';

const TABS: [string, string, (an: boolean) => ReactNode][] = [
  ['heute', 'Heute', (an) => <House size={25} weight={an ? 'fill' : 'regular'} />],
  ['woche', 'Woche', (an) => <CalendarBlank size={25} weight={an ? 'fill' : 'regular'} />],
  ['eingang', 'Eingang', (an) => <Tray size={25} weight={an ? 'fill' : 'regular'} />],
  ['geld', 'Geld', (an) => <Wallet size={25} weight={an ? 'fill' : 'regular'} />],
  ['mehr', 'Mehr', (an) => <DotsThreeCircle size={25} weight={an ? 'fill' : 'regular'} />],
];

export function App() {
  const geladen = useGeladen();
  const d = useDaten();
  const pfad = usePfad().split('?')[0];
  const [haupt, unter, unter2] = pfad.split('/');
  const offen = d.anfragen.filter((a) => a.status === 'offen').length;

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
      <main key={pfad}>{seite}</main>
      <nav className="tabs" aria-label="Bereiche">
        {TABS.map(([ziel, name, icon]) => {
          const an = (haupt || 'heute') === ziel;
          return (
            <button key={ziel} className={`tab${an ? ' aktiv' : ''}`} onClick={() => geh(ziel)} aria-current={an ? 'page' : undefined}>
              <span className="badge-wrap">
                {icon(an)}
                {ziel === 'eingang' && offen > 0 && <span className="zahl">{offen}</span>}
              </span>
              {name}
            </button>
          );
        })}
      </nav>
      <Toast />
    </div>
  );
}
