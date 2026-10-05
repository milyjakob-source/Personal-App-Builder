// Liest den Text eines PDFs direkt im Browser. Die Datei verlässt das Gerät nicht.
// Wichtig: die "legacy"-Ausgabe von pdf.js. Die moderne nutzt JavaScript-Funktionen,
// die Safari auf dem iPhone noch nicht kennt ("undefined is not a function").

import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

type TextTeil = { str?: string; transform?: number[] };

export async function pdfText(datei: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const aufgabe = pdfjs.getDocument({ data: new Uint8Array(await datei.arrayBuffer()) });
  const doc = await aufgabe.promise;
  const seiten: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const seite = await doc.getPage(i);
      const teile = await textTeile(seite);
      // Textstücke nach Zeile (y) gruppieren, innerhalb der Zeile nach x sortieren.
      const zeilen: { y: number; teile: { x: number; s: string }[] }[] = [];
      for (const item of teile) {
        if (!item.str?.trim() || !item.transform) continue;
        const x = item.transform[4];
        const y = item.transform[5];
        let z = zeilen.find((z) => Math.abs(z.y - y) < 3);
        if (!z) zeilen.push((z = { y, teile: [] }));
        z.teile.push({ x, s: item.str });
      }
      zeilen.sort((a, b) => b.y - a.y);
      seiten.push(zeilen.map((z) => z.teile.sort((a, b) => a.x - b.x).map((t) => t.s).join('  ')).join('\n'));
    }
  } finally {
    await aufgabe.destroy();
  }
  return seiten.join('\n');
}

/** Textstücke einer Seite. Liest den Stream von Hand, weil Safari "for await" über Streams nicht überall kann. */
async function textTeile(seite: { streamTextContent: () => ReadableStream }): Promise<TextTeil[]> {
  const leser = seite.streamTextContent().getReader();
  const teile: TextTeil[] = [];
  for (;;) {
    const { value, done } = await leser.read();
    if (done) break;
    teile.push(...((value as { items?: TextTeil[] })?.items ?? []));
  }
  return teile;
}
