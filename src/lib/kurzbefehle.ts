// Brücke zur Kurzbefehle-App: Eine Website kann nicht direkt auf Kalender und Erinnerungen zugreifen,
// ein Kurzbefehl schon. MILI startet Kurzbefehle per Link und bekommt Kalenderdaten über die Zwischenablage.

import type { Termin } from '../types';
import { lies, zeitKey, tagKey } from './datum';

export const KB_KALENDER = 'MILI Kalender';
export const KB_TERMIN = 'MILI Termin';
export const KB_ERINNERUNG = 'MILI Erinnerung';
export const KALENDER_KOPF = 'MILI-KALENDER';

export function kurzbefehlLink(name: string, text?: string): string {
  let url = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}`;
  if (text !== undefined) url += `&input=text&text=${encodeURIComponent(text)}`;
  return url;
}

export function starteKurzbefehl(name: string, text?: string) {
  window.location.href = kurzbefehlLink(name, text);
}

const zwei = (n: number) => String(n).padStart(2, '0');

/** "05.10.2026 19:00": so erkennt "Datum aus Eingabe abrufen" auf einem deutschen iPhone das Datum sicher. */
export function kbDatum(s: string): string {
  const d = lies(s);
  const tag = `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${d.getFullYear()}`;
  return s.length > 10 ? `${tag} ${zwei(d.getHours())}:${zwei(d.getMinutes())}` : tag;
}

/** Eingabe für "MILI Termin": eine Angabe pro Zeile (Titel, Beginn, Ende, Ort). */
export function terminEingabe(t: Pick<Termin, 'titel' | 'start' | 'ende' | 'ganztag' | 'ort'>): string {
  let ende = t.ende;
  if (!ende) {
    const s = lies(t.start);
    ende = t.ganztag ? t.start : zeitKey(new Date(s.getTime() + 60 * 60000));
  }
  return [t.titel, kbDatum(t.start), kbDatum(ende), t.ort ?? ''].join('\n');
}

/** Eingabe für "MILI Erinnerung": Titel und Zeitpunkt. */
export function erinnerungEingabe(titel: string, wann: string): string {
  return [titel, kbDatum(wann.length > 10 ? wann : `${wann}T09:00`)].join('\n');
}

const MONAT_KURZ: Record<string, number> = {
  jan: 1, feb: 2, mär: 3, mrz: 3, apr: 4, mai: 5, jun: 6, jul: 7, aug: 8, sep: 9, okt: 10, nov: 11, dez: 12,
};

/** Datum aus dem Kurzbefehl: ISO 8601 oder deutsches Format ("5. Okt. 2026 um 19:00", "05.10.26, 19:00"). */
export function leseKbDatum(s: string): { wert: string; mitZeit: boolean } | undefined {
  const t = s.trim();
  if (!t) return undefined;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? undefined : { wert: zeitKey(d), mitZeit: true };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return { wert: t, mitZeit: false };
  let m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})(?:,?\s*(?:um\s*)?(\d{1,2}):(\d{2}))?/.exec(t);
  let tag: number, monat: number, jahr: number, h: string | undefined, min: string | undefined;
  if (m) {
    [tag, monat, jahr, h, min] = [+m[1], +m[2], m[3].length === 2 ? 2000 + +m[3] : +m[3], m[4], m[5]];
  } else {
    m = /^(\d{1,2})\.\s*(\p{L}{3})\p{L}*\.?\s*(\d{4})(?:,?\s*(?:um\s*)?(\d{1,2}):(\d{2}))?/u.exec(t);
    if (!m || !MONAT_KURZ[m[2].toLowerCase()]) return undefined;
    [tag, monat, jahr, h, min] = [+m[1], MONAT_KURZ[m[2].toLowerCase()], +m[3], m[4], m[5]];
  }
  const d = new Date(jahr, monat - 1, tag, h ? +h : 0, min ? +min : 0);
  return h ? { wert: zeitKey(d), mitZeit: true } : { wert: tagKey(d), mitZeit: false };
}

const JA = /^(ja|yes|true|1|wahr)$/i;

/** Liest den Export von "MILI Kalender": Kopfzeile, dann pro Termin "Titel|Beginn|Ende|Ort|Kalender|Ganztägig". */
export function leseKalenderExport(text: string): Termin[] | undefined {
  const zeilen = text.split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
  if (!zeilen.length || !zeilen[0].toUpperCase().startsWith(KALENDER_KOPF)) return undefined;
  const termine: Termin[] = [];
  for (const z of zeilen.slice(1)) {
    const [titel, start, ende, ort, kalender, ganztag] = z.split('|').map((x) => x?.trim() ?? '');
    const s = leseKbDatum(start ?? '');
    if (!titel || !s) continue;
    const e = leseKbDatum(ende ?? '');
    const istGanztag = JA.test(ganztag ?? '') || !s.mitZeit;
    termine.push({
      id: `kal-${s.wert}-${titel}`.toLowerCase().replace(/[^\p{L}\d-]/gu, ''),
      titel,
      start: istGanztag ? s.wert.slice(0, 10) : s.wert,
      ende: e && !istGanztag ? e.wert : undefined,
      ganztag: istGanztag,
      ort: ort || undefined,
      kalender: kalender || undefined,
      quelle: 'kalender',
    });
  }
  return termine;
}
