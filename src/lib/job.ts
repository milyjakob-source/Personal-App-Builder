// Job: Stunden, Verdienst und Hochrechnung für den Monat.

import type { Job, Schicht } from '../types';
import { lies, tagKey } from './datum';

/** Minijob-Grenze 2026 (Mindestlohn 13,90 € × 130 ÷ 3, aufgerundet). */
export const MINIJOB_GRENZE = 60300;

export function stundenVon(s: Schicht): number {
  if (s.nurStunden !== undefined) return s.nurStunden;
  return Math.max(0, (lies(s.ende).getTime() - lies(s.start).getTime()) / 3600000);
}

export type JobBild = {
  /** Stunden im Monat bis heute */
  stundenBisher: number;
  /** Alle eingetragenen Stunden im Monat, auch künftige Schichten */
  stundenMonat: number;
  verdienstBisher: number;
  verdienstMonat: number;
  /** Erwarteter Verdienst im Monat: geplante Wochenstunden oder eingetragene Schichten, je nachdem was größer ist */
  hochrechnung: number;
  ueberMinijob: boolean;
};

export function jobBild(job: Job, jetzt = new Date()): JobBild {
  const monat = tagKey(jetzt).slice(0, 7);
  const heute = tagKey(jetzt);
  const imMonat = job.schichten.filter((s) => s.start.startsWith(monat));
  const stundenMonat = imMonat.reduce((a, s) => a + stundenVon(s), 0);
  const stundenBisher = imMonat.filter((s) => s.start.slice(0, 10) <= heute).reduce((a, s) => a + stundenVon(s), 0);
  const lohn = job.stundenlohn;
  const geplant = (job.stundenProWoche ?? 0) * (52 / 12);
  const hochrechnung = Math.round(Math.max(geplant, stundenMonat) * lohn);
  return {
    stundenBisher,
    stundenMonat,
    verdienstBisher: Math.round(stundenBisher * lohn),
    verdienstMonat: Math.round(stundenMonat * lohn),
    hochrechnung,
    ueberMinijob: hochrechnung > MINIJOB_GRENZE,
  };
}

export function stundenText(h: number): string {
  return `${(Math.round(h * 10) / 10).toLocaleString('de-DE')} Std.`;
}
