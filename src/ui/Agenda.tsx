import { ArrowsClockwise, Bell, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { anKalender, erinnern, kalenderImport } from '../aktionen';
import type { Eintrag } from '../lib/agenda';
import { lies, tagKey } from '../lib/datum';
import { KB_KALENDER, leseKalenderExport, starteKurzbefehl } from '../lib/kurzbefehle';
import { aendere, aktuell, useDaten } from '../store';
import { ausZwischenablage, FARBE, farbStil, geh, Haken, Icon, toast } from './ui';

export const eintragFarbe = (e: Eintrag) =>
  e.art === 'kalender' ? FARBE.kalender : e.art === 'job' ? FARBE.job : e.art === 'frist' ? FARBE.frist : e.art === 'geburtstag' ? FARBE.geburtstag : e.art === 'aufgabe' ? FARBE.aufgabe : e.art === 'treffen' ? FARBE.treffen : FARBE.termin;

export function EintragZeile({ e, tag, onClick, farbe }: { e: Eintrag; tag: Date; onClick?: () => void; farbe?: string }) {
  const inhalt = (
    <>
      {e.art === 'aufgabe' ? (
        <Haken
          an={false}
          farbe={farbe}
          label="Erledigt"
          onClick={() =>
            aendere((d) => {
              const a = d.aufgaben.find((x) => x.id === e.id);
              if (a) a.erledigt = true;
            })
          }
        />
      ) : (
        <div className="zeit-spalte">
          {e.zeit ?? <span className="leise klein">{e.art === 'geburtstag' ? 'Geb.' : e.art === 'frist' ? 'Frist' : 'ganzt.'}</span>}
          {e.bis && <div className="bis">{e.bis}</div>}
        </div>
      )}
      {e.art !== 'aufgabe' && <span className="strich" style={farbStil(farbe)} />}
      <div className="haupt">
        <div className="titel">{e.titel}</div>
        {e.neben && <div className="neben">{e.neben}</div>}
      </div>
      {e.art === 'aufgabe' && (
        <button
          className="rund"
          aria-label="Erinnerung"
          onClick={(ev) => {
            ev.stopPropagation();
            erinnern(e.titel, tagKey(tag));
          }}
        >
          <Bell size={17} />
        </button>
      )}
    </>
  );
  return onClick ? (
    <button className="zeile" onClick={onClick}>
      {inhalt}
    </button>
  ) : (
    <div className="zeile">{inhalt}</div>
  );
}

const WARTE = 'mili-warte-kalender';

export function holeKalender() {
  if (!aktuell().einstellungen.kurzbefehleAktiv) {
    toast('Richte zuerst die Kurzbefehle ein');
    geh('mehr/kurzbefehle');
    return;
  }
  try {
    sessionStorage.setItem(WARTE, '1');
  } catch {
    /* egal */
  }
  starteKurzbefehl(KB_KALENDER);
}

/** Nach dem Kurzbefehl zurück in MILI: ein Tipp übernimmt den Kalender aus der Zwischenablage. */
export function KalenderBanner() {
  const [zeigen, setZeigen] = useState(false);
  useEffect(() => {
    const pruefe = () => {
      try {
        setZeigen(document.visibilityState === 'visible' && sessionStorage.getItem(WARTE) === '1');
      } catch {
        setZeigen(false);
      }
    };
    pruefe();
    document.addEventListener('visibilitychange', pruefe);
    return () => document.removeEventListener('visibilitychange', pruefe);
  }, []);
  if (!zeigen) return null;
  const weg = () => {
    try {
      sessionStorage.removeItem(WARTE);
    } catch {
      /* egal */
    }
    setZeigen(false);
  };
  return (
    <div className="banner">
      <div className="haupt">Kalender ist kopiert. Jetzt übernehmen?</div>
      <button
        className="knopf klein"
        onClick={async () => {
          const t = await ausZwischenablage();
          const termine = t ? leseKalenderExport(t) : undefined;
          if (!termine) {
            toast('In der Zwischenablage ist kein MILI-Kalender. Kurzbefehl prüfen.');
            return;
          }
          toast(`Kalender aktualisiert: ${kalenderImport(termine)} Termine`);
          weg();
        }}
      >
        Übernehmen
      </button>
      <button className="rund" onClick={weg} aria-label="Schließen">
        <X size={16} />
      </button>
    </div>
  );
}

export function KalenderStand() {
  const d = useDaten();
  const stand = d.einstellungen.kalenderStand;
  let text = 'iCloud-Kalender noch nicht verbunden';
  if (stand) {
    const min = Math.round((Date.now() - lies(stand).getTime()) / 60000);
    text = min < 2 ? 'Kalender gerade aktualisiert' : min < 60 ? `Kalender vor ${min} Min. aktualisiert` : min < 1440 ? `Kalender vor ${Math.round(min / 60)} Std. aktualisiert` : `Kalender vor ${Math.round(min / 1440)} Tagen aktualisiert`;
  }
  return (
    <button className="zeile" onClick={holeKalender}>
      <Icon farbe="var(--teal)">
        <ArrowsClockwise size={17} weight="bold" />
      </Icon>
      <div className="haupt">
        <div className="titel" style={{ fontSize: 15 }}>{text}</div>
      </div>
      <span className="rechts" style={{ color: 'var(--accent)' }}>Aktualisieren</span>
    </button>
  );
}

/** Termine aus MILI, die noch nicht im iCloud-Kalender stehen (z. B. mehrere aus einem Diktat). */
export function KalenderSendenBanner() {
  const d = useDaten();
  if (!d.einstellungen.kurzbefehleAktiv) return null;
  const heute = tagKey(new Date());
  const offen = d.termine
    .filter((t) => t.quelle === 'mili' && !t.gesendet && t.start.slice(0, 10) >= heute)
    .sort((a, b) => a.start.localeCompare(b.start));
  if (!offen.length) return null;
  const naechster = offen[0];
  return (
    <div className="banner">
      <div className="haupt">
        {offen.length === 1 ? '1 Termin' : `${offen.length} Termine`} noch nicht im iCloud-Kalender
        <div className="leise klein">Als Nächstes: {naechster.titel}</div>
      </div>
      <button className="knopf klein" onClick={() => anKalender(naechster)}>
        Senden
      </button>
    </div>
  );
}
