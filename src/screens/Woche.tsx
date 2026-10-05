import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react';
import { useState, type CSSProperties } from 'react';
import { anKalender, terminAnlegen } from '../aktionen';
import { tagesEintraege } from '../lib/agenda';
import { MONATE, plusMinuten, plusTage, tagKey, WOCHENTAGE, wochenStart, lies, zeitKey } from '../lib/datum';
import { aendere, useDaten } from '../store';
import type { Termin } from '../types';
import { EintragZeile, eintragFarbe, KalenderBanner, KalenderStand } from '../ui/Agenda';
import { Blatt, Gruppe, Kopf, toast, useJetzt } from '../ui/ui';

export function Woche() {
  const d = useDaten();
  const jetzt = useJetzt();
  const [versatz, setVersatz] = useState(0);
  const [blatt, setBlatt] = useState<Partial<Termin> | null>(null);

  const montag = plusTage(wochenStart(jetzt), versatz * 7);
  const sonntag = plusTage(montag, 6);
  const tage = Array.from({ length: 7 }, (_, i) => plusTage(montag, i));
  const relativ = versatz === 0 ? 'Diese Woche' : versatz === 1 ? 'Nächste Woche' : versatz === -1 ? 'Letzte Woche' : '';
  const bereich =
    montag.getMonth() === sonntag.getMonth()
      ? `${montag.getDate()}. bis ${sonntag.getDate()}. ${MONATE[sonntag.getMonth()]}`
      : `${montag.getDate()}. ${MONATE[montag.getMonth()].slice(0, 3)}. bis ${sonntag.getDate()}. ${MONATE[sonntag.getMonth()].slice(0, 3)}.`;

  return (
    <div className="seite">
      <Kopf
        titel="Woche"
        unter={relativ ? `${relativ}, ${bereich}` : bereich}
        aktionen={
          <>
            <button className="rund" onClick={() => setVersatz(versatz - 1)} aria-label="Woche zurück">
              <CaretLeft size={18} weight="bold" />
            </button>
            <button className="rund" onClick={() => setVersatz(versatz + 1)} aria-label="Woche vor">
              <CaretRight size={18} weight="bold" />
            </button>
            <button
              className="rund"
              onClick={() => {
                const start = new Date(jetzt);
                start.setHours(start.getHours() + 1, 0, 0, 0);
                setBlatt({ titel: '', start: zeitKey(start), ganztag: false });
              }}
              aria-label="Neuer Termin"
            >
              <Plus size={18} weight="bold" />
            </button>
          </>
        }
      />
      <KalenderBanner />
      {versatz !== 0 && (
        <button className="knopf zweit klein" style={{ marginBottom: 8 }} onClick={() => setVersatz(0)}>
          Zu heute
        </button>
      )}

      {tage.map((tag, i) => {
        const eintraege = tagesEintraege(d, tag);
        const istHeute = tagKey(tag) === tagKey(jetzt);
        return (
          <section key={`${versatz}-${tagKey(tag)}`} className="rein" style={{ '--i': i } as CSSProperties}>
            <div className={`tag-kopf${istHeute ? ' heute' : ''}`}>
              <span className="nr">{tag.getDate()}</span>
              <span>{istHeute ? 'Heute' : WOCHENTAGE[tag.getDay()]}</span>
            </div>
            <div className="karte">
              {eintraege.length === 0 ? (
                <button className="zeile" onClick={() => setBlatt({ titel: '', start: `${tagKey(tag)}T19:00`, ganztag: false })}>
                  <span className="leise" style={{ fontSize: 15 }}>Frei</span>
                </button>
              ) : (
                eintraege.map((e) => (
                  <EintragZeile
                    key={e.key}
                    e={e}
                    tag={tag}
                    farbe={eintragFarbe(e)}
                    onClick={
                      e.art === 'termin' || e.art === 'kalender' || e.art === 'treffen'
                        ? () => setBlatt(d.termine.find((t) => t.id === e.id) ?? null)
                        : undefined
                    }
                  />
                ))
              )}
            </div>
          </section>
        );
      })}

      <Gruppe fuss="Termine aus deinem iCloud-Kalender kommen über den Kurzbefehl „MILI Kalender“. Neue Termine aus MILI schreibt „MILI Termin“ direkt in deinen Kalender.">
        <div className="karte" style={{ marginTop: 24 }}>
          <KalenderStand />
        </div>
      </Gruppe>

      <TerminBlatt termin={blatt} onClose={() => setBlatt(null)} />
    </div>
  );
}

export function TerminBlatt({ termin, onClose }: { termin: Partial<Termin> | null; onClose: () => void }) {
  return termin ? <TerminFormular key={termin.id ?? 'neu'} start={termin} onClose={onClose} /> : null;
}

function TerminFormular({ start, onClose }: { start: Partial<Termin>; onClose: () => void }) {
  const d = useDaten();
  const [t, setT] = useState<Partial<Termin>>(start);
  const neu = !start.id;
  const ausKalender = start.quelle === 'kalender';
  const setze = (x: Partial<Termin>) => setT((alt) => ({ ...alt, ...x }));

  function speichern() {
    if (!t.titel?.trim() || !t.start) {
      toast('Titel und Beginn fehlen');
      return;
    }
    if (neu) {
      terminAnlegen({ titel: t.titel.trim(), start: t.start, ende: t.ende, ganztag: !!t.ganztag, ort: t.ort });
      toast(d.einstellungen.kurzbefehleAktiv ? 'Termin angelegt und an den Kalender geschickt' : 'Termin angelegt');
    } else {
      aendere((x) => {
        const y = x.termine.find((z) => z.id === start.id);
        if (y) Object.assign(y, t);
      });
    }
    onClose();
  }

  return (
    <Blatt titel={neu ? 'Neuer Termin' : ausKalender ? 'Termin' : 'Termin bearbeiten'} offen onClose={onClose} fertig={ausKalender ? undefined : speichern} fertigText={neu ? 'Hinzufügen' : 'Sichern'}>
      <div className="formular">
        <input className="feld" placeholder="Titel" value={t.titel ?? ''} onChange={(e) => setze({ titel: e.target.value })} disabled={ausKalender} autoFocus={neu} />
        <input className="feld" placeholder="Ort" value={t.ort ?? ''} onChange={(e) => setze({ ort: e.target.value })} disabled={ausKalender} />
        <div className="karte">
          <label className="zeile">
            <div className="haupt">Ganztägig</div>
            <input
              type="checkbox"
              checked={!!t.ganztag}
              disabled={ausKalender}
              onChange={(e) => setze({ ganztag: e.target.checked, start: e.target.checked ? t.start?.slice(0, 10) : `${t.start?.slice(0, 10)}T19:00`, ende: undefined })}
            />
          </label>
          <label className="zeile">
            <div className="haupt">Beginn</div>
            <input
              className="ohne"
              type={t.ganztag ? 'date' : 'datetime-local'}
              value={t.start ?? ''}
              disabled={ausKalender}
              onChange={(e) => setze({ start: e.target.value })}
            />
          </label>
          {!t.ganztag && (
            <label className="zeile">
              <div className="haupt">Ende</div>
              <input
                className="ohne"
                type="datetime-local"
                value={t.ende ?? (t.start ? zeitKey(plusMinuten(lies(t.start), 60)) : '')}
                disabled={ausKalender}
                onChange={(e) => setze({ ende: e.target.value })}
              />
            </label>
          )}
        </div>
        {ausKalender && <p className="leise klein">Aus deinem iCloud-Kalender ({start.kalender ?? 'Kalender'}). Ändern geht in der Kalender-App.</p>}
        {!neu && !ausKalender && (
          <div className="knopf-reihe">
            {!start.gesendet && (
              <button className="knopf zweit" onClick={() => { anKalender(start as Termin); onClose(); }}>
                An iCloud-Kalender senden
              </button>
            )}
            <button
              className="knopf rot"
              onClick={() => {
                aendere((x) => {
                  x.termine = x.termine.filter((y) => y.id !== start.id);
                });
                toast(start.gesendet ? 'In MILI gelöscht. Im iCloud-Kalender bitte selbst löschen.' : 'Termin gelöscht');
                onClose();
              }}
            >
              Löschen
            </button>
          </div>
        )}
      </div>
    </Blatt>
  );
}
