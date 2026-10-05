import { describe, expect, it } from 'vitest';
import { erkenne, teile } from './erkennen';
import { alsWann, findeZeit } from './zeit';

// Montag, 5. Oktober 2026, 10:00
const JETZT = new Date(2026, 9, 5, 10, 0);
const wann = (s: string) => alsWann(findeZeit(s, JETZT));

describe('findeZeit', () => {
  it('relative Tage', () => {
    expect(wann('heute').wann).toBe('2026-10-05');
    expect(wann('morgen').wann).toBe('2026-10-06');
    expect(wann('übermorgen').wann).toBe('2026-10-07');
    expect(wann('in 3 Tagen').wann).toBe('2026-10-08');
    expect(wann('in zwei Wochen').wann).toBe('2026-10-19');
  });

  it('Wochentage', () => {
    expect(wann('Freitag').wann).toBe('2026-10-09');
    expect(wann('am Montag').wann).toBe('2026-10-05');
    expect(wann('nächsten Montag').wann).toBe('2026-10-12');
    expect(wann('nächste Woche Mittwoch').wann).toBe('2026-10-14');
    expect(wann('am Wochenende').wann).toBe('2026-10-10');
    expect(wann('nächste Woche').wann).toBe('2026-10-12');
  });

  it('Kalenderdaten', () => {
    expect(wann('am 12.11.').wann).toBe('2026-11-12');
    expect(wann('am 12.11').wann).toBe('2026-11-12');
    expect(wann('3.1.2027').wann).toBe('2027-01-03');
    expect(wann('12. November').wann).toBe('2026-11-12');
    expect(wann('3 Mai').wann).toBe('2027-05-03');
    // liegt mehr als eine Woche zurück → nächstes Jahr
    expect(wann('am 1.9.').wann).toBe('2027-09-01');
  });

  it('Uhrzeiten', () => {
    expect(wann('Freitag um 19 Uhr').wann).toBe('2026-10-09T19:00');
    expect(wann('Freitag 19:30').wann).toBe('2026-10-09T19:30');
    expect(wann('morgen um 7').wann).toBe('2026-10-06T19:00');
    expect(wann('morgen um 7 Uhr').wann).toBe('2026-10-06T07:00');
    expect(wann('Samstag halb 8').wann).toBe('2026-10-10T19:30');
    expect(wann('heute abend').wann).toBe('2026-10-05T19:00');
    expect(wann('morgen früh').wann).toBe('2026-10-06T09:00');
    expect(wann('heute morgen').wann).toBe('2026-10-05T09:00');
    expect(wann('Freitag abends um 8').wann).toBe('2026-10-09T20:00');
    expect(wann('um 19.30 Uhr').wann).toBe('2026-10-05T19:30');
  });

  it('nur Uhrzeit: heute oder morgen', () => {
    expect(wann('um 15 Uhr').wann).toBe('2026-10-05T15:00');
    expect(wann('um 8 Uhr').wann).toBe('2026-10-06T08:00');
  });

  it('Zeitraum', () => {
    expect(wann('Dienstag 14-18 Uhr')).toEqual({ wann: '2026-10-06T14:00', ende: '2026-10-06T18:00' });
    expect(wann('Mi von 9:30 bis 12:00')).toEqual({ wann: '2026-10-07T09:30', ende: '2026-10-07T12:00' });
  });
});

describe('erkenne', () => {
  it('Termin mit sauberem Titel', () => {
    const [v] = erkenne('Zahnarzt am Donnerstag um 14 Uhr', JETZT);
    expect(v).toMatchObject({ art: 'termin', titel: 'Zahnarzt', wann: '2026-10-08T14:00' });
  });

  it('Aufgabe mit Fälligkeit', () => {
    const [v] = erkenne('Ich muss morgen Mama anrufen', JETZT);
    expect(v).toMatchObject({ art: 'aufgabe', titel: 'Mama anrufen', wann: '2026-10-06' });
  });

  it('Einkauf mit mehreren Posten', () => {
    const [v] = erkenne('Milch, Eier und Haferflocken kaufen', JETZT);
    expect(v.art).toBe('einkauf');
    expect(v.posten).toEqual(['Milch', 'Eier', 'Haferflocken']);
  });

  it('Geburtstag', () => {
    const [v] = erkenne('Lisa hat am 14.3. Geburtstag', JETZT);
    expect(v).toMatchObject({ art: 'geburtstag', geburtstag: { name: 'Lisa', tag: 14, monat: 3 } });
    const [w] = erkenne('Geburtstag Jonas 2.12.2003', JETZT);
    expect(w.geburtstag).toEqual({ name: 'Jonas', tag: 2, monat: 12, jahr: 2003 });
    const [x] = erkenne('Annas Geburtstag ist am 4. Mai', JETZT);
    expect(x.geburtstag).toMatchObject({ name: 'Anna', tag: 4, monat: 5 });
  });

  it('geplante Ausgabe', () => {
    const [v] = erkenne('Semesterbeitrag 320 € bis 15.11. zahlen', JETZT);
    expect(v).toMatchObject({ art: 'ausgabe', betrag: 32000, wann: '2026-11-15' });
  });

  it('Anfrage aus einer einzelnen Nachricht', () => {
    const [v] = erkenne('Max: Hast du Freitag Abend Zeit für ein Bier?', JETZT);
    expect(v).toMatchObject({ art: 'anfrage', von: 'Max', wann: '2026-10-09T19:00' });
  });

  it('Anfrage ohne Absender wird nicht zerlegt', () => {
    const r = erkenne('Hey! Wollen wir Samstag jammen?', JETZT);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ art: 'anfrage', wann: '2026-10-10' });
  });

  it('WhatsApp-Verlauf: Datum relativ zur Nachricht', () => {
    const chat = [
      '[04.10.26, 21:14:03] Lena Weber: Hiii',
      '[04.10.26, 21:14:20] Lena Weber: hast du morgen um 18 Uhr Zeit? Kaffee?',
    ].join('\n');
    const [v] = erkenne(chat, JETZT);
    expect(v).toMatchObject({ art: 'anfrage', von: 'Lena Weber', wann: '2026-10-05T18:00' });
  });

  it('WhatsApp Android-Format', () => {
    const [v] = erkenne('05.10.26, 09:12 - Tim: Probe am Mittwoch um 17 Uhr?', JETZT);
    expect(v).toMatchObject({ art: 'anfrage', von: 'Tim', wann: '2026-10-07T17:00' });
  });

  it('Diktat mit mehreren Gedanken', () => {
    const r = erkenne('Morgen um 10 Uhr Vorlesung. Gitarrensaiten kaufen. Ich muss bis Freitag die Bewerbung abschicken.', JETZT);
    expect(r.map((v) => v.art)).toEqual(['termin', 'einkauf', 'aufgabe']);
    expect(r[2]).toMatchObject({ titel: 'Bewerbung abschicken', wann: '2026-10-09' });
  });

  it('Notiz, wenn nichts passt', () => {
    const [v] = erkenne('Idee: Reharmonisation von Isn’t She Lovely in Moll', JETZT);
    expect(v.art).toBe('notiz');
  });

  it('Dienstplan-Zeilen', () => {
    expect(wann('Di 13.10. 9-17 Uhr')).toEqual({ wann: '2026-10-13T09:00', ende: '2026-10-13T17:00' });
    expect(wann('Mo 12.10. 14-22 Uhr')).toEqual({ wann: '2026-10-12T14:00', ende: '2026-10-12T22:00' });
  });

  it('langes Diktat ohne Punkte (echtes Beispiel)', () => {
    const diktat =
      'Okay heute auf der Agenda steht bei Sound of Music anrufen wegen dem Job Einkaufen gehen Und noch bis eine Woche planen ' +
      'Morgen Gehe ich auf 18:00 Uhr nach Ostfildern zum Klavierunterricht bei Silke und muss noch zwischendrin irgendwie Zeit ' +
      'für Josef finden damit wir für meinen Geburtstag der am 7. November ist Eine Bandprobe machen Am Freitag gehe ich mit ' +
      'Mama Kaffeetrinken Uhrzeit steht noch nicht fest Und heute Abend gehe ich zu Juli Ich schätze so auf 20:00 Uhr';
    const r = erkenne(diktat, JETZT).map(({ art, titel, wann, ort }) => ({ art, titel, wann, ...(ort ? { ort } : {}) }));
    expect(r).toEqual([
      { art: 'aufgabe', titel: 'Bei Sound of Music anrufen wegen dem Job', wann: '2026-10-05' },
      { art: 'aufgabe', titel: 'Einkaufen gehen', wann: '2026-10-05' },
      { art: 'aufgabe', titel: 'Eine Woche planen', wann: '2026-10-05' },
      { art: 'termin', titel: 'Klavierunterricht bei Silke', wann: '2026-10-06T18:00', ort: 'Ostfildern' },
      { art: 'aufgabe', titel: 'Zeit für Josef finden', wann: '2026-11-07' },
      { art: 'termin', titel: 'Mit Mama Kaffeetrinken', wann: '2026-10-09' },
      { art: 'termin', titel: 'Bei Juli', wann: '2026-10-05T20:00' },
    ]);
  });

  it('Diktat: Einkauf und Termin in einem Satz', () => {
    const r = erkenne('Morgen um 9 Uhr Zahnarzt und dann noch Milch und Brot kaufen', JETZT);
    expect(r.map((v) => v.art)).toEqual(['termin', 'einkauf']);
    expect(r[1].posten).toEqual(['Milch', 'Brot']);
  });

  it('Diktat: danach am selben Tag, Erinnerung als Aufgabe', () => {
    const r = erkenne('Am Mittwoch hab ich um 14 Uhr Gitarrenunterricht und danach muss ich noch Noten ausdrucken', JETZT);
    expect(r.map(({ art, titel, wann }) => ({ art, titel, wann }))).toEqual([
      { art: 'termin', titel: 'Gitarrenunterricht', wann: '2026-10-07T14:00' },
      { art: 'aufgabe', titel: 'Noten ausdrucken', wann: '2026-10-07' },
    ]);
    const [e] = erkenne('Erinnere mich morgen um 8 an die Miete', JETZT);
    expect(e).toMatchObject({ art: 'aufgabe', titel: 'Miete', wann: '2026-10-06' });
  });

  it('"mein Geburtstag" ist kein Geburtstags-Eintrag', () => {
    const [v] = erkenne('Für meinen Geburtstag am 7. November muss ich noch den Raum buchen', JETZT);
    expect(v.art).toBe('aufgabe');
  });

  it('teilt Aufzählungen', () => {
    expect(teile('- Milch\n- Brot\n1. Saiten')).toEqual(['Milch', 'Brot', 'Saiten']);
  });
});
