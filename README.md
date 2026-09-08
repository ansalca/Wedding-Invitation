# Adhila & Kabeer — Nikah Invitation

A single-page wedding invitation. Guests land on a sealed ribbon; pulling it
unties the bow, the floral panels part, and the invitation is revealed with a
silk rustle and a swell of music.

Built with Vite + React. No CSS framework, no UI library, no runtime CSS-in-JS.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5183
```

```bash
npm run build      # -> dist/
npm run preview    # serve dist/ locally
```

`dist/` is a static bundle — deploy it to Netlify, Vercel, GitHub Pages,
Cloudflare Pages or any static host. No server needed. Requires Node 20.19+.

---

## Supabase & environment variables

The guest features and the admin page talk to a Supabase project. Copy `.env`
(or create it) from the values in your Supabase dashboard → **Project
Settings → API**:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
```

Use the **publishable (anon)** key only — the service-role/secret key must
never appear in the frontend or in this repository (`.env` is git-ignored).
All access is governed by RLS policies applied via `supabase/schema.sql` (run
it once in the Supabase SQL Editor). Full setup — storage bucket, admin
account, RLS, deleting user content — is in **`SUPABASE_ADMIN_SETUP.md`**.

Without the variables, the site runs entirely on `localStorage` and the admin
page shows a friendly "not configured" message; nothing breaks.

---

## How to deploy

1. `npm run build` → outputs `dist/`.
2. Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages,
   GitHub Pages).
3. On the host, set the two `VITE_` env vars from step "Supabase &
   environment variables" **before** the build (they are baked in at build
   time), and re-deploy.
4. For SPA fallback routing, let unknown paths fall through to `index.html`
   (the admin page is also reachable at `/#admin`, which needs no rewrites).
5. Run `supabase/schema.sql` in the Supabase SQL editor and create your admin
   account per `SUPABASE_ADMIN_SETUP.md`.

---

## Changing the content

**Almost everything lives in [`src/data.js`](src/data.js)** — names, dates,
events, photographs, music, venue, registry, and the timing of the opening
sequence. You should not need to touch component code to make it your wedding.

See **[CUSTOMIZE.md](CUSTOMIZE.md)** for the full walkthrough, and
**[DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md)** for a file-by-file "what to change
where" reference. Quick index:

| I want to change… | Where |
|---|---|
| Bride / groom names | `couple` in `src/data.js` |
| The two families | `families` in `src/data.js` |
| Wedding date & countdown | `ceremonyISO` + `dates` in `src/data.js` |
| Event schedule | `schedule` in `src/data.js` |
| Landing background photo | `landing` in `src/data.js` |
| The wedding film | `film` in `src/data.js` + file in `public/videos/` |
| Photographs | `gallery` in `src/data.js` + files in `public/photos/` |
| Background music | `audio.music` in `src/data.js` + file in `public/music/` |
| Opening sound effect | `audio.effects` in `src/data.js`, synthesis in `src/lib/audio.js` |
| How fast the ribbon opens | `timing` in `src/data.js` |
| Colours / theme | `src/styles/tokens.css` |
| Fonts | `src/styles/tokens.css` + the `<link>` in `index.html` |
| Qur'anic verse / dua | `verses` in `src/data.js` |
| Venue & map | `venue` in `src/data.js` |
| Gift registry links | `registry` in `src/data.js` |
| Browser tab title & meta | `index.html` |

---

## Project structure

```
public/
  photos/            your photographs
  videos/            your wedding film
  music/             your background music

src/
  data.js            ← all wedding content, in one file
  main.jsx           React entry point
  WeddingInvitation.jsx   composition root + opening sequence orchestration

  components/
    IntroCurtain.jsx   the sealed opening screen
    Ribbon.jsx         the bow, drawn in SVG
    Hero.jsx           name lockup + countdown
    Arabesque.jsx      tiling khatim lattice used as section texture
    AmbientCanvas.jsx  three.js gold dust (lazy-loaded, hero only)
    Verse.jsx          Arabic + translation block
    Couple.jsx         the bride & groom with their families
    Schedule.jsx       event timeline
    Film.jsx           the wedding film, in a cinema frame
    Gallery.jsx        photo grid + lightbox
    Venue.jsx          map + directions
    Rsvp.jsx           RSVP form (Supabase + localStorage fallback, one per guest)
    Registry.jsx       gift options
    WishesWall.jsx     guests post blessings (Supabase, paginated, scrollable)
    GuestWall.jsx      social feed with photos, likes, comments (Supabase, paginated)
    VideoWishes.jsx    guests record or upload video wishes (Supabase, paginated)
    AdminRsvp.jsx      private RSVP dashboard at /#admin (Supabase Auth + RLS)
    WeddingCard.jsx    printable card — export as PNG / JPG / PDF
    Closing.jsx        the closing flourish
    CinematicMotion.jsx  falling-petal overlay (lazy-loaded)
    SectionHead.jsx    shared section heading
    MusicToggle.jsx    floating music button
    Footer.jsx
    ErrorBoundary.jsx  keeps a crashed section from taking the page down

  lib/
    audio.js         Web Audio synthesis for the opening sounds
    hooks.js         reveal-on-scroll, scroll lock, countdown, localStorage
    icons.jsx        ornaments, florals, icon set

  styles/
    tokens.css       ← design tokens: colour, type, spacing, motion
    base.css         reset + type roles
    site.css         everything else
```

---

## How the opening works

The sequence is a state machine in `WeddingInvitation.jsx`, driven by the
millisecond offsets in `timing` (`src/data.js`):

| Offset | State | What happens | Sound |
|---|---|---|---|
| `0` | `untied` | knot takes up slack and turns | silk pull |
| `slip` (220ms) | — | loops slip free and fall outward | silk release |
| `release` (620ms) | `released` | knot lets go and fades | — |
| `part` (1350ms) | `breaking` | bands draw off, panels part, gold bloom | — |
| `part + reveal` (2650ms) | `opened` | curtain removed, scroll unlocked | music starts |

Each ribbon part has its own CSS `transition-delay` and easing in
`src/styles/site.css` (search for `The ribbon`). The stagger is what makes it
read as fabric rather than a simultaneous fade — if you change `timing`, adjust
the `--rb-*` durations there to match.

---

## Guest interactions, Supabase and privacy

The guest features (RSVP, Wishes Wall, Guest Wall, Video Wishes) are backed by
**Supabase** when the environment variables are set, and **fall back to
`localStorage`** when they are not — the site works either way.

- **RSVP** — inserted into the `rsvps` table; the guest's contact (email or
  phone) is normalised into a unique `rsvp_identity`, so the database rejects
  duplicate replies. After refresh the form asks the database whether this
  guest has already replied (a yes/no RPC — no private rows are exposed). A
  copy is also kept in `localStorage` under `wedding:rsvp`.
- **Wishes Wall** — shared `wishes` table, newest first, paginated 12 at a
  time inside a scrollable frame.
- **Guest Wall** — posts with photos and avatars stored in Supabase Storage,
  likes and comments in relational tables, paginated 6 at a time with a
  "View More" button. Uploaded photos are compressed in the browser before
  they are stored. **Each uploaded file is limited to 50 MB.**
- **Video Wishes** — clips uploaded to Storage, list rows in
  `video_wishes`, paginated 6 at a time. **Each uploaded file is limited to
  50 MB.**

The couple can read RSVPs privately at **`/#admin`** (email/password via
Supabase Auth, allow-listed through the `admin_users` table). Public visitors
can never `SELECT` from `rsvps` — authorisation is enforced by Postgres RLS,
not by the frontend. Guest-post deletion is admin-only; see
`SUPABASE_ADMIN_SETUP.md`.

---

## Notes for developers

**Sound without assets.** The silk rustle heard while the ribbon comes undone
is synthesised at runtime in `src/lib/audio.js` — white noise through a
sweeping bandpass filter. There is no audio file to ship or license. Only the
optional background music is a real file.

Browsers block audio until a user gesture, which is why `unlock()` is called
inside the ribbon click handler rather than on mount.

**The film never auto-downloads.** `Film.jsx` sets `preload="none"` and paints
its own poster layer, so a guest who scrolls past the section transfers zero
bytes of video. Playback is fetched only when the play button is pressed. This
matters more than usual here — see the warning in CUSTOMIZE.md about the
current file.

**Code splitting.** three.js (~520 kB), jsPDF and html2canvas are all lazily
imported — three behind the curtain (prefetched on ribbon pull), the export
libraries on the guest's first click of a Save button. The initial payload
stays small; a guest who only reads the invitation never downloads the heavy
chunks.

**The lattice needs unique ids.** `Arabesque` uses `useId()` per instance. An
SVG `<pattern>` is resolved by reference, so duplicate ids would make every
section paint the first instance's pattern — including its colour.

**Reduced motion** is respected throughout: the reveal observer resolves
immediately, the ribbon stagger collapses, the foil sheen and idle halo stop.
Sound is deliberately *not* tied to this — motion sensitivity is not sound
sensitivity. Use `audio.effects.enabled` to silence the effects.

The motion decision is one `motion-reduce` class on `<html>`, kept in sync
with the OS setting by `src/lib/motion.js` — no CSS/JS drift, and flipping
the OS setting mid-visit updates the page live. To preview the full
experience on a machine that reports reduced motion (e.g. Windows with
*Animation effects* off), append `?motion=on` to the URL; `?motion=off`
forces the reduced experience. Guest URLs without the parameter behave
exactly as their OS asks.

**RSVP and guest walls use Supabase when configured, with localStorage as a
graceful fallback.** The RSVP form writes to `localStorage` under `wedding:rsvp`
and also inserts into the `rsvps` table; on a later visit it checks the
database (existence-only) so a guest who already replied sees the
"already received" card instead of the form. The Wishes Wall, Guest Wall and
Video Wishes do the same: shared Supabase tables with localStorage fallback.
Uploaded photos are compressed in the browser before upload, and clips are
capped so everything stays polite for both the database and guests' data.

---

## Accessibility

- Every interactive element is a real `<button>` or `<a>` with a visible focus ring
- The opening curtain is a single labelled button; `inert` once dismissed
- Arabic passages carry `lang="ar"` and `dir="rtl"`
- Countdown announces via `aria-live`; the lightbox is a labelled modal, Escape closes it
- Photograph `alt` text comes from `gallery[].alt` — **write real descriptions**
