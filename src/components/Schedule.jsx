import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { schedule } from '../data.js';

export default function Schedule() {
  return (
    <section className="section section--sand" aria-labelledby="schedule-title">
      <Arabesque />
      <div className="section__inner">
        <SectionHead
          id="schedule-title"
          eyebrow="The Celebrations"
          title="Event Schedule"
          sub="Four days of blessings, family and joy — every function warmly open to loved ones."
        />

        <ol className="timeline">
          {schedule.map((ev) => (
            <li className="tl__item reveal" key={`${ev.day}-${ev.title}`}>
              <span className="tl__marker" aria-hidden="true" />
              <p className="tl__day">{ev.day}</p>
              <h3 className="tl__title">{ev.title}</h3>
              <p className="tl__meta">{ev.meta}</p>
              <p className="tl__desc">{ev.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
