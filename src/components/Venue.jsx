import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { venue, dates } from '../data.js';

export default function Venue() {
  const q = encodeURIComponent(venue.mapQuery);

  return (
    <section className="section section--light" aria-labelledby="venue-title">
      <Arabesque />
      <div className="section__inner">
        <SectionHead
          id="venue-title"
          eyebrow="Join Us At"
          title="Venue & Directions"
          sub="All ceremonies and the reception take place at the same venue."
        />

        <div className="venue reveal">
          <div className="venue__map">
            <iframe
              title={`Map showing ${venue.name}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps?q=${q}&output=embed`}
            />
          </div>

          <div>
            <h3 className="venue__name">{venue.name}</h3>
            <p className="venue__when eyebrow">
              {dates.long} · {dates.time}
            </p>
            <p className="venue__addr">
              {venue.addressLines.map((line, i) => (
                <span key={line}>
                  {line}
                  {i < venue.addressLines.length - 1 && <br />}
                </span>
              ))}
            </p>
            <a
              className="btn btn--gold"
              href={`https://www.google.com/maps?q=${q}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Get Directions
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
