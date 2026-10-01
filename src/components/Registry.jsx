import { useState, useRef } from 'react';
import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { useInView } from '../lib/hooks.js';
import { giftRegistry } from '../data.js';

/* Clipboard with a fallback for insecure origins and older browsers, where
   navigator.clipboard is undefined. */
async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the textarea approach */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:absolute;left:-9999px;top:0;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------- UPI ---- */
function UpiCard() {
  const cardRef = useRef(null);
  const inView = useInView(cardRef);
  const { id, qrImage, openUpiApp } = giftRegistry.upi;
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const ok = await copyText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2600);
    if (!ok) {
      /* selection fallback is silent here — the Copied state still reassures */
    }
  };

  /* Generic UPI intent; opens whichever UPI app the guest has installed. */
  const upiAppUrl = id
    ? `upi://pay?pa=${encodeURIComponent(id)}&pn=${encodeURIComponent('Wedding Gift')}&cu=INR`
    : '#';

  return (
    <article ref={cardRef} className={`gift-card gift-card--upi ${inView ? 'is-in' : ''}`}>
      <span className="gift-card__icon" aria-hidden="true">✦</span>
      <h3 className="gift-card__title">Send a Gift</h3>
      <p className="gift-card__sub">
        Your blessings are more than enough. For those who wish to gift, you may use UPI.
      </p>

      <div className="gupi">
        {qrImage ? (
          <img className="gupi__qr" src={qrImage} alt={`UPI QR code to pay ${id}`} loading="lazy" />
        ) : (
          <div className="gupi__qr gupi__qr--empty" aria-hidden="true">
            <span>QR</span>
            <small>Add your QR to /photos/upi-qr.png</small>
          </div>
        )}

        <div className="gupi__id-row">
          <span className="gupi__id-label">UPI ID</span>
          <span className="gupi__id">{id || 'yourname@upi'}</span>
        </div>

        <div className="gupi__actions">
          <button type="button" className="btn btn--gold" onClick={onCopy} disabled={!id}>
            {copied ? 'Copied ✓' : 'Copy UPI ID'}
          </button>
          {openUpiApp && id && (
            <a className="btn" href={upiAppUrl} aria-label="Open UPI app">
              Open UPI App
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------- Amazon ---- */
function AmazonCard() {
  const cardRef = useRef(null);
  const inView = useInView(cardRef);
  const { url } = giftRegistry.amazon;

  if (!url) return null; /* nothing to show until a real URL is configured */

  return (
    <article ref={cardRef} className={`gift-card gift-card--amazon ${inView ? 'is-in' : ''}`}>
      <span className="gift-card__icon" aria-hidden="true">✿</span>
      <h3 className="gift-card__title">Gift from Our Wedding Registry</h3>
      <p className="gift-card__sub">
        For those who would like to gift us something special,
we've gathered a few things that will become part of our new beginning.
      </p>

      <a
        className="btn btn--solid"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View our wedding gift registry on Amazon (opens in a new tab)"
      >
        View Gift Registry
      </a>
    </article>
  );
}

export default function Registry() {
  return (
    <section className="section section--light" aria-labelledby="registry-title">
      <Arabesque />
      <div className="section__inner">
        <SectionHead
          id="registry-title"
          eyebrow="With Love"
          title="Gift Registry"
          sub="Your presence is the greatest gift. For those who wish to give more, here are a few thoughtful options."
        />

        <div className="gift-grid">
          <UpiCard />
          <AmazonCard />
        </div>
      </div>
    </section>
  );
}
