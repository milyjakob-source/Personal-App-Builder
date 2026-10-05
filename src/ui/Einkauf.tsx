import { ShoppingCart, Trash } from '@phosphor-icons/react';
import { useState } from 'react';
import { aendere, neueId, useDaten } from '../store';
import { Blatt, Haken, Leer } from './ui';

/** Die Einkaufsliste: hinzufügen, abhaken, Gekauftes leeren. Wird auf der Einkaufsseite und als Blatt beim Termin benutzt. */
export function EinkaufListe() {
  const d = useDaten();
  const [neu, setNeu] = useState('');
  const offen = d.einkauf.filter((e) => !e.erledigt);
  const erledigt = d.einkauf.filter((e) => e.erledigt);

  function hinzu() {
    const posten = neu.split(',').map((p) => p.trim()).filter(Boolean);
    if (!posten.length) return;
    aendere((x) => {
      for (const p of posten) {
        const titel = p.charAt(0).toUpperCase() + p.slice(1);
        if (!x.einkauf.some((e) => !e.erledigt && e.titel.toLowerCase() === titel.toLowerCase())) {
          x.einkauf.push({ id: neueId(), titel, erledigt: false });
        }
      }
    });
    setNeu('');
  }

  const umschalten = (id: string) =>
    aendere((x) => {
      const y = x.einkauf.find((z) => z.id === id);
      if (y) y.erledigt = !y.erledigt;
    });

  return (
    <>
      <div className="karte">
        <form
          className="zeile"
          onSubmit={(e) => {
            e.preventDefault();
            hinzu();
          }}
        >
          <span className="check" />
          <input
            className="ohne"
            style={{ textAlign: 'left', flex: 1, color: 'var(--text)' }}
            placeholder="Was brauchst du?"
            value={neu}
            onChange={(e) => setNeu(e.target.value)}
            enterKeyHint="done"
            aria-label="Zur Einkaufsliste hinzufügen"
          />
        </form>
        {offen.length === 0 && (
          <Leer titel="Alles da" icon={<ShoppingCart size={26} weight="fill" />} farbe="#e8900c">
            Schreib Sachen auf, sobald sie dir einfallen. Beim Einkaufen hast du dann alles beisammen.
          </Leer>
        )}
        {offen.map((e) => (
          <div key={e.id} className="zeile">
            <Haken an={false} farbe="#e8900c" label="Gekauft" onClick={() => umschalten(e.id)} />
            <div className="haupt">
              <div className="titel">{e.titel}</div>
            </div>
          </div>
        ))}
      </div>
      {erledigt.length > 0 && (
        <section className="gruppe" style={{ marginTop: 22 }}>
          <h2 className="gruppe-titel">
            <span>Im Wagen</span>
            <button className="mehr" onClick={() => aendere((x) => { x.einkauf = x.einkauf.filter((y) => !y.erledigt); })}>
              <Trash size={14} /> Leeren
            </button>
          </h2>
          <div className="karte">
            {erledigt.map((e) => (
              <div key={e.id} className="zeile erledigt">
                <Haken an farbe="#e8900c" label="Wieder offen" onClick={() => umschalten(e.id)} />
                <div className="haupt">
                  <div className="titel">{e.titel}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export function EinkaufBlatt({ offen, onClose }: { offen: boolean; onClose: () => void }) {
  return (
    <Blatt titel="Einkaufsliste" offen={offen} onClose={onClose}>
      <EinkaufListe />
    </Blatt>
  );
}
