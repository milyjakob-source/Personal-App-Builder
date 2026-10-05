// Liest den Text eines PDFs direkt im Browser. Die Datei verlässt das Gerät nicht.

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export async function pdfText(datei: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const aufgabe = pdfjs.getDocument({ data: new Uint8Array(await datei.arrayBuffer()) });
  const doc = await aufgabe.promise;
  const seiten: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const seite = await doc.getPage(i);
    const inhalt = await seite.getTextContent();
    // Textstücke nach Zeile (y) gruppieren, innerhalb der Zeile nach x sortieren.
    const zeilen: { y: number; teile: { x: number; s: string }[] }[] = [];
    for (const item of inhalt.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const [, , , , x, y] = item.transform as number[];
      let z = zeilen.find((z) => Math.abs(z.y - y) < 3);
      if (!z) zeilen.push((z = { y, teile: [] }));
      z.teile.push({ x, s: item.str });
    }
    zeilen.sort((a, b) => b.y - a.y);
    seiten.push(zeilen.map((z) => z.teile.sort((a, b) => a.x - b.x).map((t) => t.s).join('  ')).join('\n'));
  }
  await aufgabe.destroy();
  return seiten.join('\n');
}
