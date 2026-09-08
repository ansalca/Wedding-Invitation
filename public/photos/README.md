# Photographs

Drop your images in this folder, then list them in `src/data.js` under `gallery`.

A file saved here as `01.jpg` is referenced as `/photos/01.jpg` — the `public/`
part is not included in the path.

```js
export const gallery = [
  { src: '/photos/01.jpg', alt: 'Adhila and Kabeer at the engagement' },
  { src: '/photos/02.jpg', full: '/photos/02-large.jpg', alt: 'Family in Thrissur' },
];
```

- Portrait **3:4** crops best — around **700x900** for thumbnails
- Add `full` (about **1400x1800**) if you want a sharper lightbox image
- Always write a real `alt` description

See `../../CUSTOMIZE.md` for the full guide.
