/* The ribbon seal, drawn in SVG so the loops and tails are real curves.
   Each part is its own <g> so CSS can untie them independently. */
export default function Ribbon({ untied, released }) {
  return (
    <svg
      className={['ribbon', untied && 'is-untied', released && 'is-released'].filter(Boolean).join(' ')}
      viewBox="0 0 460 150"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        {/* Silk face: dark selvedge, bright fold down the middle */}
        <linearGradient id="silkFace" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6E0C22" />
          <stop offset="18%"  stopColor="#9C1735" />
          <stop offset="42%"  stopColor="#CC3355" />
          <stop offset="52%"  stopColor="#F08B9F" />
          <stop offset="64%"  stopColor="#C82F52" />
          <stop offset="86%"  stopColor="#8E1330" />
          <stop offset="100%" stopColor="#5F0A1D" />
        </linearGradient>

        {/* Loops turn away from the light, so they sit a shade deeper */}
        <linearGradient id="silkLoop" x1="0.1" y1="0" x2="0.6" y2="1">
          <stop offset="0%"   stopColor="#B62243" />
          <stop offset="38%"  stopColor="#DC4A69" />
          <stop offset="62%"  stopColor="#A81834" />
          <stop offset="100%" stopColor="#690D20" />
        </linearGradient>

        <linearGradient id="silkTail" x1="0" y1="0" x2="0.8" y2="1">
          <stop offset="0%"   stopColor="#C22B4C" />
          <stop offset="45%"  stopColor="#9A1533" />
          <stop offset="100%" stopColor="#630B1F" />
        </linearGradient>

        <radialGradient id="knotFill" cx="0.36" cy="0.30" r="0.78">
          <stop offset="0%"   stopColor="#FFA9BA" />
          <stop offset="42%"  stopColor="#D63256" />
          <stop offset="100%" stopColor="#780F26" />
        </radialGradient>

        <filter id="ribbonShadow" x="-30%" y="-40%" width="160%" height="200%">
          <feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#3A0512" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#ribbonShadow)">
        {/* ---- Bands running out to the edges ---- */}
        <g className="rb-band rb-band--l">
          <rect x="-4" y="49" width="168" height="28" rx="4" fill="url(#silkFace)" />
        </g>
        <g className="rb-band rb-band--r">
          <rect x="296" y="49" width="168" height="28" rx="4" fill="url(#silkFace)" />
        </g>

        {/* ---- Tails, hanging with a swallowtail notch ---- */}
        <g className="rb-tail rb-tail--l">
          <path
            d="M224 70 C 214 96, 194 118, 168 132 L 179 110 L 152 114 C 180 99, 204 84, 216 64 Z"
            fill="url(#silkTail)"
          />
        </g>
        <g className="rb-tail rb-tail--r">
          <path
            d="M236 70 C 246 96, 266 118, 292 132 L 281 110 L 308 114 C 280 99, 256 84, 244 64 Z"
            fill="url(#silkTail)"
          />
        </g>

        {/* ---- Bow loops ---- */}
        <g className="rb-loop rb-loop--l">
          <path
            d="M225 63 C 190 20, 122 16, 104 43 C 87 69, 152 84, 225 71 Z"
            fill="url(#silkLoop)"
          />
          {/* inner fold, catching a little light */}
          <path
            d="M220 66 C 192 38, 146 33, 125 49"
            fill="none"
            stroke="#FFC2CE"
            strokeOpacity="0.30"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
        <g className="rb-loop rb-loop--r">
          <path
            d="M235 63 C 270 20, 338 16, 356 43 C 373 69, 308 84, 235 71 Z"
            fill="url(#silkLoop)"
          />
          <path
            d="M240 66 C 268 38, 314 33, 335 49"
            fill="none"
            stroke="#FFC2CE"
            strokeOpacity="0.30"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>

        {/* ---- Knot ---- */}
        <g className="rb-knot">
          <rect x="211" y="44" width="38" height="38" rx="14" fill="url(#knotFill)" />
          <rect
            x="211" y="44" width="38" height="38" rx="14"
            fill="none" stroke="#FFE3EA" strokeOpacity="0.5" strokeWidth="1.6"
          />
          <path
            d="M219 53 C 226 49, 236 49, 242 53"
            fill="none" stroke="#FFD3DD" strokeOpacity="0.55" strokeWidth="2.2" strokeLinecap="round"
          />
        </g>
      </g>
    </svg>
  );
}
