# Wedding film

Drop your video here, then point `src/data.js` at it:

```js
export const film = {
  src: '/videos/1.mp4',
  poster: '/photos/105.jpeg',
  // ...
};
```

Set `src: null` to remove the film section entirely.

## Encoding matters here

`1.mp4` is 71.6 MB for 31.5 seconds of 1920x1080 — about 18 Mbps, four to five
times what 1080p needs. Its index (`moov` atom) is also at the end of the file,
so a browser has to download nearly all of it before it can show one frame.

The site is built so nothing downloads until a guest presses play — but the
file is still worth re-encoding. The resolution is fine; only the bitrate and
the index placement are wrong:

```bash
ffmpeg -i public/videos/1.mp4 -c:v libx264 -crf 23 -preset slow -c:a aac -b:a 128k -movflags +faststart public/videos/film.mp4
```

Expect roughly 8–15 MB out. Then set `src: '/videos/film.mp4'`.

See `../../CUSTOMIZE.md` for the full guide.
