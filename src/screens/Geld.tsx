import {
  ArrowsLeftRight,
  Bag,
  Bank,
  BeerStein,
  CaretLeft,
  CaretRight,
  Cigarette,
  DotsThree,
  Drop,
  FilePlus,
  FirstAid,
  ForkKnife,
  GraduationCap,
  House,
  Money,
  MusicNotes,
  PiggyBank,
  Plus,
  Repeat,
  Scooter,
  ShoppingCart,
  Ticket,
  Trash,
  TrendUp,
  X,
} from '@phosphor-icons/react';
import { useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { aboSetzen, buchungEintragen, buchungenImport, kategorieLernen } from '../aktionen';
import { leseAuszug, mitKategorie, type RohBuchung } from '../lib/bank';
import { kurzesDatum, lies, monatName, tagKey, tagName } from '../lib/datum';
import { jobBild } from '../lib/job';
import { haendlerKey, KATEGORIE_FARBE, KATEGORIEN } from '../lib/kategorien';
import { euro, findeAbos, monateMitDaten, monatsBild, sparplan, type Sparplan } from '../lib/sparplan';
import { aendere, neueId, useDaten } from '../store';
import type { Buchung } from '../types';
import { JobKarte } from '../ui/JobKarte';
import { Blatt, geh, Gruppe, Icon, Kopf, Leer, Segment, toast, useJetzt, Zeile } from '../ui/ui';

const ICON: Record<string, ReactNode> = {
  Lebensmittel: <ShoppingCart size={16} weight="fill" />,
  'Essen & Trinken': <ForkKnife size={16} weight="fill" />,
  'Bar & Ausgehen': <BeerStein size={16} weight="fill" />,
  'Zigaretten & Kiosk': <Cigarette size={16} weight="fill" />,
  Drogerie: <Drop size={16} weight="fill" />,
  Mobilität: <Scooter size={16} weight="fill" />,
  'Abos & Software': <Repeat size={16} weight="bold" />,
  'Musik & Equipment': <MusicNotes size={16} weight="fill" />,
  Shopping: <Bag size={16} weight="fill" />,
  Freizeit: <Ticket size={16} weight="fill" />,
  'Wohnen & Handy': <House size={16} weight="fill" />,
  Gesundheit: <FirstAid size={16} weight="fill" />,
  'Versicherung & Gebühren': <Bank size={16} weight="fill" />,
  Bildung: <GraduationCap size={16} weight="fill" />,
  Überweisungen: <ArrowsLeftRight size={16} weight="bold" />,
  Bargeld: <Money size={16} weight="fill" />,
  Sparen: <PiggyBank size={16} weight="fill" />,
  Sonstiges: <DotsThree size={16} weight="bold" />,
  Einnahmen: <TrendUp size={16} weight="bold" />,
};

export function KategorieIcon({ name }: { name: string }) {
  return <Icon farbe={KATEGORIE_FARBE[name] ?? '#aeaeb2'}>{ICON[name] ?? ICON.Sonstiges}</Icon>;
}

/** Betrag mit Vorzeichen: Ausgaben rot, Einnahmen grün. */
export function Betrag({ cent, mitCent = true, gross = false }: { cent: number; mitCent?: boolean; gross?: boolean }) {
  const text = `${cent > 0 ? '+' : cent < 0 ? '−' : ''}${euro(Math.abs(cent), mitCent)}`;
  return <span className={`betrag ${cent > 0 ? 'rein' : cent < 0 ? 'raus' : ''}${gross ? ' gross' : ''}`}>{text}</span>;
}

/** Plan mit Job-Hochrechnung, wie er überall im Geld-Bereich gebraucht wird. */
function usePlan(): Sparplan {
  const d = useDaten();
  const jetzt = useJetzt();
  return useMemo(() => {
    const job = d.job.aktiv ? jobBild(d.job, jetzt).hochrechnung : 0;
    return sparplan(d.buchungen, d.geplant, d.einstellungen, jetzt, job);
  }, [d.buchungen, d.geplant, d.einstellungen, d.job, jetzt]);
}

type Ansicht = 'uebersicht' | 'buchungen' | 'plan';

export function Geld({ unter }: { unter?: string }) {
  const ansicht: Ansicht = unter === 'buchungen' ? 'buchungen' : unter === 'plan' || unter === 'sparplan' ? 'plan' : 'uebersicht';
  const [importRoh, setImportRoh] = useState<{ zeilen: RohBuchung[]; text: string } | null>(null);
  const [eintrag, setEintrag] = useState(false);
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
      console.error(e);
      toast(`Die Datei konnte nicht gelesen werden (${e instanceof Error ? e.message : 'unbekannter Fehler'}). Versuch es mit einem Screenshot.`, true);
      return;
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
          <>
            <button className="rund" onClick={() => setEintrag(true)} aria-label="Einnahme oder Ausgabe eintragen">
              <Plus size={19} weight="bold" />
            </button>
            <button className="rund" onClick={() => datei.current?.click()} aria-label="Kontoauszug hinzufügen">
              <FilePlus size={19} />
            </button>
          </>
        }
      />
      <input ref={datei} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => dateienLesen(e.target.files)} />

      {laedt && (
        <div className="banner">
          <div className="haupt">{laedt}</div>
        </div>
      )}

      <Segment<Ansicht>
        wert={ansicht}
        optionen={[
          ['uebersicht', 'Übersicht'],
          ['buchungen', 'Buchungen'],
          ['plan', 'Plan'],
        ]}
        onChange={(w) => geh(w === 'uebersicht' ? 'geld' : `geld/${w}`)}
      />

      {ansicht === 'uebersicht' && <Uebersicht onImport={() => datei.current?.click()} onText={() => setImportRoh({ zeilen: [], text: '' })} onEintrag={() => setEintrag(true)} />}
      {ansicht === 'buchungen' && <Buchungen />}
      {ansicht === 'plan' && <PlanAnsicht />}

      {importRoh && <ImportBlatt start={importRoh} onClose={() => setImportRoh(null)} />}
      {eintrag && <EintragBlatt onClose={() => setEintrag(false)} />}
    </div>
  );
}

// --- Übersicht --------------------------------------------------------------

function Uebersicht({ onImport, onText, onEintrag }: { onImport: () => void; onText: () => void; onEintrag: () => void }) {
  const d = useDaten();
  const jetzt = useJetzt();
  const plan = usePlan();
  const monate = monateMitDaten(d.buchungen);
  const [index, setIndex] = useState(0);
  const monat = monate[index] ?? tagKey(jetzt).slice(0, 7);
  const istAktuell = monat === tagKey(jetzt).slice(0, 7);
  const bild = monatsBild(d.buchungen, monat);
  const abos = useMemo(() => findeAbos(d.buchungen, d.einstellungen.aboRegeln), [d.buchungen, d.einstellungen.aboRegeln]);

  if (!d.buchungen.length) {
    return (
      <>
        <div className="karte">
          <Leer titel="Noch keine Buchungen" icon={<Bank size={26} weight="fill" />} farbe="var(--mint)">
            Lade einen Volksbank-Kontoauszug als PDF hoch oder einen Screenshot aus der Banking-App. Schwärze vorher, was MILI nicht sehen soll.
          </Leer>
          <div style={{ padding: '0 16px 16px', display: 'grid', gap: 8 }}>
            <button className="knopf voll" onClick={onImport}>Kontoauszug auswählen</button>
            <button className="knopf grau voll" onClick={onEintrag}>Einnahme oder Ausgabe eintragen</button>
          </div>
        </div>
        <p className="gruppe-fuss">Im VR Banking: Postfach oder Kontoauszüge, PDF teilen, „In Dateien sichern“. Dann hier auswählen. Nichts davon verlässt dein iPhone.</p>
      </>
    );
  }

  // Die fünf größten Posten im Balken, der Rest als "Andere"
  const top = bild.kategorien.slice(0, 5);
  const rest = bild.kategorien.slice(5).reduce((a, k) => a + k.summe, 0);
  const segmente = [...top.map((k) => ({ name: k.name, summe: k.summe, farbe: KATEGORIE_FARBE[k.name] ?? '#aeaeb2' })), ...(rest > 0 ? [{ name: 'Andere', summe: rest, farbe: '#c7c7cc' }] : [])];
  const budgetVon = (name: string) => (istAktuell ? plan.budgets.find((b) => b.kategorie === name && b.budget > 0) : undefined);
  const bilanz = bild.einnahmen - bild.ausgaben;

  return (
    <>
      <div className="monat-wahl">
        <button className="rund" disabled={index >= monate.length - 1} onClick={() => setIndex(index + 1)} aria-label="Monat zurück">
          <CaretLeft size={18} weight="bold" />
        </button>
        <div className="fett">{monatName(monat)}</div>
        <button className="rund" disabled={index <= 0} onClick={() => setIndex(index - 1)} aria-label="Monat vor">
          <CaretRight size={18} weight="bold" />
        </button>
      </div>

      <div className="karte rein-raus">
        <div>
          <div className="was">Rein</div>
          <Betrag cent={bild.einnahmen} mitCent={false} gross />
        </div>
        <div>
          <div className="was">Raus</div>
          <Betrag cent={-bild.ausgaben} mitCent={false} gross />
        </div>
        <div className="bilanz-zeile">
          <span>{bilanz >= 0 ? 'Übrig' : 'Mehr ausgegeben als reinkam'}</span>
          <Betrag cent={bilanz} mitCent={false} />
        </div>
        {istAktuell && plan.proWoche > 0 && (
          <div className="bilanz-zeile leise">
            <span>Laut Plan pro Woche für Alltag</span>
            <span className="fett">{euro(plan.proWoche)}</span>
          </div>
        )}
      </div>

      <Gruppe titel="Wofür">
        <div className="karte innen">
          <div className="bilanz-balken" role="img" aria-label={segmente.map((s) => `${s.name} ${euro(s.summe)}`).join(', ')}>
            {segmente.map((s) => (
              <i key={s.name} title={`${s.name}: ${euro(s.summe)}`} style={{ '--farbe': s.farbe, flexGrow: s.summe } as CSSProperties} />
            ))}
          </div>
          <div className="bilanz-legende">
            {segmente.map((s) => (
              <span key={s.name} style={{ '--farbe': s.farbe } as CSSProperties}>
                {s.name} <b>{Math.round((s.summe / Math.max(1, bild.ausgaben)) * 100)} %</b>
              </span>
            ))}
          </div>
        </div>
        <div className="karte" style={{ marginTop: 12 }}>
          {bild.kategorien.map((k) => {
            const b = budgetVon(k.name);
            return (
              <button key={k.name} className="zeile mit-icon" onClick={() => geh(`geld/buchungen?k=${encodeURIComponent(k.name)}&m=${monat}`)}>
                <KategorieIcon name={k.name} />
                <div className="haupt">
                  <div className="kat-kopf">
                    <span className="titel">{k.name}</span>
                    <Betrag cent={-k.summe} mitCent={false} />
                  </div>
                  {b ? <BudgetBalken ausgegeben={k.summe} budget={b.budget} /> : <div className="neben">{Math.round((k.summe / Math.max(1, bild.ausgaben)) * 100)} % deiner Ausgaben</div>}
                </div>
              </button>
            );
          })}
        </div>
      </Gruppe>

      <Gruppe titel="Abos" fuss="Monatlich gleicher Betrag oder als Abo eingeordnet. Fehlt eins oder ist eins falsch: in Buchungen auf die Abbuchung tippen.">
        <div className="karte">
          {abos.length === 0 && <Leer titel="Keine Abos erkannt" />}
          {abos.map((a) => (
            <Zeile
              key={a.key}
              icon={ICON['Abos & Software']}
              farbe={KATEGORIE_FARBE['Abos & Software']}
              titel={a.name}
              neben={a.manuell ? 'von dir markiert' : a.monate > 1 ? `seit ${a.monate} Monaten` : 'Abo'}
              rechts={
                <>
                  <Betrag cent={-a.betrag} />
                  <button className="rund" aria-label="Kein Abo" onClick={() => { aboSetzen(a.key, false); toast(`${a.name} ist kein Abo mehr`); }}>
                    <X size={14} weight="bold" />
                  </button>
                </>
              }
            />
          ))}
          {abos.length > 0 && (
            <div className="bilanz-zeile" style={{ padding: '12px 16px' }}>
              <span className="fett">Zusammen pro Monat</span>
              <Betrag cent={-abos.reduce((s, a) => s + a.betrag, 0)} />
            </div>
          )}
        </div>
      </Gruppe>

      <div className="knopf-reihe">
        <button className="knopf zweit" onClick={onImport}>Auszug hinzufügen</button>
        <button className="knopf grau" onClick={onEintrag}>Eintragen</button>
        <button className="knopf grau" onClick={onText}>Text einfügen</button>
      </div>
    </>
  );
}

function BudgetBalken({ ausgegeben, budget }: { ausgegeben: number; budget: number }) {
  const anteil = ausgegeben / Math.max(1, budget);
  const status = anteil >= 1 ? 'drueber' : anteil >= 0.8 ? 'knapp' : 'gut';
  return (
    <>
      <div className="budget-spur">
        <div className={`budget-fuellung ${status}`} style={{ width: `${Math.min(100, anteil * 100)}%` }} />
      </div>
      <div className={`neben budget-text ${status}`}>
        {anteil >= 1 ? `${euro(ausgegeben - budget)} über Budget (${euro(budget)})` : `noch ${euro(budget - ausgegeben)} von ${euro(budget)}`}
      </div>
    </>
  );
}

// --- Buchungen --------------------------------------------------------------

function Buchungen() {
  const d = useDaten();
  const jetzt = useJetzt();
  const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
  const [filter, setFilter] = useState(params.get('k') ?? '');
  const monat = params.get('m') ?? '';
  const [bearbeite, setBearbeite] = useState<Buchung | null>(null);
  const abos = useMemo(() => new Set(findeAbos(d.buchungen, d.einstellungen.aboRegeln).map((a) => a.key)), [d.buchungen, d.einstellungen.aboRegeln]);

  const liste = d.buchungen
    .filter((b) => (!filter || b.kategorie === filter) && (!monat || b.datum.startsWith(monat)))
    .sort((x, y) => y.datum.localeCompare(x.datum));
  const tage = new Map<string, Buchung[]>();
  for (const b of liste) tage.set(b.datum, [...(tage.get(b.datum) ?? []), b]);

  return (
    <>
      <div className="chips" style={{ marginBottom: 16 }}>
        <button className={`chip${!filter ? ' an' : ''}`} onClick={() => setFilter('')}>Alle</button>
        {KATEGORIEN.filter((k) => d.buchungen.some((b) => b.kategorie === k)).map((k) => (
          <button key={k} className={`chip${filter === k ? ' an' : ''}`} style={{ '--farbe': KATEGORIE_FARBE[k] } as CSSProperties} onClick={() => setFilter(k)}>
            {k}
          </button>
        ))}
      </div>
      {monat && (
        <p className="leise klein" style={{ margin: '-6px 4px 12px' }}>
          {monatName(monat)} · <a href="#/geld/buchungen">alle Monate</a>
        </p>
      )}
      {liste.length === 0 && (
        <div className="karte">
          <Leer titel="Keine Buchungen" />
        </div>
      )}
      {[...tage.entries()].map(([tag, bs]) => (
        <Gruppe key={tag} titel={<span style={{ fontSize: 15, color: 'var(--text-2)' }}>{tagName(lies(tag), jetzt)} · {kurzesDatum(tag)}</span>}>
          <div className="karte">
            {bs.map((b) => (
              <button key={b.id} className="zeile mit-icon" onClick={() => setBearbeite(b)}>
                <KategorieIcon name={b.kategorie} />
                <div className="haupt">
                  <div className="titel">{b.text.split(' · ')[0]}</div>
                  <div className="neben">
                    {b.kategorie}
                    {abos.has(haendlerKey(b.text)) ? ' · Abo' : ''}
                    {b.manuell ? ' · eingetragen' : ''}
                  </div>
                </div>
                <Betrag cent={b.betrag} />
              </button>
            ))}
          </div>
        </Gruppe>
      ))}
      {bearbeite && <BuchungBlatt b={bearbeite} istAbo={abos.has(haendlerKey(bearbeite.text))} onClose={() => setBearbeite(null)} />}
    </>
  );
}

function BuchungBlatt({ b, istAbo, onClose }: { b: Buchung; istAbo: boolean; onClose: () => void }) {
  const key = haendlerKey(b.text);
  return (
    <Blatt titel="Buchung" offen onClose={onClose}>
      <div className="karte innen" style={{ marginBottom: 16 }}>
        <div className="fett">{b.text}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span className="leise">{kurzesDatum(b.datum)}</span>
          <Betrag cent={b.betrag} />
        </div>
        {b.info && <div className="leise klein" style={{ marginTop: 8 }}>{b.info}</div>}
      </div>
      <div className="label">Kategorie (gilt ab jetzt für alle Buchungen dieses Empfängers)</div>
      <div className="chips" style={{ flexWrap: 'wrap', marginBottom: 20 }}>
        {KATEGORIEN.map((k) => (
          <button
            key={k}
            className={`chip${b.kategorie === k ? ' an' : ''}`}
            style={{ '--farbe': KATEGORIE_FARBE[k] } as CSSProperties}
            onClick={() => {
              kategorieLernen(b, k);
              toast(`${k} gemerkt`);
              onClose();
            }}
          >
            {k}
          </button>
        ))}
      </div>
      {b.betrag < 0 && key && (
        <div className="karte" style={{ marginBottom: 16 }}>
          <label className="zeile">
            <div className="haupt">
              <div className="titel">Ist ein Abo</div>
              <div className="neben">Zählt bei den Abos und im Plan als feste Kosten</div>
            </div>
            <input type="checkbox" checked={istAbo} onChange={(e) => { aboSetzen(key, e.target.checked); onClose(); }} style={{ width: 22, height: 22, accentColor: 'var(--accent)' }} />
          </label>
        </div>
      )}
      <button
        className="knopf rot"
        onClick={() => {
          aendere((x) => {
            x.buchungen = x.buchungen.filter((y) => y.id !== b.id);
          });
          onClose();
        }}
      >
        <Trash size={16} /> Buchung löschen
      </button>
    </Blatt>
  );
}

function EintragBlatt({ onClose }: { onClose: () => void }) {
  const [art, setArt] = useState<'raus' | 'rein'>('raus');
  const [betrag, setBetrag] = useState('');
  const [text, setText] = useState('');
  const [datum, setDatum] = useState(tagKey(new Date()));
  const [kategorie, setKategorie] = useState('Sonstiges');
  const speichern = () => {
    const cent = Math.round((parseFloat(betrag.replace(',', '.')) || 0) * 100);
    if (!cent || !text.trim()) {
      toast('Betrag und wofür fehlen', true);
      return;
    }
    buchungEintragen({ datum, text: text.trim(), betrag: art === 'rein' ? cent : -cent, kategorie: art === 'rein' ? 'Einnahmen' : kategorie });
    toast(art === 'rein' ? 'Einnahme eingetragen' : 'Ausgabe eingetragen');
    onClose();
  };
  return (
    <Blatt titel="Eintragen" offen onClose={onClose} fertig={speichern} fertigText="Sichern">
      <div className="formular">
        <Segment<'raus' | 'rein'> wert={art} optionen={[['raus', 'Ausgabe'], ['rein', 'Einnahme']]} onChange={setArt} />
        <input className={`feld betrag-feld ${art}`} inputMode="decimal" placeholder="0,00 €" value={betrag} onChange={(e) => setBetrag(e.target.value)} autoFocus />
        <input className="feld" placeholder={art === 'rein' ? 'z. B. Lohn, Kindergeld, von Oma' : 'Wofür?'} value={text} onChange={(e) => setText(e.target.value)} />
        <input className="feld" type="date" value={datum} onChange={(e) => setDatum(e.target.value)} aria-label="Datum" />
        {art === 'raus' && (
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {KATEGORIEN.filter((k) => k !== 'Einnahmen').map((k) => (
              <button key={k} className={`chip${kategorie === k ? ' an' : ''}`} style={{ '--farbe': KATEGORIE_FARBE[k] } as CSSProperties} onClick={() => setKategorie(k)}>
                {k}
              </button>
            ))}
          </div>
        )}
      </div>
    </Blatt>
  );
}

// --- Plan ---------------------------------------------------------------------

function PlanAnsicht() {
  const d = useDaten();
  const p = usePlan();
  const [neu, setNeu] = useState({ titel: '', betrag: '', datum: '' });
  const [einnahme, setEinnahme] = useState({ titel: '', betrag: '' });

  const verteilung = [
    { name: 'Fixkosten', wert: p.fixkosten, farbe: '#8e8e93' },
    { name: 'Rücklagen', wert: p.ruecklagenSumme, farbe: 'var(--blau)' },
    { name: 'Sparen', wert: p.sparziel, farbe: 'var(--gruen)' },
    { name: 'Alltag', wert: Math.max(0, p.spielraum), farbe: 'var(--orange)' },
  ].filter((x) => x.wert > 0);
  const quelleText = p.einkommenQuelle === 'fest' ? 'selbst festgelegt' : p.einkommenQuelle === 'geplant' ? 'aus Job und Einnahmen' : 'aus deinen Gutschriften geschätzt';

  return (
    <>
      <div className="hero" style={{ '--h1': '#ff9f0a', '--h2': '#ff6b3d', '--h3': '#ff375f' } as CSSProperties}>
        <div className="klein-titel">Pro Woche für Alltag</div>
        <div className="gross-zahl" style={{ marginTop: 4 }}>{euro(p.proWoche)}</div>
        <div className="wann">Essen, Ausgehen, Kiosk, Shopping: {euro(Math.max(0, p.spielraum))} im Monat</div>
        <div className="zaehler">
          <span>Sparen {euro(p.sparziel)}/Monat</span>
          <span>in 12 Monaten {euro(p.sparziel * 12)}</span>
        </div>
      </div>
      <div style={{ height: 14 }} />

      <Gruppe titel="So teilt sich dein Monat">
        <div className="karte innen">
          <div className="bilanz-kopf">
            <span>
              <span className="gross">{euro(p.einkommen)}</span> <span className="leise">rein</span>
            </span>
            <span className="leise klein">{quelleText}</span>
          </div>
          <div className="bilanz-balken">
            {verteilung.map((v) => (
              <i key={v.name} style={{ '--farbe': v.farbe, flexGrow: v.wert } as CSSProperties} />
            ))}
          </div>
          <div className="bilanz-legende">
            {verteilung.map((v) => (
              <span key={v.name} style={{ '--farbe': v.farbe } as CSSProperties}>
                {v.name} <b>{euro(v.wert)}</b>
              </span>
            ))}
          </div>
          {p.spielraum < 0 && <p className="budget-text drueber" style={{ margin: '10px 0 0' }}>Es fehlen {euro(-p.spielraum)} im Monat. Senk die Sparquote oder verschieb eine geplante Ausgabe.</p>}
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

      <Gruppe titel="Budget pro Kategorie" fuss="Dein Alltagsgeld, verteilt nach deinen bisherigen Ausgaben. Der Balken zeigt, wie viel diesen Monat schon weg ist.">
        <div className="karte">
          {p.budgets.filter((b) => b.budget > 0).length === 0 && <Leer titel="Noch kein Budget">Dafür braucht MILI mindestens einen Monat Buchungen und ein Einkommen.</Leer>}
          {p.budgets
            .filter((b) => b.budget > 0)
            .map((b) => (
              <div key={b.kategorie} className="zeile mit-icon">
                <KategorieIcon name={b.kategorie} />
                <div className="haupt">
                  <div className="kat-kopf">
                    <span className="titel">{b.kategorie}</span>
                    <span className="fett">{euro(b.budget)}</span>
                  </div>
                  <BudgetBalken ausgegeben={b.ausgegeben} budget={b.budget} />
                </div>
              </div>
            ))}
        </div>
      </Gruppe>

      <Gruppe titel="Job">
        <JobKarte />
      </Gruppe>

      <Gruppe titel="Regelmäßige Einnahmen" fuss="Was jeden Monat sicher reinkommt, z. B. Kindergeld oder Geld von den Eltern.">
        <div className="karte">
          {(d.einstellungen.einnahmen ?? []).map((x) => (
            <Zeile
              key={x.id}
              icon={ICON.Einnahmen}
              farbe="var(--gruen)"
              titel={x.titel}
              rechts={
                <>
                  <Betrag cent={x.betrag} mitCent={false} />
                  <button className="rund" aria-label="Löschen" onClick={() => aendere((y) => { y.einstellungen.einnahmen = (y.einstellungen.einnahmen ?? []).filter((z) => z.id !== x.id); })}>
                    <Trash size={14} />
                  </button>
                </>
              }
            />
          ))}
          <form
            className="vorschlag"
            onSubmit={(e) => {
              e.preventDefault();
              const cent = Math.round((parseFloat(einnahme.betrag.replace(',', '.')) || 0) * 100);
              if (!einnahme.titel.trim() || !cent) {
                toast('Was und wie viel im Monat?', true);
                return;
              }
              aendere((y) => {
                y.einstellungen.einnahmen = [...(y.einstellungen.einnahmen ?? []), { id: neueId(), titel: einnahme.titel.trim(), betrag: cent }];
              });
              setEinnahme({ titel: '', betrag: '' });
            }}
          >
            <div className="zwei-spalten">
              <input className="feld" placeholder="z. B. Kindergeld" value={einnahme.titel} onChange={(e) => setEinnahme({ ...einnahme, titel: e.target.value })} />
              <input className="feld" inputMode="decimal" placeholder="€ pro Monat" value={einnahme.betrag} onChange={(e) => setEinnahme({ ...einnahme, betrag: e.target.value })} />
            </div>
            <button className="knopf zweit" type="submit">Hinzufügen</button>
          </form>
        </div>
      </Gruppe>

      <Gruppe titel="Sparen" fuss={p.basisMonate ? `Gerechnet mit ${p.basisMonate} ${p.basisMonate === 1 ? 'Monat' : 'Monaten'} deiner Buchungen.` : undefined}>
        <div className="karte">
          <label className="zeile">
            <div className="haupt">Anteil vom Einkommen</div>
            <input
              type="range"
              min={0}
              max={40}
              step={5}
              value={d.einstellungen.sparquote}
              onChange={(e) => aendere((x) => { x.einstellungen.sparquote = +e.target.value; })}
              style={{ width: 130, accentColor: 'var(--gruen)' }}
            />
            <span className="leise" style={{ width: 44, textAlign: 'right' }}>{d.einstellungen.sparquote} %</span>
          </label>
          <label className="zeile">
            <div className="haupt">
              <div className="titel">Einkommen festlegen</div>
              <div className="neben">optional, sonst aus Job und Einnahmen</div>
            </div>
            <input
              className="ohne"
              inputMode="decimal"
              placeholder="automatisch"
              value={d.einstellungen.einkommen ? String(d.einstellungen.einkommen / 100) : ''}
              onChange={(e) => aendere((x) => { x.einstellungen.einkommen = Math.round((parseFloat(e.target.value.replace(',', '.')) || 0) * 100); })}
              style={{ width: 110 }}
            />
          </label>
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
                toast('Was, wie viel und bis wann?', true);
                return;
              }
              aendere((x) => {
                x.geplant.push({ id: neueId(), titel: neu.titel.trim(), betrag, datum: neu.datum });
              });
              setNeu({ titel: '', betrag: '', datum: '' });
            }}
          >
            <input className="feld" placeholder="z. B. Umzug nach Berlin" value={neu.titel} onChange={(e) => setNeu({ ...neu, titel: e.target.value })} />
            <div className="zwei-spalten">
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
                  <div><Betrag cent={z.betrag} /></div>
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
