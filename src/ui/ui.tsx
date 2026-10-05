import { CaretLeft, CaretRight, Check } from '@phosphor-icons/react';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Feste Farben pro Bereich (iOS-Systemfarben). */
export const FARBE = {
  termin: 'var(--blau)',
  kalender: 'var(--teal)',
  treffen: 'var(--gruen)',
  anfrage: 'var(--gruen)',
  aufgabe: 'var(--orange)',
  einkauf: '#e8900c',
  geburtstag: 'var(--pink)',
  geld: 'var(--mint)',
  musik: 'var(--lila)',
  job: 'var(--indigo)',
  frist: 'var(--rot)',
  notiz: '#d4a20a',
  ausgabe: 'var(--mint)',
} as const;

export const farbStil = (farbe?: string) => (farbe ? ({ '--farbe': farbe } as CSSProperties) : undefined);

// --- Navigation über den Hash (#/heute, #/mehr/einkauf ...) -----------------

function hashPfad(): string {
  return window.location.hash.replace(/^#\/?/, '') || 'heute';
}

export function usePfad(): string {
  return useSyncExternalStore(
    (h) => {
      window.addEventListener('hashchange', h);
      return () => window.removeEventListener('hashchange', h);
    },
    hashPfad,
  );
}

export function geh(pfad: string) {
  window.location.hash = `/${pfad}`;
  window.scrollTo(0, 0);
}

// --- Toast im Stil der Dynamic Island ---------------------------------------

let toastText = '';
let toastNr = 0;
const toastHoerer = new Set<() => void>();
let toastTimer: number | undefined;

export function toast(text: string) {
  toastText = text;
  toastNr++;
  toastHoerer.forEach((h) => h());
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastText = '';
    toastHoerer.forEach((h) => h());
  }, 2600);
}

export function Toast() {
  const [nummer, text] = useSyncExternalStore(
    (h) => {
      toastHoerer.add(h);
      return () => toastHoerer.delete(h);
    },
    () => `${toastNr}\u0000${toastText}`,
  ).split('\u0000') as [string, string];
  return text ? (
    <div className="toast" role="status" key={nummer}>
      <span className="ok">
        <Check size={12} weight="bold" />
      </span>
      {text}
    </div>
  ) : null;
}

// --- Bausteine -------------------------------------------------------------

export function Kopf({
  titel,
  ueber,
  unter,
  zurueck,
  aktionen,
}: {
  titel: ReactNode;
  ueber?: ReactNode;
  unter?: ReactNode;
  zurueck?: string;
  aktionen?: ReactNode;
}) {
  return (
    <>
      {zurueck && (
        <button className="zurueck" onClick={() => geh(zurueck)}>
          <CaretLeft size={18} weight="bold" /> Zurück
        </button>
      )}
      <header className="kopf">
        <div style={{ minWidth: 0 }}>
          {ueber && <div className="ueber">{ueber}</div>}
          <h1>{titel}</h1>
          {unter && <div className="unter">{unter}</div>}
        </div>
        {aktionen && <div className="kopf-aktionen">{aktionen}</div>}
      </header>
    </>
  );
}

export function Gruppe({
  titel,
  mehr,
  fuss,
  children,
}: {
  titel?: ReactNode;
  mehr?: { text: string; ziel: string } | { text: string; onClick: () => void };
  fuss?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="gruppe">
      {titel && (
        <h2 className="gruppe-titel">
          <span>{titel}</span>
          {mehr && (
            <button className="mehr" onClick={() => ('ziel' in mehr ? geh(mehr.ziel) : mehr.onClick())}>
              {mehr.text}
            </button>
          )}
        </h2>
      )}
      {children}
      {fuss && <p className="gruppe-fuss">{fuss}</p>}
    </section>
  );
}

export function Icon({ farbe, children }: { farbe?: string; children: ReactNode }) {
  return (
    <span className={`icon-kachel${farbe ? '' : ' grau'}`} style={farbStil(farbe)}>
      {children}
    </span>
  );
}

export function Zeile({
  icon,
  farbe,
  titel,
  neben,
  rechts,
  links,
  onClick,
  pfeil,
  erledigt,
  umbruch,
}: {
  icon?: ReactNode;
  farbe?: string;
  titel: ReactNode;
  neben?: ReactNode;
  rechts?: ReactNode;
  links?: ReactNode;
  onClick?: () => void;
  pfeil?: boolean;
  erledigt?: boolean;
  umbruch?: boolean;
}) {
  const inhalt = (
    <>
      {links}
      {icon && <Icon farbe={farbe}>{icon}</Icon>}
      <div className="haupt">
        <div className={`titel${umbruch ? ' umbruch' : ''}`}>{titel}</div>
        {neben && <div className="neben">{neben}</div>}
      </div>
      {(rechts || pfeil) && (
        <div className="rechts">
          {rechts}
          {pfeil && <CaretRight size={15} weight="bold" className="chev" />}
        </div>
      )}
    </>
  );
  const klasse = `zeile${icon ? ' mit-icon' : ''}${erledigt ? ' erledigt' : ''}`;
  return onClick ? (
    <button className={klasse} onClick={onClick}>
      {inhalt}
    </button>
  ) : (
    <div className={klasse}>{inhalt}</div>
  );
}

export function Leer({ titel, icon, farbe, children }: { titel: string; icon?: ReactNode; farbe?: string; children?: ReactNode }) {
  return (
    <div className="leer">
      {icon && (
        <div className="leer-icon" style={farbStil(farbe)}>
          {icon}
        </div>
      )}
      <strong>{titel}</strong>
      {children}
    </div>
  );
}

const KONFETTI = ['var(--pink)', 'var(--orange)', 'var(--gelb)', 'var(--gruen)', 'var(--teal)', 'var(--lila)'];

/** Runder Haken. Beim Abhaken: Pop, kleines Konfetti, dann erst die Aktion (damit man es sieht). */
export function Haken({ an, onClick, label, farbe }: { an: boolean; onClick: () => void; label: string; farbe?: string }) {
  const [lokal, setLokal] = useState(an);
  const [funken, setFunken] = useState(0);
  useEffect(() => setLokal(an), [an]);
  return (
    <button
      className={`check${lokal ? ' an' : ''}`}
      style={farbStil(farbe)}
      onClick={(e) => {
        e.stopPropagation();
        if (!lokal) {
          setLokal(true);
          setFunken((f) => f + 1);
          if (navigator.vibrate) navigator.vibrate(8);
          window.setTimeout(onClick, 420);
        } else {
          setLokal(false);
          onClick();
        }
      }}
      aria-label={label}
      aria-pressed={lokal}
    >
      <Check size={14} weight="bold" />
      {funken > 0 && (
        <span className="konfetti" key={funken}>
          {KONFETTI.flatMap((c, i) =>
            [0, 1].map((j) => {
              const w = ((i * 2 + j) / 12) * Math.PI * 2;
              const r = 20 + j * 8;
              return <i key={`${i}${j}`} style={{ '--c': c, '--x': `${Math.cos(w) * r}px`, '--y': `${Math.sin(w) * r}px` } as CSSProperties} />;
            }),
          )}
        </span>
      )}
    </button>
  );
}

export function Segment<T extends string>({ wert, optionen, onChange }: { wert: T; optionen: [T, string][]; onChange: (w: T) => void }) {
  const index = Math.max(0, optionen.findIndex(([w]) => w === wert));
  return (
    <div className="segment" role="tablist">
      <span className="linse" style={{ width: `calc((100% - 6px) / ${optionen.length})`, transform: `translateX(${index * 100}%)` }} />
      {optionen.map(([w, text]) => (
        <button key={w} className={w === wert ? 'an' : ''} onClick={() => onChange(w)} role="tab" aria-selected={w === wert}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** Blatt von unten. Schließen per Knopf, Tipp daneben oder Runterwischen am Griff. */
export function Blatt({
  titel,
  offen,
  onClose,
  fertig,
  fertigText = 'Fertig',
  children,
}: {
  titel: string;
  offen: boolean;
  onClose: () => void;
  fertig?: () => void;
  fertigText?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const zug = useRef<{ y: number; t: number; dy: number } | null>(null);

  useEffect(() => {
    if (!offen) return;
    const alt = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = alt;
    };
  }, [offen]);

  if (!offen) return null;

  const start = (e: React.PointerEvent) => {
    if (zug.current) return;
    zug.current = { y: e.clientY, t: Date.now(), dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    ref.current?.classList.remove('zurueckfedern');
  };
  const bewegen = (e: React.PointerEvent) => {
    if (!zug.current || !ref.current) return;
    const dy = e.clientY - zug.current.y;
    zug.current.dy = dy;
    // Nach oben mit Widerstand, nach unten frei
    const y = dy < 0 ? -Math.sqrt(-dy) * 2 : dy;
    ref.current.style.transform = `translateY(${y}px)`;
  };
  const ende = () => {
    const z = zug.current;
    zug.current = null;
    if (!z || !ref.current) return;
    const tempo = Math.abs(z.dy) / Math.max(1, Date.now() - z.t);
    if (z.dy > 120 || (z.dy > 20 && tempo > 0.11)) {
      ref.current.classList.add('zurueckfedern');
      ref.current.style.transform = 'translateY(100%)';
      window.setTimeout(onClose, 220);
    } else {
      ref.current.classList.add('zurueckfedern');
      ref.current.style.transform = '';
    }
  };

  return createPortal(
    <div className="schleier" onClick={onClose}>
      <div className="blatt" ref={ref} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titel}>
        <div className="blatt-griff-zone" onPointerDown={start} onPointerMove={bewegen} onPointerUp={ende} onPointerCancel={ende}>
          <div className="blatt-griff" />
          <div className="blatt-kopf">
            <button onClick={onClose}>Schließen</button>
            <h2>{titel}</h2>
            {fertig ? (
              <button className="fertig" onClick={fertig}>
                {fertigText}
              </button>
            ) : (
              <span className="platzhalter" />
            )}
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function useJetzt(intervallMs = 60000): Date {
  const [jetzt, setJetzt] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setJetzt(new Date()), intervallMs);
    const sichtbar = () => document.visibilityState === 'visible' && setJetzt(new Date());
    document.addEventListener('visibilitychange', sichtbar);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', sichtbar);
    };
  }, [intervallMs]);
  return jetzt;
}

export async function kopiere(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function ausZwischenablage(): Promise<string | undefined> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return undefined;
  }
}

/** Tageszeit-Farben für Hintergrund und Begrüßung. */
export function tageszeit(d = new Date()) {
  const h = d.getHours();
  // farben: weicher Hintergrund, hero: kräftige Karte "Dein Tag" (weiße Schrift muss lesbar bleiben)
  if (h >= 5 && h < 11) return { name: 'morgen', gruss: 'Guten Morgen', farben: ['#ffb38a', '#ff8fab', '#ffd56b'], hero: ['#ff8a3d', '#ff4f7b', '#ff9f0a'] };
  if (h >= 11 && h < 17) return { name: 'tag', gruss: 'Hallo', farben: ['#7cc4ff', '#a78bfa', '#5eead4'], hero: ['#2f7bf6', '#7c4dff', '#0fb5ae'] };
  if (h >= 17 && h < 22) return { name: 'abend', gruss: 'Guten Abend', farben: ['#ff8a65', '#c084fc', '#f472b6'], hero: ['#f2662b', '#d6337c', '#7a3ff0'] };
  return { name: 'nacht', gruss: 'Gute Nacht', farben: ['#6366f1', '#8b5cf6', '#0ea5e9'], hero: ['#3730a3', '#6d28d9', '#0369a1'] };
}
