// SRH University Berlin, B.Mus. Popularmusik (Berlin School of Popular Arts). Stand der Recherche: Oktober 2026.
// Studienstart im April und Oktober, 7 Semester, auf Deutsch. Bewerbung online, dann Vorauswahl
// über eingereichte Aufnahmen, danach praktische Zugangsprüfung in Berlin.

import type { Frist } from '../types';

export const SRH_LINK = 'https://www.srh-university.de/en/bachelor/popular-music/m/';
export const SRH_PORTAL = 'https://apply.srh.de/de_DE_INFORMAL/courses/course/67-bmus-bachelor-music-popularmusik';

export const SRH_FRISTEN: Frist[] = [
  {
    id: 'srh-videos',
    titel: 'Bewerbungsvideos fertig',
    datum: '2026-12-01',
    notiz: 'Eigenes Ziel, frei änderbar. Drei Videos mit Hauptinstrument oder Gesang, je 1 bis 4 Minuten (MP4, WebM oder AVI). Eigene Songs oder eigene Arrangements.',
  },
  {
    id: 'srh-sose27-frist',
    titel: 'SRH: Bewerbungsschluss Sommersemester 2027',
    datum: '2027-03-31',
    notiz: 'Vermutet: Für das Wintersemester 2026/27 war Schluss am Tag vor Studienstart (30.09.). Im Bewerbungsportal prüfen. Besser deutlich früher bewerben, weil danach noch Vorauswahl und Zugangsprüfung kommen.',
    link: SRH_PORTAL,
  },
  { id: 'srh-sose27-start', titel: 'Studienstart Sommersemester 2027', datum: '2027-04-01', link: SRH_LINK },
  {
    id: 'srh-wise27-frist',
    titel: 'SRH: Bewerbungsschluss Wintersemester 2027/28',
    datum: '2027-09-30',
    notiz: 'Vermutet nach dem Muster des Vorjahres. Im Bewerbungsportal prüfen.',
    link: SRH_PORTAL,
  },
  { id: 'srh-wise27-start', titel: 'Studienstart Wintersemester 2027/28', datum: '2027-10-01', link: SRH_LINK },
];

export const CHECKLISTE: { id: string; gruppe: string; text: string }[] = [
  { id: 'zeugnis', gruppe: 'Unterlagen', text: 'Zeugnis (Abitur oder Fachhochschulreife), beglaubigte Kopie' },
  { id: 'lebenslauf', gruppe: 'Unterlagen', text: 'Lebenslauf mit musikalischem Werdegang' },
  { id: 'ausweis', gruppe: 'Unterlagen', text: 'Kopie von Personalausweis oder Pass' },
  { id: 'video1', gruppe: 'Aufnahmen', text: 'Video 1: eigener Song' },
  { id: 'video2', gruppe: 'Aufnahmen', text: 'Video 2: Cover oder Arrangement' },
  { id: 'video3', gruppe: 'Aufnahmen', text: 'Video 3: zeigt eine andere Seite (Stil, Tempo, Improvisation)' },
  { id: 'portal', gruppe: 'Bewerbung', text: 'Online-Bewerbung im SRH-Portal abgeschickt' },
  { id: 'theorie', gruppe: 'Zugangsprüfung', text: 'Harmonielehre: Akkordsymbole, Stufen, Kadenzen, Voicings' },
  { id: 'gehoer', gruppe: 'Zugangsprüfung', text: 'Gehörbildung: Intervalle, Akkordqualitäten, Rhythmen' },
  { id: 'leadsheet', gruppe: 'Zugangsprüfung', text: 'Nach Leadsheet spielen und begleiten' },
  { id: 'programm', gruppe: 'Zugangsprüfung', text: 'Vorspiel-Programm stehen haben (2 bis 3 Stücke)' },
  { id: 'motivation', gruppe: 'Zugangsprüfung', text: 'Klar sagen können: warum Popularmusik, warum SRH Berlin' },
];
