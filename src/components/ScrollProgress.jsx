import { useEffect, useRef } from 'react';
import { reducedMotion, subscribeReducedMotion } from '../lib/motion.js';

/* A thin gold ribbon along the top of the viewport that fills as the guest
   reads through the invitation — a quiet sense of journey. rAF-throttled,
   passive listeners, and inert when motion is reduced (follows the live
   motion decision, so it reacts if the OS setting changes mid-visit). */
export default function ScrollProgress() {
  const fillRef = useRef(null);

  useEffect(() => {
    const fill = fillRef.current;
    if (!fill) return undefined;

    const rest = () => {
      fill.style.transform = 'scaleX(1)';
      fill.style.opacity = '0.25';
    };

    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      fill.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    let listening = false;
    const apply = (reduced) => {
      if (reduced) {
        if (listening) {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
          listening = false;
        }
        rest();
      } else {
        fill.style.opacity = '';
        update();
        if (!listening) {
          window.addEventListener('scroll', onScroll, { passive: true });
          window.addEventListener('resize', onScroll);
          listening = true;
        }
      }
    };

    apply(reducedMotion());
    const unsubscribe = subscribeReducedMotion(apply);

    return () => {
      unsubscribe();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <i ref={fillRef} />
    </div>
  );
}
