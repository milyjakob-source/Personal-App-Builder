// Alle Daten liegen nur auf diesem Gerät (IndexedDB). Kein Server, kein Konto.

import { useSyncExternalStore } from 'react';
import { SRH_FRISTEN } from './data/studium';
import { kategorisiere } from './lib/kategorien';
import type { Daten } from './types';

const DB = 'mili';
const STORE = 'daten';
const KEY = 'alles';

export function leer(): Daten {
  return {
    version: 1,
    termine: [],
    aufgaben: [],
    anfragen: [],
    einkauf: [],
    geburtstage: [],
    notizen: [],
    buchungen: [],
    geplant: [],
    fristen: SRH_FRISTEN,
    job: { aktiv: false, name: '', stundenlohn: 0, schichten: [] },
    einstellungen: { einkommen: 0, sparquote: 10, kurzbefehleAktiv: false, kategorieRegeln: {}, checkliste: {}, kategorienVersion: 2 },
  };
}

let daten: Daten = leer();
let geladen = false;
const hoerer = new Set<() => void>();

function oeffne(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

const KATEGORIEN_VERSION = 2;
const UMBENANNT: Record<string, string> = { Abos: 'Abos & Software', Wohnen: 'Wohnen & Handy' };

/** Ältere Daten an neue Regeln anpassen: Buchungen mit den aktuellen Kategorien neu einordnen. */
export function migriere(d: Daten): Daten {
  if ((d.einstellungen.kategorienVersion ?? 1) >= KATEGORIEN_VERSION) return d;
  const regeln: Record<string, string> = {};
  for (const [k, v] of Object.entries(d.einstellungen.kategorieRegeln)) regeln[k] = UMBENANNT[v] ?? v;
  return {
    ...d,
    buchungen: d.buchungen.map((b) => (b.manuell ? b : { ...b, kategorie: kategorisiere(`${b.text} ${b.info ?? ''}`, b.betrag, regeln) })),
    einstellungen: { ...d.einstellungen, kategorieRegeln: regeln, kategorienVersion: KATEGORIEN_VERSION },
  };
}

export async function lade(): Promise<void> {
  try {
    const db = await oeffne();
    const wert = await new Promise<Daten | undefined>((resolve, reject) => {
      const r = db.transaction(STORE).objectStore(STORE).get(KEY);
      r.onsuccess = () => resolve(r.result as Daten | undefined);
      r.onerror = () => reject(r.error);
    });
    if (wert) {
      const version = wert.einstellungen?.kategorienVersion;
      daten = migriere({ ...leer(), ...wert, einstellungen: { ...leer().einstellungen, ...wert.einstellungen, kategorienVersion: version } });
      if (version !== daten.einstellungen.kategorienVersion) speichere();
    }
  } catch {
    // Ohne IndexedDB (z. B. privater Modus) läuft MILI nur für diese Sitzung.
  }
  // Bittet Safari, die Daten nicht automatisch zu löschen.
  navigator.storage?.persist?.().catch(() => {});
  geladen = true;
  hoerer.forEach((h) => h());
}

let timer: number | undefined;
function speichere() {
  window.clearTimeout(timer);
  timer = window.setTimeout(async () => {
    try {
      const db = await oeffne();
      db.transaction(STORE, 'readwrite').objectStore(STORE).put(daten, KEY);
    } catch {
      /* siehe lade() */
    }
  }, 150);
}

export function aendere(f: (d: Daten) => Daten | void) {
  const kopie = structuredClone(daten);
  daten = f(kopie) ?? kopie;
  hoerer.forEach((h) => h());
  speichere();
}

export function ersetze(neu: Daten) {
  daten = migriere({ ...leer(), ...neu, einstellungen: { ...leer().einstellungen, ...neu.einstellungen, kategorienVersion: neu.einstellungen?.kategorienVersion } });
  hoerer.forEach((h) => h());
  speichere();
}

export function aktuell(): Daten {
  return daten;
}

function abonniere(h: () => void) {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

export function useDaten(): Daten {
  return useSyncExternalStore(abonniere, () => daten);
}

export function useGeladen(): boolean {
  return useSyncExternalStore(abonniere, () => geladen);
}

export function neueId(): string {
  return crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}
