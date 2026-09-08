# Background music

Drop one MP3 in this folder, then point `src/data.js` at it:

```js
export const audio = {
  music: {
    src: '/music/theme.mp3',
    volume: 0.32,
    startOnOpen: true,
  },
  // ...
};
```

A file saved here as `theme.mp3` is referenced as `/music/theme.mp3`.

Set `src: null` to remove the music and its floating button entirely.

The opening silk-and-chime sounds are **synthesised in the browser** — they are
not files, and nothing needs to go here for them to work.

Use music you have the right to publish.

See `../../CUSTOMIZE.md` for the full guide.
