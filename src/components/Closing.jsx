import { useRef } from 'react';
import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { verses, couple } from '../data.js';
import { useStages } from '../lib/hooks.js';

/* The final dua / closing — the last thing a guest reads before the footer.

   It unfolds in deliberate beats rather than arriving all at once:
   beat 0  the heading settles
   beat 1  the Arabic dua surfaces out of a soft blur
   beat 2  the translation follows, quietly
   beat 3  the attribution
   beat 4  Āmīn — letter-spacing relaxing into place over a gold bloom
   Reduced-motion guests get everything at once (the hook jumps to the
   final stage and the CSS drops its transitions). */
export default function Closing() {
  const dua = verses.dua || {};
  const hostRef = useRef(null);

  const hasDua = Boolean(dua.ar);
  const stage = useStages(hostRef, { stages: hasDua ? 5 : 2, step: 950 });
  const ameenAt = hasDua ? 4 : 1;

  return (
    <section className="section section--deep closing" aria-labelledby="closing-title">
      <Arabesque opacity={0.07} />

      <div className="section__inner section__inner--narrow closing__inner" ref={hostRef}>
        <SectionHead
          id="closing-title"
          eyebrow="A Prayer For The Couple"
          title="With Gratitude"
          sub={`${couple.bride.name} & ${couple.groom.name} thank you for your love, your duas and your presence.`}
        />

        {dua.ar && (
          <div className="closing__dua">
            <p
              className={`closing__ar arabic ${stage >= 1 ? 'is-in' : ''}`}
              lang="ar"
              dir="rtl"
            >
              {dua.ar}
            </p>
            {dua.tr && (
              <p className={`closing__tr ${stage >= 2 ? 'is-in' : ''}`}>{dua.tr}</p>
            )}
            {dua.src && (
              <p className={`closing__src eyebrow ${stage >= 3 ? 'is-in' : ''}`}>{dua.src}</p>
            )}
          </div>
        )}

        <div className={`closing__ameen-wrap ${stage >= ameenAt ? 'is-in' : ''}`}>
          <p className="closing__ameen">Āmīn ✦</p>
        </div>
      </div>
    </section>
  );
}