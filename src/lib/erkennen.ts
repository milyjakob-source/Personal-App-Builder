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
  ort?: string;
  original: string;
};

const W = (woerter: string, flags = 'iu') => new RegExp(`(?<![\\p{L}])(?:${woerter})(?![\\p{L}])`, flags);
/** Auch als Wortende, für zusammengesetzte Wörter wie "Klavierunterricht" oder "Bandprobe". */
const ENDE = (woerter: string) => new RegExp(`(?:${woerter})(?![\\p{L}])`, 'iu');

const ANFRAGE = W(
  'zeit|lust|bock|treffen|kommst|kommt|kommen|wollen wir|sollen wir|können wir|gehen wir|machen wir|hast du|habt ihr|bist du|seid ihr|dabei|vorbei|kaffee|essen gehen|feiern|party|zocken|bier|kino|jammen|jam|session|proben|mitkommen|abhängen|chillen|was geht|was machst du',
);
const TERMIN = ENDE(
  'termin|arzt|ärztin|probe|meeting|treffen|konzert|gig|vorlesung|seminar|kurs|unterricht|stunde|training|party|feier|kino|gespräch|friseur|frisör|prüfung|klausur|essen mit|flug|zug|abfahrt|schicht|arbeit|besichtigung|workshop|festival|session|jam',
);
const AUFGABE = W(
  'muss|müssen|musst|sollte|nicht vergessen|vergiss nicht|erinnere mich|erinner mich|todo|to do|to-do|anrufen|zurückrufen|schreiben|antworten|erledigen|abgeben|bezahlen|überweisen|kündigen|beantragen|bewerben|schicken|abschicken|senden|abholen|zurückgeben|zurückbringen|buchen|reservieren|aufräumen|waschen|putzen|lernen|üben|ausdrucken|drucken|einreichen|anmelden|abmelden|vereinbaren|machen lassen|reparieren|verkaufen|hochladen|aufnehmen|planen|organisieren|vorbereiten|kümmern|klären|finden|suchen|fragen|nachfragen|melden|checken|prüfen|besorgen|erledigen',
);
const EINKAUF = W('kaufen|einkaufen|einkauf|einkaufsliste|besorgen|brauchen noch|brauche noch|ist alle|sind alle|leer');
const GEBURTSTAG = W('geburtstag|geb\\.|bday|birthday');
const MEIN_GEBURTSTAG = W('mein|meinen|meinem|meiner');
const AUSGABE = W('kostet|kosten|zahlen|bezahlen|miete|rechnung|ausgabe|ticket|tickets|beitrag|gebühr|gebühren|abo|überweisen|semesterbeitrag|kaution');

const BETRAG = /(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:€|euro|eur)(?![\p{L}])|€\s*(\d+(?:[.,]\d{1,2})?)/iu;

/** Wörter und Wendungen, die in einem Titel nichts verloren haben (längere zuerst). */
const FUELLWOERTER = [
  'erinnere mich an', 'erinner mich an', 'ich muss', 'muss ich', 'ich sollte', 'sollte ich', 'müssen wir', 'ich will', 'will ich', 'ich möchte', 'möchte ich',
  'ich gehe', 'gehe ich', 'geh ich', 'ich geh', 'ich fahre', 'fahre ich', 'ich bin', 'bin ich', 'ich habe', 'habe ich',
  'hab ich', 'ich hab', 'ich schätze', 'schätze ich', 'nicht vergessen', 'vergiss nicht', 'erinnere mich', 'erinner mich',
  'dass ich', 'daran', 'bitte', 'noch', 'unbedingt', 'mal', 'irgendwie', 'zwischendrin', 'zwischendurch', 'eventuell',
  'vielleicht', 'wahrscheinlich', 'ungefähr', 'circa', 'ca.', 'etwa', 'todo', 'to do', 'to-do', 'termin:', 'aufgabe:',
  'notiz:', 'okay', 'also', 'danach', 'anschließend', 'dann', 'muss', 'müssen', 'sollte', 'am', 'um', 'ab', 'gegen', 'diesen', 'nächsten', 'kommenden', 'so',
];

const GRUSS = /^(hey|hi|hallo|hello|moin|servus|yo|na|ok|okay|also|alles klar|danke|haha|lol|jo|ja|nein|nee|gut|super|cool|top|ähm|äh)[\s!.,?]*$/i;

/** Nachsätze ohne eigenen Inhalt, die beim Diktieren entstehen. */
const ANHANG = /^(?:die\s+)?(?:uhrzeit|zeit|genaue zeit)\s+(?:steht|ist)\s+noch\s+(?:nicht\s+fest|offen|unklar)|^(?:weiß|weiss)\s+(?:ich\s+)?noch\s+nicht/i;

/** Einleitung wie "Okay, heute auf der Agenda steht ..." */
const EINLEITUNG =
  /^(?:(?:okay|ok|also|so|ähm|äh|gut|ja)[,!.]?\s+)*(?:(heute|morgen|übermorgen)\s+)?(?:(?:steht|stehen)\s+)?(?:auf\s+(?:der|meiner|die)\s+(?:agenda|liste|to-?do-?liste)|an|ansteht)\s+(?:(?:steht|stehen)\s+)?(?:(heute|morgen|übermorgen)\s+)?/i;

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

  const stuecke = teile(text);

  // Kurze Frage an mich ("Hey! Wollen wir Samstag jammen?") → eine Anfrage, nicht zerlegen.
  if (stuecke.length <= 2 && text.length < 160 && /\?/.test(text) && ANFRAGE.test(text) && !AUFGABE.test(text.replace(/\?.*/s, ''))) {
    return [anfrage(text, undefined, jetzt, text)];
  }

  // "Heute auf der Agenda steht ..." gilt für die folgenden Aufgaben ohne eigenes Datum.
  let kontext: string | undefined;
  const out: Vorschlag[] = [];
  for (const roh of stuecke) {
    let s = roh;
    const ein = EINLEITUNG.exec(s);
    if (ein && (ein[1] || ein[2] || /steht|stehen|agenda|liste/i.test(ein[0]))) {
      const wort = ein[1] ?? ein[2];
      if (wort) kontext = alsWann(findeZeit(wort, jetzt)).wann;
      s = s.slice(ein[0].length).trim();
    }
    s = s.replace(/^(?:(?:okay|ok|also|ähm|äh)[,!.]?\s+)+/i, '').trim();
    if (s.length < 2 || GRUSS.test(s)) continue;

    const v = einzeln(s, jetzt);
    const eigenesDatum = !!findeZeit(s, jetzt).tag;
    if (eigenesDatum) kontext = undefined;
    else if (kontext && v.art === 'aufgabe' && !v.wann) v.wann = kontext;
    // "... und danach Noten ausdrucken" → selber Tag wie davor
    const davor = out[out.length - 1]?.wann;
    if (!eigenesDatum && !v.wann && davor && v.art === 'aufgabe' && /^(?:danach|dann|anschließend|vorher|davor)(?![\p{L}])/iu.test(s)) {
      v.wann = davor.slice(0, 10);
    }
    out.push(v);
  }
  return out;
}

const STARTER = new Set([
  'Und', 'Dann', 'Danach', 'Außerdem', 'Ausserdem', 'Zusätzlich', 'Später', 'Morgen', 'Übermorgen', 'Heute', 'Am', 'Ab', 'Bis',
  'Um', 'Ich', 'Wir', 'Abends', 'Morgens', 'Mittags', 'Nachmittags', 'Uhrzeit', 'Einkaufen', 'Nächste', 'Nächsten', 'Nächstes',
  'Diese', 'Diesen', 'Dieses', 'Okay', 'Also',
]);
const UND_FOLGE = new Set(['muss', 'müssen', 'sollte', 'dann', 'danach', 'noch', 'heute', 'morgen', 'übermorgen', 'am', 'ich', 'außerdem', 'abends', 'später']);
const PRAEP = new Set(['am', 'bis', 'ab', 'um', 'für', 'zum', 'zur', 'an', 'in', 'auf', 'seit', 'vom', 'von', 'nächsten', 'diesen', 'kommenden', 'über', 'gegen', 'nach', 'bei', 'mit']);

/** Ein Satz ohne Punkt, wie ihn das Diktat liefert, wird an typischen Satzanfängen getrennt. */
function trenneDiktat(satz: string): string[] {
  const woerter = satz.split(/\s+/).filter(Boolean);
  const teile: string[][] = [[]];
  for (let i = 0; i < woerter.length; i++) {
    const w = woerter[i];
    const vorher = woerter[i - 1]?.toLowerCase().replace(/[^\p{L}]/gu, '');
    const naechstes = woerter[i + 1]?.toLowerCase();
    const aktuell = teile[teile.length - 1];
    if (aktuell.length && (w === 'Und' || (w === 'und' && naechstes && UND_FOLGE.has(naechstes)))) {
      teile.push([]);
      continue;
    }
    if (aktuell.length && STARTER.has(w.replace(/[,.!?]$/, '')) && vorher && !PRAEP.has(vorher)) {
      teile.push([w]);
      continue;
    }
    aktuell.push(w);
  }
  return teile.map((t) => t.join(' ')).filter(Boolean);
}

/** Zerlegt Diktat oder Notizen in einzelne Gedanken: Zeilen, Sätze, Aufzählungen, Satzanfänge im Diktat. */
export function teile(text: string): string[] {
  const stuecke = text
    .split(/\r?\n+/)
    .map((z) => z.replace(/^\s*(?:[-*•–]|\d{1,2}[.)])\s+/u, ''))
    // Satzende, aber nicht nach Datumsangaben wie "14.3."
    .flatMap((z) => z.split(/(?<=(?<!\d)[.!?]|[!?])\s+(?=[\p{Lu}\d])/u))
    .flatMap(trenneDiktat)
    .map((s) => s.replace(/^[,;:\s]+|[,;\s]+$/g, '').trim())
    .filter(Boolean)
    .filter((s) => !ANHANG.test(s));

  // Teile ohne eigenen Inhalt ("Ich schätze so auf 20 Uhr") gehören zum vorigen Gedanken.
  const out: string[] = [];
  for (const s of stuecke) {
    const zeit = findeZeit(s);
    if (out.length && (zeit.minuten !== undefined || zeit.tag) && !kern(s, zeit.stellen)) {
      out[out.length - 1] += ` ${s}`;
    } else {
      out.push(s);
    }
  }
  return out;
}

function ohneFuell(t: string): string {
  for (const w of FUELLWOERTER) {
    t = t.replace(new RegExp(`(?<![\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'giu'), ' ');
  }
  return t;
}

/** Was übrig bleibt, wenn man Zeitangaben und Füllwörter entfernt. */
function kern(s: string, stellen: [number, number][]): string {
  return ohneFuell(ohneStellen(s, stellen)).replace(/[^\p{L}]+/gu, ' ').trim();
}

function einzeln(satz: string, jetzt: Date): Vorschlag {
  const zeit = findeZeit(satz, jetzt);
  const { wann, ende } = alsWann(zeit);

  // "Lena hat am 4. Mai Geburtstag", aber nicht "für meinen Geburtstag am 7. November"
  if (GEBURTSTAG.test(satz) && !new RegExp(`${MEIN_GEBURTSTAG.source}\\s+(?:\\p{L}+\\s+)?geburtstag`, 'iu').test(satz)) {
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
    // "Einkaufen gehen" ohne Liste ist eine Aufgabe
    return { art: 'aufgabe', titel: titel(satz, zeit.stellen), wann: wann?.slice(0, 10), original: satz };
  }

  if (/\?/.test(satz) && ANFRAGE.test(satz)) return anfrage(satz, undefined, jetzt, satz);

  const istAufgabe = AUFGABE.test(satz);
  const istTermin = TERMIN.test(satz);
  const genaueZeit = zeit.minuten !== undefined && !zeit.ungefaehr;

  // Genaue Uhrzeit → Termin. Sonst entscheidet "muss/anrufen/planen ..." für eine Aufgabe.
  const erinnerung = /erinner/i.test(satz);
  if (wann && !erinnerung && (genaueZeit || (!istAufgabe && (istTermin || zeit.tag)))) {
    const ort = /(?<![\p{L}])(?:nach|in)\s+(\p{Lu}[\p{L}-]+)/u.exec(ohneStellen(satz, zeit.stellen));
    const stellen = [...zeit.stellen];
    if (ort) {
      const i = satz.indexOf(ort[0]);
      if (i >= 0) stellen.push([i, i + ort[0].length]);
    }
    return { art: 'termin', titel: titel(satz, stellen), wann, ende, ort: ort?.[1], original: satz };
  }
  if (istAufgabe || erinnerung) return { art: 'aufgabe', titel: titel(satz, zeit.stellen), wann: wann?.slice(0, 10), original: satz };
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
    .replace(W('kaufen|einkaufen|besorgen|brauchen noch|brauche noch|wir|ich|noch|bitte|müssen|muss|sollte|ist alle|sind alle|leer|beim|im|vom|bei|rewe|edeka|aldi|lidl|dm|rossmann|kaufland|netto|penny|supermarkt|drogerie|gehen|gehe|geh|fahren|heute|morgen|dann|später|mal', 'giu'), ' ');
  return rest
    .split(/,|;|\s+und\s+|\s+&\s+|\n/)
    .map((p) => p.replace(/[.!?]/g, '').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 1)
    .map(gross);
}

function titel(satz: string, stellen: [number, number][]): string {
  let t = ohneStellen(satz, stellen);
  // Nebensätze abschneiden: "Zeit für Josef finden damit wir ..." → "Zeit für Josef finden"
  t = t.replace(/\s+(?:damit|weil|denn|sodass|so dass|obwohl|wobei)\s.*$/is, '');
  t = ohneFuell(t);
  t = t.replace(/\s+([,.!?])/g, '$1').replace(/^[\s,.:;-]+|[\s,.:;!-]+$/g, '').replace(/\s+/g, ' ').trim();
  // "bis die Bewerbung abschicken" → "Bewerbung abschicken", "zum Klavierunterricht" → "Klavierunterricht"
  t = t.replace(/^(?:(?:und|an|bis|die|der|das|den|dem|zum|zur)\s+)+/i, '');
  // "zu Juli" → "Bei Juli"
  t = t.replace(/^zu\s+(?=\p{Lu})/u, 'Bei ');
  return gross(t || satz.trim());
}

function kurz(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 60 ? t.slice(0, 57) + '...' : t;
}

function gross(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
