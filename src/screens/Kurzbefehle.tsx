import { tagKey, zeitKey } from '../lib/datum';
import { erinnerungEingabe, KB_ERINNERUNG, starteKurzbefehl } from '../lib/kurzbefehle';
import { aendere, useDaten } from '../store';
import { holeKalender } from '../ui/Agenda';
import { Gruppe, Kopf } from '../ui/ui';

export function Kurzbefehle() {
  const d = useDaten();
  const aktiv = d.einstellungen.kurzbefehleAktiv;

  return (
    <div className="seite anleitung">
      <Kopf titel="Kurzbefehle" zurueck="mehr" unter="Verbindung zu Kalender und Erinnerungen" />

      <Gruppe fuss="Eine Website darf nicht direkt in deinen Kalender schauen. Die Kurzbefehle-App schon. Du legst einmalig den Kurzbefehl „MILI Kalender“ an, danach reicht ein Tipp in MILI. Dein iPhone-Kalender wird dabei nur gelesen, nie verändert.">
        <div className="karte">
          <label className="zeile">
            <div className="haupt">
              <div className="titel">Kurzbefehle sind eingerichtet</div>
              <div className="neben">Dann holt das Aktualisieren-Symbol bei der Woche deine Termine</div>
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

      <Gruppe titel="2. MILI Erinnerung (optional)" fuss="Das ist dein Weg zu Mitteilungen auf dem iPhone: MILI legt eine Erinnerung an, iOS meldet sich pünktlich. Funktioniert auch, wenn MILI geschlossen ist.">
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
