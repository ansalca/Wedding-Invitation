import { useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { useLocalStorage, useReveal } from '../lib/hooks.js';
import { couple } from '../data.js';
import {
  isSupabaseConfigured,
  listVideoWishesPage,
  insertVideoWish,
  uploadGuestFile,
} from '../lib/supabase.js';

const STORAGE_KEY = 'wedding:videoWishes';

function uid() {
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function VideoWishes() {
  const { read, write } = useLocalStorage(STORAGE_KEY);
  const [videos, setVideos] = useState([]);
  const [mode, setMode] = useState(null); // null | record | upload
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const mediaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [saved, setSaved] = useState(false);
  /* true once the shared board is live — videos are then uploaded to storage
     and visible to every guest instead of clogging local storage. */
  const [shared, setShared] = useState(false);
  /* Feed pagination — videos are heavy; never load them all at once. */
  const [uploading, setUploading] = useState(false);
  /* Feed pagination — videos are heavy; never load them all at once. */
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /* Dynamically-loaded cards carry .reveal — re-sweep whenever the feed grows. */
  useReveal(videos.length);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isSupabaseConfigured) {
        try {
          const { videos: rows, hasMore: more } = await listVideoWishesPage({ page: 0 });
          if (!cancelled) {
            setVideos(rows);
            setHasMore(more);
            setShared(true);
            setLoading(false);
            return;
          }
        } catch {
          /* Supabase unreachable — fall through to the local copy. */
        }
      }
      const data = read();
      if (!cancelled) {
        if (Array.isArray(data)) setVideos(data);
        setLoading(false);
      }
    }
    load();

    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* View More: append the next page of videos; nothing is re-fetched. */
  const showMoreVideos = async () => {
    if (loadingMore || !shared) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { videos: rows, hasMore: more } = await listVideoWishesPage({ page: next });
      setVideos((prev) => {
        const seen = new Set(prev.map((v) => v.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      setHasMore(more);
      setPage(next);
    } catch {
      setStatus('Could not load more video wishes — please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      setStatus('Recording is not supported in this browser — try the upload option instead.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 } },
        audio: true,
      });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        if (mediaRef.current) mediaRef.current.src = url;
        stopStream();
        setRecording(false);
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
      setStatus('Recording… click Stop when finished.');
    } catch {
      setStatus('Camera/microphone permission was denied, or recording is unavailable.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const cancelRecording = () => {
    recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop();
    recorderRef.current = null;
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    stopStream();
    setRecording(false);
    setStatus('');
  };

  const MAX_VIDEO_BYTES = 4 * 1024 * 1024; /* localStorage holds ~5 MB */
  const MAX_VIDEO_BYTES_SHARED = 50 * 1024 * 1024; /* storage allows up to 50 MB per file */
  const MAX_VIDEO_BYTES_ANY = Math.max(MAX_VIDEO_BYTES, MAX_VIDEO_BYTES_SHARED);
  const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska', 'video/avi', 'video/x-msvideo', 'video/mpeg'];

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });

  /* When the shared board is live, clips are uploaded to Supabase storage and
     the row goes into the video_wishes table. Any failure falls back to the
     original local-only path, so a wish is never simply lost. */
  const saveShared = async (blob) => {
    setUploading(true);
    try {
      const url = await uploadGuestFile(blob, { folder: 'video-wishes', fallbackExt: 'webm' });
      const row = await insertVideoWish({ name: name.trim() || 'Anonymous Guest', videoUrl: url });
      setVideos((prev) => [row, ...prev]);
      setRecordedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setMode(null);
      setStatus('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setUploading(false);
    }
  };

  /* Videos must survive a page reload when stored locally, so they are kept as
     data URLs — a blob: URL would die the moment the tab closes. Quota failures
     are caught and reported rather than silently dropping the wish. */
  const saveVideo = async (blob, mime = 'video/webm') => {
    const limit = shared ? MAX_VIDEO_BYTES_SHARED : MAX_VIDEO_BYTES;
    if (blob.size > limit) {
      setStatus(
        shared
          ? 'That clip is too large — please keep video wishes under 50 MB.'
          : 'That clip is too large for this browser\u2019s local storage — keep it under 4 MB.'
      );
      return;
    }

    if (shared) {
      try {
        await saveShared(blob);
        return;
      } catch {
        setShared(false);
        setStatus('Could not reach the wedding album server — saving on this device instead…');
      }
    }

    try {
      const url = await blobToDataUrl(blob);
      const entry = {
        id: uid(),
        name: name.trim() || 'Anonymous Guest',
        url,
        mime,
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...videos];
      if (!write(next)) {
        setStatus('Local storage is full — try a shorter or smaller video.');
        return;
      }
      setVideos(next);
      setRecordedUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setMode(null);
      setStatus('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setStatus('Could not read the recording. Try a shorter clip or the upload option.');
    }
  };

  const saveRecorded = () => {
    if (mediaRef.current && mediaRef.current.src) {
      fetch(mediaRef.current.src)
        .then((r) => r.blob())
        .then((blob) => saveVideo(blob))
        .catch(() => {
          /* known failure path: blob URL fetch can be blocked on some browsers */
          setStatus('Could not save the recording. Try a shorter clip or the upload option.');
        });
    }
  };

  const onUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type) && !/\.(mp4|webm|mov|mkv|avi)$/i.test(file.name)) {
      setStatus('That file does not look like a video — please choose an MP4, WebM, MOV, MKV or AVI.');
      return;
    }
    if (file.size > (shared ? MAX_VIDEO_BYTES_SHARED : MAX_VIDEO_BYTES)) {
      setStatus(
        shared
          ? 'Please choose a video smaller than 50 MB.'
          : 'Please choose a video smaller than 4 MB (local storage limit).'
      );
      return;
    }
    saveVideo(file, file.type || 'video/mp4');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <section className="section section--dark" aria-labelledby="videowishes-title">
      <Arabesque />
      <div className="section__inner">
        <SectionHead
          id="videowishes-title"
          eyebrow="Speak From The Heart"
          title="Video Wishes"
          sub={
            shared
              ? `Record a short video wish for ${couple.bride.name} & ${couple.groom.name}, or upload one from your device — shared with all the guests.`
              : `Record a short video wish for ${couple.bride.name} & ${couple.groom.name}, or upload one from your device. Stored locally in this browser.`
          }
        />

        {mode === 'record' && (
          <div className="video-rec">
            <video ref={mediaRef} className="video-rec__preview" muted={!recording} playsInline controls={Boolean(recordedUrl)} />
            <div className="video-rec__name field">
              <label htmlFor="vw-name-record">Your Name</label>
              <input
                id="vw-name-record" type="text" placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="video-rec__controls">
              {!recording && !recordedUrl && (
                <button type="button" className="btn btn--solid" onClick={startRecording}>🎥 Start Recording</button>
              )}
              {recording && (
                <>
                  <button type="button" className="btn btn--solid" onClick={stopRecording}>⏹ Stop</button>
                  <button type="button" className="btn" onClick={cancelRecording}>✕ Cancel</button>
                </>
              )}
              {recordedUrl && (
                <>
                  <button type="button" className="btn btn--solid" onClick={saveRecorded}>Save Video Wish</button>
                  <button type="button" className="btn" onClick={cancelRecording}>✕ Discard</button>
                </>
              )}
            </div>
            {status && <p className="video-rec__status" role="status">{status}</p>}
          </div>
        )}

        {mode === 'upload' && (
          <div className="video-rec video-rec--upload">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              id="vw-file"
              onChange={onUpload}
              className="sr-only"
              disabled={uploading}
            />
            <label
              htmlFor="vw-file"
              className={`btn btn--solid ${uploading ? 'is-disabled' : ''}`}
              aria-disabled={uploading}
            >
              {uploading ? '⏳ Uploading…' : '📁 Choose Video File'}
            </label>
            <div className="field" style={{ width: '100%', maxWidth: 380 }}>
              <label htmlFor="vw-name-upload">Your Name</label>
              <input
                id="vw-name-upload" type="text" placeholder="Your name"
                value={name} onChange={(e) => setName(e.target.value)}
                disabled={uploading}
              />
            </div>
            <p className="video-rec__hint">
              {shared
                ? 'Max ~50 MB — your wish is uploaded and shared with all the guests.'
                : "Max ~4 MB so it fits in this browser's local storage."}
            </p>
            {uploading && (
              <div className="upload-progress" role="status" aria-label="Uploading video">
                <span className="upload-progress__spinner" aria-hidden="true" />
                <span className="upload-progress__label">Uploading your memory…</span>
              </div>
            )}
            {status && !uploading && <p className="video-rec__status" role="status">{status}</p>}
          </div>
        )}

        {!mode && (
          <div className="video-choose">
            <button type="button" className="btn btn--solid" onClick={() => setMode('record')}>🎥 Record a Video Wish</button>
            <span className="video-choose__or">or</span>
            <button type="button" className="btn btn--gold" onClick={() => setMode('upload')}>📁 Upload a Video</button>
          </div>
        )}

        {saved && (
          <p className="wall-form__note" role="status">
            {shared ? 'Video wish shared with everyone ✦' : 'Video wish saved on this device ✦'}
          </p>
        )}

        {loading && (
          <p className="wall-empty" role="status">Gathering the video wishes…</p>
        )}

        <div className="video-grid">
          {!loading && videos.length === 0 && <p className="wall-empty">No video wishes yet.</p>}
          {videos.map((v) => (
            <article className="video-card reveal" key={v.id}>
              <video src={v.url} controls preload="metadata" playsInline className="video-card__player" />
              <p className="video-card__name">— {v.name}</p>
              <time className="video-card__date">
                {new Date(v.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </time>
            </article>
          ))}
        </div>

        {hasMore && !loading && (
          <div className="wall-more">
            <button
              type="button"
              className="btn btn--gold"
              onClick={showMoreVideos}
              disabled={loadingMore}
            >
              {loadingMore ? 'Gathering…' : 'View More Videos'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}