import { CaretLeft, CaretRight, FilePlus, Trash } from '@phosphor-icons/react';
import { useMemo, useRef, useState } from 'react';
import { buchungenImport, kategorieLernen } from '../aktionen';
import { leseAuszug, mitKategorie, type RohBuchung } from '../lib/bank';
import { kurzesDatum, lies, monatName, tagKey, tagName } from '../lib/datum';
import { KATEGORIEN } from '../lib/kategorien';
import { euro, findeAbos, monateMitDaten, monatsBild, sparplan } from '../lib/sparplan';
import { aendere, neueId, useDaten } from '../store';
import type { Buchung } from '../types';
import { Blatt, geh, Gruppe, Kopf, Leer, Segment, toast, useJetzt, Zeile } from '../ui/ui';

type Ansicht = 'uebersicht' | 'buchungen' | 'sparplan';

export function Geld({ unter }: { unter?: string }) {
  const ansicht: Ansicht = unter === 'buchungen' || unter === 'sparplan' ? unter : 'uebersicht';
  const [importRoh, setImportRoh] = useState<{ zeilen: RohBuchung[]; text: string } | null>(null);
  const [laedt, setLaedt] = useState<string | null>(null);
  const datei = useRef<HTMLInputElement>(null);

  async function dateienLesen(files: FileList | null) {
    if (!files?.length) return;
    const texte: string[] = [];
    try {
      for (const f of Array.from(files)) {
        if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
          setLaedt(`${f.name} wird gelesen ...`);
          const { pdfText } = await import('../lib/pdf');
          texte.push(await pdfText(f));
        } else if (f.type.startsWith('image/')) {
          setLaedt('Screenshot wird gelesen ...');
          const { bildText } = await import('../lib/ocr');
          texte.push(await bildText(f, (p) => setLaedt(`Screenshot wird gelesen ... ${Math.round(p * 100)} %`)));
        }
      }
    } catch (e) {
      toast(`Lesen fehlgeschlagen: ${e instanceof Error ? e.message : 'unbekannter Fehler'}`);
    } finally {
      setLaedt(null);
      if (datei.current) datei.current.value = '';
    }
    const text = texte.join('\n');
    setImportRoh({ zeilen: leseAuszug(text), text });
  }

  return (
    <div className="seite">
      <Kopf
        titel="Geld"
        unter="Bleibt auf diesem iPhone"
        aktionen={
          <button className="rund" onClick={() => datei.current?.click()} aria-label="Kontoauszug hinzufügen">
            <FilePlus size={19} />
          </button>
        }
      />
      <input ref={datei} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => dateienLesen(e.target.files)} />

      {laedt && <div className="banner"><div className="haupt">{laedt}</div></div>}

      <Segment<Ansicht>
        wert={ansicht}
        optionen={[
          ['uebersicht', 'Übersicht'],
          ['buchungen', 'Buchungen'],
          ['sparplan', 'Sparplan'],
        ]}
        onChange={(w) => geh(w === 'uebersicht' ? 'geld' : `geld/${w}`)}
      />

      {ansicht === 'uebersicht' && <Uebersicht onImport={() => datei.current?.click()} onText={() => setImportRoh({ zeilen: [], text: '' })} />}
      {ansicht === 'buchungen' && <Buchungen />}
      {ansicht === 'sparplan' && <SparplanAnsicht />}

      {importRoh && <ImportBlatt start={importRoh} onClose={() => setImportRoh(null)} />}
    </div>
  );
}

function Uebersicht({ onImport, onText }: { onImport: () => void; onText: () => void }) {
  const d = useDaten();
  const jetzt = useJetzt();
  const monate = monateMitDaten(d.buchungen);
  const [index, setIndex] = useState(0);
  const monat = monate[index] ?? tagKey(jetzt).slice(0, 7);
  const bild = monatsBild(d.buchungen, monat);
  const abos = useMemo(() => findeAbos(d.buchungen), [d.buchungen]);
  const max = bild.kategorien[0]?.summe ?? 1;

  if (!d.buchungen.length) {
    return (
      <>
        <div className="karte">
          <Leer titel="Noch keine Buchungen">
            Lade einen Volksbank-Kontoauszug als PDF hoch oder einen Screenshot aus der Banking-App. Schwärze vorher, was MILI nicht sehen soll.
          </Leer>
          <div style={{ padding: '0 16px 16px', display: 'grid', gap: 8 }}>
            <button className="knopf voll" onClick={onImport}>Kontoauszug auswählen</button>
            <button className="knopf grau voll" onClick={onText}>Text einfügen</button>
          </div>
        </div>
        <p className="gruppe-fuss">
          Im VR Banking: Konto öffnen, „Postfach“ oder „Kontoauszüge“, PDF teilen, „In Dateien sichern“. Dann hier auswählen. Nichts davon verlässt dein iPhone.
        </p>
      </>
    );
  }

  return (
    <>
      <div className="kopf" style={{ margin: '0 4px 12px', alignItems: 'center' }}>
        <button className="rund" disabled={index >= monate.length - 1} onClick={() => setIndex(index + 1)} aria-label="Monat zurück">
          <CaretLeft size={18} weight="bold" />
        </button>
        <div className="fett">{monatName(monat)}</div>
        <button className="rund" disabled={index <= 0} onClick={() => setIndex(index - 1)} aria-label="Monat vor">
          <CaretRight size={18} weight="bold" />
        </button>
      </div>

      <Gruppe>
        <div className="karte">
          <div style={{ padding: '18px 16px 14px' }}>
            <div className="leise klein">Ausgaben</div>
            <div className="gross-zahl">{euro(bild.ausgaben)}</div>
          </div>
          <div className="zahlen" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
            <div>
              <div className="wert plus">{euro(bild.einnahmen)}</div>
              <div className="was">Einnahmen</div>
            </div>
            <div>
              <div className={`wert ${bild.einnahmen - bild.ausgaben >= 0 ? 'plus' : 'minus'}`}>{euro(bild.einnahmen - bild.ausgaben)}</div>
              <div className="was">Bilanz</div>
            </div>
          </div>
        </div>
      </Gruppe>

      <Gruppe titel="Wofür">
        <div className="karte">
          {bild.kategorien.map((k) => (
            <button key={k.name} className="zeile" onClick={() => geh(`geld/buchungen?k=${encodeURIComponent(k.name)}&m=${monat}`)}>
              <div className="haupt">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span>{k.name}</span>
                  <span className="leise" style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(k.summe)}</span>
                </div>
                <div className="balken" style={{ width: `${Math.max(2, (k.summe / max) * 100)}%` }} />
              </div>
            </button>
          ))}
        </div>
      </Gruppe>

      {abos.length > 0 && (
        <Gruppe titel="Wiederkehrend" fuss="Gleicher Empfänger, ähnlicher Betrag, mehrere Monate hintereinander.">
          <div className="karte">
            {abos.map((a) => (
              <Zeile key={a.name} titel={a.name} neben={`${a.monate} Monate`} rechts={`${euro(a.betrag, true)}/Monat`} />
            ))}
          </div>
        </Gruppe>
      )}

      <div className="knopf-reihe">
        <button className="knopf zweit" onClick={onImport}>Weiteren Auszug hinzufügen</button>
        <button className="knopf grau" onClick={onText}>Text einfügen</button>
      </div>
    </>
  );
}

function Buchungen() {
  const d = useDaten();
  const jetzt = useJetzt();
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const [filter, setFilter] = useState(params.get('k') ?? '');
  const monat = params.get('m') ?? '';
  const [bearbeite, setBearbeite] = useState<Buchung | null>(null);

  const liste = d.buchungen.filter((b) => (!filter || b.kategorie === filter) && (!monat || b.datum.startsWith(monat)));
  const tage = new Map<string, Buchung[]>();
  for (const b of liste) tage.set(b.datum, [...(tage.get(b.datum) ?? []), b]);

  return (
    <>
      <div className="chips" style={{ marginBottom: 16 }}>
        <button className={`chip${!filter ? ' an' : ''}`} onClick={() => setFilter('')}>Alle</button>
        {KATEGORIEN.filter((k) => d.buchungen.some((b) => b.kategorie === k)).map((k) => (
          <button key={k} className={`chip${filter === k ? ' an' : ''}`} onClick={() => setFilter(k)}>{k}</button>
        ))}
      </div>
      {monat && (
        <p className="leise klein" style={{ margin: '-6px 4px 12px' }}>
          {monatName(monat)} · <a href="#/geld/buchungen">alle Monate</a>
        </p>
      )}
      {liste.length === 0 && <div className="karte"><Leer titel="Keine Buchungen" /></div>}
      {[...tage.entries()].map(([tag, bs]) => (
        <Gruppe key={tag} titel={<span style={{ fontSize: 15, color: 'var(--text-2)' }}>{tagName(lies(tag), jetzt)} · {kurzesDatum(tag)}</span>}>
          <div className="karte">
            {bs.map((b) => (
              <Zeile
                key={b.id}
                titel={b.text}
                neben={b.kategorie}
                rechts={<span className={b.betrag > 0 ? 'plus' : 'minus'} style={{ fontVariantNumeric: 'tabular-nums' }}>{euro(b.betrag, true)}</span>}
                onClick={() => setBearbeite(b)}
              />
            ))}
          </div>
        </Gruppe>
      ))}
      {bearbeite && (
        <Blatt titel="Buchung" offen onClose={() => setBearbeite(null)}>
          <div className="karte innen" style={{ marginBottom: 16 }}>
            <div className="fett">{bearbeite.text}</div>
            <div className="leise">{kurzesDatum(bearbeite.datum)} · {euro(bearbeite.betrag, true)}</div>
          </div>
          <div className="label">Kategorie (gilt ab jetzt für alle Buchungen dieses Empfängers)</div>
          <div className="chips" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
            {KATEGORIEN.map((k) => (
              <button
                key={k}
                className={`chip${bearbeite.kategorie === k ? ' an' : ''}`}
                onClick={() => {
                  kategorieLernen(bearbeite, k);
                  toast(`${k} gemerkt`);
                  setBearbeite(null);
                }}
              >
                {k}
              </button>
            ))}
          </div>
          <button
            className="knopf rot"
            onClick={() => {
              aendere((x) => { x.buchungen = x.buchungen.filter((y) => y.id !== bearbeite.id); });
              setBearbeite(null);
            }}
          >
            <Trash size={16} /> Buchung löschen
          </button>
        </Blatt>
      )}
    </>
  );
}

function SparplanAnsicht() {
  const d = useDaten();
  const jetzt = useJetzt();
  const p = sparplan(d.buchungen, d.geplant, d.einstellungen, jetzt);
  const [neu, setNeu] = useState({ titel: '', betrag: '', datum: '' });

  return (
    <>
      <Gruppe>
        <div className="karte">
          <div style={{ padding: '18px 16px 14px' }}>
            <div className="leise klein">Spielraum für Alltag pro Woche</div>
            <div className="gross-zahl">{euro(p.proWoche)}</div>
            <div className="leise klein">{euro(Math.max(0, p.spielraum))} im Monat für Essen, Ausgehen, Shopping und Co.</div>
          </div>
          <div className="zahlen">
            <div><div className="wert">{euro(p.fixkosten)}</div><div className="was">Fixkosten</div></div>
            <div><div className="wert">{euro(p.ruecklagenSumme)}</div><div className="was">Rücklagen</div></div>
            <div><div className="wert plus">{euro(p.sparziel)}</div><div className="was">Sparen</div></div>
          </div>
        </div>
      </Gruppe>

      {p.hinweise.length > 0 && (
        <Gruppe titel="Hinweise">
          <div className="karte">
            {p.hinweise.map((h) => (
              <Zeile key={h} titel={h} umbruch />
            ))}
          </div>
        </Gruppe>
      )}

      <Gruppe titel="Einstellungen" fuss={p.basisMonate ? `Gerechnet mit ${p.basisMonate} ${p.basisMonate === 1 ? 'Monat' : 'Monaten'} deiner Buchungen.` : undefined}>
        <div className="karte">
          <label className="zeile">
            <div className="haupt">Einkommen pro Monat</div>
            <input
              className="ohne"
              inputMode="decimal"
              placeholder={p.einkommenGeschaetzt ? `${Math.round(p.einkommen / 100)} (geschätzt)` : ''}
              value={d.einstellungen.einkommen ? String(d.einstellungen.einkommen / 100) : ''}
              onChange={(e) => aendere((x) => { x.einstellungen.einkommen = Math.round((parseFloat(e.target.value.replace(',', '.')) || 0) * 100); })}
              style={{ width: 140 }}
            />
            <span className="leise">€</span>
          </label>
          <label className="zeile">
            <div className="haupt">Sparen</div>
            <input
              type="range"
              min={0}
              max={40}
              step={5}
              value={d.einstellungen.sparquote}
              onChange={(e) => aendere((x) => { x.einstellungen.sparquote = +e.target.value; })}
              style={{ width: 130, accentColor: 'var(--accent)' }}
            />
            <span className="leise" style={{ width: 44, textAlign: 'right' }}>{d.einstellungen.sparquote} %</span>
          </label>
          <Zeile titel="Alltag bisher" neben="Durchschnitt pro Monat ohne Fixkosten" rechts={euro(p.variabel)} />
        </div>
      </Gruppe>

      <Gruppe titel="Geplante Ausgaben" fuss="MILI verteilt jede geplante Ausgabe auf die Monate bis dahin und legt das Geld als Rücklage zur Seite.">
        <div className="karte">
          {p.ruecklagen.map((r) => (
            <Zeile
              key={r.id}
              titel={r.titel}
              neben={`${euro(r.betrag)} bis ${kurzesDatum(r.datum)}`}
              rechts={
                <>
                  <span>{euro(r.proMonat)}/Monat</span>
                  <button className="rund" aria-label="Löschen" onClick={() => aendere((x) => { x.geplant = x.geplant.filter((y) => y.id !== r.id); })}>
                    <Trash size={15} />
                  </button>
                </>
              }
            />
          ))}
          <form
            className="vorschlag"
            onSubmit={(e) => {
              e.preventDefault();
              const betrag = Math.round((parseFloat(neu.betrag.replace(',', '.')) || 0) * 100);
              if (!neu.titel.trim() || !betrag || !neu.datum) {
                toast('Was, wie viel und bis wann?');
                return;
              }
              aendere((x) => { x.geplant.push({ id: neueId(), titel: neu.titel.trim(), betrag, datum: neu.datum }); });
              setNeu({ titel: '', betrag: '', datum: '' });
            }}
          >
            <input className="feld" placeholder="z. B. Umzug nach Berlin" value={neu.titel} onChange={(e) => setNeu({ ...neu, titel: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 }}>
              <input className="feld" inputMode="decimal" placeholder="Betrag €" value={neu.betrag} onChange={(e) => setNeu({ ...neu, betrag: e.target.value })} />
              <input className="feld" type="date" value={neu.datum} onChange={(e) => setNeu({ ...neu, datum: e.target.value })} aria-label="Bis wann" />
            </div>
            <button className="knopf zweit" type="submit">Hinzufügen</button>
          </form>
        </div>
      </Gruppe>
    </>
  );
}

function ImportBlatt({ start, onClose }: { start: { zeilen: RohBuchung[]; text: string }; onClose: () => void }) {
  const d = useDaten();
  const [text, setText] = useState(start.text);
  const [zeilen, setZeilen] = useState(() => start.zeilen.map((z) => ({ ...mitKategorie(z, d.einstellungen.kategorieRegeln), an: true })));
  const [zeigeText, setZeigeText] = useState(!start.zeilen.length);
  const anzahl = zeilen.filter((z) => z.an).length;

  return (
    <Blatt
      titel="Kontoauszug"
      offen
      onClose={onClose}
      fertig={() => {
        const { neu, doppelt } = buchungenImport(zeilen.filter((z) => z.an));
        toast(`${neu} Buchungen übernommen${doppelt ? `, ${doppelt} waren schon da` : ''}`);
        onClose();
      }}
      fertigText={`${anzahl} übernehmen`}
    >
      {zeigeText && (
        <div className="formular" style={{ marginBottom: 16 }}>
          <p className="leise klein" style={{ margin: 0 }}>
            {start.text ? 'Hier ist, was MILI gelesen hat. Du kannst den Text korrigieren.' : 'Umsätze einfügen, eine Buchung pro Zeile mit Datum und Betrag.'}
          </p>
          <textarea className="feld" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="01.10.2026 REWE -23,47" />
          <button className="knopf zweit" onClick={() => setZeilen(leseAuszug(text).map((z) => ({ ...mitKategorie(z, d.einstellungen.kategorieRegeln), an: true })))}>
            Neu auswerten
          </button>
        </div>
      )}
      {zeilen.length === 0 ? (
        <div className="karte"><Leer titel="Keine Buchungen erkannt">Prüf den Text oben. Jede Buchung braucht ein Datum und einen Betrag wie 12,99.</Leer></div>
      ) : (
        <div className="karte">
          {zeilen.map((z, i) => (
            <label key={i} className="zeile">
              <input type="checkbox" checked={z.an} onChange={(e) => setZeilen(zeilen.map((y, j) => (j === i ? { ...y, an: e.target.checked } : y)))} style={{ accentColor: 'var(--accent)' }} />
              <div className="haupt">
                <div className="titel" style={{ fontSize: 15 }}>{z.text}</div>
                <select
                  className="ohne"
                  style={{ textAlign: 'left', fontSize: 13, padding: 0 }}
                  value={z.kategorie}
                  onChange={(e) => setZeilen(zeilen.map((y, j) => (j === i ? { ...y, kategorie: e.target.value } : y)))}
                >
                  {KATEGORIEN.map((k) => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div className="rechts">
                <div style={{ textAlign: 'right' }}>
                  <div className={z.betrag > 0 ? 'plus' : 'minus'}>{euro(z.betrag, true)}</div>
                  <div className="klein">{kurzesDatum(z.datum)}</div>
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
      {!zeigeText && (
        <button className="knopf grau klein" style={{ marginTop: 12 }} onClick={() => setZeigeText(true)}>
          Gelesenen Text zeigen
        </button>
      )}
    </Blatt>
  );
}
