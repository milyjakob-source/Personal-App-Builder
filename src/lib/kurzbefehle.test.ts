import { describe, expect, it } from 'vitest';
import { erinnerungEingabe, kurzbefehlLink, leseKalenderExport, leseKbDatum, terminEingabe } from './kurzbefehle';

describe('Kurzbefehle', () => {
  it('Link mit Texteingabe', () => {
    expect(kurzbefehlLink('MILI Termin', 'Probe\n09.10.2026 19:00')).toBe(
      'shortcuts://run-shortcut?name=MILI%20Termin&input=text&text=Probe%0A09.10.2026%2019%3A00',
    );
  });

  it('Termin- und Erinnerungseingabe', () => {
    expect(terminEingabe({ titel: 'Probe', start: '2026-10-09T19:00', ganztag: false })).toBe(
      'Probe\n09.10.2026 19:00\n09.10.2026 20:00\n',
    );
    expect(erinnerungEingabe('Mama anrufen', '2026-10-06')).toBe('Mama anrufen\n06.10.2026 09:00');
  });

  it('Datumsformate aus Kurzbefehle', () => {
    expect(leseKbDatum('2026-10-09T19:00:00+02:00')?.mitZeit).toBe(true);
    expect(leseKbDatum('5. Okt. 2026 um 19:00')).toEqual({ wert: '2026-10-05T19:00', mitZeit: true });
    expect(leseKbDatum('05.10.26, 08:15')).toEqual({ wert: '2026-10-05T08:15', mitZeit: true });
    expect(leseKbDatum('12. März 2027')).toEqual({ wert: '2027-03-12', mitZeit: false });
  });

  it('Kalender-Export', () => {
    const t = leseKalenderExport(
      'MILI-KALENDER\nBandprobe|5. Okt. 2026 um 19:00|5. Okt. 2026 um 21:00|Proberaum|Privat|Nein\nUrlaub|12.10.26, 00:00|14.10.26, 00:00||Privat|Ja\n|kaputt',
    );
    expect(t).toHaveLength(2);
    expect(t![0]).toMatchObject({ titel: 'Bandprobe', start: '2026-10-05T19:00', ende: '2026-10-05T21:00', ort: 'Proberaum', ganztag: false });
    expect(t![1]).toMatchObject({ titel: 'Urlaub', start: '2026-10-12', ganztag: true });
    expect(leseKalenderExport('irgendwas')).toBeUndefined();
  });
});
