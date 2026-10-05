// Musik-News: werden einmal täglich von einer GitHub Action gesammelt (öffentliche Feeds, keine Daten von dir)
// und liegen als news.json neben der App.

import { useEffect, useState } from 'react';

export type Artikel = { titel: string; link: string; quelle: string; datum: string; rubrik: string };
export type News = { stand: string; artikel: Artikel[] };

let cache: Promise<News> | undefined;

export function ladeNews(): Promise<News> {
  cache ??= fetch('./news.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<News>) : { stand: '', artikel: [] }))
    .catch(() => ({ stand: '', artikel: [] }));
  return cache;
}

export function useNews(): News | undefined {
  const [news, setNews] = useState<News>();
  useEffect(() => {
    let aktiv = true;
    ladeNews().then((n) => aktiv && setNews(n));
    return () => {
      aktiv = false;
    };
  }, []);
  return news;
}

export const RUBRIKEN = ['Produktion', 'Business', 'Künstler', 'Stuttgart', 'Berlin', 'Studium'];

export function wieAlt(iso: string, jetzt = new Date()): string {
  const h = Math.round((jetzt.getTime() - new Date(iso).getTime()) / 3600000);
  if (Number.isNaN(h)) return '';
  if (h < 1) return 'gerade';
  if (h < 24) return `vor ${h} Std.`;
  const t = Math.round(h / 24);
  return t === 1 ? 'gestern' : `vor ${t} Tagen`;
}
