import { useEffect, useState } from 'react';
import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { gallery } from '../data.js';

export default function Gallery() {
  const [lightbox, setLightbox] = useState(null);

  /* Escape closes the lightbox; scroll stays locked while it is open. */
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => e.key === 'Escape' && setLightbox(null);
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox]);

  return (
    <section className="section section--dark" aria-labelledby="gallery-title">
      <Arabesque />
      <div className="section__inner">
        <SectionHead
          id="gallery-title"
          eyebrow="A Few Moments"
          title="Our Gallery"
          sub="A few of our favourite moments from the days that brought us here."
        />

        <div className="gallery reveal">
          {gallery.map((photo, i) => (
            <button
              type="button"
              className="gallery__cell"
              key={photo.src}
              onClick={() => setLightbox({ src: photo.full || photo.src, alt: photo.alt, rotate: photo.rotate })}
              aria-label={photo.alt || `Open photograph ${i + 1} of ${gallery.length}`}
            >
              <img
                src={photo.src}
                alt={photo.alt || ''}
                loading="lazy"
                decoding="async"
                className={photo.rotate ? 'is-rotated' : undefined}
                style={{
                  objectPosition: photo.focal || undefined,
                  '--photo-rotate': photo.rotate ? `${photo.rotate}deg` : undefined,
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.alt || 'Enlarged photograph'}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="lightbox__close"
            onClick={() => setLightbox(null)}
            aria-label="Close photograph"
          >
            &#10005;
          </button>
          <img
            src={lightbox.src}
            alt={lightbox.alt || ''}
            className={lightbox.rotate ? 'is-rotated' : undefined}
            style={lightbox.rotate ? { '--photo-rotate': `${lightbox.rotate}deg` } : undefined}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
