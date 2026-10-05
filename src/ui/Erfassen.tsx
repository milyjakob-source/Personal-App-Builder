import { ClipboardText, Microphone, X } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { kalenderImport, uebernehme } from '../aktionen';
import { wannText } from '../lib/datum';
import { erkenne, type Art, type Vorschlag } from '../lib/erkennen';
import { bloecke, vorschlagFuer } from '../lib/frei';
import { leseKalenderExport } from '../lib/kurzbefehle';
import { euro } from '../lib/sparplan';
import { useDaten } from '../store';
import { ausZwischenablage, toast } from './ui';

const ARTEN: [Art, string][] = [
  ['termin', 'Termin'],
  ['anfrage', 'Anfrage'],
  ['aufgabe', 'Aufgabe'],
  ['einkauf', 'Einkauf'],
  ['geburtstag', 'Geburtstag'],
  ['ausgabe', 'Ausgabe'],
  ['notiz', 'Notiz'],
];

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

/** Ein Feld für alles: tippen, diktieren oder Nachrichten einfügen. MILI macht daraus Vorschläge. */
export function Erfassen({ gross = false }: { gross?: boolean }) {
  const [text, setText] = useState('');
  const [vorschlaege, setVorschlaege] = useState<Vorschlag[]>([]);
  const [hoert, setHoert] = useState(false);
  const sr = useRef<SR | null>(null);
  const feld = useRef<HTMLTextAreaElement>(null);
  const Sprache = useMemo(spracheVerfuegbar, []);

  useEffect(() => {
    const f = feld.current;
    if (!f) return;
    f.style.height = 'auto';
    f.style.height = `${Math.min(f.scrollHeight, 320)}px`;
  }, [text]);

  function auswerten(eingabe = text) {
    const kalender = leseKalenderExport(eingabe);
    if (kalender) {
      const n = kalenderImport(kalender);
      toast(`Kalender aktualisiert: ${n} Termine`);
      setText('');
      return;
    }
    const v = erkenne(eingabe);
    if (!v.length) return;
    setVorschlaege(v);
  }

  async function einfuegen() {
    const t = await ausZwischenablage();
    if (t === undefined) {
      toast('Kein Zugriff auf die Zwischenablage. Lang ins Feld tippen und „Einsetzen“ wählen.');
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
    if (!Sprache) return;
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
      toast('Spracheingabe geht hier nicht. Nimm das Mikrofon der Tastatur.');
    };
    sr.current = r;
    r.start();
    setHoert(true);
  }

  function fertig(i: number, meldung?: string) {
    if (meldung) toast(meldung);
    const rest = vorschlaege.filter((_, j) => j !== i);
    setVorschlaege(rest);
    if (!rest.length) setText('');
  }

  return (
    <div className="karte">
      <div className="erfassen">
        <textarea
          ref={feld}
          value={text}
          rows={gross ? 4 : 2}
          placeholder={gross ? 'Gedanken abladen, diktieren oder kopierte Nachrichten einfügen' : 'Gedanken abladen ...'}
          onChange={(e) => {
            setText(e.target.value);
            if (vorschlaege.length) setVorschlaege([]);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) auswerten();
          }}
          aria-label="Gedanken abladen"
        />
        <div className="leiste">
          {Sprache && (
            <button className={`rund mic${hoert ? ' an' : ''}`} onClick={sprechen} aria-label={hoert ? 'Aufnahme stoppen' : 'Sprechen'}>
              <Microphone size={19} weight={hoert ? 'fill' : 'regular'} />
            </button>
          )}
          <button className="rund" onClick={einfuegen} aria-label="Aus Zwischenablage einfügen">
            <ClipboardText size={19} />
          </button>
          {text && (
            <button className="rund" onClick={() => { setText(''); setVorschlaege([]); }} aria-label="Leeren">
              <X size={17} />
            </button>
          )}
          <span className="platz" />
          <button className="knopf klein" disabled={!text.trim()} onClick={() => auswerten()}>
            Einordnen
          </button>
        </div>
        {gross && !Sprache && (
          <p className="leise klein" style={{ margin: '10px 2px 0' }}>
            Zum Sprechen das Mikrofon unten rechts auf der iPhone-Tastatur antippen.
          </p>
        )}
      </div>
      {vorschlaege.map((v, i) => (
        <VorschlagKarte key={`${i}-${v.original}`} v={v} onFertig={(m) => fertig(i, m)} />
      ))}
      {vorschlaege.length > 1 && (
        <div style={{ padding: '0 16px 16px' }}>
          <button
            className="knopf zweit voll"
            onClick={() => {
              const n = vorschlaege.length;
              vorschlaege.forEach((v) => uebernehme(v));
              setVorschlaege([]);
              setText('');
              toast(`${n} Einträge übernommen`);
            }}
          >
            Alle übernehmen
          </button>
        </div>
      )}
    </div>
  );
}

function VorschlagKarte({ v: start, onFertig }: { v: Vorschlag; onFertig: (meldung?: string) => void }) {
  const [v, setV] = useState(start);
  const d = useDaten();
  const setze = (teil: Partial<Vorschlag>) => setV((alt) => ({ ...alt, ...teil }));
  const mitZeit = !!v.wann && v.wann.length > 10;

  const verfuegbar = useMemo(() => {
    if (v.art !== 'anfrage' && v.art !== 'termin') return undefined;
    const b = bloecke(d.termine, d.job.aktiv ? d.job.schichten : []);
    return vorschlagFuer(v.wann, b);
  }, [v.art, v.wann, d.termine, d.job]);

  return (
    <div className="vorschlag">
      <div className="chips">
        {ARTEN.map(([a, name]) => (
          <button key={a} className={`chip${v.art === a ? ' an' : ''}`} onClick={() => setze({ art: a })}>
            {name}
          </button>
        ))}
      </div>

      {v.art === 'anfrage' && v.original && <div className="original">{v.original}</div>}

      {v.art === 'einkauf' ? (
        <input
          className="feld"
          value={(v.posten ?? [v.titel]).join(', ')}
          onChange={(e) => setze({ posten: e.target.value.split(',').map((p) => p.trim()).filter(Boolean) })}
          aria-label="Was kaufen"
        />
      ) : v.art === 'anfrage' ? (
        <input className="feld" value={v.von ?? ''} placeholder="Von wem?" onChange={(e) => setze({ von: e.target.value, titel: `Treffen mit ${e.target.value}` })} aria-label="Von" />
      ) : (
        <input className="feld titel-feld" value={v.titel} onChange={(e) => setze({ titel: e.target.value })} aria-label="Titel" />
      )}

      {(v.art === 'termin' || v.art === 'anfrage') && (
        <div className="formular">
          <div className="zwei">
            <input
              className="feld"
              type={mitZeit ? 'datetime-local' : 'date'}
              value={v.wann ?? ''}
              onChange={(e) => setze({ wann: e.target.value || undefined })}
              aria-label="Wann"
            />
            <button className="knopf grau" onClick={() => setze({ wann: v.wann ? (mitZeit ? v.wann.slice(0, 10) : `${v.wann}T19:00`) : undefined })}>
              {mitZeit ? 'Ganztägig' : 'Mit Uhrzeit'}
            </button>
          </div>
          {verfuegbar && v.wann && (
            <span className={`status ${verfuegbar.frei ? 'gut' : 'schlecht'}`}>
              {verfuegbar.frei ? 'Du hast da Zeit' : verfuegbar.konfliktMit ? `Überschneidet sich mit „${verfuegbar.konfliktMit}“` : 'Da ist schon etwas'}
            </span>
          )}
        </div>
      )}

      {(v.art === 'aufgabe' || v.art === 'ausgabe') && (
        <div className="formular zwei" style={{ display: 'grid', gridTemplateColumns: v.art === 'ausgabe' ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 10 }}>
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
          type="date"
          value={v.geburtstag ? `${v.geburtstag.jahr ?? 2000}-${String(v.geburtstag.monat).padStart(2, '0')}-${String(v.geburtstag.tag).padStart(2, '0')}` : ''}
          onChange={(e) => {
            const [j, m, t] = e.target.value.split('-').map(Number);
            if (t) setze({ geburtstag: { name: v.titel, tag: t, monat: m, jahr: j !== 2000 ? j : undefined } });
          }}
          aria-label="Geburtstag"
        />
      )}

      <p className="leise klein" style={{ margin: 0 }}>{zusammenfassung(v)}</p>

      <div className="knopf-reihe">
        <button className="knopf klein" onClick={() => onFertig(uebernehme(v))}>
          Übernehmen
        </button>
        <button className="knopf klein grau" onClick={() => onFertig()}>
          Verwerfen
        </button>
      </div>
    </div>
  );
}

function zusammenfassung(v: Vorschlag): string {
  switch (v.art) {
    case 'termin':
      return v.wann ? `Kommt in deinen Kalender: ${wannText(v.wann)}` : 'Ohne Datum wird daraus eine Aufgabe.';
    case 'anfrage':
      return 'Landet bei den offenen Anfragen. Dort kannst du zusagen oder etwas anderes vorschlagen.';
    case 'aufgabe':
      return v.wann ? `Fällig ${wannText(v.wann)}` : 'Ohne Fälligkeit';
    case 'einkauf':
      return 'Kommt auf die Einkaufsliste.';
    case 'geburtstag':
      return 'MILI erinnert dich auf der Startseite eine Woche vorher.';
    case 'ausgabe':
      return v.betrag ? `${euro(v.betrag, true)} werden im Sparplan eingeplant.` : 'Betrag fehlt noch.';
    case 'notiz':
      return 'Wird als Notiz gespeichert.';
  }
}
