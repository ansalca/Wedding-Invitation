/* Hand-drawn ornament + icon set. All stroke-based so they inherit colour. */

export const RingsIcon = ({ size = 40 }) => (
  <svg width={size} height={size * 0.67} viewBox="0 0 60 40" fill="none" aria-hidden="true">
    <circle cx="22" cy="24" r="13" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="38" cy="24" r="13" stroke="currentColor" strokeWidth="1.4" />
    <path d="M30 9 L27 15 L33 15 Z" fill="currentColor" />
  </svg>
);

export const CrescentStarIcon = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path d="M23 6a13 13 0 1 0 0 28 16 16 0 1 1 0-28Z" fill="currentColor" />
    <path d="M32 6l1.4 3.4L37 11l-3.6 1.6L32 16l-1.4-3.4L27 11l3.6-1.6Z" fill="currentColor" />
  </svg>
);

export const StarMotif = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <path
      d="M20 2 L24 14 L36 12 L26 20 L36 28 L24 26 L20 38 L16 26 L4 28 L14 20 L4 12 L16 14 Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
    />
  </svg>
);

export const LanternIcon = ({ size = 40 }) => (
  <svg width={size * 0.67} height={size} viewBox="0 0 40 60" fill="none" aria-hidden="true">
    <path d="M20 2v6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M12 8h16l-2 6H14z" stroke="currentColor" strokeWidth="1.3" />
    <rect x="10" y="14" width="20" height="26" rx="3" stroke="currentColor" strokeWidth="1.3" />
    <path d="M14 20h12M14 27h12M14 34h12" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
    <path d="M14 40l6 10 6-10z" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const GiftIcon = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="6" y="16" width="28" height="19" stroke="currentColor" strokeWidth="1.3" />
    <path d="M4 16h32v6H4z" stroke="currentColor" strokeWidth="1.3" />
    <path d="M20 16v19" stroke="currentColor" strokeWidth="1.3" />
    <path d="M20 16c-6 0-9-2-9-5s5-4 9 5Zm0 0c6 0 9-2 9-5s-5-4-9 5Z" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

/* Decorative rule: —— ✦ —— */
export const Ornament = ({ className = '' }) => (
  <div className={`ornament ${className}`} aria-hidden="true">
    <span className="ornament__line" />
    <StarMotif size={18} />
    <span className="ornament__line ornament__line--r" />
  </div>
);

/* Bouquet used on the two intro panels. Emerald stems, gold-lit blooms. */
export const FloralBouquet = ({ side = 'left' }) => (
  <svg
    className={`intro__floral intro__floral--${side}`}
    viewBox="0 0 260 360"
    fill="none"
    aria-hidden="true"
  >
    <g stroke="#2E6B4F" strokeWidth="2.6" strokeLinecap="round" fill="none">
      <path d="M130 350 C130 275 88 220 58 175" />
      <path d="M132 350 C136 270 178 222 201 167" />
      <path d="M125 350 C120 286 114 248 126 190" />
      <path d="M128 340 C154 282 160 248 173 212" />
      <path d="M132 343 C103 286 92 250 84 214" />
    </g>
    <g fill="#3C8460" opacity="0.85">
      <path d="M88 255 C55 230 45 206 52 194 C74 197 91 215 88 255Z" />
      <path d="M174 255 C206 229 216 205 208 193 C187 198 171 215 174 255Z" />
      <path d="M109 282 C79 272 64 255 66 244 C88 244 103 255 109 282Z" />
      <path d="M154 284 C181 273 197 256 196 244 C176 244 160 257 154 284Z" />
    </g>
    <g stroke="rgba(251,247,238,0.42)" strokeWidth="1.4">
      <g fill="#C9A24B">
        <circle cx="58" cy="174" r="22" /><circle cx="44" cy="160" r="16" />
        <circle cx="72" cy="159" r="17" /><circle cx="58" cy="146" r="16" />
      </g>
      <g fill="#EAD6A0">
        <circle cx="199" cy="168" r="22" /><circle cx="185" cy="154" r="16" />
        <circle cx="212" cy="153" r="16" /><circle cx="199" cy="139" r="16" />
      </g>
      <g fill="#B4665F">
        <circle cx="128" cy="188" r="26" /><circle cx="111" cy="172" r="19" />
        <circle cx="146" cy="171" r="19" /><circle cx="128" cy="155" r="19" />
      </g>
    </g>
    <g fill="#FBF7EE" opacity="0.9">
      <circle cx="58" cy="173" r="7" /><circle cx="199" cy="167" r="7" /><circle cx="128" cy="187" r="8" />
    </g>
    <g fill="#EAD6A0" opacity="0.72">
      <circle cx="96" cy="125" r="7" /><circle cx="106" cy="109" r="5" /><circle cx="119" cy="98" r="4" />
      <circle cx="160" cy="120" r="7" /><circle cx="151" cy="104" r="5" /><circle cx="140" cy="92" r="4" />
    </g>
  </svg>
);

export const WhatsAppIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.71 2-1.4.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35Z" />
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.38a9.87 9.87 0 0 0 4.75 1.21h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15h-.01c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.05-.2-.31a8.2 8.2 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.25-8.23 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.7 8.23-8.24 8.23Z" />
  </svg>
);
