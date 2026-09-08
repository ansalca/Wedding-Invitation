import { useEffect, useState, useCallback, useRef } from 'react';
import { useReducedMotion } from './motion.js';

/* Reveal-on-scroll. Re-runs when `enabled` flips so elements that were
   behind the intro curtain still get observed once it lifts, and when the
   motion decision changes so the page reacts to the OS setting live. */
export function useReveal(enabled = true) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!enabled) return;

    const els = document.querySelectorAll('.reveal:not(.is-in)');
    if (!els.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [enabled, reduced]);
}

/* Lock body scroll while the intro curtain is up; always restore on unmount. */
export function useScrollLock(locked) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}

/* Live countdown to an ISO timestamp. Ticks only while the target is future. */
export function useCountdown(targetISO) {
  const target = new Date(targetISO).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (Number.isNaN(target)) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (Number.isNaN(target)) {
    return { days: 0, hours: 0, mins: 0, secs: 0, isPast: false, invalid: true };
  }

  const diff = Math.max(0, target - now);
  return {
    days:  Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins:  Math.floor((diff % 3600000) / 60000),
    secs:  Math.floor((diff % 60000) / 1000),
    isPast: target - now <= 0,
    invalid: false,
  };
}

/* Staged reveal for a single section. When the element referenced by `ref`
   scrolls into view, `stage` advances from 0 to `stages - 1`, one step every
   `step` milliseconds — so a section can tell its story in ordered beats
   instead of everything arriving at once. Before the element is seen the
   stage is -1 (nothing has begun); reduced-motion guests and browsers
   without an observer get the final stage immediately. */
export function useStages(ref, { stages = 2, step = 900, threshold = 0.2 } = {}) {
  const [stage, setStage] = useState(-1);
  const reduced = useReducedMotion();
  /* Once the sequence has begun (or been jumped to its end) it never
     rewinds or replays — a mid-visit change of the OS motion setting
     must not restart choreography the guest has already seen. */
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || stages <= 1 || reduced || !('IntersectionObserver' in window)) {
      setStage(stages - 1);
      startedRef.current = true;
      return;
    }
    if (startedRef.current) return;

    const timers = [];
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        startedRef.current = true;
        setStage(0);
        for (let i = 1; i < stages; i++) {
          timers.push(setTimeout(() => setStage(i), i * step));
        }
      },
      { threshold, rootMargin: '0px 0px -10% 0px' }
    );

    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [ref, stages, step, threshold, reduced]);

  return stage;
}

/* React-managed in-view detection for elements whose className is dynamic.
   The global .reveal sweep adds .is-in by direct DOM mutation — which React
   silently wipes the next time it renders a new className string on that
   element (e.g. `…${open ? 'is-open' : ''}`). Any reveal element with a
   dynamic className must use this hook instead, so the state lives in React
   and survives re-renders. */
export function useInView(ref, { threshold = 0.12, rootMargin = '0px 0px -8% 0px' } = {}) {
  const [inView, setInView] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced || !('IntersectionObserver' in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  return inView;
}

/* localStorage helper that degrades quietly when storage is unavailable
   (private windows, disabled site data). */
export function useLocalStorage(key) {
  const read = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [key]);

  const write = useCallback(
    (value) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    [key]
  );

  return { read, write };
}
