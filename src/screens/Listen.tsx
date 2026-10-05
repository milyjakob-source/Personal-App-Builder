import { Bell, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { erinnern } from '../aktionen';
import { MONATE, plusTage, startDesTages, tagKey } from '../lib/datum';
import { aendere, neueId, useDaten } from '../store';
import { EinkaufListe } from '../ui/Einkauf';
import { Gruppe, Kopf, Leer, toast, useJetzt, Zeile } from '../ui/ui';

export function Einkauf() {
  const d = useDaten();
  const offen = d.einkauf.filter((e) => !e.erledigt).length;
  return (
    <div className="seite">
      <Kopf titel="Einkauf" zurueck="mehr" unter={offen ? `${offen} offen` : 'Alles da'} />
      <EinkaufListe />
      <p className="gruppe-fuss">
        Mehrere Sachen mit Komma trennen. Steht „Einkaufen“ in einem Termin oder einer Aufgabe, öffnest du die Liste direkt dort über das Wagen-Symbol.
      </p>
    </div>
  );
}

export function Geburtstage() {
  const d = useDaten();
  const jetzt = useJetzt();
  const [name, setName] = useState('');
  const [datum, setDatum] = useState('');
  const heute = startDesTages(jetzt);

  const liste = d.geburtstage
    .map((g) => {
      let naechster = new Date(heute.getFullYear(), g.monat - 1, g.tag);
      if (naechster < heute) naechster = new Date(heute.getFullYear() + 1, g.monat - 1, g.tag);
      const inTagen = Math.round((naechster.getTime() - heute.getTime()) / 86400000);
      return { ...g, naechster, inTagen, alter: g.jahr ? naechster.getFullYear() - g.jahr : undefined };
    })
    .sort((a, b) => a.inTagen - b.inTagen);

  return (
    <div className="seite">
      <Kopf titel="Geburtstage" zurueck="mehr" />
      <Gruppe>
        <div className="karte">
          {liste.length === 0 && <Leer titel="Noch keine Geburtstage">Unten eintragen oder auf der Startseite z. B. „Lena hat am 4. Mai Geburtstag“ abladen.</Leer>}
          {liste.map((g) => (
            <Zeile
              key={g.id}
              titel={g.name}
              neben={`${g.tag}. ${MONATE[g.monat - 1]}${g.alter ? ` · wird ${g.alter}` : ''}`}
              rechts={
                <>
                  <span>{g.inTagen === 0 ? 'heute' : g.inTagen === 1 ? 'morgen' : `in ${g.inTagen} T.`}</span>
                  <button
                    className="rund"
                    aria-label="Erinnerung am Vortag"
                    onClick={() => {
                      const vortag = g.inTagen === 0 ? g.naechster : plusTage(g.naechster, -1);
                      erinnern(`${g.name} hat ${g.inTagen === 0 ? 'heute' : 'morgen'} Geburtstag`, `${tagKey(vortag)}T18:00`);
                    }}
                  >
                    <Bell size={16} />
                  </button>
                  <button className="rund" aria-label="Löschen" onClick={() => aendere((x) => { x.geburtstage = x.geburtstage.filter((y) => y.id !== g.id); })}>
                    <Trash size={15} />
                  </button>
                </>
              }
            />
          ))}
        </div>
      </Gruppe>
      <Gruppe titel="Hinzufügen" fuss="Das Jahr ist optional. Lass es leer, wenn du es nicht weißt.">
        <form
          className="karte innen formular"
          onSubmit={(e) => {
            e.preventDefault();
            const m = /^(\d{1,2})\.(\d{1,2})\.?(\d{4})?$/.exec(datum.trim()) ?? /^(\d{4})-(\d{2})-(\d{2})$/.exec(datum.trim());
            if (!name.trim() || !m) {
              toast('Name und Datum als TT.MM. oder TT.MM.JJJJ');
              return;
            }
            const [tag, monat, jahr] = m[0].includes('-') ? [+m[3], +m[2], +m[1]] : [+m[1], +m[2], m[3] ? +m[3] : undefined];
            aendere((x) => { x.geburtstage.push({ id: neueId(), name: name.trim(), tag, monat, jahr }); });
            setName('');
            setDatum('');
          }}
        >
          <input className="feld" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="feld" placeholder="TT.MM. oder TT.MM.JJJJ" inputMode="decimal" value={datum} onChange={(e) => setDatum(e.target.value)} />
          <button className="knopf zweit" type="submit">Speichern</button>
        </form>
      </Gruppe>
    </div>
  );
}
