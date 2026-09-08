# Developer Guide — Maintain this site without reading all the code

This guide tells you exactly **which file** to open and **what to change** for
each common edit. The golden rule: **almost every wedding detail lives in
[`src/data.js`](src/data.js)** — if it is text, a date, a photo, a link or a
colour, it is configured there or in a CSS file, not buried in a component.

Project root used throughout: `C:\Users\ansal\Downloads\wedding-site-ribbon-fixed\wedding-site`

---

## Quick reference — which file controls what

| I want to change… | File |
|---|---|
| Bride / groom names | `src/data.js` → `couple` |
| Families | `src/data.js` → `families` |
| Wedding date / countdown / RSVP-by date | `src/data.js` → `ceremonyISO`, `dates` |
| Event schedule | `src/data.js` → `schedule` |
| Qur'anic verse / dua (Arabic + translation) | `src/data.js` → `verses` |
| Venue + map | `src/data.js` → `venue` |
| Gift registry cards & bank details | `src/data.js` → `registry` |
| Landing photograph | `src/data.js` → `landing` + file in `public/photos/` |
| Gallery photographs | `src/data.js` → `gallery` + files in `public/photos/` |
| The wedding film | `src/data.js` → `film` + file in `public/videos/` |
| Background music | `src/data.js` → `audio` + file in `public/music/` |
| Opening-sequence timing | `src/data.js` → `timing` |
| Colours (entire theme) | `src/styles/tokens.css` |
| Fonts | `src/styles/tokens.css` + the `<link>` in `index.html` |
| Page title / meta | `index.html` |
| RSVP behaviour (local save on/off) | `src/data.js` → `rsvp` |
| Guest wall upload size / folder | `src/components/GuestWall.jsx` + `src/lib/supabase.js` |
| Video wishes size limit | `src/components/VideoWishes.jsx` |
| Wishes wall page size | `src/lib/supabase.js` → `WISHES_PAGE_SIZE` |
| Guest wall page size | `src/lib/supabase.js` → `FEED_PAGE_SIZE` |

---

## Names

`src/data.js`:

```js
export const couple = {
  bride: { name: 'Adhila', role: 'The Bride', caption: 'with a heart full of joy' },
  groom: { name: 'Kabeer', role: 'The Groom', caption: 'with a heart full of gratitude' },
  arabicNames: 'عادلة و كبير',
};
```

`name` updates everywhere at once. `arabicNames` is the footer calligraphy;
set it to `''` to hide it.

## Date, countdown and RSVP-by

`src/data.js`:

```js
export const ceremonyISO = '2027-01-09T11:00:00+05:30';
export const dates = { short: '09 · 01 · 2027', long: 'Saturday · 09 January 2027',
  time: '11:00 AM', footer: '9th January 2027 · Thrissur, Kerala',
  rsvpBy: '1st January 2027' };
```

Keep the `+05:30` offset in `ceremonyISO` — it is what makes the countdown
correct for guests in other timezones.

## Venue and family details

`src/data.js`:

```js
export const families = { bride: { role: 'Daughter of Mr. Ummer & Mrs. Fathima', note: 'Vettikkattiri, Thrissur, Kerala' }, … };
export const venue = { name: 'KJM Community Hall', addressLines: ['…'], mapQuery: '…' };
```

`mapQuery` is what Google Maps searches — set the venue's exact name there.

## Arabic text

`src/data.js` → `verses.arRum.ar` and `verses.dua.ar` are displayed
right-to-left with `lang="ar"`. Keep the same font — Amiri/Aref Ruqaa are the
two faces loaded in `index.html` — because not every Arabic webfont carries
the full diacritics and the verse would render inconsistently.

## Photos

1. Copy files into `public/photos/`.
2. Add/point entries in `src/data.js` → `gallery`:

```js
export const gallery = [
  { src: '/photos/102.jpeg', alt: 'Adhila seated on the veranda', focal: '50% 30%' },
];
```

| Field | Meaning |
|---|---|
| `src` | thumbnail (grid shows ~700px) |
| `full` | optional larger image for the lightbox; falls back to `src` |
| `alt` | screen-reader description — write a real one |
| `focal` | CSS `object-position` to steer the 3:4 crop |
| `rotate` | degrees for a file saved sideways (e.g. `-90`) |

Export images at ~900×1200 for the grid and ~1400×1800 for `full` — larger
files just cost guests mobile data.

## Wedding film

1. Put the MP4 in `public/videos/`.
2. Point `src/data.js` → `film.src` at it.

The file `1.mp4` in the repo is ~70 MB and not `faststart`-encoded — re-encode
it once with ffmpeg (`-movflags +faststart`, `-crf 23`) so phones can start
playback without downloading the whole file, then point `film.src` at the new
file. See `CUSTOMIZE.md` → "The wedding film".

## Music

Put an MP3 at `public/music/theme.mp3` and point `src/data.js` → `audio.music`
at it. `volume` (0–1), `startOnOpen` (autoplay after the ribbon opens). Set
`src: null` to remove the music button entirely.

## Colours and fonts

`src/styles/tokens.css` — the palette block at the top is the single source
of truth: `--emerald-*`, `--gold*`, `--ivory`, `--sand`, `--rose`, plus the
new accents `--burgundy`, `--peach`, `--lavender`. Change them and the site
re-themes.

Fonts must agree in two places: `tokens.css` (`--font-display`, `--font-ui`,
`--font-arabic`) and the Google Fonts `<link>` in `index.html`.

## RSVP fields

The form is `src/components/Rsvp.jsx`. It collects **name, contact (email or
phone), guest count, attending, message**. The contact field is the guest's
identity: `src/lib/supabase.js` → `normalizeContact` decides how it is
normalised (email → lowercased; phone → digits only) and the database's unique
`rsvp_identity` index makes one-reply-per-guest a hard guarantee. Keep at
least one reliable contact field — the "already received" detection depends
on it.

## Guest Wall / Wishes Wall / Video Wishes

- **Page sizes** live in `src/lib/supabase.js`: `WISHES_PAGE_SIZE` (3 —
  three wishes at a time with a "Load More" button, no internal scrollbar),
  `FEED_PAGE_SIZE` (6), `VIDEOS_PAGE_SIZE` (6). Larger pages mean fewer
  "Load more" taps but bigger initial loads.
- **Photo compression** is in `src/components/GuestWall.jsx` (`fileToDataUrl`
  at ~1280px for posts, ~320px for the avatar).
- **Upload limit — 50 MB per file.** Enforced before upload:
  `MAX_UPLOAD_BYTES` in `src/components/GuestWall.jsx` (photos + avatars) and
  `MAX_VIDEO_BYTES_SHARED` in `src/components/VideoWishes.jsx` (shared board;
  the 4 MB `MAX_VIDEO_BYTES` cap only applies to the localStorage fallback).
  Keep these under your Supabase Storage object-size cap.
- **Upload progress** — an elegant spinner + "Uploading your memory…"
  (`.upload-progress` in `src/styles/site.css`) shows during photo, avatar,
  and video uploads; the submit button is disabled while uploading.
- **Admin moderation** — the admin dashboard's Content Moderation tab lets an
  admin delete wishes, guest posts (cascading to comments/likes + Storage
  media), and video wishes (incl. the video file), all RLS-enforced.
- Text limits (name 60 chars, message lengths) are now also enforced in the
  database (`supabase/schema.sql`, V3 section) as well as the inputs.

## How Supabase is wired (overview)

- `src/lib/supabase.js` creates the client with the publishable key and
  exposes small helpers (`listWishesPage`, `insertWish`, `listGuestPostsPage`,
  `setLike`, `insertComment`, `uploadGuestFile`, `uploadAvatar`,
  `listVideoWishesPage`, `saveRsvp`, admin auth + `listRsvps`).
- Every component tries Supabase first and **falls back to localStorage**
  silently if it is unreachable — the site never breaks.
- The whole database setup (tables, RLS, storage bucket, admin allow-list,
  input hardening) is one file: `supabase/schema.sql`. Apply it in the
  Supabase SQL Editor. See `SUPABASE_ADMIN_SETUP.md`.

## Env variables

`.env` at the project root:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Only the **publishable** key belongs in the browser. Never add the service-role
/ secret key. `.env` is git-ignored.

## Delete data

Guests have no delete buttons. To remove a wish/post/video/RSVP, see
`SUPABASE_ADMIN_SETUP.md` → "Deleting user-generated content" (dashboard SQL or
Storage UI). Deleting a guest post cascades to its likes and comments.