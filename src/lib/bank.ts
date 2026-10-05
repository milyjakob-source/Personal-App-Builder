// Liest Buchungen aus dem Text eines Kontoauszugs.
// 1. Volksbank/Raiffeisenbank-PDF (Atruvia): "01.10. 01.10. Basislastschrift   12,99 S", Details in den Folgezeilen.
// 2. Alles andere (Screenshots aus der Banking-App, andere Banken): Zeilen mit Datum und Betrag.

import { kategorisiere } from './kategorien';

export type RohBuchung = { datum: string; text: string; betrag: number };

const BETRAG_ZAHL = '\\d{1,3}(?:\\.\\d{3})*,\\d{2}';
const VB_ZEILE = new RegExp(`^(\\d{2})\\.(\\d{2})\\.\\s+(\\d{2})\\.(\\d{2})\\.\\s+(.*?)\\s+(${BETRAG_ZAHL})\\s*([SH])\\s*$`);
const VB_ENDE = /^(alter|neuer)\s+kontostand|^übertrag|^uebertrag|^seite\s+\d|^bu-?tag|^kontoauszug|^iban\b|^bic\b|^summe|^bitte beachten|^rechnungsabschluss|^anlage/i;
const DETAIL_SKIP = /^(eref|mref|cred|iban|bic|ende-zu-ende|mandat|gläubiger|glaeubiger|kref|abwa|svwz|datum|uhrzeit|kartenzahlung|girocard|visa debit|referenz|folgenr|verfalld|original|\d{6,})/i;

const zwei = (n: number) => String(n).padStart(2, '0');

export function zuCent(s: string): number {
  const neg = /^[-−–]/.test(s.trim());
  const n = Math.round(parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.')) * 100);
  return neg ? -n : n;
}

/** Jahr des Auszugs: aus einem vollständigen Datum im Text, sonst das aktuelle. */
function auszugsJahr(text: string, jetzt: Date): number {
  const jahre = [...text.matchAll(/\b\d{2}\.\d{2}\.(20\d{2})\b/g)].map((m) => +m[1]);
  if (jahre.length) return Math.max(...jahre);
  const m = /\b(20\d{2})\b/.exec(text);
  return m ? +m[1] : jetzt.getFullYear();
}

export function leseVolksbank(text: string, jetzt = new Date()): RohBuchung[] {
  const zeilen = text.split(/\r?\n/).map((z) => z.replace(/\s+/g, ' ').trim());
  const jahr = auszugsJahr(text, jetzt);
  const out: (RohBuchung & { vorgang: string; details: string[] })[] = [];
  let offen = false;
  for (const z of zeilen) {
    const m = VB_ZEILE.exec(z);
    if (m) {
      const betrag = zuCent(m[6]) * (m[7] === 'S' ? -1 : 1);
      out.push({ datum: `${jahr}-${m[2]}-${m[1]}`, text: '', betrag, vorgang: m[5], details: [] });
      offen = true;
      continue;
    }
    if (!offen || !z) continue;
    if (VB_ENDE.test(z)) {
      offen = false;
      continue;
    }
    const letzte = out[out.length - 1];
    if (letzte.details.length < 4 && !DETAIL_SKIP.test(z)) letzte.details.push(z);
  }
  // Auszug über den Jahreswechsel: Dezember-Buchungen gehören ins Vorjahr.
  const wechsel = out.some((b) => b.datum.slice(5, 7) === '12') && out.some((b) => b.datum.slice(5, 7) === '01');
  return out.map(({ vorgang, details, ...b }) => ({
    ...b,
    datum: wechsel && b.datum.slice(5, 7) === '12' ? `${jahr - 1}${b.datum.slice(4)}` : b.datum,
    text: buchungsText(vorgang, details),
  }));
}

function buchungsText(vorgang: string, details: string[]): string {
  const v = vorgang.replace(/\s*PN:\s*\d+/i, '').trim();
  const haendler = details.find((d) => /\p{L}{3,}/u.test(d));
  if (!haendler) return v;
  return `${aufraeumen(haendler)} · ${v}`;
}

function aufraeumen(s: string): string {
  return s
    .replace(/\s*\/\/.*$/, '')
    .replace(/\s+(sagt danke|fil\.?\s*\d+|\d{4,}.*)$/i, '')
    .trim();
}

const MONATE: Record<string, number> = {
  januar: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5, juni: 6, juli: 7,
  august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
};

/** Für Screenshots (Texterkennung) und unbekannte Formate. */
export function leseAllgemein(text: string, jetzt = new Date()): RohBuchung[] {
  const zeilen = text.split(/\r?\n/).map((z) => z.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out: RohBuchung[] = [];
  let datum: string | undefined;
  let puffer: string[] = [];
  const betragRe = new RegExp(`([+\\-−–]?)\\s?(${BETRAG_ZAHL})\\s*(€|eur)?\\s*([SH])?(?![\\d,])`, 'i');

  for (const z of zeilen) {
    const d = findeDatum(z, jetzt);
    const b = betragRe.exec(z);
    if (d) datum = d.datum;
    if (b && (b[1] || b[3] || b[4] || !d || d.rest.length > 2)) {
      // Kontostand/Saldo überspringen
      if (/kontostand|saldo|verfügbar|verfuegbar|dispo/i.test(z)) {
        puffer = [];
        continue;
      }
      const betrag = zuCent(b[2]);
      const plus = b[1] === '+' || b[4]?.toUpperCase() === 'H';
      const minus = (b[1] && b[1] !== '+') || b[4]?.toUpperCase() === 'S';
      // Ohne Vorzeichen: Ausgabe, außer der Text klingt nach Eingang.
      const eingang = plus || (!minus && /gutschrift|gehalt|lohn|eingang|erstattung/i.test(z + puffer.join(' ')));
      let t = z.replace(b[0], ' ');
      if (d) t = d.rest.replace(b[0], ' ');
      t = t.replace(/\s+/g, ' ').trim();
      const text = [...puffer, t].filter((x) => /\p{L}{2,}/u.test(x)).join(' · ') || 'Buchung';
      if (datum) out.push({ datum, text: aufraeumen(text), betrag: eingang ? betrag : -betrag });
      puffer = [];
      continue;
    }
    if (d) {
      puffer = d.rest && /\p{L}{3,}/u.test(d.rest) ? [d.rest] : [];
    } else if (/\p{L}{2,}/u.test(z)) {
      puffer = [...puffer, z].slice(-2);
    }
  }
  return out;
}

function findeDatum(z: string, jetzt: Date): { datum: string; rest: string } | undefined {
  let m = /\b(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})?/.exec(z);
  if (m && +m[2] <= 12 && +m[1] <= 31) {
    const j = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : jetzt.getFullYear();
    return { datum: `${j}-${zwei(+m[2])}-${zwei(+m[1])}`, rest: z.replace(m[0], ' ').trim() };
  }
  m = /\b(\d{1,2})\.\s*(januar|februar|märz|maerz|april|mai|juni|juli|august|september|oktober|november|dezember)\s*(\d{4})?/i.exec(z);
  if (m) {
    const j = m[3] ? +m[3] : jetzt.getFullYear();
    return { datum: `${j}-${zwei(MONATE[m[2].toLowerCase()])}-${zwei(+m[1])}`, rest: z.replace(m[0], ' ').replace(/^\p{L}+,\s*/u, '').trim() };
  }
  const tag = /^(heute|gestern)\b/i.exec(z);
  if (tag) {
    const d = new Date(jetzt);
    if (tag[1].toLowerCase() === 'gestern') d.setDate(d.getDate() - 1);
    return { datum: `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`, rest: z.slice(tag[0].length).trim() };
  }
  return undefined;
}

export function leseAuszug(text: string, jetzt = new Date()): RohBuchung[] {
  const vb = leseVolksbank(text, jetzt);
  return vb.length ? vb : leseAllgemein(text, jetzt);
}

export function mitKategorie(b: RohBuchung, gelernt: Record<string, string>) {
  return { ...b, kategorie: kategorisiere(b.text, b.betrag, gelernt) };
}

/** Schlüssel gegen doppelten Import desselben Auszugs. */
export function buchungsKey(b: { datum: string; betrag: number; text: string }): string {
  return `${b.datum}|${b.betrag}|${b.text.toLowerCase().replace(/[^\p{L}\d]/gu, '').slice(0, 24)}`;
}
