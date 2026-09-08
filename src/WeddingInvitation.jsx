import { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';

import IntroCurtain from './components/IntroCurtain.jsx';
import MusicToggle from './components/MusicToggle.jsx';
import Hero from './components/Hero.jsx';
import Verse from './components/Verse.jsx';
import Arabesque from './components/Arabesque.jsx';
import Couple from './components/Couple.jsx';
import Schedule from './components/Schedule.jsx';
import Film from './components/Film.jsx';
import Gallery from './components/Gallery.jsx';
import Venue from './components/Venue.jsx';
import Rsvp from './components/Rsvp.jsx';
import Registry from './components/Registry.jsx';
import WishesWall from './components/WishesWall.jsx';
import GuestWall from './components/GuestWall.jsx';
import VideoWishes from './components/VideoWishes.jsx';
import WeddingCard from './components/WeddingCard.jsx';
import Closing from './components/Closing.jsx';
import Footer from './components/Footer.jsx';
import ScrollProgress from './components/ScrollProgress.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { PetalFall } from './components/CinematicMotion.jsx';

import { verses, audio as audioConfig, timing } from './data.js';
import { useReveal, useScrollLock } from './lib/hooks.js';
import { createSoundscape } from './lib/audio.js';

import './styles/tokens.css';
import './styles/base.css';
import './styles/site.css';

/* Cinematic petals over the whole page — cheap DOM animation, so it is only
   mounted once the curtain has lifted. */
const PetalField = lazy(() => Promise.resolve({ default: PetalFall }));

/* A section that crashed must never take the page down with it. The
   ErrorBoundary renders its own diagnostic card (section-styled, and
   showing the actual error message) — no custom fallback needed. */
function Boundary({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

export default function WeddingInvitation() {
  const [opened, setOpened] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [untied, setUntied] = useState(false);
  const [released, setReleased] = useState(false);
  const [musicOn, setMusicOn] = useState(false);

  const audioRef = useRef(null);
  const sfxRef = useRef(null);
  const timersRef = useRef([]);
  /* Videos currently playing anywhere on the page (the film, guest video
     wishes…). While this set is non-empty the background music and the
     synthesized soundscape are silenced. */
  const playingVideosRef = useRef(new Set());
  /* Whether music was playing just before a video ducked it, so it can
     resume when the last video stops. */
  const musicWasOnRef = useRef(false);

  useScrollLock(!opened);
  useReveal(opened);

  /* One soundscape for the life of the page. */
  useEffect(() => {
    sfxRef.current = createSoundscape(audioConfig.effects);
    return () => {
      sfxRef.current?.dispose();
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  /* -----------------------------------------------------------------------
     Audio ducking — when any video on the page starts playing (the wedding
     film, a guest's video wish…), the background music pauses and the
     synthesized soundscape goes silent. When the last video stops, both
     return: the music only if it was playing before the video began.

     Media events do not bubble, but they do propagate in the capture
     phase, so document-level capture listeners see them for every
     <video> without each component having to opt in. The background
     music is an <audio> element and is excluded by tag name.
     ----------------------------------------------------------------------- */
  useEffect(() => {
    const sfx = sfxRef.current;
    const isVideo = (t) => t && t.tagName === 'VIDEO';

    const duck = () => {
      const el = audioRef.current;
      if (el && !el.paused) {
        musicWasOnRef.current = true;
        el.pause();
        setMusicOn(false);
      }
      sfx?.setEnabled(false);
    };

    const maybeRestore = () => {
      if (playingVideosRef.current.size > 0) return;
      /* Restore the soundscape to whatever the configuration asked for. */
      sfx?.setEnabled(audioConfig.effects?.enabled !== false);
      if (musicWasOnRef.current) {
        musicWasOnRef.current = false;
        const el = audioRef.current;
        if (el) {
          el.volume = audioConfig.music.volume;
          el.play().then(() => setMusicOn(true)).catch(() => {
            /* Browser refused — the floating control still works. */
          });
        }
      }
    };

    const onPlay = (e) => {
      if (!isVideo(e.target)) return;
      playingVideosRef.current.add(e.target);
      duck();
    };
    const onStop = (e) => {
      if (!isVideo(e.target)) return;
      playingVideosRef.current.delete(e.target);
      maybeRestore();
    };

    document.addEventListener('play', onPlay, true);
    document.addEventListener('pause', onStop, true);
    document.addEventListener('ended', onStop, true);
    return () => {
      document.removeEventListener('play', onPlay, true);
      document.removeEventListener('pause', onStop, true);
      document.removeEventListener('ended', onStop, true);
      playingVideosRef.current.clear();
    };
  }, []);

  const after = useCallback((ms, fn) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  const openInvitation = useCallback(() => {
    if (untied) return;

    const sfx = sfxRef.current;
    /* Both audio paths must be started from inside this gesture. */
    sfx?.unlock();

    /* Start fetching the WebGL chunk now so it is ready when the hero appears. */
    import('./components/AmbientCanvas.jsx').catch(() => {});

    setUntied(true);

    /* Played synchronously at the default pull:0 — starting audio inside the
       gesture is what satisfies the browser's autoplay rules. Only defer it
       if the sequence deliberately delays the pull. */
    if (timing.pull > 0) after(timing.pull, () => sfx?.ribbonPull());
    else sfx?.ribbonPull();

    after(timing.slip, () => sfx?.ribbonRelease());
    after(timing.release, () => setReleased(true));

    after(timing.part, () => {
      setBreaking(true);

      const el = audioRef.current;
      if (el && audioConfig.music.src && audioConfig.music.startOnOpen) {
        el.volume = audioConfig.music.volume;
        el.play().then(() => setMusicOn(true)).catch(() => {
          /* No file, or autoplay refused — the floating control still works. */
        });
      }
    });

    after(timing.part + timing.reveal, () => setOpened(true));
  }, [untied, after]);

  const toggleMusic = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (musicOn) {
      el.pause();
      /* A deliberate pause by the guest must not be undone when a video
         later stops — clear the duck-resume flag. */
      musicWasOnRef.current = false;
      setMusicOn(false);
    } else {
      /* Never start the music over a playing video. */
      if (playingVideosRef.current.size > 0) return;
      el.volume = audioConfig.music.volume;
      el.play().then(() => setMusicOn(true)).catch(() => setMusicOn(false));
    }
  }, [musicOn]);

  return (
    <div className={`wi-root ${opened ? 'is-opened' : ''}`}>
      {/* If the curtain itself ever crashes, fall back to a plain open
          button instead of a blank screen. */}
      <ErrorBoundary
        fallback={
          <div style={{
            position: 'fixed', inset: 0, zIndex: 60,
            display: 'grid', placeItems: 'center',
            background: 'var(--emerald-900)', color: 'var(--gold-bright)',
          }}>
            <button type="button" className="btn btn--solid" onClick={openInvitation}>
              Open the Invitation
            </button>
          </div>
        }
      >
        <IntroCurtain
          opened={opened}
          breaking={breaking}
          untied={untied}
          released={released}
          onOpen={openInvitation}
        />
      </ErrorBoundary>

      {opened && (
        <>
          <Suspense fallback={null}>
            <PetalField count={14} />
          </Suspense>
          <ScrollProgress />
        </>
      )}

      {audioConfig.music.src && (
        <>
          <audio ref={audioRef} loop preload="none" src={audioConfig.music.src} />
          <MusicToggle playing={musicOn} onToggle={toggleMusic} />
        </>
      )}

      <main>
        <Hero ambient={opened} />

        <section className="section section--deep" aria-label="Qur'anic verse">
          <Arabesque />
          <div className="section__inner section__inner--narrow">
            <Verse {...verses.arRum} />
          </div>
        </section>

        <Couple />

        <Schedule />

        <Boundary><Film /></Boundary>
        <Boundary><Gallery /></Boundary>

        <Venue />
        <Boundary><WeddingCard /></Boundary>

        <Rsvp />
        <Registry />

        <Boundary><WishesWall /></Boundary>
        <Boundary><GuestWall /></Boundary>
        <Boundary><VideoWishes /></Boundary>
        

        <Closing />
      </main>

      <Footer />
    </div>
  );
}
