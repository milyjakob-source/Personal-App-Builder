// Sammelt einmal am Tag Musik-News aus öffentlichen Feeds und schreibt public/news.json.
// Läuft in der GitHub Action vor dem Build. Es werden keine Daten von dir verschickt.
// Quellen anpassen: einfach die Listen unten ändern.

import { writeFileSync } from 'node:fs';

const gn = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=de&gl=DE&ceid=DE:de`;
const gnEn = (q) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const QUELLEN = [
  // Produktion & Technik
  { rubrik: 'Produktion', name: 'gearnews', url: 'https://www.gearnews.de/feed/' },
  { rubrik: 'Produktion', name: 'Bonedo', url: 'https://www.bonedo.de/feed/' },
  { rubrik: 'Produktion', name: 'AMAZONA.de', url: 'https://www.amazona.de/feed/' },
  { rubrik: 'Produktion', name: 'MusicRadar', url: 'https://www.musicradar.com/feeds/all' },
  // Musikbusiness
  { rubrik: 'Business', name: 'Music Business Worldwide', url: 'https://www.musicbusinessworldwide.com/feed/' },
  { rubrik: 'Business', url: gn('Musikbranche OR Musikindustrie OR Streaming Musiker') },
  // Künstler und Genres
  { rubrik: 'Künstler', name: 'JazzTimes', url: 'https://jazztimes.com/feed/' },
  { rubrik: 'Künstler', url: gnEn('"John Mayer" OR "Herbie Hancock" OR "Keith Jarrett"') },
  { rubrik: 'Künstler', url: gnEn('"Fleetwood Mac" OR "Stevie Wonder"') },
  { rubrik: 'Künstler', url: gn('Jazz Neuerscheinung OR Jazzalbum') },
  // Szene vor Ort
  { rubrik: 'Stuttgart', url: gn('Stuttgart Musik (Konzert OR Jazz OR Popbüro OR Band OR Club)') },
  { rubrik: 'Stuttgart', url: gn('"Jazzopen" OR "Bix Jazzclub" OR "Popbüro Region Stuttgart"') },
  { rubrik: 'Berlin', url: gn('Berlin Musikszene OR "Musicboard Berlin" OR Berlin Jazz Konzert') },
  // Studium
  { rubrik: 'Studium', url: gn('"SRH" Berlin "Popular Arts" OR Popularmusik Studium') },
  { rubrik: 'Studium', url: gn('Popularmusik Studium OR Popakademie OR Musikhochschule Aufnahmeprüfung') },
];

const PRO_QUELLE = 6;
const PRO_RUBRIK = 14;
const MAX_ALTER_TAGE = 14;

function entities(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(xml, name) {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  return m ? entities(m[1]) : '';
}

function lesen(xml, quelle) {
  const items = xml.match(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi) ?? [];
  const kanal = quelle.name ?? tag(xml.split(/<item|<entry/i)[0], 'title');
  return items.map((it) => {
    let titel = tag(it, 'title');
    let link = tag(it, 'link');
    if (!link) link = /<link[^>]*href="([^"]+)"/i.exec(it)?.[1] ?? '';
    const datum = tag(it, 'pubDate') || tag(it, 'published') || tag(it, 'updated') || tag(it, 'dc:date');
    let name = kanal;
    const source = tag(it, 'source');
    if (source) {
      name = source;
      titel = titel.replace(new RegExp(`\\s+-\\s+${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), '');
    }
    return { titel, link, quelle: name, datum: new Date(datum || Date.now()).toISOString(), rubrik: quelle.rubrik };
  });
}

async function hole(q) {
  try {
    const r = await fetch(q.url, { headers: { 'user-agent': 'Mozilla/5.0 (MILI news; personal use)' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const artikel = lesen(await r.text(), q);
    console.log(`ok   ${q.rubrik.padEnd(10)} ${artikel.length.toString().padStart(3)}  ${q.name ?? q.url.slice(0, 80)}`);
    return artikel;
  } catch (e) {
    console.log(`fehl ${q.rubrik.padEnd(10)}      ${q.name ?? q.url.slice(0, 80)}: ${e.message}`);
    return [];
  }
}

const grenze = Date.now() - MAX_ALTER_TAGE * 86400000;
const listen = await Promise.all(QUELLEN.map(hole));
const gesehen = new Set();
const proRubrik = {};
const artikel = listen
  .flatMap((l) => l.filter((a) => a.titel && a.link && new Date(a.datum).getTime() > grenze).sort((a, b) => b.datum.localeCompare(a.datum)).slice(0, PRO_QUELLE))
  .sort((a, b) => b.datum.localeCompare(a.datum))
  .filter((a) => {
    const key = a.titel.toLowerCase().replace(/[^\p{L}\d]/gu, '').slice(0, 60);
    if (gesehen.has(key)) return false;
    gesehen.add(key);
    proRubrik[a.rubrik] = (proRubrik[a.rubrik] ?? 0) + 1;
    return proRubrik[a.rubrik] <= PRO_RUBRIK;
  });

writeFileSync(new URL('../public/news.json', import.meta.url), JSON.stringify({ stand: new Date().toISOString(), artikel }, null, 1));
console.log(`${artikel.length} Artikel geschrieben`);
