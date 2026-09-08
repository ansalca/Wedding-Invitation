import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { SwayLeaf } from './CinematicMotion.jsx';
import { couple, families } from '../data.js';

/* Couple & family section — the two sides of the celebration, presented
   as facing cards with a soft floral sway accent behind each name. */
export default function Couple() {
  const { bride, groom } = couple;

  const cards = [
    { key: 'bride', person: bride, family: families.bride, side: 'l' },
    { key: 'groom', person: groom, family: families.groom, side: 'r' },
  ];

  return (
    <section className="section section--light" aria-labelledby="couple-title">
      <Arabesque opacity={0.06} />

      <div className="section__inner">
        <SectionHead
          id="couple-title"
          eyebrow="Two Families, One Blessing"
          title="The Couple"
          sub="With the blessings of both families, we invite you to share in our joy."
        />

        <div className="couple-grid">
          {cards.map(({ key, person, family, side }) => (
            <article className={`couple-card reveal couple-card--${side}`} key={key}>
              <SwayLeaf className="couple-card__leaf" glyph={side === 'l' ? '❀' : '✿'} />
              <span className="couple-card__initial" aria-hidden="true">
                {person.name.charAt(0)}
              </span>
              <h3 className="couple-card__name">{person.name}</h3>
              <p className="couple-card__role eyebrow">{family.label}</p>
              <p className="couple-card__line">{family.role}</p>
              <p className="couple-card__note">{family.note}</p>
            </article>
          ))}
        </div>

        <p className="couple__dua reveal" lang="ar" dir="rtl">
          رَضِيَ اللَّهُ عَنْهُمَا وَأَلْهَمَهُمَا السَّعَادَةَ
        </p>
        <p className="couple__dua-tr reveal reveal-d1">
          May Allah be pleased with them both, and grant them happiness.
        </p>
      </div>
    </section>
  );
}