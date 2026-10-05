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

export type Abo = { name: string; betrag: number; monate: number };

/** Gleicher Händler in mindestens zwei Monaten mit ähnlichem Betrag. */
export function findeAbos(buchungen: Buchung[]): Abo[] {
  const gruppen = new Map<string, Buchung[]>();
  for (const b of buchungen) {
    if (b.betrag >= 0) continue;
    const key = haendlerKey(b.text);
    if (!key) continue;
    gruppen.set(key, [...(gruppen.get(key) ?? []), b]);
  }
  const abos: Abo[] = [];
  for (const liste of gruppen.values()) {
    const monate = new Set(liste.map((b) => monatKey(b.datum)));
    if (monate.size < 2) continue;
    const betraege = liste.map((b) => -b.betrag);
    const mittel = betraege.reduce((a, b) => a + b, 0) / betraege.length;
    if (betraege.every((x) => Math.abs(x - mittel) <= mittel * 0.1 + 50) && liste.length <= monate.size + 1) {
      abos.push({ name: liste[0].text.split(' · ')[0], betrag: Math.round(mittel), monate: monate.size });
    }
  }
  return abos.sort((a, b) => b.betrag - a.betrag);
}

export type Ruecklage = GeplanteAusgabe & { proMonat: number; monate: number };

export type Sparplan = {
  /** Anzahl der vollständigen Monate, aus denen gerechnet wurde */
  basisMonate: number;
  einkommen: number;
  einkommenGeschaetzt: boolean;
  fixkosten: number;
  variabel: number;
  ruecklagen: Ruecklage[];
  ruecklagenSumme: number;
  sparziel: number;
  /** Was pro Monat für Alltag (Essen, Ausgehen, Shopping ...) bleibt */
  spielraum: number;
  proWoche: number;
  hinweise: string[];
};

/** Rechnet mit den letzten bis zu drei vollen Monaten. */
export function sparplan(
  buchungen: Buchung[],
  geplant: GeplanteAusgabe[],
  e: Pick<Einstellungen, 'einkommen' | 'sparquote'>,
  jetzt = new Date(),
): Sparplan {
  const aktuell = monatKey(`${jetzt.getFullYear()}-${String(jetzt.getMonth() + 1).padStart(2, '0')}`);
  const volle = monateMitDaten(buchungen).filter((m) => m < aktuell).slice(0, 3);
  const basis = volle.length ? volle : monateMitDaten(buchungen).slice(0, 1);
  const bilder = basis.map((m) => monatsBild(buchungen, m));
  const n = Math.max(1, bilder.length);
  const schnitt = (f: (b: MonatsBild) => number) => Math.round(bilder.reduce((a, b) => a + f(b), 0) / n);

  const geschaetzt = schnitt((b) => b.einnahmen);
  const einkommen = e.einkommen > 0 ? e.einkommen : geschaetzt;
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

  const hinweise: string[] = [];
  if (!buchungen.length) {
    hinweise.push('Lade einen Kontoauszug hoch, dann rechnet MILI mit deinen echten Zahlen.');
  } else {
    if (spielraum < 0) {
      hinweise.push('Mit Fixkosten, Rücklagen und Sparziel bleibt nichts übrig. Senk die Sparquote oder verschieb eine geplante Ausgabe.');
    } else if (variabel > spielraum && spielraum > 0) {
      hinweise.push(`Du gibst im Schnitt ${euro(variabel - spielraum)} pro Monat mehr für Alltag aus, als dein Plan erlaubt.`);
    }
    const abos = findeAbos(buchungen);
    if (abos.length) {
      const summe = abos.reduce((a, x) => a + x.betrag, 0);
      hinweise.push(`${abos.length} wiederkehrende Abbuchungen erkannt, zusammen ${euro(summe)} im Monat. Lohnt sich jede davon noch?`);
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
    if (e.einkommen <= 0) hinweise.push('Einkommen ist aus deinen Gutschriften geschätzt. Du kannst es unten genau eintragen.');
  }

  return {
    basisMonate: bilder.length,
    einkommen,
    einkommenGeschaetzt: e.einkommen <= 0,
    fixkosten,
    variabel,
    ruecklagen,
    ruecklagenSumme,
    sparziel,
    spielraum,
    proWoche: Math.round(Math.max(0, spielraum) / 4.33),
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
