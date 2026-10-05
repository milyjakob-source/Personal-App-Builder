import { Bell, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { erinnern } from '../aktionen';
import { MONATE, plusTage, startDesTages, tagKey } from '../lib/datum';
import { aendere, neueId, useDaten } from '../store';
import { Gruppe, Haken, Kopf, Leer, toast, useJetzt, Zeile } from '../ui/ui';

export function Einkauf() {
  const d = useDaten();
  const [neu, setNeu] = useState('');
  const offen = d.einkauf.filter((e) => !e.erledigt);
  const erledigt = d.einkauf.filter((e) => e.erledigt);

  function hinzu() {
    const posten = neu.split(',').map((p) => p.trim()).filter(Boolean);
    if (!posten.length) return;
    aendere((x) => {
      for (const p of posten) x.einkauf.push({ id: neueId(), titel: p.charAt(0).toUpperCase() + p.slice(1), erledigt: false });
    });
    setNeu('');
  }

  return (
    <div className="seite">
      <Kopf titel="Einkauf" zurueck="mehr" unter={offen.length ? `${offen.length} offen` : 'Alles da'} />
      <Gruppe fuss="Mehrere Sachen mit Komma trennen. Oder einfach auf der Startseite „Milch und Eier kaufen“ abladen.">
        <div className="karte">
          <form className="zeile" onSubmit={(e) => { e.preventDefault(); hinzu(); }}>
            <span className="check" />
            <input className="ohne" style={{ textAlign: 'left', flex: 1, color: 'var(--text)' }} placeholder="Hinzufügen" value={neu} onChange={(e) => setNeu(e.target.value)} enterKeyHint="done" />
          </form>
          {offen.map((e) => (
            <Zeile
              key={e.id}
              links={<Haken an={false} label="Gekauft" onClick={() => aendere((x) => { const y = x.einkauf.find((z) => z.id === e.id); if (y) y.erledigt = true; })} />}
              titel={e.titel}
            />
          ))}
        </div>
      </Gruppe>
      {erledigt.length > 0 && (
        <Gruppe titel="Im Wagen" mehr={{ text: 'Leeren', onClick: () => aendere((x) => { x.einkauf = x.einkauf.filter((y) => !y.erledigt); }) }}>
          <div className="karte">
            {erledigt.map((e) => (
              <Zeile
                key={e.id}
                erledigt
                links={<Haken an label="Wieder offen" onClick={() => aendere((x) => { const y = x.einkauf.find((z) => z.id === e.id); if (y) y.erledigt = false; })} />}
                titel={e.titel}
              />
            ))}
          </div>
        </Gruppe>
      )}
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
