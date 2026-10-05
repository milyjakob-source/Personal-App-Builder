// Alles, was Daten verändert und mehr als eine Zeile ist.

import { buchungsKey, mitKategorie, type RohBuchung } from './lib/bank';
import { lies, tagKey, wannText, zeitKey } from './lib/datum';
import type { Vorschlag } from './lib/erkennen';
import { haendlerKey } from './lib/kategorien';
import { erinnerungEingabe, KB_ERINNERUNG, KB_TERMIN, starteKurzbefehl, terminEingabe } from './lib/kurzbefehle';
import { aendere, aktuell, neueId } from './store';
import type { Anfrage, Buchung, Termin } from './types';

const jetztKey = () => zeitKey(new Date());

/** Legt einen Vorschlag an und gibt eine kurze Bestätigung zurück. */
export function uebernehme(v: Vorschlag, senden?: boolean): string {
  switch (v.art) {
    case 'termin':
      if (!v.wann) return uebernehme({ ...v, art: 'aufgabe' });
      terminAnlegen({ titel: v.titel, start: v.wann, ende: v.ende, ganztag: v.wann.length <= 10, ort: v.ort }, senden);
      return `Termin: ${wannText(v.wann)}`;
    case 'anfrage':
      aendere((d) => {
        d.anfragen.unshift({ id: neueId(), von: v.von, text: v.original, wann: v.wann, status: 'offen', erstellt: jetztKey() });
      });
      return 'Anfrage im Eingang';
    case 'aufgabe':
      aendere((d) => {
        d.aufgaben.unshift({ id: neueId(), titel: v.titel, faellig: v.wann?.slice(0, 10), erledigt: false, erstellt: jetztKey() });
      });
      return v.wann ? `Aufgabe bis ${wannText(v.wann.slice(0, 10))}` : 'Aufgabe angelegt';
    case 'einkauf': {
      const posten = v.posten?.length ? v.posten : [v.titel];
      aendere((d) => {
        for (const p of posten) {
          if (!d.einkauf.some((e) => !e.erledigt && e.titel.toLowerCase() === p.toLowerCase())) {
            d.einkauf.push({ id: neueId(), titel: p, erledigt: false });
          }
        }
      });
      return posten.length === 1 ? `${posten[0]} auf der Einkaufsliste` : `${posten.length} Sachen auf der Einkaufsliste`;
    }
    case 'geburtstag': {
      const g = v.geburtstag;
      if (!g) return uebernehme({ ...v, art: 'notiz' });
      aendere((d) => {
        d.geburtstage.push({ id: neueId(), ...g, name: v.titel || g.name });
      });
      return `Geburtstag von ${v.titel || g.name} gespeichert`;
    }
    case 'ausgabe':
      aendere((d) => {
        d.geplant.push({
          id: neueId(),
          titel: v.titel,
          betrag: v.betrag ?? 0,
          datum: v.wann?.slice(0, 10) ?? tagKey(new Date(Date.now() + 30 * 86400000)),
        });
      });
      return 'Geplante Ausgabe im Sparplan';
    case 'notiz':
      aendere((d) => {
        d.notizen.unshift({ id: neueId(), text: v.titel || v.original, erstellt: jetztKey() });
      });
      return 'Notiz gespeichert';
  }
}

/** Termin in MILI anlegen und, falls eingerichtet, per Kurzbefehl in den iCloud-Kalender schreiben. */
export function terminAnlegen(t: Omit<Termin, 'id' | 'quelle'>, senden?: boolean) {
  senden ??= aktuell().einstellungen.kurzbefehleAktiv;
  const termin: Termin = { ...t, id: neueId(), quelle: 'mili', gesendet: senden };
  aendere((d) => {
    d.termine.push(termin);
  });
  if (senden) starteKurzbefehl(KB_TERMIN, terminEingabe(termin));
  return termin;
}

export function anKalender(t: Pick<Termin, 'titel' | 'start' | 'ende' | 'ganztag' | 'ort'> & { id?: string }) {
  starteKurzbefehl(KB_TERMIN, terminEingabe(t));
  if (t.id) {
    aendere((d) => {
      const x = d.termine.find((y) => y.id === t.id);
      if (x) x.gesendet = true;
    });
  }
}

export function erinnern(titel: string, wann: string) {
  starteKurzbefehl(KB_ERINNERUNG, erinnerungEingabe(titel, wann));
}

/** Zusage: Termin anlegen, Anfrage abhaken, Antworttext zurückgeben. */
export function zusagen(a: Anfrage, wann: string): string {
  const mitZeit = wann.length > 10;
  terminAnlegen({
    titel: a.von ? `Treffen mit ${a.von}` : 'Treffen',
    start: wann,
    ganztag: !mitZeit,
    art: 'treffen',
  });
  aendere((d) => {
    const x = d.anfragen.find((y) => y.id === a.id);
    if (x) {
      x.status = 'zugesagt';
      x.wann = wann;
    }
  });
  return `Klar, ${antwortZeit(wann)} passt mir!`;
}

export function gegenvorschlag(alternativen: string[]): string {
  const liste = alternativen.slice(0, 3).map(antwortZeit);
  if (!liste.length) return 'Da kann ich leider nicht. Ich melde mich, wenn ich wieder Zeit habe!';
  const text = liste.length === 1 ? liste[0] : `${liste.slice(0, -1).join(', ')} oder ${liste[liste.length - 1]}`;
  return `Da kann ich leider nicht. Wie wär's mit ${text}?`;
}

function antwortZeit(wann: string): string {
  const d = lies(wann);
  const tage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const heute = new Date();
  const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - new Date(heute.getFullYear(), heute.getMonth(), heute.getDate()).getTime()) / 86400000);
  const tag = diff === 0 ? 'heute' : diff === 1 ? 'morgen' : diff < 7 ? tage[d.getDay()] : `am ${d.getDate()}.${d.getMonth() + 1}.`;
  return wann.length > 10 ? `${tag} um ${wann.slice(11, 16)}` : tag;
}

export function anfrageStatus(id: string, status: Anfrage['status']) {
  aendere((d) => {
    const x = d.anfragen.find((y) => y.id === id);
    if (x) x.status = status;
  });
}

/** Ersetzt alle Kalender-Termine durch den neuen Export. Bereits gesendete MILI-Termine, die jetzt im Kalender stehen, fallen weg. */
export function kalenderImport(termine: Termin[]): number {
  aendere((d) => {
    const neu = new Set(termine.map((t) => `${t.titel.toLowerCase()}|${t.start.slice(0, 16)}`));
    d.termine = [
      ...d.termine.filter((t) => t.quelle === 'mili' && !(t.gesendet && neu.has(`${t.titel.toLowerCase()}|${t.start.slice(0, 16)}`))),
      ...termine,
    ];
    d.einstellungen.kalenderStand = jetztKey();
  });
  return termine.length;
}

export function buchungenImport(roh: (RohBuchung & { kategorie?: string })[]): { neu: number; doppelt: number } {
  let neu = 0;
  let doppelt = 0;
  aendere((d) => {
    const vorhanden = new Set(d.buchungen.map(buchungsKey));
    for (const r of roh) {
      const key = buchungsKey(r);
      if (vorhanden.has(key)) {
        doppelt++;
        continue;
      }
      vorhanden.add(key);
      const { datum, text, betrag } = r;
      const kategorie = r.kategorie ?? mitKategorie(r, d.einstellungen.kategorieRegeln).kategorie;
      d.buchungen.push({ id: neueId(), datum, text, betrag, kategorie });
      neu++;
    }
    d.buchungen.sort((a, b) => b.datum.localeCompare(a.datum));
  });
  return { neu, doppelt };
}

/** Kategorie ändern und für diesen Händler merken (gilt auch für alte und künftige Buchungen). */
export function kategorieLernen(b: Buchung, kategorie: string) {
  const key = haendlerKey(b.text);
  aendere((d) => {
    if (key) d.einstellungen.kategorieRegeln[key] = kategorie;
    for (const x of d.buchungen) {
      if (x.id === b.id || (key && haendlerKey(x.text) === key)) x.kategorie = kategorie;
    }
  });
}

export function backupDatei(): File {
  const json = JSON.stringify(aktuell(), null, 2);
  return new File([json], `mili-backup-${tagKey(new Date())}.json`, { type: 'application/json' });
}
