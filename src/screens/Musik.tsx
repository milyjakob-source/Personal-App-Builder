import { ArrowSquareOut, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { CHECKLISTE, SRH_LINK, SRH_PORTAL } from '../data/studium';
import { naechsteFristen } from '../lib/agenda';
import { lies, tageBis, tagName } from '../lib/datum';
import { RUBRIKEN, useNews, wieAlt } from '../lib/news';
import { aendere, neueId, useDaten } from '../store';
import type { Frist } from '../types';
import { Blatt, geh, Gruppe, Haken, Kopf, Leer, Segment, toast, useJetzt, Zeile } from '../ui/ui';

export function Musik({ unter }: { unter?: string }) {
  const ansicht = unter === 'news' ? 'news' : 'studium';
  return (
    <div className="seite">
      <Kopf titel="Musik" zurueck="mehr" unter="Studium und was in der Szene passiert" />
      <Segment
        wert={ansicht}
        optionen={[
          ['studium', 'Studium'],
          ['news', 'News'],
        ]}
        onChange={(w) => geh(w === 'news' ? 'mehr/musik/news' : 'mehr/musik')}
      />
      {ansicht === 'studium' ? <Studium /> : <NewsListe />}
    </div>
  );
}

function Studium() {
  const d = useDaten();
  const jetzt = useJetzt();
  const [frist, setFrist] = useState<Partial<Frist> | null>(null);
  const naechste = naechsteFristen(d, jetzt)[0];
  const erledigt = CHECKLISTE.filter((c) => d.einstellungen.checkliste[c.id]).length;
  const gruppen = [...new Set(CHECKLISTE.map((c) => c.gruppe))];
  const fristen = [...d.fristen].sort((a, b) => a.datum.localeCompare(b.datum));

  return (
    <>
      <Gruppe>
        <div className="karte innen" style={{ display: 'grid', gap: 10 }}>
          <div>
            <div className="fett">Popularmusik (B.Mus.)</div>
            <div className="leise klein">SRH University Berlin, Berlin School of Popular Arts. 7 Semester, Start im April oder Oktober.</div>
          </div>
          {naechste && (
            <div>
              <div className="gross-zahl" style={{ fontSize: 34 }}>{tageBis(lies(naechste.datum), jetzt)} Tage</div>
              <div className="leise">bis: {naechste.titel}</div>
            </div>
          )}
          <div className="fortschritt" aria-label={`${erledigt} von ${CHECKLISTE.length} erledigt`}>
            <div style={{ width: `${(erledigt / CHECKLISTE.length) * 100}%` }} />
          </div>
          <div className="leise klein">{erledigt} von {CHECKLISTE.length} Schritten erledigt</div>
        </div>
      </Gruppe>

      <Gruppe titel="Fristen" mehr={{ text: 'Neu', onClick: () => setFrist({ titel: '', datum: '' }) }} fuss="Vermutete Termine sind markiert. Prüf sie im Bewerbungsportal und pass sie hier an.">
        <div className="karte">
          {fristen.map((f) => (
            <Zeile
              key={f.id}
              erledigt={f.erledigt}
              links={<Haken an={!!f.erledigt} label="Erledigt" onClick={() => aendere((x) => { const y = x.fristen.find((z) => z.id === f.id); if (y) y.erledigt = !y.erledigt; })} />}
              titel={f.titel}
              neben={`${tagName(lies(f.datum), jetzt)}${f.notiz?.startsWith('Vermutet') ? ' · vermutet' : ''}`}
              onClick={() => setFrist(f)}
              pfeil
            />
          ))}
        </div>
      </Gruppe>

      {gruppen.map((g) => (
        <Gruppe key={g} titel={g}>
          <div className="karte">
            {CHECKLISTE.filter((c) => c.gruppe === g).map((c) => {
              const an = !!d.einstellungen.checkliste[c.id];
              return (
                <Zeile
                  key={c.id}
                  erledigt={an}
                  umbruch
                  links={<Haken an={an} label="Erledigt" onClick={() => aendere((x) => { x.einstellungen.checkliste[c.id] = !an; })} />}
                  titel={c.text}
                />
              );
            })}
          </div>
        </Gruppe>
      ))}

      <Gruppe titel="Links">
        <div className="karte">
          <a className="zeile" href={SRH_LINK} target="_blank" rel="noreferrer">
            <div className="haupt">Studiengang bei der SRH</div>
            <ArrowSquareOut size={17} />
          </a>
          <a className="zeile" href={SRH_PORTAL} target="_blank" rel="noreferrer">
            <div className="haupt">Bewerbungsportal</div>
            <ArrowSquareOut size={17} />
          </a>
        </div>
      </Gruppe>

      {frist && <FristBlatt start={frist} onClose={() => setFrist(null)} />}
    </>
  );
}

function FristBlatt({ start, onClose }: { start: Partial<Frist>; onClose: () => void }) {
  const [f, setF] = useState(start);
  return (
    <Blatt
      titel={start.id ? 'Frist' : 'Neue Frist'}
      offen
      onClose={onClose}
      fertigText="Sichern"
      fertig={() => {
        if (!f.titel?.trim() || !f.datum) {
          toast('Titel und Datum fehlen');
          return;
        }
        aendere((x) => {
          const y = x.fristen.find((z) => z.id === start.id);
          if (y) Object.assign(y, f);
          else x.fristen.push({ id: neueId(), titel: f.titel!.trim(), datum: f.datum!, notiz: f.notiz });
        });
        onClose();
      }}
    >
      <div className="formular">
        <input className="feld" placeholder="Titel" value={f.titel ?? ''} onChange={(e) => setF({ ...f, titel: e.target.value })} />
        <input className="feld" type="date" value={f.datum ?? ''} onChange={(e) => setF({ ...f, datum: e.target.value })} aria-label="Datum" />
        <textarea className="feld" rows={4} placeholder="Notiz" value={f.notiz ?? ''} onChange={(e) => setF({ ...f, notiz: e.target.value })} />
        {f.link && <a href={f.link} target="_blank" rel="noreferrer">Link öffnen</a>}
        {start.id && (
          <button className="knopf rot" onClick={() => { aendere((x) => { x.fristen = x.fristen.filter((y) => y.id !== start.id); }); onClose(); }}>
            <Trash size={16} /> Löschen
          </button>
        )}
      </div>
    </Blatt>
  );
}

function NewsListe() {
  const news = useNews();
  const jetzt = useJetzt();
  const [rubrik, setRubrik] = useState('');
  const artikel = news?.artikel.filter((a) => !rubrik || a.rubrik === rubrik) ?? [];
  return (
    <>
      <div className="chips" style={{ marginBottom: 16 }}>
        <button className={`chip${!rubrik ? ' an' : ''}`} onClick={() => setRubrik('')}>Alle</button>
        {RUBRIKEN.filter((r) => news?.artikel.some((a) => a.rubrik === r)).map((r) => (
          <button key={r} className={`chip${rubrik === r ? ' an' : ''}`} onClick={() => setRubrik(r)}>{r}</button>
        ))}
      </div>
      <div className="karte">
        {!news && <Leer titel="Lädt ..." />}
        {news && !artikel.length && <Leer titel="Noch nichts da">Die News werden einmal am Tag gesammelt.</Leer>}
        {artikel.map((a) => (
          <a key={a.link} className="zeile" href={a.link} target="_blank" rel="noreferrer">
            <div className="haupt">
              <div className="news-quelle">{a.rubrik} · {a.quelle} · {wieAlt(a.datum, jetzt)}</div>
              <div className="titel umbruch" style={{ color: 'var(--text)', fontSize: 16 }}>{a.titel}</div>
            </div>
          </a>
        ))}
      </div>
      {news?.stand && <p className="gruppe-fuss">Zuletzt gesammelt {wieAlt(news.stand, jetzt)}.</p>}
      <p className="gruppe-fuss">
        Quellen und Stichworte (Künstler, Städte) stehen in <code>scripts/news.mjs</code> im Repo.
      </p>
    </>
  );
}
