import { Cake, ChatCircleText, GraduationCap, ShoppingCart, Wallet } from '@phosphor-icons/react';
import { anstehendeTreffen, naechsteFristen, naechsteGeburtstage, tagesEintraege, ueberfaelligeAufgaben } from '../lib/agenda';
import { langesDatum, lies, plusTage, tageBis, tagKey, tagName, wannText, WOCHENTAGE } from '../lib/datum';
import { useNews, wieAlt } from '../lib/news';
import { euro, monatsBild, sparplan } from '../lib/sparplan';
import { aendere, useDaten } from '../store';
import { EintragZeile, KalenderBanner, KalenderStand } from '../ui/Agenda';
import { Erfassen } from '../ui/Erfassen';
import { geh, Gruppe, Haken, Kopf, Leer, useJetzt, Zeile } from '../ui/ui';

export function Heute() {
  const d = useDaten();
  const jetzt = useJetzt();
  const heute = tagesEintraege(d, jetzt);
  const ueberfaellig = ueberfaelligeAufgaben(d, jetzt);
  const anfragen = d.anfragen.filter((a) => a.status === 'offen');
  const treffen = anstehendeTreffen(d, 7, jetzt).filter((t) => t.start.slice(0, 10) !== tagKey(jetzt));
  const geburtstage = naechsteGeburtstage(d, 14, jetzt);
  const frist = naechsteFristen(d, jetzt)[0];
  const einkauf = d.einkauf.filter((e) => !e.erledigt);
  const news = useNews();

  const monat = tagKey(jetzt).slice(0, 7);
  const bild = monatsBild(d.buchungen, monat);
  const plan = d.buchungen.length ? sparplan(d.buchungen, d.geplant, d.einstellungen, jetzt) : undefined;

  const stunde = jetzt.getHours();
  const gruss = stunde < 11 ? 'Guten Morgen' : stunde < 18 ? 'Hallo' : 'Guten Abend';

  return (
    <div className="seite">
      <Kopf titel={gruss} unter={langesDatum(jetzt)} />
      <KalenderBanner />

      <Gruppe>
        <Erfassen />
      </Gruppe>

      <Gruppe titel="Heute" mehr={{ text: 'Woche', ziel: 'woche' }}>
        <div className="karte">
          {heute.length === 0 && ueberfaellig.length === 0 && <Leer titel="Nichts geplant">Ein freier Tag. Oder einfach oben etwas abladen.</Leer>}
          {ueberfaellig.map((a) => (
            <Zeile
              key={a.id}
              links={<Haken an={false} label="Erledigt" onClick={() => aendere((x) => { const y = x.aufgaben.find((z) => z.id === a.id); if (y) y.erledigt = true; })} />}
              titel={a.titel}
              neben={<span style={{ color: 'var(--rot)' }}>Überfällig seit {tagName(lies(a.faellig!), jetzt)}</span>}
            />
          ))}
          {heute.map((e) => (
            <EintragZeile key={e.key} e={e} tag={jetzt} />
          ))}
          <KalenderStand />
        </div>
      </Gruppe>

      {anfragen.length > 0 && (
        <Gruppe titel="Offene Anfragen" mehr={{ text: 'Alle', ziel: 'eingang' }}>
          <div className="karte">
            {anfragen.slice(0, 3).map((a) => (
              <Zeile
                key={a.id}
                icon={<ChatCircleText size={17} />}
                titel={a.von ?? 'Anfrage'}
                neben={(a.text.split('\n').pop() ?? '').replace(/^[^:\n]{1,40}:\s/, '')}
                rechts={a.wann ? wannText(a.wann, jetzt) : undefined}
                onClick={() => geh('eingang')}
                pfeil
              />
            ))}
          </div>
        </Gruppe>
      )}

      {treffen.length > 0 && (
        <Gruppe titel="Treffen">
          <div className="karte">
            {treffen.map((t) => (
              <Zeile key={t.id} titel={t.titel} rechts={wannText(t.start, jetzt)} />
            ))}
          </div>
        </Gruppe>
      )}

      <Gruppe titel="Diese Woche" mehr={{ text: 'Alles', ziel: 'woche' }}>
        <div className="karte">
          {[1, 2, 3, 4, 5, 6].map((i) => {
            const tag = plusTage(jetzt, i);
            const e = tagesEintraege(d, tag);
            return (
              <Zeile
                key={i}
                titel={i === 1 ? 'Morgen' : WOCHENTAGE[tag.getDay()]}
                neben={e.length ? e.slice(0, 2).map((x) => (x.zeit ? `${x.zeit} ${x.titel}` : x.titel)).join(' · ') : 'frei'}
                rechts={e.length > 2 ? `+${e.length - 2}` : undefined}
                onClick={() => geh('woche')}
                pfeil
              />
            );
          })}
        </div>
      </Gruppe>

      {(geburtstage.length > 0 || frist || einkauf.length > 0) && (
        <Gruppe titel="Nicht vergessen">
          <div className="karte">
            {geburtstage.map((g) => (
              <Zeile
                key={g.id}
                icon={<Cake size={17} />}
                titel={g.name}
                neben={g.alter ? `wird ${g.alter}` : 'Geburtstag'}
                rechts={g.inTagen === 1 ? 'morgen' : `in ${g.inTagen} Tagen`}
                onClick={() => geh('mehr/geburtstage')}
              />
            ))}
            {frist && (
              <Zeile
                icon={<GraduationCap size={17} />}
                titel={frist.titel}
                neben={tagName(lies(frist.datum), jetzt)}
                rechts={`${tageBis(lies(frist.datum), jetzt)} Tage`}
                onClick={() => geh('mehr/musik')}
                pfeil
              />
            )}
            {einkauf.length > 0 && (
              <Zeile
                icon={<ShoppingCart size={17} />}
                titel="Einkaufsliste"
                neben={einkauf.slice(0, 4).map((e) => e.titel).join(', ')}
                rechts={String(einkauf.length)}
                onClick={() => geh('mehr/einkauf')}
                pfeil
              />
            )}
          </div>
        </Gruppe>
      )}

      <Gruppe titel="Geld" mehr={{ text: 'Details', ziel: 'geld' }}>
        <div className="karte">
          {d.buchungen.length ? (
            <>
              <Zeile icon={<Wallet size={17} />} titel="Ausgegeben diesen Monat" rechts={euro(bild.ausgaben)} onClick={() => geh('geld')} />
              {plan && (
                <Zeile
                  titel="Spielraum pro Woche"
                  neben="laut deinem Sparplan"
                  rechts={<span className={plan.proWoche > 0 ? '' : 'minus'}>{euro(plan.proWoche)}</span>}
                  onClick={() => geh('geld/sparplan')}
                />
              )}
            </>
          ) : (
            <Zeile icon={<Wallet size={17} />} titel="Kontoauszug hinzufügen" neben="PDF oder Screenshot, wird nur hier ausgewertet" onClick={() => geh('geld')} pfeil />
          )}
        </div>
      </Gruppe>

      <Gruppe titel="Musik" mehr={{ text: 'Mehr', ziel: 'mehr/musik' }}>
        <div className="karte">
          {!news && <Leer titel="Lädt ..." />}
          {news && news.artikel.length === 0 && <Leer titel="Noch keine News">Die werden einmal am Tag automatisch gesammelt.</Leer>}
          {news?.artikel.slice(0, 3).map((a) => (
            <a key={a.link} className="zeile" href={a.link} target="_blank" rel="noreferrer">
              <div className="haupt">
                <div className="news-quelle">{a.quelle} · {wieAlt(a.datum, jetzt)}</div>
                <div className="titel umbruch" style={{ color: 'var(--text)', fontSize: 16 }}>{a.titel}</div>
              </div>
            </a>
          ))}
        </div>
      </Gruppe>
    </div>
  );
}
