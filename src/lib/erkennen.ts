// Macht aus Freitext (Gedanken, Diktat, kopierte WhatsApp-/iMessage-Nachrichten) Vorschläge:
// Termin, Anfrage, Aufgabe, Einkauf, Geburtstag, geplante Ausgabe oder Notiz.
// Komplett lokal über Muster. Jeder Vorschlag wird vor dem Speichern angezeigt und kann geändert werden.

import { tagKey } from './datum';
import { alsWann, findeZeit, ohneStellen } from './zeit';

export type Art = 'termin' | 'anfrage' | 'aufgabe' | 'einkauf' | 'geburtstag' | 'ausgabe' | 'notiz';

export type Vorschlag = {
  art: Art;
  titel: string;
  wann?: string;
  ende?: string;
  von?: string;
  /** Betrag in Cent */
  betrag?: number;
  posten?: string[];
  geburtstag?: { name: string; tag: number; monat: number; jahr?: number };
  original: string;
};

const W = (woerter: string) => new RegExp(`(?<![\\p{L}])(?:${woerter})(?![\\p{L}])`, 'iu');

const ANFRAGE = W(
  'zeit|lust|bock|treffen|kommst|kommt|kommen|wollen wir|sollen wir|können wir|gehen wir|machen wir|hast du|habt ihr|bist du|seid ihr|dabei|vorbei|kaffee|essen gehen|feiern|party|zocken|bier|kino|jammen|jam|session|proben|mitkommen|abhängen|chillen|was geht|was machst du',
);
const TERMIN = W(
  'termin|arzt|zahnarzt|ärztin|probe|bandprobe|meeting|treffen|konzert|gig|vorlesung|seminar|kurs|unterricht|stunde|training|party|feier|kino|vorstellungsgespräch|bewerbungsgespräch|gespräch|friseur|frisör|prüfung|klausur|eignungsprüfung|aufnahmeprüfung|essen mit|date|flug|zug|abfahrt|schicht|arbeit|besichtigung|workshop|festival',
);
const AUFGABE = W(
  'muss|müssen|musst|sollte|nicht vergessen|vergiss nicht|erinnere mich|erinner mich|todo|to do|to-do|anrufen|zurückrufen|schreiben|antworten|erledigen|abgeben|bezahlen|überweisen|kündigen|beantragen|bewerben|schicken|senden|abholen|zurückgeben|zurückbringen|buchen|reservieren|aufräumen|waschen|putzen|lernen|üben|ausdrucken|drucken|einreichen|anmelden|abmelden|vereinbaren|machen lassen|reparieren|verkaufen|hochladen|aufnehmen',
);
const EINKAUF = W('kaufen|einkaufen|einkauf|einkaufsliste|besorgen|brauchen noch|brauche noch|ist alle|sind alle|leer');
const GEBURTSTAG = W('geburtstag|geb\\.|bday|birthday');
const AUSGABE = W('kostet|kosten|zahlen|bezahlen|miete|rechnung|ausgabe|ticket|tickets|beitrag|gebühr|gebühren|abo|überweisen|semesterbeitrag|kaution');

const BETRAG = /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)(?![\p{L}])|€\s*(\d+(?:[.,]\d{1,2})?)/iu;

const FUELLWOERTER = [
  'ich muss', 'ich sollte', 'muss ich', 'müssen wir', 'nicht vergessen', 'vergiss nicht', 'erinnere mich', 'erinner mich',
  'daran', 'dass ich', 'bitte', 'noch', 'unbedingt', 'mal', 'todo', 'to do', 'to-do', 'termin:', 'aufgabe:', 'notiz:',
  'am', 'um', 'ab', 'gegen', 'den', 'diesen', 'nächsten', 'kommenden',
];

const GRUSS = /^(hey|hi|hallo|hello|moin|servus|yo|na|ok|okay|alles klar|danke|haha|lol|jo|ja|nein|nee|gut|super|cool|top)[\s!.,?]*$/i;

/** WhatsApp (iOS): "[05.10.26, 14:32:10] Max: Text" · WhatsApp (Android): "05.10.26, 14:32 - Max: Text" */
const WA_ZEILE = /^‎?\[?(\d{1,2})\.(\d{1,2})\.(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::\d{2})?\]?\s*(?:-\s*)?([^:]{1,40}):\s(.*)$/;

type Nachricht = { von: string; zeit: Date; text: string };

export function leseChat(text: string): Nachricht[] {
  const out: Nachricht[] = [];
  for (const zeile of text.split(/\r?\n/)) {
    const m = WA_ZEILE.exec(zeile.trim());
    if (m) {
      const j = m[3].length === 2 ? 2000 + +m[3] : +m[3];
      out.push({ von: m[6].trim(), zeit: new Date(j, +m[2] - 1, +m[1], +m[4], +m[5]), text: m[7].trim() });
    } else if (out.length && zeile.trim()) {
      out[out.length - 1].text += '\n' + zeile.trim();
    }
  }
  return out;
}

export function erkenne(eingabe: string, jetzt = new Date()): Vorschlag[] {
  const text = eingabe.trim();
  if (!text) return [];

  // Kopierter Chatverlauf: eine Anfrage, Datum relativ zum Zeitpunkt der Nachricht.
  const chat = leseChat(text);
  if (chat.length) return [ausChat(chat, text, jetzt)];

  // "Max: Hast du Freitag Zeit?" (einzelne kopierte Nachricht mit Absender)
  const absender = /^([\p{Lu}][\p{L}]+(?:\s[\p{Lu}][\p{L}]+)?):\s+([\s\S]+)$/u.exec(text);
  if (absender && ANFRAGE.test(absender[2])) {
    return [anfrage(absender[2], absender[1], jetzt, text)];
  }

  // Ganzer Text ist eine Frage an mich → eine Anfrage, nicht zerlegen.
  if (/\?/.test(text) && ANFRAGE.test(text) && !AUFGABE.test(text.replace(/\?.*/s, ''))) {
    return [anfrage(text, undefined, jetzt, text)];
  }

  return teile(text)
    .filter((s) => s.length > 1 && !GRUSS.test(s))
    .map((s) => einzeln(s, jetzt));
}

/** Zerlegt Diktat oder Notizen in einzelne Gedanken: Zeilen, Sätze, Aufzählungen. */
export function teile(text: string): string[] {
  return text
    .split(/\r?\n+/)
    .map((z) => z.replace(/^\s*(?:[-*•–]|\d{1,2}[.)])\s+/u, ''))
    // Satzende, aber nicht nach Datumsangaben wie "14.3."
    .flatMap((z) => z.split(/(?<=(?<!\d)[.!?]|[!?])\s+(?=[\p{Lu}\d])/u))
    .map((s) => s.trim())
    .filter(Boolean);
}

function einzeln(satz: string, jetzt: Date): Vorschlag {
  const zeit = findeZeit(satz, jetzt);
  const { wann, ende } = alsWann(zeit);

  if (GEBURTSTAG.test(satz)) {
    const g = geburtstag(satz, jetzt);
    if (g) return { art: 'geburtstag', titel: g.name, geburtstag: g, original: satz };
  }

  const betragM = BETRAG.exec(satz);
  if (betragM && (AUSGABE.test(satz) || wann)) {
    const roh = (betragM[1] ?? betragM[2]).replace(/\.(?=\d{3})/g, '').replace(',', '.');
    const stellen = [...zeit.stellen, [betragM.index, betragM.index + betragM[0].length] as [number, number]];
    return {
      art: 'ausgabe',
      titel: titel(satz, stellen),
      betrag: Math.round(parseFloat(roh) * 100),
      wann: wann?.slice(0, 10),
      original: satz,
    };
  }

  if (EINKAUF.test(satz) && !TERMIN.test(satz)) {
    const posten = einkaufsPosten(satz);
    if (posten.length) return { art: 'einkauf', titel: posten.join(', '), posten, original: satz };
  }

  if (/\?/.test(satz) && ANFRAGE.test(satz)) return anfrage(satz, undefined, jetzt, satz);

  const t = titel(satz, zeit.stellen);
  const istAufgabe = AUFGABE.test(satz);
  const istTermin = TERMIN.test(satz);

  if (wann && (istTermin || (!istAufgabe && (zeit.minuten !== undefined || zeit.tag)))) {
    return { art: 'termin', titel: t, wann, ende, original: satz };
  }
  if (istAufgabe) return { art: 'aufgabe', titel: t, wann: wann?.slice(0, 10), original: satz };
  return { art: 'notiz', titel: satz, original: satz };
}

function anfrage(text: string, von: string | undefined, jetzt: Date, original: string): Vorschlag {
  const zeit = findeZeit(text, jetzt);
  const { wann, ende } = alsWann(zeit);
  return {
    art: 'anfrage',
    titel: von ? `Treffen mit ${von}` : kurz(text),
    von,
    wann,
    ende,
    original,
  };
}

function ausChat(chat: Nachricht[], original: string, jetzt: Date): Vorschlag {
  // Die letzte Nachricht mit einer Zeitangabe oder Frage ist meist die eigentliche Anfrage.
  const relevant =
    [...chat].reverse().find((n) => findeZeit(n.text, n.zeit).tag || (/\?/.test(n.text) && ANFRAGE.test(n.text))) ??
    chat[chat.length - 1];
  const zeit = findeZeit(relevant.text, relevant.zeit);
  let { wann, ende } = alsWann(zeit);
  // Liegt der erkannte Tag schon in der Vergangenheit, nicht vorschlagen.
  if (wann && wann.slice(0, 10) < tagKey(jetzt)) {
    wann = undefined;
    ende = undefined;
  }
  return {
    art: 'anfrage',
    titel: `Treffen mit ${relevant.von}`,
    von: relevant.von,
    wann,
    ende,
    original: chat.map((n) => `${n.von}: ${n.text}`).join('\n') || original,
  };
}

function geburtstag(satz: string, jetzt: Date) {
  const zeit = findeZeit(satz, jetzt);
  if (!zeit.tag) return undefined;
  const jahrM = /(?:\d{1,2}\.\d{1,2}\.|\p{L}+\.?)\s*((?:19|20)\d{2})\b/u.exec(satz);
  const jahr = jahrM && +jahrM[1] < jetzt.getFullYear() ? +jahrM[1] : undefined;
  let rest = ohneStellen(satz, zeit.stellen);
  rest = rest.replace(GEBURTSTAG, ' ').replace(/(?<![\p{L}])(hat|ist|am|von|der|die|das|ihr|sein|seinen|ihren|feiert|wird|jahre|alt)(?![\p{L}])/giu, ' ');
  rest = rest.replace(/((?:19|20)\d{2})/g, ' ').replace(/[^\p{L}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim();
  // "Lisas Geburtstag" → "Lisa", aber "Jonas" bleibt "Jonas"
  const genitiv = /(\p{Lu}\p{L}+)s\s+[Gg]eburtstag/u.exec(satz);
  const name = genitiv ? genitiv[1] : rest;
  if (!name) return undefined;
  return { name: gross(name), tag: zeit.tag.getDate(), monat: zeit.tag.getMonth() + 1, jahr };
}

function einkaufsPosten(satz: string): string[] {
  const rest = satz
    .replace(/^.*?(einkaufsliste|einkaufen|einkauf)\s*:?/i, '')
    .replace(W('kaufen|einkaufen|besorgen|brauchen noch|brauche noch|wir|ich|noch|bitte|müssen|muss|sollte|ist alle|sind alle|leer|beim|im|vom|bei|rewe|edeka|aldi|lidl|dm|rossmann|kaufland|netto|penny|supermarkt|drogerie'), ' ')
    .replace(W('kaufen|einkaufen|besorgen|noch|muss|ich|wir'), ' ');
  return rest
    .split(/,|;|\s+und\s+|\s+&\s+|\n/)
    .map((p) => p.replace(/[.!?]/g, '').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 1)
    .map(gross);
}

function titel(satz: string, stellen: [number, number][]): string {
  let t = ohneStellen(satz, stellen);
  for (const w of FUELLWOERTER) {
    t = t.replace(new RegExp(`(?<![\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu'), ' ');
  }
  t = t.replace(/\s+([,.!?])/g, '$1').replace(/^[\s,.:;-]+|[\s,.:;!-]+$/g, '').replace(/\s+/g, ' ').trim();
  // "bis die Bewerbung abschicken" → "Bewerbung abschicken"
  t = t.replace(/^(?:(?:bis|die|der|das|den|dem|zum|zur)\s+)+/i, '');
  return gross(t || satz.trim());
}

function kurz(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 60 ? t.slice(0, 57) + '...' : t;
}

function gross(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
