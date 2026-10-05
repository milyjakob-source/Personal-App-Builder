// Fasst alles, was an einem Tag ansteht, zusammen: Termine, Schichten, Aufgaben, Geburtstage, Fristen.

import type { Daten } from '../types';
import { bereichFuer, istEinkauf, type Bereich } from './bereiche';
import { lies, plusTage, startDesTages, tagKey, uhrzeit } from './datum';

export type Eintrag = {
  key: string;
  art: 'termin' | 'kalender' | 'treffen' | 'job' | 'aufgabe' | 'geburtstag' | 'frist';
  titel: string;
  zeit?: string;
  bis?: string;
  neben?: string;
  id: string;
  /** Nur bei Terminen und Schichten */
  bereich?: Bereich;
  /** Titel klingt nach Einkaufen → Einkaufsliste anbieten */
  einkauf?: boolean;
  /** Dauer in Minuten, wenn keine Uhrzeit bekannt ist (Schicht nur mit Stunden) */
  dauer?: number;
};

export function tagesEintraege(d: Daten, tag: Date): Eintrag[] {
  const key = tagKey(tag);
  const out: Eintrag[] = [];

  for (const t of d.termine) {
    const startTag = t.start.slice(0, 10);
    const endeTag = (t.ende ?? t.start).slice(0, 10);
    // Mehrtägige Termine an jedem Tag zeigen (bei ganztägigen ist das Ende exklusiv).
    const drin = t.ganztag ? key >= startTag && (key < endeTag || key === startTag) : key === startTag;
    if (!drin) continue;
    out.push({
      key: `t-${t.id}`,
      art: t.art === 'treffen' ? 'treffen' : t.quelle === 'kalender' ? 'kalender' : 'termin',
      titel: t.titel,
      zeit: t.ganztag ? undefined : uhrzeit(t.start),
      bis: t.ende && !t.ganztag ? uhrzeit(t.ende) : undefined,
      neben: [t.ort, t.quelle === 'kalender' ? t.kalender : undefined].filter(Boolean).join(' · ') || undefined,
      id: t.id,
      bereich: bereichFuer(t, d.einstellungen.bereichRegeln),
      einkauf: istEinkauf(t.titel),
    });
  }

  if (d.job.aktiv) {
    for (const s of d.job.schichten) {
      if (s.start.slice(0, 10) !== key) continue;
      const nur = s.nurStunden !== undefined;
      out.push({
        key: `s-${s.id}`,
        art: 'job',
        titel: d.job.name || 'Arbeit',
        zeit: nur ? undefined : uhrzeit(s.start),
        bis: nur ? undefined : uhrzeit(s.ende),
        neben: [nur ? `${String(s.nurStunden).replace('.', ',')} Std.` : undefined, s.notiz].filter(Boolean).join(' · ') || undefined,
        id: s.id,
        bereich: 'arbeit',
        dauer: nur ? Math.round(s.nurStunden! * 60) : undefined,
      });
    }
  }

  for (const a of d.aufgaben) {
    if (a.erledigt || a.faellig !== key) continue;
    out.push({ key: `a-${a.id}`, art: 'aufgabe', titel: a.titel, id: a.id, einkauf: istEinkauf(a.titel) });
  }

  for (const g of d.geburtstage) {
    if (g.tag !== tag.getDate() || g.monat !== tag.getMonth() + 1) continue;
    const alter = g.jahr ? tag.getFullYear() - g.jahr : undefined;
    out.push({ key: `g-${g.id}`, art: 'geburtstag', titel: `${g.name} hat Geburtstag`, neben: alter ? `wird ${alter}` : undefined, id: g.id });
  }

  for (const f of d.fristen) {
    if (f.erledigt || f.datum !== key) continue;
    out.push({ key: `f-${f.id}`, art: 'frist', titel: f.titel, id: f.id });
  }

  // Ganztägiges zuerst, dann nach Uhrzeit
  return out.sort((a, b) => (a.zeit ?? '') .localeCompare(b.zeit ?? ''));
}

/** Nächste Geburtstage innerhalb von n Tagen (ohne heute). */
export function naechsteGeburtstage(d: Daten, tage: number, heute = new Date()) {
  const start = startDesTages(heute);
  const out: { name: string; datum: Date; inTagen: number; alter?: number; id: string }[] = [];
  for (const g of d.geburtstage) {
    let datum = new Date(start.getFullYear(), g.monat - 1, g.tag);
    if (datum < start) datum = new Date(start.getFullYear() + 1, g.monat - 1, g.tag);
    const inTagen = Math.round((datum.getTime() - start.getTime()) / 86400000);
    if (inTagen > 0 && inTagen <= tage) {
      out.push({ name: g.name, datum, inTagen, alter: g.jahr ? datum.getFullYear() - g.jahr : undefined, id: g.id });
    }
  }
  return out.sort((a, b) => a.inTagen - b.inTagen);
}

export function naechsteFristen(d: Daten, heute = new Date()) {
  const k = tagKey(heute);
  return d.fristen.filter((f) => !f.erledigt && f.datum >= k).sort((a, b) => a.datum.localeCompare(b.datum));
}

export function ueberfaelligeAufgaben(d: Daten, heute = new Date()) {
  const k = tagKey(heute);
  return d.aufgaben.filter((a) => !a.erledigt && a.faellig && a.faellig < k);
}

/** Treffen und Termine mit Freunden in den nächsten Tagen. */
export function anstehendeTreffen(d: Daten, tage = 7, heute = new Date()) {
  const von = tagKey(heute);
  const bis = tagKey(plusTage(heute, tage));
  return d.termine
    .filter((t) => t.art === 'treffen' && t.start.slice(0, 10) >= von && t.start.slice(0, 10) <= bis)
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((t) => ({ ...t, datum: lies(t.start) }));
}

/** Wie viel Zeit in den nächsten 7 Tagen auf welchen Bereich fällt (Minuten und Anzahl Termine). */
export function wochenBilanz(d: Daten, ab = new Date()) {
  const summe = new Map<Bereich, { minuten: number; anzahl: number }>();
  for (let i = 0; i < 7; i++) {
    for (const e of tagesEintraege(d, plusTage(ab, i))) {
      if (!e.bereich) continue;
      const x = summe.get(e.bereich) ?? { minuten: 0, anzahl: 0 };
      x.anzahl++;
      if (e.dauer) x.minuten += e.dauer;
      else if (e.zeit) {
        const von = +e.zeit.slice(0, 2) * 60 + +e.zeit.slice(3, 5);
        const bis = e.bis ? +e.bis.slice(0, 2) * 60 + +e.bis.slice(3, 5) : von + 60;
        x.minuten += bis > von ? bis - von : bis + 24 * 60 - von;
      }
      summe.set(e.bereich, x);
    }
  }
  return summe;
}
