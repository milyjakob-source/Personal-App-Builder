// Übersicht und Sparplan aus den importierten Buchungen.

import type { Buchung, Einstellungen, GeplanteAusgabe } from '../types';
import { lies, monateBis, monatKey } from './datum';
import { FIXKOSTEN, haendlerKey } from './kategorien';

export type MonatsBild = {
  monat: string;
  einnahmen: number;
  ausgaben: number;
  kategorien: { name: string; summe: number }[];
};

export function monatsBild(buchungen: Buchung[], monat: string): MonatsBild {
  const im = buchungen.filter((b) => monatKey(b.datum) === monat);
  const summen = new Map<string, number>();
  let einnahmen = 0;
  let ausgaben = 0;
  for (const b of im) {
    if (b.betrag > 0 || b.kategorie === 'Einnahmen') {
      einnahmen += b.betrag;
      continue;
    }
    ausgaben += -b.betrag;
    summen.set(b.kategorie, (summen.get(b.kategorie) ?? 0) - b.betrag);
  }
  const kategorien = [...summen.entries()].map(([name, summe]) => ({ name, summe })).sort((a, b) => b.summe - a.summe);
  return { monat, einnahmen, ausgaben, kategorien };
}

export function monateMitDaten(buchungen: Buchung[]): string[] {
  return [...new Set(buchungen.map((b) => monatKey(b.datum)))].sort().reverse();
}

export type Abo = { name: string; betrag: number; monate: number; key: string; manuell?: boolean };

/** Kategorien, die nie ein Abo sind, auch wenn man jede Woche gleich viel ausgibt. */
const KEIN_ABO = [
  'Lebensmittel', 'Essen & Trinken', 'Bar & Ausgehen', 'Zigaretten & Kiosk', 'Drogerie', 'Bargeld', 'Shopping', 'Mobilität',
  // Miete, Handy, Versicherung und Überweisungen sind feste Kosten, aber keine Abos
  'Wohnen & Handy', 'Versicherung & Gebühren', 'Überweisungen', 'Sparen',
];

/**
 * Abos: gleicher Händler, fast exakt gleicher Betrag, mindestens dreimal im Monatsabstand (25 bis 35 Tage).
 * Dazu alles, was als "Abos & Software" eingeordnet ist, und was du von Hand markiert hast.
 */
export function findeAbos(buchungen: Buchung[], regeln: Record<string, boolean> = {}): Abo[] {
  const gruppen = new Map<string, Buchung[]>();
  for (const b of buchungen) {
    if (b.betrag >= 0) continue;
    const key = haendlerKey(b.text);
    if (!key) continue;
    gruppen.set(key, [...(gruppen.get(key) ?? []), b]);
  }
  const abos: Abo[] = [];
  for (const [key, liste] of gruppen) {
    if (regeln[key] === false) continue;
    const sortiert = [...liste].sort((a, b) => a.datum.localeCompare(b.datum));
    const letzte = sortiert[sortiert.length - 1];
    const name = letzte.text.split(' · ')[0];
    const monate = new Set(liste.map((b) => monatKey(b.datum))).size;
    if (regeln[key] === true || (letzte.kategorie === 'Abos & Software' && !regeln[key])) {
      abos.push({ name, betrag: -letzte.betrag, monate, key, manuell: regeln[key] === true });
      continue;
    }
    if (sortiert.length < 3 || KEIN_ABO.includes(letzte.kategorie)) continue;
    const betraege = sortiert.map((b) => -b.betrag);
    const mittel = betraege.reduce((a, b) => a + b, 0) / betraege.length;
    const gleicherBetrag = betraege.every((x) => Math.abs(x - mittel) <= mittel * 0.02 + 5);
    const abstaende = sortiert.slice(1).map((b, i) => (lies(b.datum).getTime() - lies(sortiert[i].datum).getTime()) / 86400000);
    const monatlich = abstaende.every((t) => (t >= 25 && t <= 35) || (t >= 55 && t <= 70));
    if (gleicherBetrag && monatlich) abos.push({ name, betrag: Math.round(mittel), monate, key });
  }
  return abos.sort((a, b) => b.betrag - a.betrag);
}

export type Ruecklage = GeplanteAusgabe & { proMonat: number; monate: number };

export type Budget = { kategorie: string; budget: number; ausgegeben: number; schnitt: number };

export type Sparplan = {
  /** Anzahl der vollständigen Monate, aus denen gerechnet wurde */
  basisMonate: number;
  einkommen: number;
  /** Woher das Einkommen kommt: selbst festgelegt, aus Job und Einnahmen geplant oder aus Gutschriften geschätzt */
  einkommenQuelle: 'fest' | 'geplant' | 'geschaetzt';
  einkommenTeile: { name: string; betrag: number }[];
  fixkosten: number;
  variabel: number;
  ruecklagen: Ruecklage[];
  ruecklagenSumme: number;
  sparziel: number;
  /** Was pro Monat für Alltag (Essen, Ausgehen, Shopping ...) bleibt */
  spielraum: number;
  proWoche: number;
  /** Vorschlag, wie viel pro Kategorie im Monat drin ist, plus was im laufenden Monat schon weg ist */
  budgets: Budget[];
  hinweise: string[];
};

/** Rechnet mit den letzten bis zu drei vollen Monaten. */
export function sparplan(
  buchungen: Buchung[],
  geplant: GeplanteAusgabe[],
  e: Pick<Einstellungen, 'einkommen' | 'sparquote'> & Partial<Pick<Einstellungen, 'einnahmen' | 'aboRegeln'>>,
  jetzt = new Date(),
  jobMonat = 0,
): Sparplan {
  const aktuell = monatKey(`${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}`);
  const volle = monateMitDaten(buchungen).filter((m) => m < aktuell).slice(0, 3);
  const basis = volle.length ? volle : monateMitDaten(buchungen).slice(0, 1);
  const bilder = basis.map((m) => monatsBild(buchungen, m));
  const n = Math.max(1, bilder.length);
  const schnitt = (f: (b: MonatsBild) => number) => Math.round(bilder.reduce((a, b) => a + f(b), 0) / n);

  // Einkommen: selbst festgelegt > Job + regelmäßige Einnahmen > aus den Gutschriften geschätzt
  const einnahmen = e.einnahmen ?? [];
  const einkommenTeile = [
    ...(jobMonat > 0 ? [{ name: 'Job (hochgerechnet)', betrag: jobMonat }] : []),
    ...einnahmen.map((x) => ({ name: x.titel, betrag: x.betrag })),
  ];
  const geplantSumme = einkommenTeile.reduce((a, x) => a + x.betrag, 0);
  const geschaetzt = schnitt((b) => b.einnahmen);
  const einkommenQuelle = e.einkommen > 0 ? 'fest' : geplantSumme > 0 ? 'geplant' : 'geschaetzt';
  const einkommen = e.einkommen > 0 ? e.einkommen : geplantSumme > 0 ? geplantSumme : geschaetzt;

  const fixkosten = schnitt((b) => b.kategorien.filter((k) => FIXKOSTEN.includes(k.name)).reduce((a, k) => a + k.summe, 0));
  const sparenIst = schnitt((b) => b.kategorien.find((k) => k.name === 'Sparen')?.summe ?? 0);
  const variabel = schnitt((b) => b.ausgaben) - fixkosten - sparenIst;

  const ruecklagen: Ruecklage[] = geplant
    .filter((g) => !g.erledigt && lies(g.datum) >= new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate()))
    .map((g) => {
      const monate = Math.max(1, monateBis(lies(g.datum), jetzt));
      return { ...g, monate, proMonat: Math.ceil(g.betrag / monate) };
    })
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const ruecklagenSumme = ruecklagen.reduce((a, r) => a + r.proMonat, 0);
  const sparziel = Math.round((einkommen * e.sparquote) / 100);
  const spielraum = einkommen - fixkosten - ruecklagenSumme - sparziel;

  // Budget pro Kategorie: der Spielraum, verteilt nach deinem bisherigen Anteil an den Alltagsausgaben
  const alltag = new Map<string, number>();
  for (const b of bilder) {
    for (const k of b.kategorien) {
      if (FIXKOSTEN.includes(k.name) || k.name === 'Sparen') continue;
      alltag.set(k.name, (alltag.get(k.name) ?? 0) + k.summe / n);
    }
  }
  const alltagSumme = [...alltag.values()].reduce((a, x) => a + x, 0);
  const diesenMonat = monatsBild(buchungen, aktuell);
  const budgets: Budget[] = [...alltag.entries()]
    .map(([kategorie, s]) => ({
      kategorie,
      schnitt: Math.round(s),
      budget: alltagSumme > 0 ? Math.round((Math.max(0, spielraum) * s) / alltagSumme) : 0,
      ausgegeben: diesenMonat.kategorien.find((k) => k.name === kategorie)?.summe ?? 0,
    }))
    .sort((a, b) => b.budget - a.budget);

  const hinweise: string[] = [];
  if (!buchungen.length) {
    hinweise.push('Lade einen Kontoauszug hoch, dann rechnet MILI mit deinen echten Zahlen.');
  } else {
    if (spielraum < 0) {
      hinweise.push('Mit Fixkosten, Rücklagen und Sparziel bleibt nichts übrig. Senk die Sparquote oder verschieb eine geplante Ausgabe.');
    } else if (variabel > spielraum && spielraum > 0) {
      hinweise.push(`Du gibst im Schnitt ${euro(variabel - spielraum)} pro Monat mehr für Alltag aus, als dein Plan erlaubt.`);
    }
    const drueber = budgets.filter((b) => b.budget > 0 && b.ausgegeben > b.budget);
    for (const b of drueber.slice(0, 2)) {
      hinweise.push(`${b.kategorie}: diesen Monat schon ${euro(b.ausgegeben - b.budget)} über dem Budget.`);
    }
    const letzter = bilder[0];
    if (letzter && bilder.length > 1) {
      for (const k of letzter.kategorien.slice(0, 4)) {
        if (FIXKOSTEN.includes(k.name)) continue;
        const frueher = bilder.slice(1).map((b) => b.kategorien.find((x) => x.name === k.name)?.summe ?? 0);
        const mittel = frueher.reduce((a, b) => a + b, 0) / frueher.length;
        if (mittel > 0 && k.summe > mittel * 1.4 && k.summe - mittel > 2000) {
          hinweise.push(`${k.name}: im ${monatsWort(letzter.monat)} ${euro(k.summe - mittel)} mehr als sonst.`);
        }
      }
    }
    if (einkommenQuelle === 'geschaetzt') hinweise.push('Einkommen ist aus deinen Gutschriften geschätzt. Trag unten deinen Job oder regelmäßige Einnahmen ein.');
  }

  return {
    basisMonate: bilder.length,
    einkommen,
    einkommenQuelle,
    einkommenTeile,
    fixkosten,
    variabel,
    ruecklagen,
    ruecklagenSumme,
    sparziel,
    spielraum,
    proWoche: Math.round(Math.max(0, spielraum) / 4.33),
    budgets,
    hinweise,
  };
}

const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
function monatsWort(key: string) {
  return MONATE[+key.slice(5, 7) - 1];
}

export function euro(cent: number, mitCent = false): string {
  return (cent / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: mitCent ? 2 : 0,
    maximumFractionDigits: mitCent ? 2 : 0,
  });
}
