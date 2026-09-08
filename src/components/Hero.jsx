import { lazy, Suspense } from 'react';
import Arabesque from './Arabesque.jsx';
import { couple, dates, ceremonyISO } from '../data.js';
import { useCountdown } from '../lib/hooks.js';

/* three.js is ~600 kB and sits behind the intro curtain, so it is split into
   its own chunk and only mounted once the invitation is actually open. */
const AmbientCanvas = lazy(() => import('./AmbientCanvas.jsx'));

const pad = (n) => String(n).padStart(2, '0');

function Countdown() {
  const { days, hours, mins, secs, isPast } = useCountdown(ceremonyISO);

  if (isPast) {
    return (
      <p className="cd__done">
        Alhamdulillah — married on {dates.long.replace('Saturday · ', '')}.
      </p>
    );
  }

  const units = [
    { value: days,  label: 'Days' },
    { value: hours, label: 'Hours' },
    { value: mins,  label: 'Minutes' },
    { value: secs,  label: 'Seconds' },
  ];

  return (
    <div className="countdown">
      {units.map(({ value, label }) => (
        <div className="cd__item" key={label}>
          <div className="cd__num">{pad(value)}</div>
          <div className="cd__label">{label}</div>
        </div>
      ))}
      <span className="sr-only" aria-live="polite">
        {days} days until the ceremony
      </span>
    </div>
  );
}

export default function Hero({ ambient = true }) {
  return (
    <section className="hero" aria-labelledby="hero-names">
      {ambient && (
        <Suspense fallback={null}>
          <AmbientCanvas active />
        </Suspense>
      )}

      <Arabesque opacity={0.07} tile={104} />

      <div className="hero__frame">
        <p className="hero__bismillah arabic-display" lang="ar" dir="rtl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <p className="hero__nikah">Nikah Mubarak</p>
        <span className="hero__eyebrow eyebrow"><a href="/admin">The Nikah Of</a></span>

        <h1 className="hero__names" id="hero-names">
          {couple.bride.name}
          <span className="hero__amp">&amp;</span>
          {couple.groom.name}
        </h1>

        <p className="hero__date">{dates.long}</p>
        <p className="hero__verse">“…and He placed between you love and mercy.”</p>

        <Countdown />
      </div>

      <div className="hero__scroll" aria-hidden="true">
        <i />
        Scroll
      </div>
    </section>
  );
}
