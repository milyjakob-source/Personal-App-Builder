// Ordnet Buchungen über Stichworte Kategorien zu. Eigene Korrekturen merkt sich MILI pro Händler.

export const KATEGORIEN = [
  'Lebensmittel',
  'Essen & Trinken',
  'Drogerie',
  'Wohnen',
  'Abos',
  'Musik & Equipment',
  'Mobilität',
  'Shopping',
  'Freizeit',
  'Gesundheit',
  'Versicherung & Gebühren',
  'Bildung',
  'Bargeld',
  'Sparen',
  'Sonstiges',
  'Einnahmen',
] as const;

export type Kategorie = (typeof KATEGORIEN)[number];

/** Kosten, die jeden Monat ungefähr gleich anfallen. */
export const FIXKOSTEN: string[] = ['Wohnen', 'Abos', 'Versicherung & Gebühren'];

const REGELN: [Kategorie, string[]][] = [
  ['Abos', ['spotify', 'netflix', 'apple.com/bill', 'apple services', 'itunes', 'disney', 'prime video', 'amazon prime', 'youtube', 'icloud', 'adobe', 'dazn', 'chatgpt', 'openai', 'audible', 'tidal', 'deezer', 'patreon', 'crunchyroll', 'sky deutschland', 'rtl+', 'joyn', 'claude.ai', 'anthropic']],
  ['Musik & Equipment', ['thomann', 'musicstore', 'music store', 'just music', 'ableton', 'native instruments', 'splice', 'plugin boutique', 'steinberg', 'waves', 'sweetwater', 'musikhaus', 'session music', 'kirstein', 'bax-shop', 'fender', 'gibson', 'universal audio', 'izotope', 'arturia', 'notenbuch', 'musikschule']],
  ['Lebensmittel', ['rewe', 'edeka', 'aldi', 'lidl', 'netto', 'penny', 'kaufland', 'norma', 'tegut', 'alnatura', 'denns', 'basic bio', 'supermarkt', 'bäckerei', 'baeckerei', 'backhaus', 'nahkauf', 'globus', 'real ', 'hit markt', 'flink', 'getir', 'picnic']],
  ['Essen & Trinken', ['lieferando', 'wolt', 'uber eats', 'mcdonald', 'burger king', 'kfc', 'subway', 'starbucks', 'cafe', 'café', 'kaffee', 'restaurant', 'pizza', 'döner', 'doener', 'kebap', 'kebab', 'sushi', 'bar ', 'imbiss', 'vapiano', 'dean&david', 'dean & david', 'coffee', 'mensa', 'studierendenwerk']],
  ['Drogerie', ['dm-drogerie', 'dm drogerie', 'dm fil', 'rossmann', 'müller handels', 'mueller handels', 'drogerie müller', 'budni']],
  ['Wohnen', ['miete', 'nebenkosten', 'strom', 'stadtwerke', 'enbw', 'vattenfall', 'e.on', 'gasag', 'vermieter', 'rundfunk', 'ard zdf', 'beitragsservice', 'wohnung', 'hausverwaltung', 'internet', 'vodafone', 'telekom', 'o2 ', 'telefonica', '1&1', 'congstar', 'aldi talk', 'fraenk']],
  ['Mobilität', ['db vertrieb', 'deutsche bahn', 'db fernverkehr', 'bahn', 'vvs', 'ssb', 'bvg', 's-bahn', 'flixbus', 'flixtrain', 'tier mobility', 'lime', 'voi technology', 'shell', 'aral', 'esso', 'jet ', 'tankstelle', 'deutschlandticket', 'd-ticket', 'mvg', 'uber', 'bolt', 'free now', 'parkhaus', 'parken', 'stadtmobil', 'share now', 'miles']],
  ['Shopping', ['amazon', 'amzn', 'zalando', 'vinted', 'h&m', 'zara', 'about you', 'ebay', 'otto', 'ikea', 'mediamarkt', 'media markt', 'saturn', 'apple store', 'decathlon', 'primark', 'uniqlo', 'snipes', 'kleinanzeigen', 'shein', 'temu', 'galaxus']],
  ['Freizeit', ['eventim', 'ticketmaster', 'reservix', 'kino', 'cinemaxx', 'ufa-palast', 'club', 'konzert', 'festival', 'fitness', 'gym', 'mcfit', 'urban sports', 'clever fit', 'bowling', 'museum', 'theater', 'steam', 'playstation', 'nintendo', 'xbox']],
  ['Gesundheit', ['apotheke', 'arzt', 'zahnarzt', 'praxis', 'physio', 'optiker', 'fielmann', 'krankenkasse', 'docmorris', 'shop apotheke']],
  ['Versicherung & Gebühren', ['versicherung', 'allianz', 'huk', 'ergo', 'axa', 'debeka', 'kontoführung', 'kontofuehrung', 'entgelt', 'gebühr', 'gebuehr', 'abschluss', 'zinsen', 'r+v', 'haftpflicht']],
  ['Bildung', ['hochschule', 'universität', 'universitaet', 'srh', 'semesterbeitrag', 'kurs', 'udemy', 'skillshare', 'masterclass', 'thalia', 'hugendubel', 'bewerbungsgebühr']],
  ['Bargeld', ['geldautomat', 'bargeld', 'auszahlung', 'gaa ', 'atm ', 'cash']],
  ['Sparen', ['sparplan', 'depot', 'trade republic', 'scalable', 'tagesgeld', 'sparkonto', 'umbuchung spar', 'vl ', 'bausparen']],
];

/** Händler-Schlüssel für gelernte Regeln: die ersten zwei Wörter, klein geschrieben. */
export function haendlerKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\d&+ ]/gu, ' ')
    .replace(/\b(gmbh|ag|se|kg|sagt danke|sa|s a r l|sarl|europe|deutschland|filiale|fil)\b/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w))
    .slice(0, 2)
    .join(' ');
}

export function kategorisiere(text: string, betrag: number, gelernt: Record<string, string> = {}): string {
  const key = haendlerKey(text);
  if (key && gelernt[key]) return gelernt[key];
  const t = ` ${text.toLowerCase()} `;
  if (betrag > 0) {
    return /sparplan|tagesgeld|sparkonto/.test(t) ? 'Sparen' : 'Einnahmen';
  }
  for (const [kat, woerter] of REGELN) {
    if (woerter.some((w) => t.includes(w))) return kat;
  }
  return 'Sonstiges';
}
