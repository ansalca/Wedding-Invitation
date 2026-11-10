import { useRef, useState } from "react";
import SectionHead from "./SectionHead.jsx";
import Arabesque from "./Arabesque.jsx";

/* =========================================================================
   Wedding Card — static invitation image
   -------------------------------------------------------------------------
   The DOM-rendered card has been replaced by the attached invitation
   image (public/photos/wedding-invitation.png). It is shown centred and
   scaled to fit the viewport, with a one-click download so guests can
   save it to their phone.
   ========================================================================= */

const CARD_IMG = "/photos/wedding-invitation.png";

export default function WeddingCard() {
  const [done, setDone] = useState("");
  const timerRef = useRef(null);

  const flash = (msg) => {
    setDone(msg);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDone(""), 3000);
  };

  const saveImage = () => {
    const a = document.createElement("a");
    a.href = CARD_IMG;
    a.download = "Adhila-Kabeer-Nikah-Invitation.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    flash("Card saved \u2764");
  };

  return (
    <section className="section section--sand cardsec" aria-labelledby="card-title">
      <Arabesque opacity={0.05} />

      <div className="section__inner">
        <SectionHead
          id="card-title"
          eyebrow="Keep It Close"
          title="The Wedding Card"
          sub="Save a keepsake of the invitation as an image."
        />

        <div className="card-stage reveal">
          <div className="card-image">
            <img
              src={CARD_IMG}
              alt="Adhila & Kabeer \u2014 Nikah invitation card"
              loading="lazy"
            />
          </div>
        </div>

        <div className="card-actions reveal reveal-d2">
          <button type="button" className="btn btn--gold" onClick={saveImage}>
            Save Image
          </button>
        </div>

        <div aria-live="polite" className="card-status">
          {done && <p className="wall-form__note" role="status">{done}</p>}
        </div>
      </div>
    </section>
  );
}