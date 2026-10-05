import { describe, expect, it } from 'vitest';
import type { Termin } from '../types';
import { bloecke, freieAbende, vorschlagFuer } from './frei';

const JETZT = new Date(2026, 9, 5, 10, 0);
const T = (start: string, ende: string, titel = 'X'): Termin => ({ id: titel, titel, start, ende, ganztag: false, quelle: 'mili' });

describe('freie Zeiten', () => {
  const b = bloecke([T('2026-10-06T18:00', '2026-10-06T21:00', 'Probe')], [{ id: 's', start: '2026-10-07T17:00', ende: '2026-10-07T23:00' }]);

  it('freie Abende überspringen Termine und Schichten', () => {
    expect(freieAbende(b, 3, JETZT)).toEqual(['2026-10-05T19:00', '2026-10-08T19:00', '2026-10-09T19:00']);
  });

  it('Konflikt mit Termin', () => {
    const v = vorschlagFuer('2026-10-06T19:00', b, JETZT);
    expect(v.frei).toBe(false);
    expect(v.konfliktMit).toBe('Probe');
    expect(v.alternativen[0]).toBe('2026-10-08T19:00');
  });

  it('nur Tag: Abend vorschlagen', () => {
    expect(vorschlagFuer('2026-10-09', b, JETZT)).toMatchObject({ frei: true, alternativen: ['2026-10-09T19:00'] });
  });
});
