import { tagKey, zeitKey } from '../lib/datum';
import { erinnerungEingabe, KB_ERINNERUNG, KB_TERMIN, starteKurzbefehl, terminEingabe } from '../lib/kurzbefehle';
import { aendere, useDaten } from '../store';
import { holeKalender } from '../ui/Agenda';
import { Gruppe, Kopf } from '../ui/ui';

export function Kurzbefehle() {
  const d = useDaten();
  const aktiv = d.einstellungen.kurzbefehleAktiv;

  return (
    <div className="seite anleitung">
      <Kopf titel="Kurzbefehle" zurueck="mehr" unter="Verbindung zu Kalender und Erinnerungen" />

      <Gruppe fuss="Eine Website darf nicht direkt in deinen Kalender schauen. Die Kurzbefehle-App schon. Du legst einmalig drei Kurzbefehle an, danach reicht ein Tipp in MILI.">
        <div className="karte">
          <label className="zeile">
            <div className="haupt">
              <div className="titel">Kurzbefehle sind eingerichtet</div>
              <div className="neben">Neue Termine gehen dann automatisch in deinen iCloud-Kalender</div>
            </div>
            <input type="checkbox" checked={aktiv} onChange={(e) => aendere((x) => { x.einstellungen.kurzbefehleAktiv = e.target.checked; })} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
          </label>
        </div>
      </Gruppe>

      <Gruppe titel="0. MILI auf den Home-Bildschirm">
        <div className="karte innen">
          <ol>
            <li>MILI in <b>Safari</b> öffnen.</li>
            <li>Unten auf <b>Teilen</b> tippen, dann <b>Zum Home-Bildschirm</b>.</li>
            <li>Ab jetzt MILI immer über das Symbol öffnen. Deine Daten liegen in dieser App, nicht in Safari.</li>
          </ol>
        </div>
      </Gruppe>

      <Gruppe titel="1. MILI Kalender" fuss="Holt deine Termine der nächsten zwei Wochen.">
        <div className="karte innen">
          <ol>
            <li>Kurzbefehle-App öffnen, oben rechts <b>+</b>. Oben als Namen <code>MILI Kalender</code> eingeben.</li>
            <li>Aktion <b>Kalenderereignisse suchen</b> hinzufügen. <b>Filter hinzufügen</b>: <b>Startdatum</b> „liegt in den nächsten“ <b>14 Tage</b>.</li>
            <li>Aktion <b>Wiederholen mit jedem Objekt</b> hinzufügen (nimmt automatisch die Ereignisse).</li>
            <li>
              In die Wiederholung eine Aktion <b>Text</b> ziehen und so füllen, mit senkrechten Strichen dazwischen:
              <br />
              <code>Titel|Startdatum|Enddatum|Ort|Kalender|Ganztägig</code>
              <br />
              Jedes Wort ist die Variable <b>Wiederholungsobjekt</b>: einfügen, antippen und die passende Eigenschaft wählen. Bei Start- und Enddatum zusätzlich <b>Datumsformat: ISO 8601</b> mit Uhrzeit.
            </li>
            <li>Nach <b>Ende der Wiederholung</b>: Aktion <b>Text kombinieren</b> mit <b>Wiederholungsergebnisse</b>, Trennzeichen <b>Neue Zeilen</b>.</li>
            <li>
              Aktion <b>Text</b>: erste Zeile <code>MILI-KALENDER</code>, zweite Zeile die Variable <b>Kombinierter Text</b>.
            </li>
            <li>Aktion <b>In Zwischenablage kopieren</b>. Fertig.</li>
          </ol>
          <button className="knopf zweit klein" onClick={holeKalender}>Testen</button>
          <p className="leise klein">Danach oben links zurück zu MILI und auf <b>Übernehmen</b> tippen. Klappt es nicht, den Text hier ins Eingabefeld auf der Startseite einfügen.</p>
        </div>
      </Gruppe>

      <Gruppe titel="2. MILI Termin" fuss="Schreibt Termine aus MILI in deinen iCloud-Kalender. MILI schickt Titel, Beginn, Ende und Ort, jeweils in einer eigenen Zeile.">
        <div className="karte innen">
          <ol>
            <li>Neuer Kurzbefehl mit Namen <code>MILI Termin</code>.</li>
            <li>Aktion <b>Text teilen</b>: Eingabe ist die <b>Kurzbefehleingabe</b>, Trennzeichen <b>Neue Zeilen</b>.</li>
            <li>Aktion <b>Objekt aus Liste abrufen</b>, <b>Objekt am Index 1</b>. Danach <b>Variable festlegen</b>: <code>Titel</code>.</li>
            <li>Wieder <b>Objekt aus Liste abrufen</b> aus dem geteilten Text, Index <b>2</b>, dann <b>Datum aus Eingabe abrufen</b>, dann <b>Variable festlegen</b>: <code>Beginn</code>.</li>
            <li>Genauso Index <b>3</b> als <code>Ende</code> und Index <b>4</b> (ohne Datum-Schritt) als <code>Ort</code>.</li>
            <li>Aktion <b>Neues Ereignis hinzufügen</b>: Titel, Startdatum, Enddatum und Ort mit den Variablen füllen, deinen Kalender auswählen.</li>
          </ol>
          <button
            className="knopf zweit klein"
            onClick={() => {
              const morgen = new Date(Date.now() + 86400000);
              morgen.setHours(12, 0, 0, 0);
              starteKurzbefehl(KB_TERMIN, terminEingabe({ titel: 'MILI Test', start: zeitKey(morgen), ganztag: false }));
            }}
          >
            Testen (morgen 12 Uhr)
          </button>
        </div>
      </Gruppe>

      <Gruppe titel="3. MILI Erinnerung" fuss="Das ist dein Weg zu Mitteilungen auf dem iPhone: MILI legt eine Erinnerung an, iOS meldet sich pünktlich. Funktioniert auch, wenn MILI geschlossen ist.">
        <div className="karte innen">
          <ol>
            <li>Neuer Kurzbefehl mit Namen <code>MILI Erinnerung</code>.</li>
            <li><b>Text teilen</b> (Kurzbefehleingabe, Neue Zeilen).</li>
            <li><b>Objekt aus Liste abrufen</b> Index 1, <b>Variable festlegen</b>: <code>Titel</code>.</li>
            <li><b>Objekt aus Liste abrufen</b> Index 2, <b>Datum aus Eingabe abrufen</b>, <b>Variable festlegen</b>: <code>Wann</code>.</li>
            <li>Aktion <b>Erinnerung hinzufügen</b>: Titel, dann <b>Erinnern</b> einschalten und als Datum <code>Wann</code> wählen.</li>
          </ol>
          <button
            className="knopf zweit klein"
            onClick={() => {
              const gleich = new Date(Date.now() + 2 * 60000);
              starteKurzbefehl(KB_ERINNERUNG, erinnerungEingabe('MILI Test', zeitKey(gleich)));
            }}
          >
            Testen (in 2 Minuten)
          </button>
        </div>
      </Gruppe>

      <Gruppe titel="Optional: jeden Morgen automatisch" fuss="Der Kalender landet dann schon in der Zwischenablage, wenn du MILI öffnest. Ein Tipp auf Einfügen auf der Startseite übernimmt ihn.">
        <div className="karte innen">
          <ol>
            <li>Kurzbefehle-App, Tab <b>Automation</b>, <b>Neue Automation</b>.</li>
            <li><b>Tageszeit</b>, z. B. 7:00, täglich, <b>Sofort ausführen</b>.</li>
            <li>Kurzbefehl <code>MILI Kalender</code> ausführen lassen.</li>
          </ol>
        </div>
      </Gruppe>

      <p className="gruppe-fuss">Stand: {tagKey(new Date())}. Die Namen der Aktionen können je nach iOS-Version leicht abweichen.</p>
    </div>
  );
}
