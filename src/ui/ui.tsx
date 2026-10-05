import { CaretLeft, CaretRight, Check } from '@phosphor-icons/react';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

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

// --- Toast ---------------------------------------------------------------------

let toastText = '';
const toastHoerer = new Set<() => void>();
let toastTimer: number | undefined;

export function toast(text: string) {
  toastText = text;
  toastHoerer.forEach((h) => h());
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastText = '';
    toastHoerer.forEach((h) => h());
  }, 2600);
}

export function Toast() {
  const text = useSyncExternalStore(
    (h) => {
      toastHoerer.add(h);
      return () => toastHoerer.delete(h);
    },
    () => toastText,
  );
  return text ? (
    <div className="toast" role="status">
      {text}
    </div>
  ) : null;
}

// --- Bausteine -------------------------------------------------------------

export function Kopf({ titel, unter, zurueck, aktionen }: { titel: string; unter?: ReactNode; zurueck?: string; aktionen?: ReactNode }) {
  return (
    <>
      {zurueck && (
        <button className="zurueck" onClick={() => geh(zurueck)}>
          <CaretLeft size={20} weight="bold" /> Zurück
        </button>
      )}
      <header className="kopf">
        <div>
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

export function Zeile({
  icon,
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
      {icon && <span className="icon-kachel">{icon}</span>}
      <div className="haupt">
        <div className={`titel${umbruch ? ' umbruch' : ''}`}>{titel}</div>
        {neben && <div className="neben">{neben}</div>}
      </div>
      {(rechts || pfeil) && (
        <div className="rechts">
          {rechts}
          {pfeil && <CaretRight size={16} weight="bold" className="chev" />}
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

export function Leer({ titel, children }: { titel: string; children?: ReactNode }) {
  return (
    <div className="leer">
      <strong>{titel}</strong>
      {children}
    </div>
  );
}

export function Haken({ an, onClick, label }: { an: boolean; onClick: () => void; label: string }) {
  return (
    <button
      className={`check${an ? ' an' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-pressed={an}
    >
      <Check size={14} weight="bold" />
    </button>
  );
}

export function Segment<T extends string>({ wert, optionen, onChange }: { wert: T; optionen: [T, string][]; onChange: (w: T) => void }) {
  return (
    <div className="segment" role="tablist">
      {optionen.map(([w, text]) => (
        <button key={w} className={w === wert ? 'an' : ''} onClick={() => onChange(w)} role="tab" aria-selected={w === wert}>
          {text}
        </button>
      ))}
    </div>
  );
}

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
  useEffect(() => {
    if (!offen) return;
    const alt = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = alt;
    };
  }, [offen]);
  if (!offen) return null;
  return (
    <div className="schleier" onClick={onClose}>
      <div className="blatt" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titel}>
        <div className="blatt-griff" />
        <div className="blatt-kopf">
          <button onClick={onClose}>Abbrechen</button>
          <h2>{titel}</h2>
          {fertig ? <button onClick={fertig}>{fertigText}</button> : <span style={{ minWidth: 70 }} />}
        </div>
        {children}
      </div>
    </div>
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
