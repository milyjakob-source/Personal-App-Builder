// Bereiche für Termine: Arbeit, Freizeit (Musik, Freunde, Familie, Sport) und Alltag.
// Zuordnung über Stichworte im Titel; was du einmal änderst, merkt sich MILI pro Titel.

import type { Termin } from '../types';

export type Bereich = 'arbeit' | 'musik' | 'freunde' | 'familie' | 'sport' | 'alltag';

export const BEREICHE: { id: Bereich; name: string; farbe: string; freizeit: boolean }[] = [
  { id: 'arbeit', name: 'Arbeit', farbe: 'var(--indigo)', freizeit: false },
  { id: 'musik', name: 'Musik', farbe: 'var(--lila)', freizeit: true },
  { id: 'freunde', name: 'Freunde', farbe: 'var(--gruen)', freizeit: true },
  { id: 'familie', name: 'Familie', farbe: 'var(--pink)', freizeit: true },
  { id: 'sport', name: 'Sport', farbe: 'var(--orange)', freizeit: true },
  { id: 'alltag', name: 'Alltag', farbe: 'var(--teal)', freizeit: false },
];

export const bereichInfo = (b: Bereich) => BEREICHE.find((x) => x.id === b)!;

// Lange Stichworte dürfen in zusammengesetzten Wörtern stecken ("Zahnarzt"), kurze nur als ganzes Wort ("Bank", nicht "Bankett").
const W = (woerter: string) =>
  new RegExp(
    woerter
      .split('|')
      .map((w) => (w.length <= 4 ? `(?<![\\p{L}])${w}(?![\\p{L}])` : w))
      .join('|'),
    'iu',
  );

// Reihenfolge zählt: "Klavierunterricht bei Silke" ist Musik, nicht Freunde; "Fitnessstudio" ist Sport, nicht Musik.
const REGELN: [Bereich, RegExp][] = [
  ['arbeit', W('arbeit|schicht|dienst|job|meeting|büro|kunde|kundin|besprechung|vorstellungsgespräch|bewerbungsgespräch|probearbeit|einarbeitung|team-?call|sound of music')],
  ['familie', W('mama|mutter|papa|vater|oma|opa|bruder|schwester|tante|onkel|cousin|familie|eltern')],
  ['sport', W('training|gym|fitness|sport|laufen|joggen|fußball|fussball|schwimmen|yoga|bouldern|klettern|radfahren|tennis|basketball|volleyball')],
  ['musik', W('musik|probe|band|klavier|piano|gitarre|bass|schlagzeug|drums|gesang|singen|chor|konzert|gig|session|jam|studio|aufnahme|recording|gehörbildung|theorie|harmonielehre|üben|srh|eignungsprüfung|aufnahmeprüfung|songwriting|produktion|mix')],
  ['alltag', W('arzt|ärztin|zahnarzt|friseur|frisör|amt|behörde|bank|post|einkauf|einkaufen|supermarkt|werkstatt|reparatur|apotheke|physio|termin|umzug|putzen|wäsche|vorlesung|uni|seminar|klausur|prüfung')],
  ['freunde', W('treffen|party|feier|geburtstag|kino|bar|bier|kneipe|club|essen gehen|zocken|chillen|abhängen|besuch')],
];

/** "bei Juli", "mit Tim", "zu Lena": ein Name ohne anderes Stichwort heißt meist Freunde. */
const PERSON = /(?<![\p{L}])(?:[Bb]ei|[Mm]it|[Zz]u|[Vv]on)\s+\p{Lu}\p{Ll}+/u;

export function titelKey(titel: string): string {
  return titel.toLowerCase().replace(/[^\p{L}\d ]/gu, '').replace(/\s+/g, ' ').trim();
}

export function bereichFuer(t: Pick<Termin, 'titel' | 'ort' | 'kalender' | 'art' | 'bereich'>, gelernt: Record<string, Bereich> = {}): Bereich {
  if (t.bereich) return t.bereich;
  const gemerkt = gelernt[titelKey(t.titel)];
  if (gemerkt) return gemerkt;
  if (t.art === 'job') return 'arbeit';
  const kal = (t.kalender ?? '').toLowerCase();
  if (/arbeit|job|work|dienst/.test(kal)) return 'arbeit';
  if (/musik|band|music/.test(kal)) return 'musik';
  if (/familie|family/.test(kal)) return 'familie';
  if (/sport/.test(kal)) return 'sport';
  const text = `${t.titel} ${t.ort ?? ''}`;
  for (const [b, re] of REGELN) if (re.test(text)) return b;
  if (t.art === 'treffen' || PERSON.test(t.titel)) return 'freunde';
  return 'alltag';
}

/** Steht etwas mit Einkaufen im Titel? Dann zeigt MILI die Einkaufsliste dazu. */
export function istEinkauf(titel: string): boolean {
  return /einkauf|einkaufen|supermarkt|rewe|edeka|aldi|lidl|netto|penny|kaufland|dm-?markt|drogerie|wocheneinkauf/i.test(titel);
}
