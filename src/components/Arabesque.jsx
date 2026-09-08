import { useId } from 'react';

/* A tiling eight-point star (khatim) lattice — the geometric vocabulary you
   find on Islamic tilework. Sits behind section content at low opacity to
   give the flat colour bands some texture.

   Rendered as a real <pattern> rather than a CSS data-URI so the stroke can
   use currentColor and pick up whatever section it sits in. That only works
   if every instance owns a unique id: a <pattern> is resolved by reference,
   so duplicate ids would make every section paint the first one's colour. */
export default function Arabesque({ className = '', tile = 88, opacity = 0.055 }) {
  /* useId gives a per-instance value; the colons it contains are stripped so
     the result is safe inside url(#…). */
  const id = `khatim-${useId().replace(/:/g, '')}`;

  return (
    <svg
      className={`arabesque ${className}`}
      style={{ opacity }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="0.9"
            transform={`scale(${tile / 60})`}
          >
            {/* eight-point star */}
            <path d="M30 3 L36.4 16.6 L50.5 10.5 L44.4 24.6 L57 30 L44.4 35.4 L50.5 49.5 L36.4 43.4 L30 57 L23.6 43.4 L9.5 49.5 L15.6 35.4 L3 30 L15.6 24.6 L9.5 10.5 L23.6 16.6 Z" />
            {/* interlocking square, rotated 45° */}
            <rect x="17.5" y="17.5" width="25" height="25" transform="rotate(45 30 30)" />
            <circle cx="30" cy="30" r="6.5" />
            {/* stubs that meet the neighbouring tiles */}
            <path d="M0 30 L6 30 M54 30 L60 30 M30 0 L30 6 M30 54 L30 60" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
