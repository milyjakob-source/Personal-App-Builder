// Zeitpunkte werden als lokale Zeit ohne Zeitzone gespeichert: "2026-10-05T19:00", ganztägig "2026-10-05".

export type Termin = {
  id: string;
  titel: string;
  start: string;
  ende?: string;
  ganztag: boolean;
  ort?: string;
  /** 'kalender' = aus dem iCloud-Kalender übernommen, 'mili' = in MILI angelegt */
  quelle: 'kalender' | 'mili';
  kalender?: string;
  /** In MILI angelegt und per Kurzbefehl an den iCloud-Kalender geschickt */
  gesendet?: boolean;
  art?: 'treffen' | 'job' | 'frist';
};

export type Aufgabe = {
  id: string;
  titel: string;
  faellig?: string;
  erledigt: boolean;
  erstellt: string;
  erinnert?: boolean;
};

export type Anfrage = {
  id: string;
  von?: string;
  text: string;
  /** Vorgeschlagener Zeitpunkt aus der Nachricht, falls einer erkannt wurde */
  wann?: string;
  ganztag?: boolean;
  status: 'offen' | 'zugesagt' | 'abgesagt';
  erstellt: string;
};

export type Einkauf = { id: string; titel: string; erledigt: boolean };

export type Geburtstag = { id: string; name: string; tag: number; monat: number; jahr?: number };

export type Notiz = { id: string; text: string; erstellt: string };

export type Buchung = {
  id: string;
  datum: string;
  text: string;
  /** Betrag in Cent, Ausgaben negativ */
  betrag: number;
  kategorie: string;
};

export type GeplanteAusgabe = { id: string; titel: string; betrag: number; datum: string; erledigt?: boolean };

export type Frist = { id: string; titel: string; datum: string; notiz?: string; link?: string; erledigt?: boolean };

export type Schicht = { id: string; start: string; ende: string; notiz?: string };

export type Job = {
  aktiv: boolean;
  name: string;
  /** Stundenlohn in Cent */
  stundenlohn: number;
  schichten: Schicht[];
};

export type Einstellungen = {
  /** Monatliches Netto-Einkommen in Cent, 0 = aus den Buchungen schätzen */
  einkommen: number;
  /** Wunsch-Sparquote in Prozent */
  sparquote: number;
  kurzbefehleAktiv: boolean;
  kalenderStand?: string;
  /** Gelernte Zuordnung Händler-Stichwort → Kategorie */
  kategorieRegeln: Record<string, string>;
  checkliste: Record<string, boolean>;
};

export type Daten = {
  version: 1;
  termine: Termin[];
  aufgaben: Aufgabe[];
  anfragen: Anfrage[];
  einkauf: Einkauf[];
  geburtstage: Geburtstag[];
  notizen: Notiz[];
  buchungen: Buchung[];
  geplant: GeplanteAusgabe[];
  fristen: Frist[];
  job: Job;
  einstellungen: Einstellungen;
};
