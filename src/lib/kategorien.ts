// Ordnet Buchungen über Händler-Stichworte Kategorien zu. Eigene Korrekturen merkt sich MILI pro Händler.
// Gesucht wird im ganzen Buchungstext, also auch in den Detailzeilen des Auszugs
// (bei PayPal, SumUp & Co. steht der eigentliche Empfänger oft erst dort).

export const KATEGORIEN = [
  'Lebensmittel',
  'Essen & Trinken',
  'Bar & Ausgehen',
  'Zigaretten & Kiosk',
  'Drogerie',
  'Mobilität',
  'Abos & Software',
  'Musik & Equipment',
  'Shopping',
  'Freizeit',
  'Wohnen & Handy',
  'Gesundheit',
  'Versicherung & Gebühren',
  'Bildung',
  'Überweisungen',
  'Bargeld',
  'Sparen',
  'Sonstiges',
  'Einnahmen',
] as const;

export type Kategorie = (typeof KATEGORIEN)[number];

/** Farbe pro Kategorie (folgt der Kategorie, nie dem Rang). */
export const KATEGORIE_FARBE: Record<string, string> = {
  Lebensmittel: 'var(--gruen)',
  'Essen & Trinken': 'var(--orange)',
  'Bar & Ausgehen': 'var(--pink)',
  'Zigaretten & Kiosk': '#a2845e',
  Drogerie: 'var(--teal)',
  Mobilität: 'var(--blau)',
  'Abos & Software': 'var(--lila)',
  'Musik & Equipment': 'var(--indigo)',
  Shopping: 'var(--gelb)',
  Freizeit: 'var(--mint)',
  'Wohnen & Handy': '#8e8e93',
  Gesundheit: 'var(--rot)',
  'Versicherung & Gebühren': '#636366',
  Bildung: 'var(--indigo)',
  Überweisungen: '#8e8e93',
  Bargeld: '#8e8e93',
  Sparen: 'var(--gruen)',
  Sonstiges: '#aeaeb2',
  Einnahmen: 'var(--gruen)',
};

/** Kosten, die jeden Monat ungefähr gleich anfallen. */
export const FIXKOSTEN: string[] = ['Wohnen & Handy', 'Abos & Software', 'Versicherung & Gebühren'];

/** Zahlungsdienste: der eigentliche Händler steht in der nächsten Zeile. */
export const ZAHLUNGSDIENSTE = /paypal|klarna|sumup|zettle|izettle|stripe|adyen|mollie|payone|unzer|computop|nexi|concardis|worldline|wirecard|sofort|giropay|apple pay|google pay|mangopay/i;

const REGELN: [Kategorie, string[]][] = [
  // Zuerst die eindeutigen Abos, damit "Uber One" nicht als Fahrt zählt
  ['Abos & Software', [
    'anthropic', 'claude.ai', 'claude ai', 'openai', 'chatgpt', 'spotify', 'netflix', 'apple.com/bill', 'apple services', 'itunes', 'icloud',
    'disney', 'prime video', 'amazon prime', 'amazon digital', 'youtube', 'google one', 'google storage', 'adobe', 'dazn', 'audible',
    'tidal', 'deezer', 'patreon', 'crunchyroll', 'sky deutschland', 'wow tv', 'rtl+', 'joyn', 'paramount', 'uber one', 'lime prime',
    'lime pass', 'deutschlandticket', 'd-ticket', 'notion', 'canva', 'dropbox', 'microsoft 365', 'xbox game pass', 'playstation plus', 'nintendo online', 'duolingo',
  ]],
  ['Zigaretten & Kiosk', [
    'kiosk', 'tabak', 'tabakwaren', 'zigarette', 'zigaretten', 'tobacco', 'tabacco', 'smoke', 'shisha', 'vape', 'e-zigarette', 'lotto',
    'toto', 'presse', 'zeitschriften', 'spätkauf', 'spaeti', 'späti', 'tankstelle shop', 'convenience', 'trinkhalle',
    'tabak-börse', 'tabakbörse', 'zigarren', 'zigarettenautomat', 'tabac', 'büdchen', 'buedchen',
  ]],
  ['Bar & Ausgehen', [
    ' bar ', ' pub ', 'kneipe', 'club', 'lounge', 'bierhaus', 'biergarten', 'brauhaus', 'brauerei', 'cocktail',
    'disco', 'irish', 'weinbar', 'tanzbar', 'nachtclub', 'eventim', 'ticketmaster', 'reservix', 'resident advisor', 'dice.fm', 'shotgun',
    'festival', 'konzertkasse', 'clubkasse', 'schankwirtschaft', 'gaststätte', 'gaststaette', 'wirtshaus',
  ]],
  ['Essen & Trinken', [
    'lieferando', 'wolt', 'uber eats', 'ubereats', 'deliveroo', 'mcdonald', 'burger king', 'kfc', 'subway', 'five guys', 'starbucks',
    'restaurant', 'ristorante', 'trattoria', 'pizzeria', 'pizza', 'döner', 'doener', 'kebap', 'kebab', 'sushi', 'imbiss', 'vapiano',
    'dean&david', 'dean & david', 'coffee', 'kaffee', 'café', 'cafe ', 'cafe,', 'bistro', 'mensa', 'studierendenwerk', 'backwerk',
    'bäckerei', 'baeckerei', 'backhaus', 'bäcker', 'baecker', 'konditorei', 'eiscafe', 'eiscafé', 'gelato', 'noodle', 'asia ', ' thai',
    'burrito', 'taco', 'falafel', 'grill', 'steakhouse', 'l\'osteria', 'osteria', 'hans im glück', 'block house', 'nordsee',
    'ditsch', 'kamps', 'le crobag', 'yormas', 'mcfit kantine', 'kantine',
  ]],
  ['Lebensmittel', [
    'rewe', 'edeka', 'aldi', 'lidl', 'netto', 'penny', 'kaufland', 'norma', 'tegut', 'alnatura', 'denns', 'basic bio', 'supermarkt',
    'nahkauf', 'globus', 'real,-', 'marktkauf', 'hit markt', 'flink', 'getir', 'picnic', 'knuspr', 'wasgau', 'famila', ' combi ',
    'bio company', 'vollcorner', 'asia markt', 'asiamarkt', 'türkischer markt', 'getränke', 'getraenke', 'trinkgut', 'hol ab',
  ]],
  ['Drogerie', [' dm ', 'dm-drogerie', 'dm drogerie', 'dm fil', 'dm-markt', 'dm markt', 'rossmann', 'müller handels', 'mueller handels', 'drogerie müller', 'budni', 'douglas', 'flaconi']],
  ['Mobilität', [
    ' lime', ' uber ', ' uber*', 'uber bv', 'uber trip', ' bolt', 'free now', 'freenow', 'tier mobility', 'tier ', 'dott', 'voi technology', ' voi ', 'bird rides', 'nextbike',
    'db vertrieb', 'deutsche bahn', 'db fernverkehr', 'db regio', 'bahn.de', 'vvs', 'ssb ag', 'bvg', 's-bahn', 'flixbus', 'flixtrain',
    'blablacar', 'deutschlandticket', 'd-ticket', 'mvg', 'hvv', 'kvv', 'naldo', 'shell', 'aral', 'esso', 'jet tankstelle', 'total energies',
    'totalenergies', 'agip', 'tankstelle', 'parkhaus', 'parken', 'easypark', 'parkster', 'stadtmobil', 'share now', 'miles mobility',
    'sixt', 'europcar', 'taxi', 'mietwagen',
  ]],
  ['Musik & Equipment', [
    'thomann', 'musicstore', 'music store', 'just music', 'ableton', 'native instruments', 'splice', 'plugin boutique', 'steinberg',
    'waves audio', 'sweetwater', 'musikhaus', 'session music', 'sound of music', 'kirstein', 'bax-shop', 'fender', 'gibson',
    'universal audio', 'izotope', 'arturia', 'notenbuch', 'musikschule', 'proberaum', 'tonstudio', 'distrokid', 'bandcamp', 'soundcloud',
  ]],
  ['Shopping', [
    'amazon', 'amzn', 'zalando', 'vinted', 'h&m', 'zara', 'about you', 'ebay', ' otto ', 'otto gmbh', 'ikea', 'mediamarkt', 'media markt', 'saturn',
    'apple store', 'decathlon', 'primark', 'uniqlo', 'snipes', 'kleinanzeigen', 'shein', 'temu', 'galaxus', 'tk maxx', 'c&a', 'pull&bear',
    'bershka', 'asos', ' nike', 'adidas', 'foot locker', ' depot ', ' action ', ' tedi ', 'woolworth', 'thalia', 'hugendubel', 'douglas',
  ]],
  ['Freizeit', [
    'kino', 'cinemaxx', 'ufa-palast', 'cineplex', 'fitness', 'gym', 'mcfit', 'urban sports', 'clever fit', 'bowling', 'museum',
    'theater', 'steam', 'playstation', 'nintendo', 'xbox', 'schwimmbad', 'freibad', 'boulder', 'kletterhalle', 'escape',
  ]],
  ['Wohnen & Handy', [
    'miete', 'nebenkosten', 'strom', 'stadtwerke', 'enbw', 'vattenfall', 'e.on', 'gasag', 'vermieter', 'rundfunk', 'ard zdf',
    'beitragsservice', 'wohnung', 'hausverwaltung', 'internet', 'vodafone', 'telekom', 'o2 ', 'telefonica', '1&1', 'congstar',
    'aldi talk', 'fraenk', 'freenet', 'mobilcom', 'winsim', 'blau.de', 'wg-',
  ]],
  ['Gesundheit', ['apotheke', 'arzt', 'zahnarzt', 'praxis', 'physio', 'optiker', 'fielmann', 'krankenkasse', 'docmorris', 'shop apotheke', 'klinik', 'labor']],
  ['Versicherung & Gebühren', ['versicherung', 'allianz', 'huk', 'ergo', 'axa', 'debeka', 'kontoführung', 'kontofuehrung', 'entgelt', 'gebühr', 'gebuehr', 'rechnungsabschluss', 'abschluss', 'zinsen', 'r+v', 'haftpflicht', 'mahn']],
  ['Bildung', ['hochschule', 'universität', 'universitaet', 'srh', 'semesterbeitrag', 'udemy', 'skillshare', 'masterclass', 'bewerbungsgebühr', 'volkshochschule', 'vhs ']],
  ['Bargeld', ['geldautomat', 'bargeld', 'auszahlung', 'gaa ', 'atm ', 'cash', 'bargeldauszahlung']],
  ['Sparen', ['sparplan', 'trade republic', 'scalable', 'tagesgeld', 'sparkonto', 'umbuchung spar', ' vl ', 'bausparen', 'etf']],
];

/** Händler-Schlüssel für gelernte Regeln: die ersten zwei Wörter, klein geschrieben. */
export function haendlerKey(text: string): string {
  return text
    .split(' · ')[0]
    .toLowerCase()
    .replace(/[^\p{L}\d&+ ]/gu, ' ')
    .replace(/\b(gmbh|ag|se|kg|ohg|ug|sagt danke|sa|s a r l|sarl|europe|deutschland|filiale|fil|co)\b/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w))
    .slice(0, 2)
    .join(' ');
}

export function kategorisiere(text: string, betrag: number, gelernt: Record<string, string> = {}): string {
  const key = haendlerKey(text);
  if (key && gelernt[key]) return gelernt[key];
  const t = ` ${text.toLowerCase().replace(/[/*_.,:;]+/g, ' ').replace(/\s+/g, ' ')} `;
  if (betrag > 0) {
    return /sparplan|tagesgeld|sparkonto/.test(t) ? 'Sparen' : 'Einnahmen';
  }
  for (const [kat, woerter] of REGELN) {
    if (woerter.some((w) => t.includes(w.replace(/[/.]+/g, ' ').replace(/\s+/g, ' ')) || t.includes(w))) return kat;
  }
  // Überweisung an eine Person (Vor- und Nachname, kein Firmenzusatz)
  if (/überweisung|ueberweisung|dauerauftrag|echtzeit/i.test(text) && !/gmbh|ag\b|e\.?v\.?|kg\b|ug\b/i.test(text)) return 'Überweisungen';
  return 'Sonstiges';
}
