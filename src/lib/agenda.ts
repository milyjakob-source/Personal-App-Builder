// Fasst alles, was an einem Tag ansteht, zusammen: Termine, Schichten, Aufgaben, Geburtstage, Fristen.

import type { Daten } from '../types';
import { lies, plusTage, startDesTages, tagKey, uhrzeit } from './datum';

export type Eintrag = {
  key: string;
  art: 'termin' | 'kalender' | 'treffen' | 'job' | 'aufgabe' | 'geburtstag' | 'frist';
  titel: string;
  zeit?: string;
  bis?: string;
  neben?: string;
  id: string;
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
    });
  }

  if (d.job.aktiv) {
    for (const s of d.job.schichten) {
      if (s.start.slice(0, 10) !== key) continue;
      out.push({ key: `s-${s.id}`, art: 'job', titel: d.job.name || 'Arbeit', zeit: uhrzeit(s.start), bis: uhrzeit(s.ende), neben: s.notiz, id: s.id });
    }
  }

  for (const a of d.aufgaben) {
    if (a.erledigt || a.faellig !== key) continue;
    out.push({ key: `a-${a.id}`, art: 'aufgabe', titel: a.titel, id: a.id });
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
