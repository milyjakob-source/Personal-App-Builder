import { Bell, Trash } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { anfrageStatus, erinnern, gegenvorschlag, zusagen } from '../aktionen';
import { kurzesDatum, lies, tagKey, tagName, wannText } from '../lib/datum';
import { bloecke, vorschlagFuer } from '../lib/frei';
import { aendere, neueId, useDaten } from '../store';
import type { Anfrage } from '../types';
import { Erfassen } from '../ui/Erfassen';
import { Gruppe, Haken, Kopf, kopiere, Leer, toast, useJetzt, Zeile } from '../ui/ui';

export function Eingang() {
  const d = useDaten();
  const jetzt = useJetzt();
  const [neueAufgabe, setNeueAufgabe] = useState('');
  const [zeigeErledigt, setZeigeErledigt] = useState(false);
  const offen = d.anfragen.filter((a) => a.status === 'offen');
  const aufgaben = d.aufgaben
    .filter((a) => zeigeErledigt || !a.erledigt)
    .sort((a, b) => Number(a.erledigt) - Number(b.erledigt) || (a.faellig ?? '9').localeCompare(b.faellig ?? '9'));

  return (
    <div className="seite">
      <Kopf titel="Eingang" unter="Alles, was rein kommt" />

      <Gruppe fuss="WhatsApp oder iMessage: Nachricht lange drücken, „Kopieren“, hier auf das Klemmbrett tippen. Mehrere markierte WhatsApp-Nachrichten gehen auch.">
        <Erfassen gross />
      </Gruppe>

      <Gruppe titel={`Anfragen${offen.length ? ` (${offen.length})` : ''}`}>
        {offen.length === 0 ? (
          <div className="karte">
            <Leer titel="Keine offenen Anfragen">Kopierte Nachrichten wie „Hast du Freitag Zeit?“ landen hier.</Leer>
          </div>
        ) : (
          offen.map((a) => <AnfrageKarte key={a.id} a={a} />)
        )}
      </Gruppe>

      <Gruppe
        titel="Aufgaben"
        mehr={{ text: zeigeErledigt ? 'Erledigte ausblenden' : 'Erledigte zeigen', onClick: () => setZeigeErledigt(!zeigeErledigt) }}
      >
        <div className="karte">
          <form
            className="zeile"
            onSubmit={(e) => {
              e.preventDefault();
              if (!neueAufgabe.trim()) return;
              aendere((x) => {
                x.aufgaben.unshift({ id: neueId(), titel: neueAufgabe.trim(), erledigt: false, erstellt: tagKey(new Date()) });
              });
              setNeueAufgabe('');
            }}
          >
            <span className="check" />
            <input className="ohne" style={{ textAlign: 'left', flex: 1, color: 'var(--text)' }} placeholder="Neue Aufgabe" value={neueAufgabe} onChange={(e) => setNeueAufgabe(e.target.value)} />
          </form>
          {aufgaben.map((a) => {
            const ueber = a.faellig && !a.erledigt && a.faellig < tagKey(jetzt);
            return (
              <Zeile
                key={a.id}
                erledigt={a.erledigt}
                links={<Haken an={a.erledigt} label="Erledigt" onClick={() => aendere((x) => { const y = x.aufgaben.find((z) => z.id === a.id); if (y) y.erledigt = !y.erledigt; })} />}
                titel={a.titel}
                neben={a.faellig ? <span style={ueber ? { color: 'var(--rot)' } : undefined}>{tagName(lies(a.faellig), jetzt)}</span> : undefined}
                rechts={
                  a.erledigt ? (
                    <button className="rund" aria-label="Löschen" onClick={() => aendere((x) => { x.aufgaben = x.aufgaben.filter((y) => y.id !== a.id); })}>
                      <Trash size={16} />
                    </button>
                  ) : (
                    <button
                      className="rund"
                      aria-label="Erinnerung anlegen"
                      onClick={() => {
                        erinnern(a.titel, a.faellig ?? tagKey(new Date(Date.now() + 86400000)));
                        aendere((x) => { const y = x.aufgaben.find((z) => z.id === a.id); if (y) y.erinnert = true; });
                      }}
                    >
                      <Bell size={16} weight={a.erinnert ? 'fill' : 'regular'} />
                    </button>
                  )
                }
              />
            );
          })}
        </div>
      </Gruppe>

      {d.notizen.length > 0 && (
        <Gruppe titel="Notizen">
          <div className="karte">
            {d.notizen.map((n) => (
              <Zeile
                key={n.id}
                titel={n.text}
                umbruch
                neben={kurzesDatum(n.erstellt)}
                rechts={
                  <button className="rund" aria-label="Notiz löschen" onClick={() => aendere((x) => { x.notizen = x.notizen.filter((y) => y.id !== n.id); })}>
                    <Trash size={16} />
                  </button>
                }
              />
            ))}
          </div>
        </Gruppe>
      )}
    </div>
  );
}

function AnfrageKarte({ a }: { a: Anfrage }) {
  const d = useDaten();
  const [wann, setWann] = useState(a.wann);
  const v = useMemo(() => vorschlagFuer(wann, bloecke(d.termine, d.job.aktiv ? d.job.schichten : [])), [wann, d.termine, d.job]);
  const optionen = [...(wann && v.frei && wann.length > 10 ? [wann] : []), ...v.alternativen];
  const [wahl, setWahl] = useState<string | undefined>(optionen[0]);
  const gewaehlt = wahl && optionen.includes(wahl) ? wahl : optionen[0];

  return (
    <div className="karte innen" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong>{a.von ?? 'Anfrage'}</strong>
        <span className="leise klein">{kurzesDatum(a.erstellt)}</span>
      </div>
      <div className="leise" style={{ whiteSpace: 'pre-wrap', fontSize: 15, maxHeight: '7em', overflow: 'auto' }}>{a.text}</div>

      <div className="zwei" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 8 }}>
        <input
          className="feld"
          type={wann && wann.length <= 10 ? 'date' : 'datetime-local'}
          value={wann ?? ''}
          onChange={(e) => setWann(e.target.value || undefined)}
          aria-label="Wann"
        />
        {wann && (
          <span className={`status ${v.frei ? 'gut' : 'schlecht'}`}>
            {wann.length > 10
              ? v.frei
                ? `${wannText(wann)}: du hast Zeit`
                : `${wannText(wann)}: ${v.konfliktMit ? `„${v.konfliktMit}“` : 'belegt'}`
              : v.frei
                ? `${tagName(lies(wann))} abends ist frei`
                : `${tagName(lies(wann))} abends ist belegt`}
          </span>
        )}
      </div>

      {optionen.length > 0 && (
        <div>
          <div className="label" style={{ marginLeft: 0 }}>{wann && v.frei ? 'Zusagen für' : 'Freie Abende'}</div>
          <div className="chips">
            {optionen.map((o) => (
              <button key={o} className={`chip${o === gewaehlt ? ' an' : ''}`} onClick={() => setWahl(o)}>
                {wannText(o)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="knopf-reihe">
        <button
          className="knopf klein"
          disabled={!gewaehlt}
          onClick={async () => {
            if (!gewaehlt) return;
            const antwort = zusagen({ ...a, wann }, gewaehlt);
            const ok = await kopiere(antwort);
            toast(ok ? 'Termin angelegt, Antwort kopiert' : 'Termin angelegt');
          }}
        >
          Zusagen
        </button>
        {v.alternativen.length > 0 && !(wann && v.frei) && (
          <button
            className="knopf klein zweit"
            onClick={async () => {
              const ok = await kopiere(gegenvorschlag(v.alternativen));
              toast(ok ? 'Gegenvorschlag kopiert, jetzt in WhatsApp einfügen' : 'Kopieren hat nicht geklappt');
            }}
          >
            Vorschlag kopieren
          </button>
        )}
        <button
          className="knopf klein grau"
          onClick={async () => {
            anfrageStatus(a.id, 'abgesagt');
            const ok = await kopiere('Sorry, da kann ich leider nicht. Nächstes Mal gern!');
            toast(ok ? 'Abgesagt, Antwort kopiert' : 'Abgesagt');
          }}
        >
          Absagen
        </button>
        <button className="knopf klein rot" onClick={() => aendere((x) => { x.anfragen = x.anfragen.filter((y) => y.id !== a.id); })}>
          Löschen
        </button>
      </div>
    </div>
  );
}
