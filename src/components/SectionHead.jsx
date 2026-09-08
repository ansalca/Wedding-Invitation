import { Ornament } from '../lib/icons.jsx';

export default function SectionHead({ eyebrow, title, sub, id }) {
  return (
    <header className="sec-head">
      <span className="sec-eyebrow eyebrow reveal">{eyebrow}</span>
      <h2 className="sec-title reveal reveal-d1" id={id}>{title}</h2>
      {sub && <p className="sec-sub reveal reveal-d2">{sub}</p>}
      <Ornament className="reveal reveal-d3" />
    </header>
  );
}
