import { useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { useReducedMotion } from '../lib/motion.js';
import { couple, families, dates, venue } from '../data.js';

/* =========================================================================
   Save Wedding Card — PNG / JPG / PDF
   -------------------------------------------------------------------------
   A fixed-ratio invitation card is rendered as plain DOM. An off-screen
   "master" copy is captured with html2canvas and offered as:

     - PNG  lossless, for sharing on WhatsApp etc.
     - JPG  smaller, solid background
     - PDF  the card centred on an A4 page via jsPDF

   The card carries every important detail: the couple's names with their
   families and home towns, the ceremony date and time, and the auditorium
   with its full address. Both export libraries are dynamically imported
   on first click so they never weigh down the initial bundle.

   The on-screen preview idles on a soft float, tilts in 3D toward the
   pointer and sweeps a gold sheen — purely decorative, and all of it is
   disabled for reduced-motion and coarse pointers.
   ========================================================================= */

const CARD_W = 620;
const CARD_H = 960;

function FamilyBlock({ person, family }) {
  return (
    <p className="card-art__fam">
      <span className="card-art__fam-name">{person.name}</span>
      <span className="card-art__fam-role">{family.role}</span>
      <span className="card-art__fam-note">{family.note}</span>
    </p>
  );
}

function CardArt({ id, names, families: fams, dateLine, timeLine, hall, hallAddress, rsvpBy }) {
  return (
    <div className="card-art" id={id} style={{ width: CARD_W, height: CARD_H }}>
      <div className="card-art__border">
        <p className="card-art__bismillah arabic-display" lang="ar" dir="rtl">
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
        <p className="card-art__nikah">Nikah Mubarak</p>

        <p className="card-art__invite">Together with their families</p>

        <h3 className="card-art__names">
          {names.bride}
          <span className="card-art__amp">&amp;</span>
          {names.groom}
        </h3>

        <div className="card-art__fams">
          <FamilyBlock person={{ name: names.bride }} family={fams.bride} />
          <span className="card-art__fam-amp" aria-hidden="true">❋</span>
          <FamilyBlock person={{ name: names.groom }} family={fams.groom} />
        </div>

        <p className="card-art__orn" aria-hidden="true">✦ ❋ ✦</p>

        <p className="card-art__when">
          {dateLine}
          <span className="card-art__time">{timeLine}</span>
        </p>

        <p className="card-art__at" aria-hidden="true">at</p>
        <p className="card-art__hall">{hall}</p>
        <p className="card-art__where">{hallAddress}</p>

        <p className="card-art__foot">With love and gratitude, we await you.</p>
      </div>
    </div>
  );
}

/* Decorative sparkles drifting around the preview card. */
const SPARKS = [
  { glyph: '✦', top: '4%',  left: '6%',  size: 18, delay: '0s' },
  { glyph: '✧', top: '12%', right: '5%', size: 14, delay: '0.9s' },
  { glyph: '❋', top: '46%', left: '2%',  size: 16, delay: '1.7s' },
  { glyph: '✧', top: '58%', right: '3%', size: 13, delay: '0.4s' },
  { glyph: '✦', top: '88%', left: '8%',  size: 17, delay: '2.2s' },
  { glyph: '✧', top: '94%', right: '7%', size: 15, delay: '1.3s' },
];

/* Pointer-follow 3D tilt. Skipped entirely on touch and reduced motion. */
function useCardTilt(ref) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (!fine || reduced) return undefined;

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${(-py * 6).toFixed(2)}deg`);
    };
    const reset = () => {
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', reset);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', reset);
    };
  }, [ref, reduced]);
}

export default function WeddingCard() {
  const [busy, setBusy] = useState(null); /* 'png' | 'jpg' | 'pdf' | null */
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const timerRef = useRef(null);
  const tiltRef = useRef(null);
  const stageRef = useRef(null);
  const [scale, setScale] = useState(1);

  useCardTilt(tiltRef);

  /* The card is authored at a fixed 620×960 so exports stay pixel-perfect.
     The on-screen preview scales down to fit the viewport — phones included —
     via a ResizeObserver; the export master keeps its natural size. */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const update = () => {
      const w = stage.clientWidth;
      setScale(w > 0 ? Math.min(1, w / CARD_W) : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const names = { bride: couple.bride.name, groom: couple.groom.name };
  const dateLine = dates.long;
  const timeLine = dates.time;
  const hall = venue.name;
  const hallAddress = venue.addressLines.join(' ');
  const rsvpBy = dates.rsvpBy;

  const flash = (msg) => {
    setDone(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDone(''), 3000);
  };

  const capture = async () => {
    const { default: html2canvas } = await import('html2canvas');
    const node = document.getElementById('card-art-master');
    if (!node) throw new Error('Card master node not found');
    return html2canvas(node, {
      scale: 2,
      backgroundColor: '#FBF7EE',
      useCORS: true,
      logging: false,
    });
  };

  const download = (href, filename) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const run = (kind) => async () => {
    if (busy) return;
    setBusy(kind);
    setError('');
    setDone('');
    try {
      const canvas = await capture();
      const base = `${couple.bride.name}-${couple.groom.name}-Nikah`;

      if (kind === 'png') {
        download(canvas.toDataURL('image/png'), `${base}.png`);
        flash('Card saved as PNG ✦');
      } else if (kind === 'jpg') {
        download(canvas.toDataURL('image/jpeg', 0.92), `${base}.jpg`);
        flash('Card saved as JPG ✦');
      } else {
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margin = 12;
        const ratio = Math.min(
          (pageW - margin * 2) / CARD_W,
          (pageH - margin * 2) / CARD_H
        );
        const w = CARD_W * ratio;
        const h = CARD_H * ratio;
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.94),
          'JPEG',
          (pageW - w) / 2,
          (pageH - h) / 2,
          w,
          h
        );
        pdf.save(`${base}-Invitation.pdf`);
        flash('Invitation PDF downloaded ✦');
      }
    } catch (e) {
      setError('Could not render the card in this browser. Please try again.');
      // eslint-disable-next-line no-console
      console.error('Wedding card export failed:', e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="section section--sand cardsec" aria-labelledby="card-title">
      <Arabesque opacity={0.05} />

      <div className="section__inner">
        <SectionHead
          id="card-title"
          eyebrow="Keep It Close"
          title="The Wedding Card"
          sub="Save a keepsake of the invitation as an image, or take the full invitation as a PDF."
        />

        <div
          className="card-stage reveal"
          ref={stageRef}
          style={{ '--card-scale': scale }}
        >
          <div className="card-float" aria-hidden="true">
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className="card-spark"
                style={{
                  top: s.top,
                  left: s.left,
                  right: s.right,
                  fontSize: `${s.size}px`,
                  animationDelay: s.delay,
                }}
              >
                {s.glyph}
              </span>
            ))}
          </div>

          {/* .card-fit reserves the scaled layout box; .card-tilt does the
              scaling itself so the 3D pointer tilt composes with it. */}
          <div className="card-fit">
            <div className="card-tilt" ref={tiltRef}>
              <CardArt
                id="card-art-preview"
                names={names}
                families={families}
                dateLine={dateLine}
                timeLine={timeLine}
                hall={hall}
                hallAddress={hallAddress}
                rsvpBy={rsvpBy}
              />
            </div>
          </div>
        </div>

        <div className="card-actions reveal reveal-d1">
          <button type="button" className="btn btn--gold" onClick={run('png')} disabled={Boolean(busy)}>
            {busy === 'png' ? 'Rendering…' : 'Save PNG'}
          </button>
          <button type="button" className="btn btn--gold" onClick={run('jpg')} disabled={Boolean(busy)}>
            {busy === 'jpg' ? 'Rendering…' : 'Save JPG'}
          </button>
          <button type="button" className="btn" onClick={run('pdf')} disabled={Boolean(busy)}>
            {busy === 'pdf' ? 'Rendering…' : 'Download Invitation PDF'}
          </button>
        </div>

        <div aria-live="polite" className="card-status">
          {done && <p className="wall-form__note" role="status">{done}</p>}
          {error && <p className="card-status__error" role="alert">{error}</p>}
        </div>
      </div>

      {/* Off-screen master used for the export capture — never visible. */}
      <div className="card-master" aria-hidden="true">
        <CardArt
          id="card-art-master"
          names={names}
          families={families}
          dateLine={dateLine}
          timeLine={timeLine}
          hall={hall}
          hallAddress={hallAddress}
          rsvpBy={rsvpBy}
        />
      </div>
    </section>
  );
}