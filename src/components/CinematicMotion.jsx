import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/motion.js';

/* Cinematic layers:
   - PetalFall:       subtle petals drifting down over the whole page
   - SwayLeaves:      flower/leaf sway accents inside a section
   - Convergence:     two-sides-to-center floral convergence on reveal
*/
export function PetalFall({ count = 16, className = '' }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const host = ref.current;
    if (!host || reduced) return;

    const petals = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span');
      el.className = 'petal';
      const glyphs = ['✿', '❀', '✽', '❋', '✦'];
      el.textContent = glyphs[i % glyphs.length];
      el.style.left = `${Math.random() * 100}%`;
      el.style.fontSize = `${10 + Math.random() * 14}px`;
      el.style.animationDelay = `${Math.random() * 14}s`;
      el.style.animationDuration = `${12 + Math.random() * 14}s`;
      el.style.opacity = `${0.25 + Math.random() * 0.4}`;
      host.appendChild(el);
      petals.push(el);
    }

    return () => petals.forEach((el) => el.remove());
  }, [count, reduced]);

  return <div ref={ref} className={`petal-field ${className}`} aria-hidden="true" />;
}

export function FloralConvergence({ active = false, label = '' }) {
  return (
    <div className={`converge ${active ? 'is-active' : ''}`} aria-hidden="true">
      <span className="converge__leaf converge__leaf--l">✿</span>
      <span className="converge__bloom converge__bloom--l">❋</span>
      <span className="converge__bloom converge__bloom--r">❀</span>
      <span className="converge__leaf converge__leaf--r">✽</span>
      {label && <span className="converge__label">{label}</span>}
    </div>
  );
}

export function SwayLeaf({ className = '', glyph = '✿' }) {
  return (
    <span className={`sway-leaf ${className}`} aria-hidden="true">
      {glyph}
    </span>
  );
}