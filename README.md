# MILI

Deine persönliche Organisations-App fürs iPhone (und den Mac): Termine, Anfragen von Freunden, Aufgaben, Einkauf, Geburtstage, Geld, Studium und Musik-News an einem Ort.

**Datenschutz:** Alles, was du eingibst, bleibt auf deinem Gerät (IndexedDB im Browser). Es gibt keinen Server und kein Konto. Der Code ist öffentlich, deine Daten nicht. Nur die Musik-News werden einmal am Tag von GitHub aus öffentlichen Feeds gesammelt.

## Was MILI kann

| Bereich | Was passiert |
|---|---|
| **Heute** | Begrüßung, Gedanken-Feld, Termine und fällige Aufgaben von heute, offene Anfragen, Treffen, Wochenvorschau, Geburtstage, nächste Frist, Einkaufsliste, Geld und Musik-News |
| **Gedanken abladen** | Tippen, diktieren oder Nachrichten einfügen. MILI erkennt Termine („Zahnarzt Donnerstag 14 Uhr“), Aufgaben („Mama morgen anrufen“), Einkäufe („Milch und Eier kaufen“), Geburtstage („Lena hat am 4. Mai Geburtstag“), geplante Ausgaben („Semesterbeitrag 320 € bis 15.11.“) und Anfragen. Du siehst jeden Vorschlag vorher und kannst ihn ändern. |
| **WhatsApp / iMessage** | Nachricht kopieren und einfügen. Auch kopierte WhatsApp-Verläufe mit Zeitstempel werden gelesen („morgen“ zählt dann ab dem Tag der Nachricht). |
| **Anfragen** | MILI prüft, ob du Zeit hast, schlägt freie Abende vor, legt bei „Zusagen“ den Termin an und kopiert eine Antwort zum Zurückschicken. |
| **Woche** | Alle Termine, Schichten, Aufgaben, Geburtstage und Fristen pro Tag, filterbar nach Bereich (Arbeit, Freizeit mit Musik, Freunde, Familie, Sport, und Alltag). |
| **Bereiche** | Jeder Termin bekommt automatisch einen Bereich, änderbar per Tipp; MILI merkt sich das pro Titel. Auf der Startseite zeigt „Deine Woche“, wie viel Zeit auf Arbeit und Freizeit fällt. |
| **Geld** | Volksbank-Kontoauszug als PDF oder Screenshot aus der Banking-App hochladen. Ausgaben nach Kategorien, wiederkehrende Abbuchungen, Sparplan mit Rücklagen für geplante Ausgaben. Kategorien lernst du MILI durch Umsortieren bei. |
| **Musik und Studium** | SRH Berlin, B.Mus. Popularmusik: Fristen mit Countdown, Checkliste für Bewerbung und Zugangsprüfung, Links. Täglich News zu Produktion, Musikbusiness, deinen Künstlern, Stuttgart und Berlin. |
| **Job** | Leer, bis du ihn einrichtest. Dann Schichten (auch als Dienstplan-Text einfügbar), Stunden und Verdienst. |
| **Einkauf, Geburtstage** | Einkaufsliste zum Sammeln über die Woche. Steht „Einkaufen“ in einem Termin oder einer Aufgabe, öffnet das Wagen-Symbol dort direkt die Liste. Geburtstage mit Erinnerung am Vortag. |
| **Hell/Dunkel** | Folgt automatisch deinem iPhone. Akzentfarbe in den Einstellungen. |

## Einrichtung (einmalig)

### 1. GitHub Pages einschalten

1. Im Repo auf **Settings → Pages** gehen.
2. Bei **Source** „**GitHub Actions**“ auswählen.
3. Unter **Actions** den Lauf „Veröffentlichen“ öffnen und **Re-run all jobs** (oder „Run workflow“) drücken.

Danach läuft MILI unter `https://milyjakob-source.github.io/Personal-App-Builder/`.
Jeden Morgen gegen 7 Uhr baut GitHub die Seite mit frischen News neu.

> GitHub pausiert geplante Läufe, wenn 60 Tage lang nichts im Repo passiert. Dann unter Actions einmal „Enable workflow“ drücken.

### 2. Auf den Home-Bildschirm

Seite in **Safari** öffnen → **Teilen** → **Zum Home-Bildschirm**. Ab dann MILI immer über das Symbol öffnen.

### 3. Kurzbefehle für Kalender und Erinnerungen

Eine Website darf nicht direkt auf Kalender und Erinnerungen zugreifen, die Kurzbefehle-App schon. Die Schritt-für-Schritt-Anleitung steht in der App unter **Mehr → Kurzbefehle**:

- **MILI Kalender** kopiert deine Termine der nächsten 14 Tage, MILI übernimmt sie mit einem Tipp (Aktualisieren-Symbol bei der Woche). Der iPhone-Kalender wird nur gelesen, nie verändert.
- **MILI Erinnerung** (optional) legt Erinnerungen an. So bekommst du echte Mitteilungen aufs iPhone, auch wenn MILI zu ist.

### 4. Backup

Unter **Mehr → Einstellungen → Backup sichern** ab und zu eine Datei in iCloud Drive legen. Damit kannst du die Daten auch auf dem MacBook laden.

## Grenzen (ehrlich)

- **WhatsApp und iMessage** lassen sich nicht automatisch auslesen. Kopieren und Einfügen geht.
- **Mail** ist noch nicht verbunden. iCloud-Mail bräuchte einen Server mit deinem App-Passwort. Bis dahin Mail-Text einfach einfügen.
- Die Erkennung arbeitet mit festen Mustern, nicht mit KI. Sie versteht typische Sätze gut, freie Formulierungen nicht immer. Darum zeigt MILI jeden Vorschlag vorher.
- Screenshots werden auf dem Gerät per Texterkennung gelesen. Beim ersten Mal lädt das Sprachdaten (einige MB) aus dem Netz, dein Bild bleibt auf dem Gerät. PDFs sind genauer.
- Die SRH-Fristen für 2027 sind teils vermutet und in der App so markiert. Bitte im Bewerbungsportal prüfen.

## Entwicklung

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # Erkennung, Kontoauszug, Sparplan, Kurzbefehle
npm run news    # News lokal sammeln
npm run build
```

Aufbau:

- `src/lib/zeit.ts`, `src/lib/erkennen.ts`: deutsche Datums- und Texterkennung
- `src/lib/bank.ts`, `src/lib/kategorien.ts`, `src/lib/sparplan.ts`: Kontoauszüge und Finanzen
- `src/lib/kurzbefehle.ts`: Brücke zur Kurzbefehle-App
- `src/data/studium.ts`: SRH-Fristen und Checkliste
- `scripts/news.mjs`: Quellen und Stichworte für die Musik-News
- `src/screens/*`: die Bildschirme
