import { describe, expect, it } from 'vitest';
import { bereichFuer, istEinkauf } from './bereiche';

const b = (titel: string, extra: Record<string, string> = {}) => bereichFuer({ titel, ...extra });

describe('Bereiche', () => {
  it('ordnet typische Termine zu', () => {
    expect(b('Klavierunterricht bei Silke')).toBe('musik');
    expect(b('Bandprobe')).toBe('musik');
    expect(b('Mit Mama Kaffeetrinken')).toBe('familie');
    expect(b('Bei Juli')).toBe('freunde');
    expect(b('Treffen mit Lena')).toBe('freunde');
    expect(b('Zahnarzt')).toBe('alltag');
    expect(b('Schicht Café Blum')).toBe('arbeit');
    expect(b('Fitnessstudio')).toBe('sport');
    expect(b('Irgendwas')).toBe('alltag');
  });

  it('Kalendername und Gelerntes gehen vor', () => {
    expect(b('Planung', { kalender: 'Arbeit' })).toBe('arbeit');
    expect(bereichFuer({ titel: 'Zahnarzt' }, { zahnarzt: 'freunde' })).toBe('freunde');
    expect(bereichFuer({ titel: 'Zahnarzt', bereich: 'sport' })).toBe('sport');
  });

  it('erkennt Einkaufen', () => {
    expect(istEinkauf('Einkaufen gehen')).toBe(true);
    expect(istEinkauf('Wocheneinkauf bei REWE')).toBe(true);
    expect(istEinkauf('Bandprobe')).toBe(false);
  });
});
