// Findet Datum und Uhrzeit in deutschem Freitext ("Freitag um halb 8", "am 12.11.", "morgen früh").
// Alles läuft lokal, ohne KI: feste Muster, dafür vorhersehbar.

import { plusTage, startDesTages, tagKey, zeitKey } from './datum';

export type ZeitFund = {
  /** Gefundener Tag (Mitternacht) */
  tag?: Date;
  /** Uhrzeit in Minuten nach Mitternacht */
  minuten?: number;
  endeMinuten?: number;
  /** Nur Tageszeit wie "abends" erkannt, keine genaue Uhrzeit */
  ungefaehr?: boolean;
  /** Fundstellen [start, ende) im Text, damit sie aus dem Titel entfernt werden können */
  stellen: [number, number][];
};

const WOCHENTAG: Record<string, number> = {
  sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6,
};

const MONAT: Record<string, number> = {
  jan: 0, januar: 0, feb: 1, februar: 1, mär: 2, märz: 2, maerz: 2, apr: 3, april: 3, mai: 4,
  jun: 5, juni: 5, jul: 6, juli: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  okt: 9, oktober: 9, nov: 10, november: 10, dez: 11, dezember: 11,
};

const ZAHLWORT: Record<string, number> = {
  ein: 1, einem: 1, einer: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8,
  neun: 9, zehn: 10, elf: 11, zwölf: 12,
};

// Wortgrenzen, die auch Umlaute als Buchstaben behandeln.
const B = '(?<![\\p{L}\\d])';
const E = '(?![\\p{L}\\d])';
const re = (s: string) => new RegExp(s.replaceAll('\\b<', B).replaceAll('\\b>', E), 'giu');

function zahl(s: string): number {
  return ZAHLWORT[s.toLowerCase()] ?? Number(s);
}

/** Uhrzeiten ohne "Uhr" unter 8 sind im Alltag fast immer abends gemeint ("um 7", "halb 8"). */
function nachmittags(h: number): number {
  return h >= 1 && h <= 7 ? h + 12 : h;
}

export function findeZeit(text: string, jetzt = new Date()): ZeitFund {
  const t = text.toLowerCase();
  const fund: ZeitFund = { stellen: [] };
  const belegt = (i: number, j: number) => fund.stellen.some(([a, b]) => i < b && j > a);
  const nimm = (m: RegExpExecArray) => {
    fund.stellen.push([m.index, m.index + m[0].length]);
  };
  const heute = startDesTages(jetzt);

  // --- Uhrzeit ---------------------------------------------------------------

  // Bereich: "14-16 Uhr", "von 14:30 bis 16 Uhr"
  for (const m of t.matchAll(re('\\b<(?:von\\s+)?(\\d{1,2})(?:[:.](\\d{2}))?\\s*(?:-|–|bis)\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(uhr)?\\b>'))) {
    const h1 = +m[1], h2 = +m[3];
    // Ohne "Uhr" und ohne Minuten könnte es auch "2-3 Tage" sein.
    if (!m[5] && !m[2] && !m[4]) continue;
    if (h1 > 23 || h2 > 24) continue;
    fund.minuten = h1 * 60 + (m[2] ? +m[2] : 0);
    fund.endeMinuten = h2 * 60 + (m[4] ? +m[4] : 0);
    nimm(m);
    break;
  }

  if (fund.minuten === undefined) {
    const muster: [RegExp, (m: RegExpExecArray) => number | undefined][] = [
      [re('\\b<(?:um|ab|gegen)\\s+halb\\s+(\\d{1,2}|\\p{L}+)\\b>'), (m) => halb(m[1])],
      [re('\\b<halb\\s+(\\d{1,2}|\\p{L}+)\\b>'), (m) => halb(m[1])],
      [re('\\b<viertel\\s+nach\\s+(\\d{1,2})\\b>'), (m) => nachmittags(+m[1]) * 60 + 15],
      [re('\\b<viertel\\s+vor\\s+(\\d{1,2})\\b>'), (m) => (nachmittags(+m[1]) - 1) * 60 + 45],
      [re('\\b<(?:so\\s+)?(?:um|ab|gegen|auf|ca\\.|circa|etwa)?\\s*(\\d{1,2}):(\\d{2})\\s*(?:uhr)?\\b>'), (m) => +m[1] * 60 + +m[2]],
      [re('\\b<(?:um|ab|gegen)?\\s*(\\d{1,2})\\.(\\d{2})\\s*uhr\\b>'), (m) => +m[1] * 60 + +m[2]],
      [re('\\b<(?:um|ab|gegen)\\s+(\\d{1,2})\\.(\\d{2})\\b>(?!\\.)'), (m) => +m[1] * 60 + +m[2]],
      [re('\\b<(?:so\\s+)?(?:um|ab|gegen|auf|ca\\.|circa|etwa)?\\s*(\\d{1,2})\\s*uhr\\b>'), (m) => +m[1] * 60],
      [re('\\b<(?:um|ab|gegen)\\s+(\\d{1,2})\\b>(?![.:]\\d)'), (m) => nachmittags(+m[1]) * 60],
    ];
    for (const [r, f] of muster) {
      const m = r.exec(t);
      if (!m) continue;
      const min = f(m);
      if (min === undefined || min < 0 || min >= 24 * 60) continue;
      fund.minuten = min;
      nimm(m);
      break;
    }
  }

  // Tageszeiten als Näherung, falls keine genaue Uhrzeit dasteht.
  const tageszeiten: [string, number][] = [
    ['heute\\s+morgen', 9 * 60], ['morgen\\s+früh', 9 * 60], ['frühmorgens', 7 * 60], ['morgens', 9 * 60], ['vormittags?', 10 * 60],
    ['mittags?', 12 * 60], ['nachmittags?', 15 * 60], ['abends?', 19 * 60], ['nachts', 22 * 60],
  ];
  for (const [w, min] of tageszeiten) {
    const m = re(`\\b<(?:am\\s+|heute\\s+)?${w}\\b>`).exec(t);
    if (!m || belegt(m.index, m.index + m[0].length)) continue;
    // "morgen früh": den Tag-Teil stehen lassen, damit "morgen" als Datum gefunden wird.
    if (w.startsWith('morgen\\s')) {
      const frueh = t.indexOf('früh', m.index);
      fund.stellen.push([frueh, frueh + 4]);
    } else {
      // "heute abend": "heute" bleibt für die Datumssuche erhalten.
      const start = m[0].startsWith('heute') ? m.index + 6 : m.index;
      fund.stellen.push([start, m.index + m[0].length]);
    }
    if (fund.minuten === undefined) {
      fund.minuten = min;
      fund.ungefaehr = true;
    } else if (min >= 15 * 60 && fund.minuten < 12 * 60) {
      // "abends um 7" → 19 Uhr
      fund.minuten += 12 * 60;
    }
    break;
  }

  // --- Datum -----------------------------------------------------------------

  const setze = (d: Date, m: RegExpExecArray) => {
    if (fund.tag) return;
    fund.tag = startDesTages(d);
    nimm(m);
  };

  // 12.11. / 12.11.2026 / 12.11.26
  for (const m of t.matchAll(re('\\b<(?:am\\s+)?(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}|\\d{2})?(?![\\d:])(?!\\s*uhr)'))) {
    if (belegt(m.index, m.index + m[0].length)) continue;
    const d = +m[1], mo = +m[2];
    if (d < 1 || d > 31 || mo < 1 || mo > 12) continue;
    const j = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : undefined;
    setze(kuenftig(d, mo - 1, j, heute), m);
    break;
  }

  // "am 12.11" ohne Schlusspunkt
  if (!fund.tag) {
    const m = re('\\b<am\\s+(\\d{1,2})\\.(\\d{1,2})(?![\\d.:])(?!\\s*uhr)').exec(t);
    if (m && +m[1] >= 1 && +m[1] <= 31 && +m[2] >= 1 && +m[2] <= 12) setze(kuenftig(+m[1], +m[2] - 1, undefined, heute), m);
  }

  // 12. November / 3 Mai
  if (!fund.tag) {
    const namen = Object.keys(MONAT).sort((a, b) => b.length - a.length).join('|');
    const m = re(`\\b<(?:am\\s+)?(\\d{1,2})\\.?\\s*(${namen})\\.?\\b>(?:\\s+(\\d{4}))?`).exec(t);
    if (m && !belegt(m.index, m.index + m[0].length)) {
      setze(kuenftig(+m[1], MONAT[m[2]], m[3] ? +m[3] : undefined, heute), m);
    }
  }

  if (!fund.tag) {
    const m = re('\\b<übermorgen\\b>').exec(t);
    if (m) setze(plusTage(heute, 2), m);
  }
  if (!fund.tag) {
    const m = re('\\b<morgen\\b>').exec(t);
    if (m && !belegt(m.index, m.index + m[0].length)) setze(plusTage(heute, 1), m);
  }
  if (!fund.tag) {
    const m = re('\\b<heute\\b>').exec(t);
    if (m) setze(heute, m);
  }

  // "in 3 Tagen", "in zwei Wochen"
  if (!fund.tag) {
    const m = re('\\b<in\\s+(\\d+|\\p{L}+)\\s+(tag|tagen|woche|wochen)\\b>').exec(t);
    if (m && !Number.isNaN(zahl(m[1]))) {
      const n = zahl(m[1]) * (m[2].startsWith('woche') ? 7 : 1);
      setze(plusTage(heute, n), m);
    }
  }

  // "nächste Woche Freitag", "nächsten Freitag", "Freitag", "am Wochenende"
  if (!fund.tag) {
    const tage = Object.keys(WOCHENTAG).join('|');
    const m = re(`\\b<(?:(nächste|kommende)\\s+woche\\s+)?(?:(?:am|nächsten|kommenden|diesen|den)\\s+)*(${tage})s?\\b>`).exec(t);
    if (m) {
      const ziel = WOCHENTAG[m[2]];
      let diff = (ziel - heute.getDay() + 7) % 7;
      if (m[1]) {
        // in der nächsten Kalenderwoche (Montag bis Sonntag)
        const montag = plusTage(heute, ((8 - heute.getDay()) % 7) || 7);
        diff = Math.round((plusTage(montag, (ziel + 6) % 7).getTime() - heute.getTime()) / 86400000);
      } else if (diff === 0 && /nächsten|kommenden/.test(m[0])) {
        diff = 7;
      }
      setze(plusTage(heute, diff), m);
    }
  }
  // Abkürzungen nur vor einer Zahl ("Mi 9:30", "Fr. 14-22 Uhr"), sonst zu leicht mit Wörtern verwechselt.
  if (!fund.tag) {
    const kurz: Record<string, number> = { so: 0, mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6 };
    const m = re('\\b<(mo|di|mi|do|fr|sa|so)\\.?(?=,?\\s*(?:von\\s+)?\\d)').exec(t);
    if (m) setze(plusTage(heute, (kurz[m[1]] - heute.getDay() + 7) % 7), m);
  }
  if (!fund.tag) {
    const m = re('\\b<(?:am\\s+|übers\\s+|dieses\\s+|nächstes\\s+)?wochenende\\b>').exec(t);
    if (m) {
      const tag = heute.getDay();
      let diff = tag === 6 || tag === 0 ? 0 : 6 - tag;
      if (m[0].startsWith('nächstes')) diff += 7;
      setze(plusTage(heute, diff), m);
    }
  }
  if (!fund.tag) {
    const m = re('\\b<(?:nächste|kommende)\\s+woche\\b>').exec(t);
    if (m) setze(plusTage(heute, ((8 - heute.getDay()) % 7) || 7), m);
  }

  // Nur Uhrzeit: heute, oder morgen, falls schon vorbei.
  if (!fund.tag && fund.minuten !== undefined && !fund.ungefaehr) {
    const jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();
    fund.tag = fund.minuten > jetztMin ? heute : plusTage(heute, 1);
  }

  return fund;
}

function halb(s: string): number | undefined {
  const n = zahl(s);
  if (!n || n > 24) return undefined;
  return nachmittags(n - 1) * 60 + 30;
}

/** Nächstes Vorkommen eines Tages ohne Jahr: liegt er mehr als eine Woche zurück, ist nächstes Jahr gemeint. */
function kuenftig(tag: number, monat: number, jahr: number | undefined, heute: Date): Date {
  if (jahr) return new Date(jahr, monat, tag);
  const d = new Date(heute.getFullYear(), monat, tag);
  if (d.getTime() < plusTage(heute, -7).getTime()) d.setFullYear(d.getFullYear() + 1);
  return d;
}

/** Zeitpunkt als gespeicherter Text: mit Uhrzeit "YYYY-MM-DDTHH:mm", sonst "YYYY-MM-DD". */
export function alsWann(f: ZeitFund): { wann?: string; ende?: string } {
  if (!f.tag) return {};
  if (f.minuten === undefined) return { wann: tagKey(f.tag) };
  const start = new Date(f.tag);
  start.setMinutes(f.minuten);
  const r: { wann?: string; ende?: string } = { wann: zeitKey(start) };
  if (f.endeMinuten !== undefined) {
    const ende = new Date(f.tag);
    ende.setMinutes(f.endeMinuten <= f.minuten ? f.endeMinuten + 24 * 60 : f.endeMinuten);
    r.ende = zeitKey(ende);
  }
  return r;
}

/** Entfernt die Fundstellen aus dem Text (für saubere Titel). */
export function ohneStellen(text: string, stellen: [number, number][]): string {
  let r = text;
  for (const [a, b] of [...stellen].sort((x, y) => y[0] - x[0])) {
    r = r.slice(0, a) + ' ' + r.slice(b);
  }
  return r;
}
