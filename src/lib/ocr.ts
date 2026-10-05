// Texterkennung für Screenshots, läuft auf dem Gerät.
// Beim ersten Mal lädt tesseract.js Programm und deutsche Sprachdaten (einige MB) aus dem Netz;
// das Bild selbst wird dabei nicht hochgeladen.

export async function bildText(datei: File, fortschritt?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('deu', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') fortschritt?.(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(datei);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
