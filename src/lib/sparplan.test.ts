import { describe, expect, it } from 'vitest';
import type { Buchung } from '../types';
import { findeAbos, monatsBild, sparplan } from './sparplan';

const JETZT = new Date(2026, 9, 5);
let id = 0;
const b = (datum: string, betrag: number, text: string, kategorie: string): Buchung => ({ id: String(id++), datum, betrag, text, kategorie });

const BUCHUNGEN: Buchung[] = [
  ...['2026-08', '2026-09'].flatMap((m) => [
    b(`${m}-01`, 90000, 'Café Blum · Lohn', 'Einnahmen'),
    b(`${m}-01`, -42000, 'Miete WG · Dauerauftrag', 'Wohnen'),
    b(`${m}-03`, -1299, 'Spotify AB · Lastschrift', 'Abos'),
    b(`${m}-10`, -15000, 'REWE Markt', 'Lebensmittel'),
  ]),
  b('2026-09-20', -8000, 'Lieferando', 'Essen & Trinken'),
];

describe('Finanzen', () => {
  it('Monatsbild', () => {
    const m = monatsBild(BUCHUNGEN, '2026-09');
    expect(m.einnahmen).toBe(90000);
    expect(m.ausgaben).toBe(42000 + 1299 + 15000 + 8000);
    expect(m.kategorien[0]).toEqual({ name: 'Wohnen', summe: 42000 });
  });

  it('erkennt Abos', () => {
    const abos = findeAbos(BUCHUNGEN);
    expect(abos.map((a) => a.name)).toContain('Spotify AB');
  });

  it('Sparplan mit Rücklage für geplante Ausgabe', () => {
    const p = sparplan(
      BUCHUNGEN,
      [{ id: 'g', titel: 'Semesterbeitrag', betrag: 30000, datum: '2027-01-15' }],
      { einkommen: 0, sparquote: 10 },
      JETZT,
    );
    expect(p.basisMonate).toBe(2);
    expect(p.einkommen).toBe(90000);
    expect(p.fixkosten).toBe(43299);
    expect(p.ruecklagen[0]).toMatchObject({ monate: 3, proMonat: 10000 });
    expect(p.sparziel).toBe(9000);
    expect(p.spielraum).toBe(90000 - 43299 - 10000 - 9000);
  });
});
