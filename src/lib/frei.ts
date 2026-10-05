// Prüft, ob ein Zeitpunkt frei ist, und schlägt freie Abende vor (für Anfragen von Freunden).

import type { Schicht, Termin } from '../types';
import { lies, plusMinuten, plusTage, startDesTages, tagKey } from './datum';

type Block = { titel: string; von: Date; bis: Date };

export function bloecke(termine: Termin[], schichten: Schicht[] = []): Block[] {
  const out: Block[] = [];
  for (const t of termine) {
    if (t.ganztag) continue;
    const von = lies(t.start);
    out.push({ titel: t.titel, von, bis: t.ende ? lies(t.ende) : plusMinuten(von, 60) });
  }
  for (const s of schichten) out.push({ titel: 'Arbeit', von: lies(s.start), bis: lies(s.ende) });
  return out;
}

export function konflikt(wann: string, dauerMin: number, b: Block[]): Block | undefined {
  const von = lies(wann);
  const bis = plusMinuten(von, dauerMin);
  return b.find((x) => x.von < bis && x.bis > von);
}

/** Freie Abende (19 Uhr, 3 Stunden) ab morgen bzw. ab einem bestimmten Tag. */
export function freieAbende(b: Block[], anzahl = 3, ab = new Date(), tageMax = 14): string[] {
  const out: string[] = [];
  const start = startDesTages(ab);
  for (let i = 0; i < tageMax && out.length < anzahl; i++) {
    const tag = plusTage(start, i);
    const wann = `${tagKey(tag)}T19:00`;
    if (lies(wann) <= ab) continue;
    if (!konflikt(wann, 180, b)) out.push(wann);
  }
  return out;
}

/** Vorschlag für eine Anfrage: genauer Zeitpunkt, falls frei; sonst freie Abende. */
export function vorschlagFuer(wann: string | undefined, b: Block[], jetzt = new Date()) {
  if (wann && wann.length > 10) {
    const k = konflikt(wann, 120, b);
    return { frei: !k, konfliktMit: k?.titel, alternativen: k ? freieAbende(b, 3, lies(wann)) : [] };
  }
  if (wann) {
    const tag = lies(wann);
    const abends = `${wann}T19:00`;
    const frei = !konflikt(abends, 180, b);
    return { frei, konfliktMit: undefined, alternativen: frei ? [abends] : freieAbende(b, 3, tag) };
  }
  return { frei: false, konfliktMit: undefined, alternativen: freieAbende(b, 3, jetzt) };
}

