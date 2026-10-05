// Kleine Datumshelfer. Alles in lokaler Zeit, gespeichert als "YYYY-MM-DD" oder "YYYY-MM-DDTHH:mm".

export const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
export const WOCHENTAGE_KURZ = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
export const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

const zwei = (n: number) => String(n).padStart(2, '0');

export function tagKey(d: Date): string {
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

export function zeitKey(d: Date): string {
  return `${tagKey(d)}T${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
}

/** Liest "YYYY-MM-DD" oder "YYYY-MM-DDTHH:mm" als lokale Zeit. */
export function lies(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(s);
  if (!m) return new Date(s);
  return new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
}

export function hatZeit(s: string): boolean {
  return s.length > 10;
}

export function startDesTages(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function plusTage(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function plusMinuten(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 60000);
}

export function gleicherTag(a: Date, b: Date): boolean {
  return tagKey(a) === tagKey(b);
}

/** Ganze Tage von heute bis zum Datum (0 = heute, 1 = morgen, negativ = vorbei). */
export function tageBis(d: Date, heute = new Date()): number {
  return Math.round((startDesTages(d).getTime() - startDesTages(heute).getTime()) / 86400000);
}

export function uhrzeit(s: string): string {
  return hatZeit(s) ? s.slice(11, 16) : '';
}

/** "Heute", "Morgen", "Freitag", "Fr, 14. Nov." */
export function tagName(d: Date, heute = new Date()): string {
  const t = tageBis(d, heute);
  if (t === 0) return 'Heute';
  if (t === 1) return 'Morgen';
  if (t === -1) return 'Gestern';
  if (t > 1 && t < 7) return WOCHENTAGE[d.getDay()];
  return `${WOCHENTAGE_KURZ[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()].slice(0, 3)}.`;
}

/** "Morgen, 19:00" */
export function wannText(s: string, heute = new Date()): string {
  const d = lies(s);
  return hatZeit(s) ? `${tagName(d, heute)}, ${uhrzeit(s)}` : tagName(d, heute);
}

export function langesDatum(d: Date): string {
  return `${WOCHENTAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]}`;
}

export function kurzesDatum(s: string): string {
  const d = lies(s);
  return `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}.${String(d.getFullYear()).slice(2)}`;
}

/** Montag der Woche, in der d liegt. */
export function wochenStart(d: Date): Date {
  const s = startDesTages(d);
  const tag = (s.getDay() + 6) % 7;
  return plusTage(s, -tag);
}

export function monatKey(s: string): string {
  return s.slice(0, 7);
}

export function monatName(key: string): string {
  const [j, m] = key.split('-').map(Number);
  return `${MONATE[m - 1]} ${j}`;
}

export function monateBis(d: Date, heute = new Date()): number {
  return (d.getFullYear() - heute.getFullYear()) * 12 + (d.getMonth() - heute.getMonth());
}
