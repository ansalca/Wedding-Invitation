import { useRef } from 'react';
import { Ornament } from '../lib/icons.jsx';
import { couple, dates } from '../data.js';
import { useStages } from '../lib/hooks.js';

/* The footer closes the invitation in four quiet beats — calligraphy,
   names, ornament, note — mirroring the staged farewell above. */
export default function Footer() {
  const hostRef = useRef(null);
  const stage = useStages(hostRef, { stages: 4, step: 700 });
  const at = (n) => (stage >= n ? 'is-in' : '');

  return (
    <footer className="footer" ref={hostRef}>
      <p className={`footer__ar footer__stage arabic-display ${at(0)}`} lang="ar" dir="rtl">
        {couple.arabicNames}
      </p>
      <p className={`footer__names footer__stage ${at(1)}`}>
        {couple.bride.name} &amp; {couple.groom.name}
      </p>
      <div className={`footer__stage ${at(2)}`}>
        <Ornament />
      </div>
      <p className={`footer__note footer__stage ${at(3)}`}>
        <span lang="ar" dir="rtl">الحمد لله</span> &nbsp;·&nbsp; {dates.footer}
        <br />
        With love and gratitude, always.
      </p>
    </footer>
  );
}
