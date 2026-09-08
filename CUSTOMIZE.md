# Customisation guide

Everything below is edited in **[`src/data.js`](src/data.js)** unless stated
otherwise. The dev server hot-reloads, so changes appear as you save.

- [Names](#names)
- [Date, time and countdown](#date-time-and-countdown)
- [Event schedule](#event-schedule)
- [Landing photograph](#landing-photograph)
- [The wedding film](#the-wedding-film)
- [Photographs](#photographs)
- [Background music](#background-music)
- [Opening sound effect](#opening-sound-effect)
- [Opening speed](#opening-speed)
- [Colours](#colours)
- [Fonts](#fonts)
- [Arabic verses](#arabic-verses)
- [Venue and map](#venue-and-map)
- [Gift registry](#gift-registry)
- [RSVP](#rsvp)
- [Guest walls and the wedding card](#guest-walls-and-the-wedding-card)
- [Page title and favicon](#page-title-and-favicon)

---

## Names

```js
export const couple = {
  bride: { name: 'Adhila', role: 'The Bride', caption: 'with a heart full of joy' },
  groom: { name: 'Kabeer', role: 'The Groom', caption: 'with a heart full of gratitude' },
  arabicNames: 'عادلة و كبير',
};
```

`name` appears on the opening panels, in the hero, and in the footer — change it
in one place and it updates everywhere. `role` and `caption` only appear on the
opening screen. `arabicNames` is the calligraphic line in the footer; set it to
an empty string to hide it.

> **Check the Arabic.** `عادلة و كبير` is a transliteration of Adhila and
> Kabeer, not something you supplied — correct it to the spelling your family
> actually uses.

> Long names: the hero uses `clamp()` so it scales down on its own, but names
> over roughly 10 characters look better if you drop `--t-hero` a notch in
> `src/styles/tokens.css`.

---

## Date, time and countdown

```js
export const ceremonyISO = '2027-01-09T11:00:00+05:30';
```

This one value drives the live countdown. **Keep the offset** — `+05:30` is IST.
Without it the countdown is wrong for guests in other timezones. Once the date
passes, the countdown is replaced by a short married message automatically.

The human-readable strings are separate, so you can phrase them freely:

```js
export const dates = {
  short:  '09 · 01 · 2027',              // opening screen
  long:   'Saturday · 09 January 2027',  // hero
  time:   '11:00 AM',                    // ceremony time, shown on the wedding card
  footer: '9th January 2027 · Thrissur, Kerala',
  rsvpBy: '1st January 2027',
};
```

`time` is the human-readable ceremony time printed on the downloadable
wedding card, alongside the date, the auditorium name and full address, and
the couple's families and home towns — all of which the card now carries.

---

## Event schedule

An array — add or remove entries freely, the timeline reflows. On desktop
entries alternate left and right of the centre spine in array order.

> The four entries currently in the file have had their **dates** realigned to
> the January 2027 ceremony, but their **times and venues** are still the
> original placeholders ("The Garden Lawn", "Poolside Deck", "Grand Ballroom").
> Set your real ones.

```js
export const schedule = [
  {
    day:   'Thu · 07 Jan',
    title: 'Mehndi',
    meta:  '4:00 PM — The Garden Lawn',
    desc:  'Henna, music and an evening of laughter with family.',
  },
  // ...
];
```

---

## Landing photograph

The picture behind the sealed opening screen.

```js
export const landing = {
  image: '/photos/104.jpeg',
  focal: '50% 14%',
  scrim: 0.72,
};
```

| Field | What it does |
|---|---|
| `image` | the photograph. Set to `null` for the plain emerald opening |
| `focal` | CSS `object-position`. A **low** percentage shows more of the top of the picture |
| `scrim` | 0–1. How heavily the photo is darkened so the gold lettering stays readable |

**About the crop.** 104.jpeg is 4:5 and most screens are close to that, so
`object-fit: cover` barely trims anything — you cannot rely on the crop alone
to hide the "Kabeer & Adhila" caption printed into the bottom of that file.
What actually covers it is the opaque foot of the scrim, in
`src/styles/site.css` under `.intro__scrim`. If you swap in a photo without
printed text and want the bottom brighter, soften the first gradient there:

```css
linear-gradient(180deg, transparent 58%, rgba(6,37,28,0.72) 74%, var(--emerald-900) 88%)
```

Raise the `58%` to reveal more of the photo, lower it to hide more.

---

## The wedding film

```js
export const film = {
  src: '/videos/1.mp4',
  poster: '/photos/105.jpeg',
  posterFocal: '50% 40%',
  posterZoom: 1.24,
  eyebrow: 'Our Film',
  title: 'A Moment, Held',
  caption: 'Thirty seconds of the day we said yes.',
};
```

Drop your file in `public/videos/` and point `src` at it. Set `src` to `null`
to remove the section entirely.

`poster` is the still shown before playback. It is rendered as its own layer
rather than the video's `poster` attribute, so `posterZoom` can crop past a
printed border — 105.jpeg has a white margin, and `1.24` pushes it out of
frame. Use `1` for a borderless photo.

### ⚠ The current video needs re-encoding

`public/videos/1.mp4` is **71.6 MB for 31.5 seconds of 1920x1080**. That is
about 18 Mbps — four to five times the bitrate 1080p needs. Its index (the
`moov` atom) also sits at the *end* of the file. Two consequences:

1. A browser cannot show the first frame until it has downloaded almost the
   whole file. There is no progressive playback.
2. On a phone that is roughly 70 MB of mobile data per guest who presses play.

The section is built so nothing downloads until someone actually presses play,
which limits the damage — but the file itself should be fixed. The resolution
is already fine, so this is purely a re-encode:

```bash
ffmpeg -i public/videos/1.mp4 -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart public/videos/film.mp4
```

`-movflags +faststart` moves the index to the front so playback can begin
immediately, and `-crf 23` brings the bitrate down to something sensible
without a visible quality drop. Expect roughly 8–15 MB out. Then set
`src: '/videos/film.mp4'`.

ffmpeg is not installed on this machine — `winget install Gyan.FFmpeg` or a
build from ffmpeg.org will do it.

---

## Photographs

**1. Put your images in `public/photos/`.**

Anything in `public/` is served from the site root, so `public/photos/01.jpg`
is referenced as `/photos/01.jpg`.

**2. Point `gallery` at them.**

```js
export const gallery = [
  { src: '/photos/102.jpeg', alt: 'Adhila seated on the veranda', focal: '50% 30%' },
  { src: '/photos/104.jpeg', alt: 'Kabeer and Adhila together', focal: '50% 28%' },
  { src: '/photos/101.PNG',  alt: 'Adhila framed by jasmine', rotate: -90 },
];
```

| Field | Required | Notes |
|---|---|---|
| `src` | yes | thumbnail shown in the grid |
| `full` | no | larger version for the lightbox; falls back to `src` |
| `alt` | yes | screen-reader description — please write a real one |
| `focal` | no | CSS `object-position` to steer the 3:4 crop, e.g. `'50% 30%'` |
| `rotate` | no | degrees, for a file whose pixels were saved sideways |

**Sideways photographs.** `101.PNG` was saved a quarter-turn out and, being a
PNG, carries no EXIF orientation tag for the browser to correct — so it is set
to `rotate: -90`. Flip the sign if an image lands upside down. The rotated
picture is resized to the cell's inverse ratio so it still fills the frame; if
you change the gallery's aspect ratio, update `.gallery__cell img.is-rotated`
in `src/styles/site.css` to match.

Re-saving the file the right way up is still better than rotating it in CSS —
`rotate` exists so a stray photo does not block you.

**Sizing.** Cells are portrait **3:4** and cropped with `object-fit: cover`, so
faces near the edges may clip. Around **700x900** is right for thumbnails and
**1400x1800** for `full`. Larger files just cost your guests mobile data.

**How many.** Any number. The grid is 3 columns on desktop, 2 on mobile, and
every third cell is offset downward for an editorial feel. Six or nine look
tidiest.

**Removing the gallery entirely:** delete the `<Gallery />` line from
`src/WeddingInvitation.jsx`.

> **File sizes.** Your photographs are currently 0.5–2.7 MB each and up to
> 3024x4032. The grid only ever shows them at a few hundred pixels wide, so
> most of that is wasted on your guests' data. Exporting them at around
> 900x1200 would cut the gallery from roughly 8 MB to under 1 MB.

---

## Background music

**1. Put an MP3 at `public/music/theme.mp3`.**

**2. Point at it:**

```js
export const audio = {
  music: {
    src: '/music/theme.mp3',
    volume: 0.32,      // 0-1. Keep it low; it starts without warning.
    startOnOpen: true, // false = guests must press the button themselves
  },
  // ...
};
```

The track loops. A floating button, bottom right, lets guests pause it.

**To remove music entirely**, set `src: null` — the audio element and the
floating button both disappear.

**Format:** MP3 is the safe choice. Browsers will not autoplay until the guest
interacts with the page, which is why playback is triggered by the ribbon click.
If autoplay is refused, the button still works — nothing breaks.

**Licensing:** if you publish this publicly, use music you have the right to
use. A commercial track on a public URL is a copyright problem.

---

## Opening sound effect

The silk rustle heard while the ribbon comes undone is **synthesised in the
browser** — there is no file to supply. See `src/lib/audio.js`.

```js
effects: {
  enabled: true,
  volume: 0.5,   // 0-1
},
```

Set `enabled: false` for a silent opening.

To retune, edit `src/lib/audio.js`:

- **`silk({ from, to, duration, peak, q })`** — filtered white noise. Raise
  `from` / `to` for a thinner, papery sound; lower them for heavier fabric.
- **`ribbonPull()`** — the short, close sound as the knot takes up slack.
- **`ribbonRelease()`** — the longer slip as the loops let go, with a quieter
  reverse sweep underneath so it settles rather than stops.

---

## Opening speed

```js
export const timing = {
  pull: 0,       // knot takes up slack
  slip: 220,     // loops leave the knot
  release: 620,  // knot lets go
  part: 1350,    // curtain begins to open
  reveal: 1300,  // how long the curtain takes to clear
};
```

Total time to the invitation is `part + reveal` — currently about 2.65s.

These drive the **JavaScript** state changes. The **CSS** stagger that makes
each ribbon part move at its own pace lives in `src/styles/site.css` under the
`The ribbon` heading:

```css
.ribbon {
  --rb-slip:  1.15s;   /* loops leaving the knot */
  --rb-fall:  1.30s;   /* tails dropping */
  --rb-relax: 1.10s;   /* bands easing apart */
}
```

If you shorten `timing`, shorten these too or the curtain will start parting
while the bow is still coming undone.

---

---

## Motion

Animations are keyed to a single `motion-reduce` class on `<html>`, kept in
sync with the guest's OS "reduce motion" setting (Windows *Animation
effects*, iOS *Reduce Motion*, Android *Remove animations*). Guests who have
that setting on — which is common on desktops — see the invitation settle
quietly instead of animating, exactly as their OS asked.

**If animations ever seem "not working" on your screen**, your OS is almost
certainly reporting `prefers-reduced-motion`. You can preview the full
experience anywhere by appending:

```
?motion=on        full motion, regardless of the OS setting
?motion=off       reduced motion, regardless of the OS setting
```

e.g. `https://your-site.app/?motion=on`.

Guest devices without the parameter behave exactly as their OS asks, which
is the accessible default; nothing changes for them. The decision is watched
live in `src/lib/motion.js`, so toggling the OS setting mid-visit flips the
site's motion instantly. Everything — scroll reveals, the staged closing and
footer, the ribbon choreography, the gold dust, the petals, the card tilt —
reads the same class, so CSS and JavaScript can never disagree.
## Colours

All of it is in **`src/styles/tokens.css`**. The palette block at the top is the
only place colours are defined:

```css
--emerald-900: #06251C;
--emerald-800: #0A3327;   /* dark section background */
--gold:        #C9A24B;
--gold-bright: #EAD6A0;   /* headings on dark */
--rose:        #8C3B4A;   /* eyebrow labels on light */
--ivory:       #FBF7EE;   /* light section background */
--sand:        #F2E9D7;   /* alternate light band */
```

Change these and the entire site re-themes — sections, buttons, the lattice,
the ornaments, the countdown.

**The ribbon is the exception.** It is an SVG with its own gradients in
`src/components/Ribbon.jsx` (`silkFace`, `silkLoop`, `silkTail`, `knotFill`),
so a red ribbon on a blue theme stays red until you edit those stops.

Sections alternate by class — `section--light`, `section--sand`,
`section--dark`, `section--deep`. Swap a section's class in its component to
change where it sits in the rhythm.

---

## Fonts

Two places must agree:

1. The `<link>` in **`index.html`** loads them from Google Fonts
2. `--font-display` / `--font-ui` / `--font-arabic` in **`src/styles/tokens.css`**

Current set: **Cormorant Garamond** (display), **Jost** (UI), **Amiri** (Arabic
body), **Aref Ruqaa** (Arabic display). If you change the Arabic faces, check
the verses still render — not every Arabic webfont carries full diacritics.

---

## Arabic verses

```js
export const verses = {
  arRum: { ar: '...', tr: '...', src: 'Surah Ar-Rum, 30:21' },
  dua:   { ar: '...', tr: '...', src: 'A traditional wedding dua' },
};
```

`ar` renders right-to-left with `lang="ar"`. `tr` is the translation, `src` the
attribution. To remove a verse block, delete its `<section>` from
`src/WeddingInvitation.jsx`.

---

## Venue and map

```js
export const venue = {
  name: 'KJM Community Hall',
  addressLines: ['Vettikkattiri, Thrissur,', 'Kerala 679531, India'],
  mapQuery: 'KJM Community Hall, Vettikkattiri, Cheruthuruthi, Nedumpura, Kerala 679531',
};
```

`mapQuery` is URL-encoded and passed to Google Maps for both the embedded map
and the Get Directions button. If the embed lands on the wrong place, paste the
venue's exact name or its `lat,lng` instead.

---

## Gift registry

Each card declares a `kind`, which decides what its button does.

```js
export const registry = [
  {
    kind: 'copy',                    // reveals details, copies on click
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
    lines: [                         // extra copyable rows
      { label: 'Account name', value: 'Kabeer' },
      { label: 'IFSC', value: 'SBIN0001234' },
      { label: 'Bank', value: 'State Bank of India' },
    ],
  },
  { kind: 'email', title: 'Ask Us Anything', desc: '…', cta: 'Email Us',
    value: 'ansalanu919@gmail.com' },
];
```

| `kind` | Button behaviour | Fields used |
|---|---|---|
| `'copy'` | expands a panel; each row has its own Copy button | `value`, `valueLabel`, `lines` |
| `'email'` | opens the guest's mail app | `value` |
| `'link'` | opens a URL in a new tab | `href` |

> **The bank details shipped here are placeholders.** `1234567890` /
> `SBIN0001234` are made up. Replace them with your real account number, IFSC
> and UPI ID before you send this to anyone — or delete the card.

Copying needs a real click (browsers refuse clipboard writes without user
activation) and can still be blocked by policy. When it fails, the value is
selected instead and the button reads *Press Ctrl+C*, so nobody has to retype
an account number.

Delete any card you do not want; the grid adapts to one, two or three.

---

## RSVP

Replies are saved **privately in the guest's own browser**. There is no backend
and nothing is sent anywhere.

```js
export const rsvp = {
  saveLocally: true,
};
```

Pressing **Save RSVP** stores the reply in `localStorage` under `wedding:rsvp`,
so the form remembers what a returning guest answered and pre-fills it. Set
`saveLocally: false` if you would rather store nothing — the form still shows
a thank-you, it just does not persist.

> **What this cannot do.** Because replies never leave the guest's device,
> *you cannot see them*. This is deliberate privacy, not a delivery system —
> treat your phone and your messages as the real RSVP list. If you want the
> replies to reach you, see below.

### Sending replies somewhere real

To collect replies in an inbox, wire the submit handler in
`src/components/Rsvp.jsx` to an endpoint — the record is already a plain
object ready to POST:

```js
await fetch('https://your-endpoint.example/rsvp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(record),
});
```

Formspree, Netlify Forms, a Google Apps Script endpoint or a small serverless
function all work. Remember to update the note under the button, which
currently reads *"Saved privately in this browser — nothing is sent
anywhere."*

---

## Guest walls and the wedding card

Three sections after the registry let guests contribute, and one lets them
take the invitation home. None of them are configured in `data.js` — they read
the couple's names from `couple` and store everything locally.

| Section | What guests do | Stored under |
|---|---|---|
| **Wishes Wall** | post a short blessing | `wedding:wishes` |
| **Guest Wall** | post a message with an optional photo; like and comment on posts | `wedding:guestWall` |
| **Video Wishes** | record from the camera or upload a clip | `wedding:videoWishes` |
| **The Wedding Card** | save the card as PNG/JPG or download it as a PDF | nothing — files download directly |

Like the RSVP, **none of this reaches you**: everything sits in the guest's
own browser. They are keepsakes for the guest, not a guestbook you can read.
If you want the content, the same `fetch`-to-an-endpoint approach as the RSVP
applies — the submit handlers live in `WishesWall.jsx`, `GuestWall.jsx` and
`VideoWishes.jsx`.

Limits worth knowing:

- Uploaded **photos** are compressed to ~900px JPEG before saving, to fit the
  browser's ~5 MB localStorage quota.
- Uploaded **videos** must be under ~4 MB for the same reason; larger files
  are refused with a friendly message.
- The **wedding card** renders with `html2canvas` and `jsPDF`, both loaded
  lazily on first click, so guests who never use it pay nothing for it.

To remove any of these sections, delete the corresponding line from
`src/WeddingInvitation.jsx` (`<WishesWall />`, `<GuestWall />`,
`<VideoWishes />`, `<WeddingCard />`).

---

## Page title and favicon

Edit **`index.html`** — the `<title>`, the `description` meta, and
`theme-color` (the browser chrome tint on mobile). Drop a `favicon.svg` into
`public/` and add a `<link rel="icon" href="/favicon.svg">` to the `<head>`.
