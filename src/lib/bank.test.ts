import { describe, expect, it } from 'vitest';
import { buchungsKey, leseAllgemein, leseAuszug, leseVolksbank } from './bank';
import { haendlerKey, kategorisiere } from './kategorien';

const JETZT = new Date(2026, 9, 5, 10, 0);

const VOLKSBANK = `
Volksbank Stuttgart eG
Kontoauszug 9/2026          Erstellt am 30.09.2026
Bu-Tag Wert Vorgang                                      Soll   Haben
alter Kontostand vom 31.08.2026                                  812,40 H
01.09. 01.09. Basislastschrift PN:931                 12,99 S
              Spotify AB
              EREF: 1234567890 MREF: ABC
              CRED: DE12ZZZ00000012345
02.09. 02.09. Kartenzahlung girocard PN:801           23,47 S
              REWE Markt GmbH Stuttgart
              2026-09-01T18:22 Debitk.0 2027-12
15.09. 15.09. Gutschrift PN:166                                 450,00 H
              Café Blum GmbH Lohn September
30.09. 30.09. Dauerauftrag PN:900                      420,00 S
              Miete WG Marienplatz
neuer Kontostand vom 30.09.2026                                  806,94 H
`;

describe('Volksbank-PDF', () => {
  it('liest Buchungen mit Soll/Haben', () => {
    const b = leseVolksbank(VOLKSBANK, JETZT);
    expect(b).toHaveLength(4);
    expect(b[0]).toMatchObject({ datum: '2026-09-01', betrag: -1299, text: 'Spotify AB · Basislastschrift' });
    expect(b[1]).toMatchObject({ datum: '2026-09-02', betrag: -2347, text: 'REWE Markt GmbH Stuttgart · Kartenzahlung girocard' });
    expect(b[2]).toMatchObject({ betrag: 45000 });
    expect(b[3]).toMatchObject({ betrag: -42000, text: 'Miete WG Marienplatz · Dauerauftrag' });
  });

  it('Jahreswechsel', () => {
    const t = 'Erstellt am 05.01.2027\n30.12. 30.12. Lastschrift 9,99 S\nNetflix\n02.01. 02.01. Lastschrift 5,00 S\nApple';
    expect(leseVolksbank(t, JETZT).map((b) => b.datum)).toEqual(['2026-12-30', '2027-01-02']);
  });
});

describe('Screenshot / allgemein', () => {
  it('Banking-App mit Datumsüberschriften', () => {
    const ocr = `Umsätze
Freitag, 3. Oktober 2026
SPOTIFY AB
Lastschrift
-12,99 €
Lidl sagt danke
-8,45 €
Donnerstag, 2. Oktober 2026
Café Blum
Gehalt
+450,00 €
Kontostand 806,94 €`;
    const b = leseAllgemein(ocr, JETZT);
    expect(b).toEqual([
      { datum: '2026-10-03', text: 'SPOTIFY AB · Lastschrift', betrag: -1299 },
      { datum: '2026-10-03', text: 'Lidl', betrag: -845 },
      { datum: '2026-10-02', text: 'Café Blum · Gehalt', betrag: 45000 },
    ]);
  });

  it('Zeilen mit Datum, Text und Betrag', () => {
    const b = leseAuszug('01.10.2026 Thomann GmbH -89,00\n02.10.2026 Gutschrift Oma +50,00', JETZT);
    expect(b).toEqual([
      { datum: '2026-10-01', text: 'Thomann GmbH', betrag: -8900 },
      { datum: '2026-10-02', text: 'Gutschrift Oma', betrag: 5000 },
    ]);
  });

  it('Dubletten-Schlüssel', () => {
    expect(buchungsKey({ datum: '2026-10-01', betrag: -8900, text: 'Thomann GmbH' })).toBe(
      buchungsKey({ datum: '2026-10-01', betrag: -8900, text: 'thomann gmbh' }),
    );
  });
});

describe('Kategorien', () => {
  it('Stichworte', () => {
    expect(kategorisiere('Spotify AB · Basislastschrift', -1299)).toBe('Abos & Software');
    expect(kategorisiere('REWE Markt GmbH', -2347)).toBe('Lebensmittel');
    expect(kategorisiere('Thomann GmbH', -8900)).toBe('Musik & Equipment');
    expect(kategorisiere('Miete WG', -42000)).toBe('Wohnen & Handy');
    expect(kategorisiere('Vinted UAB', -1500)).toBe('Shopping');
    expect(kategorisiere('Café Blum Lohn', 45000)).toBe('Einnahmen');
    expect(kategorisiere('Irgendwas', -100)).toBe('Sonstiges');
  });

  it('typische Händler aus dem Alltag', () => {
    expect(kategorisiere('Kiosk am Marienplatz · Kartenzahlung', -720)).toBe('Zigaretten & Kiosk');
    expect(kategorisiere('Tabakwaren Müller · Kartenzahlung', -900)).toBe('Zigaretten & Kiosk');
    expect(kategorisiere('Bar Rosenau · Kartenzahlung', -1450)).toBe('Bar & Ausgehen');
    expect(kategorisiere('LIME*RIDE · Lastschrift', -380)).toBe('Mobilität');
    expect(kategorisiere('UBER *TRIP · Lastschrift', -1290)).toBe('Mobilität');
    expect(kategorisiere('UBER *ONE · Lastschrift', -499)).toBe('Abos & Software');
    expect(kategorisiere('ANTHROPIC, PBC · Lastschrift', -2000)).toBe('Abos & Software');
    expect(kategorisiere('Lime Prime · Lastschrift', -799)).toBe('Abos & Software');
    expect(kategorisiere('Lisa Huber · Überweisung', -2000)).toBe('Überweisungen');
    expect(kategorisiere('Bäckerei Treiber · Kartenzahlung', -350)).toBe('Essen & Trinken');
  });

  it('PayPal: echter Händler aus der Folgezeile', () => {
    const t = '03.09. 03.09. Basislastschrift PN:5 15,00 S\nPayPal Europe S.a.r.l. et Cie S.C.A\nIhr Einkauf bei Vinted\nEREF: 123';
    const [b] = leseVolksbank(t, JETZT);
    expect(b.text).toBe('Vinted · Basislastschrift');
    expect(kategorisiere(`${b.text} ${b.info}`, b.betrag)).toBe('Shopping');
  });

  it('gelernte Regeln gehen vor', () => {
    expect(haendlerKey('REWE Markt GmbH Stuttgart')).toBe('rewe markt');
    expect(kategorisiere('REWE Markt GmbH', -500, { 'rewe markt': 'Essen & Trinken' })).toBe('Essen & Trinken');
  });
});
