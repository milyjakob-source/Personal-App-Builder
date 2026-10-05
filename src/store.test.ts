import { describe, expect, it } from 'vitest';
import { leer, migriere } from './store';

describe('Migration', () => {
  it('ordnet alte Buchungen neu ein und behält eigene Regeln', () => {
    const alt = leer();
    alt.einstellungen.kategorienVersion = undefined;
    alt.einstellungen.kategorieRegeln = { 'bar rosenau': 'Freizeit', 'mein abo': 'Abos' };
    alt.buchungen = [
      { id: '1', datum: '2026-09-01', text: 'Kiosk am Markt · Kartenzahlung', betrag: -650, kategorie: 'Sonstiges' },
      { id: '2', datum: '2026-09-02', text: 'Bar Rosenau · Kartenzahlung', betrag: -1200, kategorie: 'Sonstiges' },
      { id: '3', datum: '2026-09-03', text: 'Mein Abo · Lastschrift', betrag: -500, kategorie: 'Sonstiges' },
      { id: '4', datum: '2026-09-04', text: 'Bargeld', betrag: -2000, kategorie: 'Shopping', manuell: true },
    ];
    const neu = migriere(alt);
    expect(neu.buchungen.map((b) => b.kategorie)).toEqual(['Zigaretten & Kiosk', 'Freizeit', 'Abos & Software', 'Shopping']);
    expect(neu.einstellungen.kategorienVersion).toBe(2);
    expect(migriere(neu)).toBe(neu);
  });
});
