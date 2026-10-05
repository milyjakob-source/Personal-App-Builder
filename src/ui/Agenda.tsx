import { ArrowsClockwise, Bell, ShoppingCart, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { erinnern, kalenderImport } from '../aktionen';
import { bereichInfo } from '../lib/bereiche';
import { EinkaufBlatt } from './Einkauf';
import type { Eintrag } from '../lib/agenda';
import { lies, tagKey } from '../lib/datum';
import { KB_KALENDER, leseKalenderExport, starteKurzbefehl } from '../lib/kurzbefehle';
import { aendere, aktuell, useDaten } from '../store';
import { ausZwischenablage, FARBE, farbStil, geh, Haken, toast } from './ui';

export const eintragFarbe = (e: Eintrag) =>
  e.bereich ? bereichInfo(e.bereich).farbe :
  e.art === 'kalender' ? FARBE.kalender : e.art === 'job' ? FARBE.job : e.art === 'frist' ? FARBE.frist : e.art === 'geburtstag' ? FARBE.geburtstag : e.art === 'aufgabe' ? FARBE.aufgabe : e.art === 'treffen' ? FARBE.treffen : FARBE.termin;

/** Bereich, Ort und Kalender ohne Doppelungen ("Arbeit · Arbeit"). */
function nebenText(e: Eintrag): string {
  const teile = [e.bereich && e.art !== 'job' ? bereichInfo(e.bereich).name : undefined, ...(e.neben?.split(' · ') ?? [])].filter(Boolean) as string[];
  return teile.filter((t, i) => teile.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i).join(' · ');
}

export function EintragZeile({ e, tag, onClick, farbe }: { e: Eintrag; tag: Date; onClick?: () => void; farbe?: string }) {
  const d = useDaten();
  const [liste, setListe] = useState(false);
  const offeneSachen = d.einkauf.filter((x) => !x.erledigt).length;
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
        {(e.neben || e.bereich) && (
          <div className="neben">{nebenText(e)}</div>
        )}
      </div>
      {e.einkauf && (
        <span
          className="einkauf-knopf"
          role="button"
          aria-label="Einkaufsliste öffnen"
          onClick={(ev) => {
            ev.stopPropagation();
            setListe(true);
          }}
        >
          <ShoppingCart size={15} weight="fill" />
          {offeneSachen}
        </span>
      )}
      {e.art === 'aufgabe' && !e.einkauf && (
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
  return (
    <>
      {onClick ? (
        <button className="zeile" onClick={onClick}>
          {inhalt}
        </button>
      ) : (
        <div className="zeile">{inhalt}</div>
      )}
      {e.einkauf && <EinkaufBlatt offen={liste} onClose={() => setListe(false)} />}
    </>
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

export function kalenderStandText(stand?: string): string {
  if (!stand) return 'Kalender noch nicht verbunden';
  const min = Math.round((Date.now() - lies(stand).getTime()) / 60000);
  if (min < 2) return 'Kalender gerade aktualisiert';
  if (min < 60) return `Kalender vor ${min} Min.`;
  if (min < 1440) return `Kalender vor ${Math.round(min / 60)} Std.`;
  return `Kalender vor ${Math.round(min / 1440)} Tagen`;
}

/** Kleines Symbol zum Aktualisieren, statt einer eigenen Zeile. */
export function KalenderKnopf() {
  const d = useDaten();
  return (
    <button className="rund" onClick={holeKalender} aria-label={`Kalender aktualisieren (${kalenderStandText(d.einstellungen.kalenderStand)})`}>
      <ArrowsClockwise size={17} weight="bold" />
    </button>
  );
}
