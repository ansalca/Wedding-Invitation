import { FloralBouquet } from '../lib/icons.jsx';
import Ribbon from './Ribbon.jsx';
import { couple, dates, landing } from '../data.js';

/* The opening curtain. Clicking anywhere in the centre unties the ribbon,
   then the two floral panels part to reveal the invitation. */
export default function IntroCurtain({ opened, breaking, untied, released, onOpen }) {
  const { bride, groom } = couple;

  return (
    <div
      className={[
        'intro',
        breaking ? 'is-breaking' : '',
        opened ? 'is-open' : '',
      ].filter(Boolean).join(' ')}
      aria-hidden={opened ? 'true' : undefined}
      inert={opened || undefined}
    >
      {landing.image && (
        <div className="intro__photo" aria-hidden="true">
          <img src={landing.image} alt="" style={{ objectPosition: landing.focal }} />
          <span className="intro__scrim" style={{ '--scrim': landing.scrim }} />
        </div>
      )}

      <div className="intro__side intro__side--left">
        <FloralBouquet side="left" />
        <div className="intro__nameblock">
          <span className="intro__role eyebrow">{bride.role}</span>
          <div className="intro__sidename">{bride.name}</div>
          <div className="intro__caption">{bride.caption}</div>
        </div>
      </div>

      <button
        type="button"
        className="intro__center"
        onClick={onOpen}
        aria-label="Untie the ribbon and open the invitation"
      >
        <span className="intro__kicker eyebrow">Sealed with love</span>

        <div className="intro__names">
          {bride.name}
          <span className="intro__amp">&amp;</span>
          {groom.name}
        </div>

        <div className="intro__date">{dates.short}</div>

        <div className={`ribbon-wrap ${untied ? 'is-untied' : ''}`}>
          <Ribbon untied={untied} released={released} />
        </div>

        <div className="intro__cta">
          <span>✦</span> Untie &amp; open <span>↓</span>
        </div>
        <div className="intro__hint">two stories · one beautiful beginning</div>
      </button>

      <div className="intro__side intro__side--right">
        <FloralBouquet side="right" />
        <div className="intro__nameblock">
          <span className="intro__role eyebrow">{groom.role}</span>
          <div className="intro__sidename">{groom.name}</div>
          <div className="intro__caption">{groom.caption}</div>
        </div>
      </div>
    </div>
  );
}
