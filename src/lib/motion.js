import { useEffect, useState } from 'react';

/* =========================================================================
   Motion preference — one source of truth for the whole site.

   Every decorative motion on the site (CSS keyframes, scroll reveals,
   the three.js gold dust, petals, the card tilt) keys off a single
   `motion-reduce` class on <html>, kept in sync with the guest's OS
   "reduce motion" setting by this module.

   Why a class instead of raw `@media (prefers-reduced-motion:)`:
   - CSS and JS can never disagree (both read the same class).
   - The decision is *live* — if the guest toggles the OS setting while
     the page is open, motion switches without a reload.
   - The couple can preview the full experience on any machine — including
     one with Windows "Animation effects" turned off — by opening the site
     with ?motion=on. ?motion=off forces the reduced experience for
     testing. Guest devices without the parameter behave exactly as the
     OS asks, which is the accessible default and is preserved.
   ========================================================================= */

const QUERY = '(prefers-reduced-motion: reduce)';

/* URL override, read once per page load. */
let motionOverrideCache;

function motionOverride() {
  if (motionOverrideCache === undefined) {
    try {
      const q = new URLSearchParams(window.location.search).get('motion');
      motionOverrideCache = q === 'on' || q === 'off' ? q : null;
    } catch {
      motionOverrideCache = null;
    }
  }
  return motionOverrideCache;
}

/* What the OS reports right now. */
export function systemReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia) &&
    window.matchMedia(QUERY).matches
  );
}

/* The decision the site acts on — override first, then the OS setting. */
export function reducedMotion() {
  const override = motionOverride();
  if (override === 'on') return false;
  if (override === 'off') return true;
  return systemReducedMotion();
}

function applyMotionClass() {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('motion-reduce', reducedMotion());
}

/* Keep <html> in sync for the life of the page and notify subscribers
   whenever the effective decision changes. Fires once immediately.
   Returns an unsubscribe function. */
export function subscribeReducedMotion(callback) {
  applyMotionClass();
  callback(reducedMotion());

  const mq = window.matchMedia(QUERY);
  const onChange = () => {
    applyMotionClass();
    callback(reducedMotion());
  };
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange); // Safari < 14

  return () => {
    if (mq.removeEventListener) mq.removeEventListener('change', onChange);
    else if (mq.removeListener) mq.removeListener(onChange);
  };
}

/* React hook — re-renders consumers when the motion decision changes. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(reducedMotion);
  useEffect(() => subscribeReducedMotion(setReduced), []);
  return reduced;
}

/* Self-heal if the inline <head> script ever fails to run (strict CSP,
   unusual browsers): the first import of this module applies the class. */
if (typeof document !== 'undefined') applyMotionClass();