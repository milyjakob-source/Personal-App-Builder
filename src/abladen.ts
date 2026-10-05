// Das Abladen-Blatt lässt sich von überall öffnen (Mikrofon-Knopf, Startseite, Eingang).

import { useSyncExternalStore } from 'react';

type Start = 'tippen' | 'einfuegen' | undefined;
let zustand: { offen: boolean; start: Start; nr: number } = { offen: false, start: undefined, nr: 0 };
const hoerer = new Set<() => void>();

export function oeffneAbladen(start?: Start) {
  zustand = { offen: true, start, nr: zustand.nr + 1 };
  hoerer.forEach((h) => h());
}

export function schliesseAbladen() {
  zustand = { ...zustand, offen: false };
  hoerer.forEach((h) => h());
}

export function useAbladen() {
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => hoerer.delete(h);
    },
    () => zustand,
  );
}
