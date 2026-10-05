import { Cake, CalendarBlank, ChatsCircle, Confetti, GraduationCap, Microphone, MusicNotes, ShoppingCart, Wallet } from '@phosphor-icons/react';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { oeffneAbladen } from '../abladen';
import { naechsteFristen, naechsteGeburtstage, tagesEintraege, ueberfaelligeAufgaben, wochenBilanz } from '../lib/agenda';
import { BEREICHE, istEinkauf } from '../lib/bereiche';
import { langesDatum, lies, plusTage, startDesTages, tageBis, tagKey, WOCHENTAGE_KURZ } from '../lib/datum';
import { useNews, wieAlt } from '../lib/news';
import { jobBild } from '../lib/job';
import { euro, sparplan } from '../lib/sparplan';
import { useDaten } from '../store';
import { EintragZeile, eintragFarbe, KalenderBanner, KalenderKnopf } from '../ui/Agenda';
import { EinkaufBlatt } from '../ui/Einkauf';
import { FARBE, farbStil, geh, Icon, Kopf, Leer, tageszeit, useJetzt } from '../ui/ui';

const RUBRIK_FARBEN: Record<string, [string, string]> = {
  Produktion: ['var(--indigo)', ''],
  Business: ['var(--blau)', ''],
  Künstler: ['var(--pink)', ''],
  Stuttgart: ['var(--gruen)', ''],
  Berlin: ['var(--orange)', ''],
  Studium: ['var(--lila)', ''],
};


export function Heute() {
  const d = useDaten();
  const jetzt = useJetzt(30000);
  const zeit = tageszeit(jetzt);
  const name = d.einstellungen.name?.trim();

  return (
    <div className="seite">
      <div className="rein" style={{ '--i': 0 } as CSSProperties}>
        <Kopf
          ueber={langesDatum(jetzt)}
          titel={name ? `${zeit.gruss}, ${name}` : zeit.gruss}
          aktionen={
            <button className="profil" onClick={() => geh('mehr/einstellungen')} aria-label="Einstellungen">
              {(name || 'M').charAt(0).toUpperCase()}
            </button>
          }
        />
      </div>
      <KalenderBanner />

      <div className="rein" style={{ '--i': 1 } as CSSProperties}>
        <button className="abladen-pille karte" onClick={() => oeffneAbladen('tippen')}>
          <span>Was geht dir durch den Kopf?</span>
          <span
            className="mic"
            role="button"
            aria-label="Sprechen"
            onClick={(e) => {
              e.stopPropagation();
              oeffneAbladen();
            }}
          >
            <Microphone size={22} weight="fill" />
          </span>
        </button>
      </div>

      <div className="rein" style={{ '--i': 2 } as CSSProperties}>
        <DeinTag jetzt={jetzt} />
      </div>

      <div className="rein" style={{ '--i': 3 } as CSSProperties}>
        <Widgets jetzt={jetzt} />
      </div>

      <div className="rein" style={{ '--i': 4 } as CSSProperties}>
        <Woche jetzt={jetzt} />
      </div>

      <div className="rein" style={{ '--i': 5 } as CSSProperties}>
        <Bilanz jetzt={jetzt} />
      </div>

      <div className="rein" style={{ '--i': 6 } as CSSProperties}>
        <News jetzt={jetzt} />
      </div>
    </div>
  );
}

function dauerText(min: number): string {
  if (min < 1) return 'jetzt';
  if (min < 60) return `in ${min} Min.`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `in ${h} Std. ${m} Min.` : `in ${h} Std.`;
}

function DeinTag({ jetzt }: { jetzt: Date }) {
  const d = useDaten();
  const zeit = tageszeit(jetzt);
  const eintraege = tagesEintraege(d, jetzt);
  const ueberfaellig = ueberfaelligeAufgaben(d, jetzt);
  const anfragen = d.anfragen.filter((a) => a.status === 'offen').length;
  const jetztMin = jetzt.getHours() * 60 + jetzt.getMinutes();
  const minuten = (z?: string) => (z ? +z.slice(0, 2) * 60 + +z.slice(3, 5) : undefined);

  const mitZeit = eintraege.filter((e) => e.zeit);
  const laeuft = mitZeit.find((e) => minuten(e.zeit)! <= jetztMin && (minuten(e.bis) ?? minuten(e.zeit)! + 60) > jetztMin);
  const naechstes = mitZeit.find((e) => minuten(e.zeit)! > jetztMin);
  const offeneAufgaben = eintraege.filter((e) => e.art === 'aufgabe').length + ueberfaellig.length;
  const [liste, setListe] = useState(false);
  const einkaufHeute = eintraege.some((e) => e.einkauf) || ueberfaellig.some((a) => istEinkauf(a.titel));
  const einkaufOffen = d.einkauf.filter((e) => !e.erledigt).length;
  const termine = eintraege.filter((e) => e.art !== 'aufgabe').length;

  let titel: ReactNode = 'Nichts mehr geplant';
  let unter: ReactNode = offeneAufgaben ? 'Nur noch ein paar Aufgaben, dann ist Feierabend.' : 'Genieß den Tag.';
  let klein = 'Dein Tag';
  if (laeuft) {
    klein = 'Gerade';
    titel = laeuft.titel;
    unter = laeuft.bis ? `bis ${laeuft.bis}` : 'läuft';
  } else if (naechstes) {
    klein = 'Als Nächstes';
    titel = naechstes.titel;
    unter = `${dauerText(minuten(naechstes.zeit)! - jetztMin)} · ${naechstes.zeit}${naechstes.bis ? ` bis ${naechstes.bis}` : ''}`;
  } else if (!eintraege.length && !ueberfaellig.length) {
    titel = 'Freier Tag';
    unter = 'Nichts im Kalender. Zeit für Musik?';
  }

  return (
    <>
    <div
      className="hero"
      style={{ '--h1': zeit.hero[0], '--h2': zeit.hero[1], '--h3': zeit.hero[2] } as CSSProperties}
      onClick={() => geh('woche')}
      role="button"
    >
      <div className="klein-titel">{klein}</div>
      <div className="naechstes">{titel}</div>
      <div className="wann">{unter}</div>

      {(eintraege.length > 0 || ueberfaellig.length > 0) && (
        <div className="liste">
          {ueberfaellig.slice(0, 2).map((a) => (
            <div key={a.id} className="punkt">
              <span className="z">!</span>
              <span className="t">{a.titel}</span>
            </div>
          ))}
          {eintraege.slice(0, 5).map((e) => {
            const vorbei = e.zeit && (minuten(e.bis) ?? minuten(e.zeit)! + 60) <= jetztMin;
            return (
              <div key={e.key} className={`punkt${e === laeuft || e === naechstes ? ' jetzt' : ''}${vorbei ? ' erledigt' : ''}`}>
                <span className="z">{e.zeit ?? (e.art === 'aufgabe' ? 'To-do' : e.art === 'geburtstag' ? 'Geb.' : 'Tag')}</span>
                <span className="t">{e.titel}</span>
              </div>
            );
          })}
          {eintraege.length > 5 && <div className="punkt"><span className="z" /><span className="t">und {eintraege.length - 5} weitere</span></div>}
        </div>
      )}

      <div className="zaehler">
        <span>{termine} {termine === 1 ? 'Termin' : 'Termine'}</span>
        <span>{offeneAufgaben} {offeneAufgaben === 1 ? 'Aufgabe' : 'Aufgaben'}</span>
        {anfragen > 0 && <span>{anfragen} {anfragen === 1 ? 'Anfrage' : 'Anfragen'}</span>}
        {ueberfaellig.length > 0 && <span>{ueberfaellig.length} überfällig</span>}
        {einkaufHeute && (
          <span
            role="button"
            className="hero-einkauf"
            onClick={(ev) => {
              ev.stopPropagation();
              setListe(true);
            }}
          >
            <ShoppingCart size={13} weight="fill" /> Einkaufsliste · {einkaufOffen}
          </span>
        )}
      </div>
    </div>
    <EinkaufBlatt offen={liste} onClose={() => setListe(false)} />
    </>
  );
}

/** Wochenende beginnt Freitag 18 Uhr und endet Montag 0 Uhr. */
function wochenende(jetzt: Date) {
  const tag = jetzt.getDay();
  const montag = startDesTages(plusTage(jetzt, -((tag + 6) % 7)));
  const freitagAbend = new Date(montag.getFullYear(), montag.getMonth(), montag.getDate() + 4, 18);
  const naechsterMontag = plusTage(montag, 7);
  if (jetzt >= freitagAbend) {
    return { jetzt: true, rest: naechsterMontag.getTime() - jetzt.getTime(), anteil: 1 };
  }
  const gesamt = freitagAbend.getTime() - montag.getTime();
  const rest = freitagAbend.getTime() - jetzt.getTime();
  return { jetzt: false, rest, anteil: 1 - rest / gesamt };
}

/** Bierglas, das sich über die Woche füllt. Ab Freitag 18 Uhr voll, mit Schaum und Prost-Wackeln. */
function Bierglas({ anteil, voll }: { anteil: number; voll: boolean }) {
  const oben = 14;
  const unten = 100;
  const pegel = voll ? oben + 2 : unten - (unten - oben) * Math.min(0.97, Math.max(0.06, anteil));
  const glas = 'M8 8 L72 8 L66 98 Q65 104 59 104 L21 104 Q15 104 14 98 Z';
  const id = 'bier-glas';
  return (
    <svg className={`bier${voll ? ' voll' : ''}`} viewBox="0 0 80 110" aria-hidden>
      <defs>
        <clipPath id={id}>
          <path d={glas} />
        </clipPath>
        <linearGradient id="bier-farbe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd54a" />
          <stop offset="1" stopColor="#f29a0c" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${id})`}>
        <path d={glas} fill="currentColor" opacity="0.06" />
        <g className="fluessig">
          <g className="welle">
            <path
              d={`M0 ${pegel} q10 -4 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V110 H0 Z`}
              fill="url(#bier-farbe)"
            />
          </g>
          {[18, 30, 44, 56, 38].map((x, i) => (
            <circle key={i} className="blase" cx={x} cy={unten - 2} r={i % 2 ? 1.6 : 2.2} style={{ animationDelay: `${i * 0.5}s` }} />
          ))}
          {(voll || anteil > 0.8) && (
            <g className="schaum">
              {[14, 26, 38, 50, 62].map((x, i) => (
                <circle key={x} cx={x} cy={pegel - 1 + (i % 2) * 2} r={9} />
              ))}
            </g>
          )}
        </g>
      </g>
      {voll && (
        <g className="schaum">
          {[12, 24, 36, 48, 60, 70].map((x, i) => (
            <circle key={x} cx={x} cy={8 - (i % 2) * 3} r={8 + (i % 3)} />
          ))}
        </g>
      )}
      <path className="glas-rand" d={glas} />
      <path className="glanz" d="M20 20 L23 88" />
    </svg>
  );
}

type Widget = { key: string; breit?: boolean; bier?: boolean; inhalt: ReactNode; onClick: () => void; farbig?: [string, string]; farbe?: string };

function Widgets({ jetzt }: { jetzt: Date }) {
  const d = useDaten();
  const we = wochenende(jetzt);
  const tage = Math.floor(we.rest / 86400000);
  const std = Math.floor((we.rest % 86400000) / 3600000);
  const min = Math.floor((we.rest % 3600000) / 60000);
  const anfragen = d.anfragen.filter((a) => a.status === 'offen');
  const einkauf = d.einkauf.filter((e) => !e.erledigt);
  const frist = naechsteFristen(d, jetzt)[0];
  const geb = naechsteGeburtstage(d, 30, jetzt)[0];
  const plan = d.buchungen.length || d.job.aktiv ? sparplan(d.buchungen, d.geplant, d.einstellungen, jetzt, d.job.aktiv ? jobBild(d.job, jetzt).hochrechnung : 0) : undefined;

  const kopf = (icon: ReactNode, text: string) => (
    <div className="w-kopf">
      <span className="icon-kachel">{icon}</span>
      {text}
    </div>
  );

  const liste: Widget[] = [
    {
      key: 'we',
      breit: true,
      bier: true,
      farbe: 'var(--orange)',
      onClick: () => geh('woche'),
      inhalt: (
        <>
          <div className="bier-text">
            {kopf(<Confetti size={15} weight="fill" />, we.jetzt ? 'Wochenende!' : 'Bis zum Wochenende')}
            <div className="countdown">
              {tage > 0 && (
                <div>
                  <b>{tage}</b>
                  <span>{tage === 1 ? 'Tag' : 'Tage'}</span>
                </div>
              )}
              {(tage > 0 || std > 0) && (
                <div>
                  <b>{std}</b>
                  <span>Std.</span>
                </div>
              )}
              {tage === 0 && (
                <div>
                  <b>{min}</b>
                  <span>Min.</span>
                </div>
              )}
            </div>
            <div className="w-text">
              {we.jetzt ? 'noch frei. Prost!' : jetzt.getDay() === 5 ? 'Fast geschafft. Das Glas ist gleich voll.' : 'Das Glas füllt sich bis Freitag 18 Uhr.'}
            </div>
          </div>
          <Bierglas anteil={we.anteil} voll={we.jetzt} />
        </>
      ),
    },
  ];

  // Kleine Leiste statt großer Kacheln
  const minis: { key: string; icon: ReactNode; farbe: string; wert: ReactNode; name: string; onClick: () => void }[] = [
    { key: 'anfragen', icon: <ChatsCircle size={18} weight="fill" />, farbe: FARBE.anfrage, wert: anfragen.length, name: anfragen.length === 1 ? 'Anfrage' : 'Anfragen', onClick: () => geh('eingang') },
    { key: 'einkauf', icon: <ShoppingCart size={18} weight="fill" />, farbe: '#e8900c', wert: einkauf.length, name: 'Einkauf', onClick: () => geh('mehr/einkauf') },
    {
      key: 'geld',
      icon: <Wallet size={18} weight="fill" />,
      farbe: 'var(--mint)',
      wert: plan ? euro(plan.proWoche) : '–',
      name: plan ? 'pro Woche' : 'Geld',
      onClick: () => geh(plan ? 'geld/sparplan' : 'geld'),
    },
    ...(frist
      ? [{ key: 'srh', icon: <GraduationCap size={18} weight="fill" />, farbe: 'var(--lila)', wert: `${tageBis(lies(frist.datum), jetzt)} T.`, name: 'SRH-Frist', onClick: () => geh('mehr/musik') }]
      : []),
    ...(geb
      ? [{ key: 'geb', icon: <Cake size={18} weight="fill" />, farbe: 'var(--pink)', wert: geb.name, name: geb.inTagen === 1 ? 'morgen Geburtstag' : `Geburtstag in ${geb.inTagen} T.`, onClick: () => geh('mehr/geburtstage') }]
      : []),
  ];

  return (
    <>
      <div className="bento" style={{ marginBottom: 12 }}>
        {liste.map((w) => (
          <button
            key={w.key}
            className={`widget${w.breit ? ' breit' : ''}${w.bier ? ' bier-widget' : ''}`}
            style={{ '--farbe': w.farbe ?? '#fff' } as CSSProperties}
            onClick={w.onClick}
          >
            {w.inhalt}
          </button>
        ))}
      </div>
      <div className="mini-leiste">
        {minis.map((m) => (
          <button key={m.key} className="mini" onClick={m.onClick}>
            <Icon farbe={m.farbe}>{m.icon}</Icon>
            <span>
              <div className="m-wert">{m.wert}</div>
              <div className="m-name">{m.name}</div>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

/** Wie sich die nächsten 7 Tage auf Arbeit und Freizeit verteilen. */
function Bilanz({ jetzt }: { jetzt: Date }) {
  const d = useDaten();
  const summe = wochenBilanz(d, jetzt);
  const teile = BEREICHE.map((b) => ({ ...b, ...(summe.get(b.id) ?? { minuten: 0, anzahl: 0 }) })).filter((b) => b.anzahl > 0);
  if (!teile.length) return null;
  const gesamt = teile.reduce((a, b) => a + Math.max(b.minuten, 30), 0);
  const std = (m: number) => (m >= 60 ? `${(Math.round(m / 6) / 10).toLocaleString('de-DE')} Std.` : `${m} Min.`);
  const arbeit = teile.filter((t) => t.id === 'arbeit').reduce((a, b) => a + b.minuten, 0);
  const freizeit = teile.filter((t) => t.freizeit).reduce((a, b) => a + b.minuten, 0);
  return (
    <section className="gruppe">
      <h2 className="gruppe-titel">
        <span>Deine Woche</span>
        <button className="mehr" onClick={() => geh('woche')}>Details</button>
      </h2>
      <button className="karte innen" style={{ width: '100%', textAlign: 'left', border: 0, color: 'var(--text)' }} onClick={() => geh('woche')}>
        <div className="bilanz-kopf">
          <span>
            <span className="gross">{std(arbeit)}</span> <span className="leise">Arbeit</span>
          </span>
          <span>
            <span className="gross">{std(freizeit)}</span> <span className="leise">Freizeit</span>
          </span>
        </div>
        <div className="bilanz-balken">
          {teile.map((t) => (
            <i key={t.id} style={{ '--farbe': t.farbe, flexGrow: Math.max(t.minuten, 30) / gesamt } as CSSProperties} />
          ))}
        </div>
        <div className="bilanz-legende">
          {teile.map((t) => (
            <span key={t.id} style={{ '--farbe': t.farbe } as CSSProperties}>
              {t.name} <b>{t.anzahl}</b>
            </span>
          ))}
        </div>
      </button>
    </section>
  );
}


function Woche({ jetzt }: { jetzt: Date }) {
  const d = useDaten();
  const [wahl, setWahl] = useState(1);
  const tage = Array.from({ length: 7 }, (_, i) => plusTage(jetzt, i));
  const tag = tage[wahl];
  const eintraege = tagesEintraege(d, tag);

  return (
    <section className="gruppe">
      <h2 className="gruppe-titel">
        <span>Die nächsten Tage</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <KalenderKnopf />
          <button className="mehr" onClick={() => geh('woche')}>Woche</button>
        </span>
      </h2>
      <div className="tagesleiste">
        {tage.map((t, i) => {
          const e = tagesEintraege(d, t);
          return (
            <button key={tagKey(t)} className={`tag-pill${i === 0 ? ' heute' : ''}${i === wahl ? ' an' : ''}`} onClick={() => setWahl(i)}>
              <span className="wt">{i === 0 ? 'Heute' : WOCHENTAGE_KURZ[t.getDay()]}</span>
              <span className="nr">{t.getDate()}</span>
              <span className="punkte">
                {e.slice(0, 3).map((x) => (
                  <i key={x.key} style={farbStil(eintragFarbe(x))} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="karte" key={wahl} style={{ animation: 'rein 320ms var(--ease-out) both' }}>
        {eintraege.length === 0 ? (
          <Leer titel={wahl === 0 ? 'Heute ist nichts mehr' : 'Noch frei'} icon={<CalendarBlank size={26} weight="fill" />} farbe={FARBE.termin}>
            Perfekt für Musik, Freunde oder einfach Pause.
          </Leer>
        ) : (
          eintraege.map((e) => <EintragZeile key={e.key} e={e} tag={tag} farbe={eintragFarbe(e)} />)
        )}
      </div>
    </section>
  );
}

function News({ jetzt }: { jetzt: Date }) {
  const news = useNews();
  return (
    <section className="gruppe">
      <h2 className="gruppe-titel">
        <span>Musik</span>
        <button className="mehr" onClick={() => geh('mehr/musik/news')}>Alle</button>
      </h2>
      {news && news.artikel.length > 0 ? (
        <div className="karussell">
          {news.artikel.slice(0, 8).map((a) => {
            const [f1, f2] = RUBRIK_FARBEN[a.rubrik] ?? ['var(--lila)', ''];
            return (
              <a key={a.link} className="news-karte" href={a.link} target="_blank" rel="noreferrer" style={{ '--a': f1, '--b': f2 } as CSSProperties}>
                <span className="r">{a.rubrik}</span>
                <span className="t">{a.titel}</span>
                <span className="q">
                  {a.quelle} · {wieAlt(a.datum, jetzt)}
                </span>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="karte">
          <Leer titel={news ? 'News kommen jeden Morgen' : 'Lädt ...'} icon={<MusicNotes size={26} weight="fill" />} farbe={FARBE.musik}>
            Produktion, Musikbusiness, Jazz und Pop, Stuttgart und Berlin.
          </Leer>
        </div>
      )}
    </section>
  );
}
