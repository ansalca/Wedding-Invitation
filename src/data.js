/* =========================================================================
   All wedding content lives here. Edit this file to change the invitation —
   no component code needs to be touched.

   See CUSTOMIZE.md for a walkthrough of every section below.
   ========================================================================= */

export const couple = {
  bride: { name: 'Adhila', role: 'The Bride', caption: 'with a heart full of joy' },
  groom: { name: 'Kabeer', role: 'The Groom', caption: 'with a heart full of gratitude' },
  /* Calligraphic line in the footer. Transliterated — please check the
     spelling you actually use and correct it here. */
  arabicNames: 'عادلة و كبير',
};

/* The two families behind the couple. Rendered by the Couple section —
   edit freely, every line is safe to change or remove. */
export const families = {
  bride: {
    label: 'The Bride',
    role: 'Daughter of Mr. Ummer & Mrs. Habeetha',
    note: 'Ottupara, Wadakkanchery, Thrissur, Kerala',
  },
  groom: {
    label: 'The Groom',
    role: 'Son of Mr. Abdul Rahman & Mrs. Aysha',
    note: 'Cheruthuruthi, Thrissur, Kerala',
  },
};

/* ISO 8601 with offset — IST (+05:30). Drives the live countdown. */
export const ceremonyISO = '2027-01-09T11:00:00+05:30';

export const dates = {
  short: '09 · 01 · 2027',
  long: 'Saturday · 09 January 2027',
  time: '11:00 AM',                      // ceremony time, shown on the card & venue
  footer: '9th January 2027 · Thrissur, Kerala',
  rsvpBy: '1st January 2027',
};

/* Dates realigned to the January 2027 ceremony. Times and venues below are
   still the original placeholders — set your real ones. */
export const schedule = [
  {
    day: 'Thu · 07 Jan',
    title: 'Mehndi',
    meta: '4:00 PM — The Garden Lawn',
    desc: 'Henna, music and an evening of laughter with family.',
  },
  {
    day: 'Fri · 08 Jan',
    title: 'Sangeet',
    meta: '7:30 PM — Poolside Deck',
    desc: 'Performances and dancing to celebrate the couple.',
  },
  {
    day: 'Sat · 09 Jan',
    title: 'Nikah Ceremony',
    meta: '11:00 AM — Main Hall',
    desc: 'The sacred marriage contract, followed by lunch and blessings.',
  },
  {
    day: 'Sat · 09 Jan',
    title: 'Walima Reception',
    meta: '7:00 PM — Grand Ballroom',
    desc: 'A joyous feast celebrating the union, hosted with gratitude.',
  },
];

export const verses = {
  arRum: {
    ar: 'وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً',
    tr: '“And among His signs is this: He created for you mates from among yourselves, that you may find tranquillity in them, and He placed between you love and mercy.”',
    src: 'Surah Ar-Rum, 30:21',
  },
  dua: {
    ar: 'بَارَكَ اللَّهُ لَكَ وَبَارَكَ عَلَيْكَ وَجَمَعَ بَيْنَكُمَا فِي خَيْرٍ',
    tr: '“May Allah bless you, and shower His blessings upon you, and unite you both in goodness.”',
    src: 'A traditional wedding dua',
  },
};

export const venue = {
  name: 'KJM Community Hall',
  addressLines: ['Vettikkattiri, Thrissur,', 'Kerala 679531, India'],
  mapQuery: 'KJM Community Hall, Vettikkattiri, Cheruthuruthi, Nedumpura, Kerala 679531',
};

/* =========================================================================
   LANDING
   -------------------------------------------------------------------------
   The photograph behind the sealed opening screen.

   focal  CSS object-position. A low percentage keeps both faces in frame and
          pushes the bottom of the picture out of the crop — necessary here
          because 104.jpeg has "Kabeer & Adhila" printed across its lower third.
   scrim  0–1. How heavily the photo is darkened so the gold lettering and
          the ribbon stay readable on top of it. Lower it for a brighter
          photo, raise it if text is hard to read.
   ========================================================================= */
export const landing = {
  image: '/photos/104.jpeg',
  focal: '50% 14%',
  scrim: 0.72,
};

/* =========================================================================
   THE FILM
   -------------------------------------------------------------------------
   src     video file in public/videos/
   poster  still shown before playback — nothing downloads until the guest
           presses play, so this image is all most visitors will ever load.
   Set src to null to remove the section entirely.
   ========================================================================= */
export const film = {
  src: '/videos/1.mp4',
  poster: '/photos/105.jpeg',
  posterFocal: '50% 40%',
  /* 105.jpeg has a white margin printed around it; zooming past the edge
     keeps the cinema frame edge-to-edge. Set to 1 for a borderless photo. */
  posterZoom: 1.24,
  eyebrow: 'Our Film',
  title: 'A Moment, Held',
  caption: 'Thirty seconds of the day we said yes.',
};

/* =========================================================================
   GIFT REGISTRY
   -------------------------------------------------------------------------
   Each card needs a `kind`:

     'link'   opens `href` in a new tab — use for a real registry URL
     'email'  opens the guest's mail app — `value` is the address
     'copy'   reveals `value` and copies it to the clipboard on click.
              Use for a UPI ID, an account number, or an IFSC.
              `lines` adds extra copyable rows under the main value.

   Delete any card you do not want; the grid adapts.
   ========================================================================= */
export const registry = [
  {
    kind: 'copy',
    title: 'Gift a Contribution',
    desc: 'Send something towards our new home via UPI.',
    cta: 'Show UPI ID',
    value: 'ansalanu919@ptaxis',
    valueLabel: 'UPI ID',
  },
  {
    kind: 'copy',
    title: 'Bank Transfer',
    desc: 'Account details for anyone who prefers a transfer.',
    cta: 'Show Details',
    value: '1234567890',
    valueLabel: 'Account number',
    lines: [
      { label: 'Account name', value: 'Adhila Ummer' },
      { label: 'IFSC', value: 'SBIN0001234' },
      { label: 'Bank', value: 'State Bank of India' },
    ],
  },
  {
    kind: 'email',
    title: 'Ask Us Anything',
    desc: 'Questions about travel, timings or anything else.',
    cta: 'Email Us',
    value: 'ansalanu919@gmail.com',
  },
];

/* =========================================================================
   RSVP — now uses only localStorage, no WhatsApp
   ========================================================================= */
export const rsvp = {
  saveLocally: true,
};

/* =========================================================================
   GIFT REGISTRY
   -------------------------------------------------------------------------
   Two elegant options: a UPI monetary gift and an Amazon wedding registry.

   UPI GIFT
     upiId        the UPI handle guests pay to (shown + copyable)
     upiQrImage   path to your UPI QR code image in public/photos/;
                  replace with your own — the card renders even if it is
                  missing, falling back to the UPI ID only.
     openUpiApp   whether to show the "Open UPI App" button (uses a
                  generic UPI intent; harmless if no app handles it).

   AMAZON WEDDING GIFTS
     amazonGiftUrl  your Amazon wedding-registry URL. Leave empty ("") to
                    hide the button until you have a real link. Never invent
                    a URL here.
   ========================================================================= */
export const giftRegistry = {
  upi: {
    id: 'ansalanu919@ptaxis',
    qrImage: '/photos/upi-qr.png',
    openUpiApp: true,
  },
  amazon: {
    url: '',
  },
};

/* =========================================================================
   PHOTOGRAPHS
   -------------------------------------------------------------------------
   Files live in  public/photos/  and are referenced from the site root, so
   public/photos/102.jpeg  is written here as  '/photos/102.jpeg'.

     src     thumbnail in the grid   (portrait 3:4 crops best)
     full    larger version for the lightbox; omit to reuse `src`
     alt     screen-reader description
     focal   optional CSS object-position, to steer the 3:4 crop
     rotate  optional degrees, for images whose pixels were saved sideways
             with no EXIF orientation to correct them
   ========================================================================= */
export const gallery = [
  {
    src: '/photos/102.jpeg',
    alt: 'Adhila seated on the veranda in a blush pink outfit, hands hennaed',
    focal: '50% 30%',
  },
  {
    src: '/photos/104.jpeg',
    alt: 'Kabeer and Adhila standing together against green foliage',
    focal: '50% 28%',
  },
  {
    src: '/photos/105.jpeg',
    alt: 'Kabeer and Adhila looking at one another in the garden',
    focal: '50% 45%',
  },
  {
    src: '/photos/103.jpeg',
    alt: 'The couple arm in arm, Adhila holding a bouquet',
    focal: '50% 40%',
  },
  {
    src: '/photos/106.jpeg',
    alt: 'Three portraits of Adhila among the veranda plants',
    focal: '50% 40%',
  },
  {
    src: '/photos/107.jpeg',
    alt: 'Adhila seated beside the jasmine and the white bicycle',
    focal: '50% 50%',
  },
  {
    src: '/photos/108.jpeg',
    alt: 'Two portraits of Adhila beside the flowering vine',
    focal: '50% 50%',
  },
  /* 101.PNG was saved rotated a quarter turn and carries no EXIF orientation
     tag, so browsers show it on its side. `rotate` corrects it in the layout
     without re-encoding the file. Flip the sign if it lands upside down. */
  {
    src: '/photos/101.PNG',
    alt: 'Adhila on the veranda, framed by jasmine',
    rotate: -90,
  },
];

/* =========================================================================
   AUDIO
   -------------------------------------------------------------------------
   music    looped quietly after opening. Set src to null to remove the
            music button entirely.
   effects  the silk rustle heard while the ribbon comes undone, synthesised
            in the browser (src/lib/audio.js) — no file needed.
   ========================================================================= */
export const audio = {
  music: {
    src: '/music/theme.mp3',
    volume: 0.40,
    startOnOpen: true,
  },
  effects: {
    enabled: true,
    volume: 0.5,
  },
};

/* =========================================================================
   OPENING SEQUENCE (milliseconds)
   Raise these to make the ribbon linger; lower them to get to the
   invitation faster. The CSS stagger lives in src/styles/site.css.
   ========================================================================= */
export const timing = {
  pull: 0,        // knot takes up slack
  slip: 220,      // loops leave the knot
  release: 620,   // knot lets go
  part: 1350,     // curtain begins to open
  reveal: 1300,   // how long the curtain takes to clear
};