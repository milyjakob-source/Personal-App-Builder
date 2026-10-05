import { CalendarBlank, CaretDown, Cake, ChatsCircle, Check, CheckCircle, ClipboardText, Microphone, NoteBlank, ShoppingCart, Wallet, X } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { kalenderImport, uebernehme } from '../aktionen';
import { wannText } from '../lib/datum';
import { erkenne, type Art, type Vorschlag } from '../lib/erkennen';
import { bloecke, vorschlagFuer } from '../lib/frei';
import { leseKalenderExport } from '../lib/kurzbefehle';
import { euro } from '../lib/sparplan';
import { useDaten } from '../store';
import { ausZwischenablage, FARBE, Icon, toast } from './ui';

const ARTEN: [Art, string, ReactNode][] = [
  ['termin', 'Termin', <CalendarBlank size={16} weight="fill" />],
  ['aufgabe', 'Aufgabe', <CheckCircle size={16} weight="fill" />],
  ['anfrage', 'Anfrage', <ChatsCircle size={16} weight="fill" />],
  ['einkauf', 'Einkauf', <ShoppingCart size={16} weight="fill" />],
  ['geburtstag', 'Geburtstag', <Cake size={16} weight="fill" />],
  ['ausgabe', 'Ausgabe', <Wallet size={16} weight="fill" />],
  ['notiz', 'Notiz', <NoteBlank size={16} weight="fill" />],
];
const artInfo = (a: Art) => ARTEN.find(([x]) => x === a)!;

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function spracheVerfuegbar(): (new () => SR) | undefined {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

type Eintrag = { v: Vorschlag; an: boolean };

/** Ein Feld für alles: tippen, diktieren oder Nachrichten einfügen. MILI macht daraus Vorschläge. */
export function Erfassen({ gross = false, orb = false, start, onGespeichert }: { gross?: boolean; orb?: boolean; start?: 'tippen' | 'einfuegen'; onGespeichert?: () => void }) {
  const [text, setText] = useState('');
  const [liste, setListe] = useState<Eintrag[]>([]);
  const [offen, setOffen] = useState<number | null>(null);
  const [hoert, setHoert] = useState(false);
  const sr = useRef<SR | null>(null);
  const feld = useRef<HTMLTextAreaElement>(null);
  const Sprache = useMemo(spracheVerfuegbar, []);

  useEffect(() => {
    if (start === 'tippen') feld.current?.focus();
    if (start === 'einfuegen') einfuegen();
    return () => sr.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const f = feld.current;
    if (!f) return;
    f.style.height = 'auto';
    f.style.height = `${Math.min(f.scrollHeight, 220)}px`;
  }, [text]);

  function auswerten(eingabe = text) {
    sr.current?.stop();
    const kalender = leseKalenderExport(eingabe);
    if (kalender) {
      toast(`Kalender aktualisiert: ${kalenderImport(kalender)} Termine`);
      setText('');
      onGespeichert?.();
      return;
    }
    const v = erkenne(eingabe);
    if (!v.length) {
      toast('Da habe ich nichts gefunden');
      return;
    }
    feld.current?.blur();
    setListe(v.map((x) => ({ v: x, an: true })));
    setOffen(v.length === 1 ? 0 : null);
  }

  async function einfuegen() {
    const t = await ausZwischenablage();
    if (t === undefined) {
      toast('Lang ins Feld tippen und „Einsetzen“ wählen');
      feld.current?.focus();
      return;
    }
    if (!t.trim()) {
      toast('Die Zwischenablage ist leer');
      return;
    }
    const neu = text ? `${text}\n${t}` : t;
    setText(neu);
    auswerten(neu);
  }

  function sprechen() {
    if (!Sprache) {
      feld.current?.focus();
      toast('Jetzt auf das Mikrofon der Tastatur tippen');
      return;
    }
    if (hoert) {
      sr.current?.stop();
      return;
    }
    const r = new Sprache();
    r.lang = 'de-DE';
    r.continuous = true;
    r.interimResults = false;
    const basis = text;
    let gesagt = '';
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) gesagt += (gesagt ? ' ' : '') + e.results[i][0].transcript.trim();
      }
      setText(basis ? `${basis} ${gesagt}` : gesagt);
    };
    r.onend = () => setHoert(false);
    r.onerror = () => {
      setHoert(false);
      feld.current?.focus();
      toast('Nimm das Mikrofon der Tastatur');
    };
    sr.current = r;
    try {
      r.start();
      setHoert(true);
    } catch {
      feld.current?.focus();
    }
  }

  function leeren() {
    setText('');
    setListe([]);
    setOffen(null);
  }

  function alleUebernehmen() {
    const gewaehlt = liste.filter((e) => e.an);
    if (!gewaehlt.length) return;
    const meldungen = gewaehlt.map((e) => uebernehme(e.v));
    toast(gewaehlt.length === 1 ? meldungen[0] : `${gewaehlt.length} Einträge gespeichert`);
    leeren();
    onGespeichert?.();
  }

  const anzahl = liste.filter((e) => e.an).length;

  return (
    <>
      {orb && (
        <div className="orb-buehne">
          <button className={`orb${hoert ? ' hoert' : ''}`} onClick={sprechen} aria-label={hoert ? 'Aufnahme stoppen' : 'Sprechen'}>
            <Microphone size={52} weight="fill" />
          </button>
          <div className="orb-text">{hoert ? 'Ich höre zu. Nochmal tippen zum Beenden.' : 'Tippen und einfach losreden'}</div>
        </div>
      )}
      <div className="karte">
        <div className="erfassen">
          <textarea
            ref={feld}
            value={text}
            rows={gross ? 3 : 2}
            placeholder={gross ? 'Gedanken abladen, diktieren oder kopierte Nachrichten einfügen' : 'Gedanken abladen ...'}
            onChange={(e) => {
              setText(e.target.value);
              if (liste.length) setListe([]);
            }}
            aria-label="Gedanken abladen"
          />
          <div className="leiste">
            {Sprache && !orb && (
              <button className={`rund${hoert ? ' an' : ''}`} onClick={sprechen} aria-label="Sprechen">
                <Microphone size={19} weight={hoert ? 'fill' : 'regular'} />
              </button>
            )}
            <button className="rund" onClick={einfuegen} aria-label="Aus Zwischenablage einfügen">
              <ClipboardText size={19} />
            </button>
            {text && (
              <button className="rund" onClick={leeren} aria-label="Leeren">
                <X size={17} />
              </button>
            )}
            <span className="platz" />
            <button className="knopf klein" disabled={!text.trim()} onClick={() => auswerten()}>
              Einordnen
            </button>
          </div>
        </div>

        {liste.length > 0 && (
          <div className="erkannt">
            <div className="erkannt-kopf">
              {liste.length === 1 ? 'Erkannt' : `${liste.length} Sachen erkannt`}
              <span className="leise">Antippen zum Ändern</span>
            </div>
            {liste.map((e, i) => (
              <div key={i} className="v-block" style={{ '--i': i } as CSSProperties}>
                <VorschlagZeile
                  e={e}
                  offen={offen === i}
                  onToggle={() => setListe(liste.map((x, j) => (j === i ? { ...x, an: !x.an } : x)))}
                  onOeffnen={() => setOffen(offen === i ? null : i)}
                />
                {offen === i && (
                  <VorschlagEditor
                    v={e.v}
                    onChange={(v) => setListe(liste.map((x, j) => (j === i ? { ...x, v } : x)))}
                    onFertig={() => setOffen(null)}
                    onEntfernen={() => {
                      setListe(liste.filter((_, j) => j !== i));
                      setOffen(null);
                    }}
                  />
                )}
              </div>
            ))}
            <div className="erkannt-fuss">
              <button className="knopf voll" disabled={!anzahl} onClick={alleUebernehmen}>
                <Check size={18} weight="bold" />
                {anzahl === 1 ? 'Übernehmen' : `${anzahl} übernehmen`}
              </button>
            </div>
          </div>
        )}
      </div>
      {gross && !Sprache && !orb && (
        <p className="gruppe-fuss">Zum Sprechen das Mikrofon unten rechts auf der iPhone-Tastatur antippen.</p>
      )}
    </>
  );
}

function VorschlagZeile({ e, offen, onToggle, onOeffnen }: { e: Eintrag; offen: boolean; onToggle: () => void; onOeffnen: () => void }) {
  const [, name, icon] = artInfo(e.v.art);
  return (
    <div className={`v-zeile${e.an ? '' : ' aus'}`}>
      <button className={`check${e.an ? ' an' : ''}`} onClick={onToggle} aria-label={e.an ? 'Nicht übernehmen' : 'Übernehmen'} aria-pressed={e.an} style={{ '--farbe': FARBE[e.v.art] } as CSSProperties}>
        <Check size={14} weight="bold" />
      </button>
      <button className="v-inhalt" onClick={onOeffnen}>
        <Icon farbe={FARBE[e.v.art]}>{icon}</Icon>
        <span className="v-text">
          <span className="v-titel">{e.v.art === 'anfrage' && e.v.von ? `${e.v.von} fragt` : e.v.titel}</span>
          <span className="v-neben">{beschreibung(e.v, name)}</span>
        </span>
        <CaretDown size={15} weight="bold" className="v-pfeil" style={{ transform: offen ? 'rotate(180deg)' : undefined }} />
      </button>
    </div>
  );
}

function beschreibung(v: Vorschlag, name: string): string {
  const teile = [name];
  if (v.wann) teile.push(wannText(v.wann));
  if (v.ort) teile.push(v.ort);
  if (v.art === 'ausgabe' && v.betrag) teile.push(euro(v.betrag, true));
  if (v.art === 'geburtstag' && v.geburtstag) teile.push(`${v.geburtstag.tag}.${v.geburtstag.monat}.`);
  return teile.join(' · ');
}

function VorschlagEditor({ v, onChange, onFertig, onEntfernen }: { v: Vorschlag; onChange: (v: Vorschlag) => void; onFertig: () => void; onEntfernen: () => void }) {
  const d = useDaten();
  const setze = (teil: Partial<Vorschlag>) => onChange({ ...v, ...teil });
  const mitZeit = !!v.wann && v.wann.length > 10;
  const [gebText, setGebText] = useState(() => (v.geburtstag ? `${v.geburtstag.tag}.${v.geburtstag.monat}.${v.geburtstag.jahr ?? ''}` : ''));

  const verfuegbar = useMemo(() => {
    if (v.art !== 'anfrage' && v.art !== 'termin') return undefined;
    return vorschlagFuer(v.wann, bloecke(d.termine, d.job.aktiv ? d.job.schichten : []));
  }, [v.art, v.wann, d.termine, d.job]);

  return (
    <div className="v-editor">
      <div className="chips">
        {ARTEN.map(([a, name]) => (
          <button key={a} className={`chip${v.art === a ? ' an' : ''}`} style={{ '--farbe': FARBE[a] } as CSSProperties} onClick={() => setze({ art: a })}>
            {name}
          </button>
        ))}
      </div>

      {v.art === 'anfrage' && <div className="v-original">{v.original}</div>}

      {v.art === 'einkauf' ? (
        <input className="feld" value={(v.posten ?? [v.titel]).join(', ')} onChange={(e) => setze({ posten: e.target.value.split(',').map((p) => p.trim()).filter(Boolean) })} aria-label="Was kaufen" />
      ) : v.art === 'anfrage' ? (
        <input className="feld" value={v.von ?? ''} placeholder="Von wem?" onChange={(e) => setze({ von: e.target.value, titel: `Treffen mit ${e.target.value}` })} aria-label="Von" />
      ) : (
        <input className="feld titel-feld" value={v.titel} onChange={(e) => setze({ titel: e.target.value })} aria-label="Titel" />
      )}

      {(v.art === 'termin' || v.art === 'anfrage') && (
        <>
          <div className="zwei-spalten">
            <input className="feld" type={mitZeit ? 'datetime-local' : 'date'} value={v.wann ?? ''} onChange={(e) => setze({ wann: e.target.value || undefined })} aria-label="Wann" />
            <button className="knopf grau" onClick={() => setze({ wann: v.wann ? (mitZeit ? v.wann.slice(0, 10) : `${v.wann}T19:00`) : undefined })}>
              {mitZeit ? 'Ganztägig' : 'Uhrzeit'}
            </button>
          </div>
          {v.art === 'termin' && <input className="feld" value={v.ort ?? ''} placeholder="Ort (optional)" onChange={(e) => setze({ ort: e.target.value || undefined })} aria-label="Ort" />}
          {verfuegbar && v.wann && (
            <span className={`status ${verfuegbar.frei ? 'gut' : 'schlecht'}`}>
              {verfuegbar.frei ? 'Du hast da Zeit' : verfuegbar.konfliktMit ? `Überschneidet sich mit „${verfuegbar.konfliktMit}“` : 'Da ist schon etwas'}
            </span>
          )}
        </>
      )}

      {(v.art === 'aufgabe' || v.art === 'ausgabe') && (
        <div className={v.art === 'ausgabe' ? 'zwei-spalten' : ''}>
          {v.art === 'ausgabe' && (
            <input
              className="feld"
              inputMode="decimal"
              placeholder="Betrag in €"
              value={v.betrag ? String(v.betrag / 100).replace('.', ',') : ''}
              onChange={(e) => setze({ betrag: Math.round(parseFloat(e.target.value.replace(',', '.')) * 100) || 0 })}
              aria-label="Betrag"
            />
          )}
          <input className="feld" type="date" value={v.wann?.slice(0, 10) ?? ''} onChange={(e) => setze({ wann: e.target.value || undefined })} aria-label="Fällig" />
        </div>
      )}

      {v.art === 'geburtstag' && (
        <input
          className="feld"
          inputMode="decimal"
          placeholder="TT.MM. oder TT.MM.JJJJ"
          value={gebText}
          onChange={(e) => {
            setGebText(e.target.value);
            const m = /^(\d{1,2})\.(\d{1,2})\.?(\d{4})?$/.exec(e.target.value.trim());
            if (m) setze({ geburtstag: { name: v.titel, tag: +m[1], monat: +m[2], jahr: m[3] ? +m[3] : undefined } });
          }}
          aria-label="Geburtstag"
        />
      )}

      <div className="knopf-reihe">
        <button className="knopf klein zweit" onClick={onFertig}>
          Fertig
        </button>
        <button className="knopf klein rot" onClick={onEntfernen}>
          Entfernen
        </button>
      </div>
    </div>
  );
}
