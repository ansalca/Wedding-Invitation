import { useRef, useState, useCallback, useEffect } from 'react';
import Arabesque from './Arabesque.jsx';
import { useInView } from '../lib/hooks.js';
import { film } from '../data.js';

/* The wedding film, presented as a cinema frame: 2.39:1 letterbox, gold
   hairline, poster still until the guest chooses to watch.

   preload="none" matters here. The source file is large and its moov atom
   sits at the end, so a browser that starts buffering has to pull most of
   the file down before it can show a single frame. Nothing is fetched until
   the play button is pressed — guests who scroll past pay only for the
   poster image. */
export default function Film() {
  const videoRef = useRef(null);
  const frameRef = useRef(null);
  /* React-managed scroll reveal — the frame's className is dynamic
     (is-playing/is-revealed), so the DOM-mutating global sweep would have
     its .is-in wiped on every state change (the invisible-frame bug). */
  const frameInView = useInView(frameRef);
  const [started, setStarted] = useState(false);
  /* `revealed` = the poster has faded out. It flips on the first real
     playback signal (metadata/canplay/playing) AND on a fallback timer, so
     the poster can never trap a playing-but-invisible video on a browser
     that skips media events (the reported mobile bug: audio played, no
     picture, because an opaque poster sat above an opacity:0 video). */
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [slow, setSlow] = useState(false);
  const timersRef = useRef([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(clearTimeout);
  }, []);

  const play = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    setStarted(true);
    setLoading(true);
    setFailed(false);
    setSlow(false);

    /* No manual el.load() here: with preload="none" a play() call makes the
       browser fetch on its own, and an explicit load() immediately before
       play() is a known way to abort the fetch mid-flight on Android Chrome
       (AbortError). */
    el.preload = 'auto';
    el.play()
      .then(() => setLoading(false))
      .catch(() => {
        /* Autoplay was refused (or interrupted). Fall back to native
           controls so the guest can start it themselves. */
        setLoading(false);
        el.controls = true;
      });

    /* Belt-and-braces: even if no media event ever fires, reveal the video
       shortly after the guest asks for it. */
    timersRef.current.push(setTimeout(() => setRevealed(true), 1500));
    /* Large source + slow connection: reassure without ever hiding media. */
    timersRef.current.push(setTimeout(() => setSlow(true), 12000));
  }, []);

  if (!film.src) return null;

  return (
    <section className="section section--deep film" aria-labelledby="film-title">
      <Arabesque opacity={0.05} />

      <div className="section__inner">
        <header className="sec-head">
          <span className="sec-eyebrow eyebrow reveal">{film.eyebrow}</span>
          <h2 className="sec-title reveal reveal-d1" id="film-title">{film.title}</h2>
          {film.caption && <p className="sec-sub reveal reveal-d2">{film.caption}</p>}
        </header>

        <div
          ref={frameRef}
          className={`film__frame ${frameInView ? 'is-in' : ''} ${started ? 'is-playing' : ''} ${revealed ? 'is-revealed' : ''}`}
        >
          {/* Letterbox bars sit above the media, never over the controls. */}
          <span className="film__bar film__bar--top" aria-hidden="true" />
          <span className="film__bar film__bar--bottom" aria-hidden="true" />

          <video
            ref={videoRef}
            className="film__video"
            preload="none"
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            controls={started}
            onLoadedMetadata={() => { setRevealed(true); setLoading(false); }}
            onCanPlay={() => { setRevealed(true); setSlow(false); }}
            onPlaying={() => { setRevealed(true); setLoading(false); setSlow(false); }}
            onPause={() => setLoading(false)}
            onError={() => { setFailed(true); setLoading(false); setSlow(false); }}
            onWaiting={() => setLoading(true)}
          >
            <source src={film.src} type="video/mp4" />
            Your browser cannot play this video.
          </video>

          {/* Poster sits ABOVE the (opacity:1) video and fades out once the
              video is revealed — event-driven, with a fallback timer. */}
          {film.poster && (
            <img
              className="film__poster"
              src={film.poster}
              alt=""
              aria-hidden="true"
              style={{
                objectPosition: film.posterFocal || '50% 50%',
                transform: `scale(${film.posterZoom || 1})`,
              }}
            />
          )}

          {!started && (
            <button type="button" className="film__play" onClick={play} aria-label={`Play the wedding film — ${film.title}`}>
              <span className="film__play-ring" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
                </svg>
              </span>
              <span className="film__play-label">Watch the film</span>
            </button>
          )}

          {loading && !failed && started && (
            <span className="film__loading" role="status">Loading the film…</span>
          )}

          {slow && !revealed && !failed && started && (
            <span className="film__loading film__loading--slow" role="status">
              Still loading — large file, slow connection.
            </span>
          )}

          {failed && (
            <div className="film__error" role="status">
              <p>The film could not be loaded right now.</p>
              <button
                type="button"
                className="btn btn--gold btn--small"
                onClick={play}
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
