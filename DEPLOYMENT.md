# Deployment guide

The production build is a static bundle (`dist/`) served over HTTPS by any static host. This project is preconfigured for **Vercel** (see `vercel.json`), but the same output works on Netlify, Cloudflare Pages, or any static host.

---

## Prerequisites

1. A Supabase project with the schema applied (see `SUPABASE_ADMIN_SETUP.md`).
2. The two environment variables from your Supabase dashboard → **Project Settings → API**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## Option A — Vercel (recommended, one CLI command)

```bash
npm i -g vercel          # once
vercel                   # follow the prompts, then:
vercel --prod            # push to production
```

When prompted:
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variables:** add the two `VITE_` keys above.

Vercel auto-detects the SPA rewrite from `vercel.json` (all paths fall through to `index.html`, so `/#admin` works without extra config).

---

## Option B — Netlify

```bash
npm i -g netlify-cli
netlify deploy --build --prod   # output dir: dist
```

Add the two `VITE_` keys under **Site settings → Environment variables**. Add a `_redirects` file in `public/`:

```
/*    /index.html   200
```

---

## Option C — Cloudflare Pages

1. Push this repo to GitHub.
2. In Cloudflare Pages, connect the repo.
3. **Build command:** `npm run build`
4. **Build output directory:** `dist`
5. Add the two `VITE_` keys under **Settings → Environment variables**.
6. No extra rewrite config is needed for `/#admin` (hash routing).

---

## Option D — Manual / any static host

```bash
npm run build      # outputs dist/
```

Upload the contents of `dist/` to any HTTPS static host (S3 + CloudFront, GitHub Pages, nginx, etc.). Ensure the host serves `index.html` for unknown paths (SPA fallback).

---

## Post-deployment checklist

- [ ] Homepage loads over HTTPS
- [ ] CSS, JS, images, music, and main video all load
- [ ] Google Fonts load (or the fallback serif/sans faces are acceptable)
- [ ] Supabase requests succeed (RSVP, Wishes, Guest Wall, Video Wishes)
- [ ] Admin route `/#admin` loads and accepts your credentials
- [ ] No console errors on mobile (320–430 px widths)
- [ ] Our Film: video visual appears while playing
- [ ] Gift Registry: Show Details keeps cards visible

---

## Redeploying

After any content change (names, dates, photos, music, video, colours, fonts):

```bash
npm run build && vercel --prod     # or your host's deploy command
```

Content lives in `src/data.js` (and the corresponding files in `public/photos/`, `public/videos/`, `public/music/`). Most edits require only a rebuild + redeploy — no schema change.