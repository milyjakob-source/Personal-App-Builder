import { describe, expect, it } from 'vitest';
import type { Buchung } from '../types';
import { jobBild } from './job';
import { findeAbos, monatsBild, sparplan } from './sparplan';

const JETZT = new Date(2026, 9, 5);
let id = 0;
const b = (datum: string, betrag: number, text: string, kategorie: string): Buchung => ({ id: String(id++), datum, betrag, text, kategorie });

const BUCHUNGEN: Buchung[] = [
  ...['2026-08', '2026-09'].flatMap((m) => [
    b(`${m}-01`, 90000, 'Café Blum · Lohn', 'Einnahmen'),
    b(`${m}-01`, -42000, 'Miete WG · Dauerauftrag', 'Wohnen & Handy'),
    b(`${m}-03`, -1299, 'Spotify AB · Lastschrift', 'Abos & Software'),
    b(`${m}-10`, -15000, 'REWE Markt', 'Lebensmittel'),
  ]),
  b('2026-09-20', -8000, 'Lieferando', 'Essen & Trinken'),
];

describe('Finanzen', () => {
  it('Monatsbild', () => {
    const m = monatsBild(BUCHUNGEN, '2026-09');
    expect(m.einnahmen).toBe(90000);
    expect(m.ausgaben).toBe(42000 + 1299 + 15000 + 8000);
    expect(m.kategorien[0]).toEqual({ name: 'Wohnen & Handy', summe: 42000 });
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

  it('Abos: nur monatlich und gleicher Betrag, keine Supermärkte', () => {
    const liste: Buchung[] = [
      b('2026-07-03', -799, 'LIME PRIME · Lastschrift', 'Abos & Software'),
      b('2026-08-03', -799, 'LIME PRIME · Lastschrift', 'Abos & Software'),
      b('2026-09-02', -799, 'LIME PRIME · Lastschrift', 'Abos & Software'),
      b('2026-08-05', -2000, 'REWE Markt · Kartenzahlung', 'Lebensmittel'),
      b('2026-09-05', -2000, 'REWE Markt · Kartenzahlung', 'Lebensmittel'),
      b('2026-09-01', -390, 'LIME RIDE · Lastschrift', 'Mobilität'),
      b('2026-09-04', -410, 'LIME RIDE · Lastschrift', 'Mobilität'),
      b('2026-09-10', -2000, 'Anthropic · Lastschrift', 'Abos & Software'),
      b('2026-07-01', -38000, 'Miete WG · Dauerauftrag', 'Wohnen & Handy'),
      b('2026-08-01', -38000, 'Miete WG · Dauerauftrag', 'Wohnen & Handy'),
      b('2026-09-01', -38000, 'Miete WG · Dauerauftrag', 'Wohnen & Handy'),
      b('2026-07-15', -999, 'Netzwerk Plus · Lastschrift', 'Sonstiges'),
      b('2026-08-15', -999, 'Netzwerk Plus · Lastschrift', 'Sonstiges'),
      b('2026-09-14', -999, 'Netzwerk Plus · Lastschrift', 'Sonstiges'),
    ];
    const namen = findeAbos(liste).map((a) => a.name);
    expect(namen).toContain('LIME PRIME');
    expect(namen).toContain('Anthropic');
    expect(namen).not.toContain('REWE Markt');
    expect(namen).not.toContain('LIME RIDE');
    expect(namen).not.toContain('Miete WG');
    // unbekannter Dienst, dreimal monatlich gleicher Betrag
    expect(namen).toContain('Netzwerk Plus');
    // von Hand ausschließen
    expect(findeAbos(liste, { anthropic: false }).map((a) => a.name)).not.toContain('Anthropic');
  });

  it('Job und regelmäßige Einnahmen ergeben das Einkommen, Budgets verteilen den Spielraum', () => {
    const job = { aktiv: true, name: 'Café', stundenlohn: 1400, stundenProWoche: 10, schichten: [
      { id: 's', start: '2026-10-01T09:00', ende: '2026-10-01T15:00' },
      { id: 't', start: '2026-10-08T00:00', ende: '2026-10-08T00:00', nurStunden: 4 },
    ] };
    const j = jobBild(job, JETZT);
    expect(j.stundenMonat).toBe(10);
    expect(j.stundenBisher).toBe(6);
    expect(j.verdienstBisher).toBe(8400);
    expect(j.hochrechnung).toBe(Math.round(10 * (52 / 12) * 1400));
    const p = sparplan(BUCHUNGEN, [], { einkommen: 0, sparquote: 10, einnahmen: [{ id: 'k', titel: 'Kindergeld', betrag: 25500 }] }, JETZT, j.hochrechnung);
    expect(p.einkommenQuelle).toBe('geplant');
    expect(p.einkommen).toBe(j.hochrechnung + 25500);
    const summeBudgets = p.budgets.reduce((a, x) => a + x.budget, 0);
    expect(Math.abs(summeBudgets - p.spielraum)).toBeLessThanOrEqual(p.budgets.length);
  });
});
