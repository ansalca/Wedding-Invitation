import { useEffect, useRef, useState } from 'react';
import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { useLocalStorage, useReveal, useInView } from '../lib/hooks.js';
import { couple } from '../data.js';
import {
  isSupabaseConfigured,
  listGuestPostsPage,
  insertGuestPost,
  setLike,
  insertComment,
  uploadGuestFile,
  uploadAvatar,
  dataUrlToBlob,
} from '../lib/supabase.js';

const STORAGE_KEY = 'wedding:guestWall';

/* 50 MB per file — applied to every user-uploaded photo/video on the site. */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function uid() {
  return `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* Compress an uploaded photo so it fits comfortably in localStorage (~4-5 MB cap). */
function fileToDataUrl(file, maxDim = 900, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/* --------------------------------------------------------------------
   A single post in the feed — modelled on the calm rhythm of a social
   photo post, but dressed entirely in the wedding's own materials.
   -------------------------------------------------------------------- */
function GuestCard({ post, onLike, onComment, notify }) {
  const { id, name, message, photo, avatar, createdAt, likes = {}, comments = [] } = post;
  const postId = id;
  const cardRef = useRef(null);
  /* React-managed reveal — the card className is dynamic (is-expanded), so a
     DOM-mutated .is-in would be wiped when comments expand/collapse. */
  const inView = useInView(cardRef);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [hearted, setHearted] = useState(false);
  const [bookmarked, setBookmarked] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem('wedding:saved') || '[]');
      return Array.isArray(saved) && saved.includes(postId);
    } catch {
      return false;
    }
  });

  const commentNow = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onComment(postId, commentText.trim());
    setCommentText('');
    setShowComments(true);
    setShowAllComments(true);
  };

  const likeCount =
    likes && typeof likes.count === 'number' ? likes.count : Object.keys(likes || {}).length;

  const toggleLike = () => {
    const willLike = !likes.me;
    if (willLike) {
      setHearted(true);
      setTimeout(() => setHearted(false), 700);
    }
    onLike(postId);
  };

  const toggleBookmark = () => {
    let saved = [];
    try {
      saved = JSON.parse(window.localStorage.getItem('wedding:saved') || '[]');
    } catch {
      saved = [];
    }
    const next = Array.isArray(saved)
      ? saved.includes(postId)
        ? saved.filter((x) => x !== postId)
        : [...saved, postId]
      : [postId];
    try {
      window.localStorage.setItem('wedding:saved', JSON.stringify(next));
    } catch {
      /* storage unavailable — bookmark simply won't persist */
    }
    setBookmarked(next.includes(postId));
    notify(next.includes(postId) ? 'Saved to your keepsakes ♡' : 'Removed from your keepsakes');
  };

  const sharePost = async () => {
    const text = `“${message}” — ${name} on the ${couple.bride.name} & ${couple.groom.name} wedding wall ✦`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Wedding Guest Wall', text });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${window.location.href.split('#')[0]}#guest-wall`);
      notify('Copied to your clipboard ✓');
    } catch {
      /* user cancelled the share sheet */
    }
  };

  const shownComments = showAllComments ? comments : comments.slice(-2);
  const hiddenCount = comments.length - shownComments.length;

  return (
    <article ref={cardRef} className={`gpost ${inView ? 'is-in' : ''} ${showComments ? 'is-expanded' : ''}`}>
      <header className="gpost__head">
        {avatar ? (
          <img className="gpost__avatar" src={avatar} alt="" loading="lazy" />
        ) : (
          <span className="gpost__avatar gpost__avatar--init" aria-hidden="true">
            {(name || 'G').charAt(0).toUpperCase()}
          </span>
        )}
        <div className="gpost__who">
          <h3 className="gpost__name">{name}</h3>
          <p className="gpost__meta">
            <span className="gpost__place">From our celebration</span>
            <span className="gpost__dot" aria-hidden="true">·</span>
            <time className="gpost__date">
              {new Date(createdAt).toLocaleString(undefined, {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </time>
          </p>
        </div>
        <div className="gpost__menu-wrap">
          <button
            type="button"
            className="gpost__menu-btn"
            aria-label="Post options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span aria-hidden="true">⋯</span>
          </button>
          {menuOpen && (
            <div className="gpost__menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); sharePost(); }}>
                ↗ Share this post
              </button>
              <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); toggleBookmark(); }}>
                {bookmarked ? '♡ Remove keepsake' : '♡ Save as keepsake'}
              </button>
            </div>
          )}
        </div>
      </header>

      {photo && (
        <figure className="gpost__figure">
          {!imgLoaded && <span className="gpost__skeleton" aria-hidden="true" />}
          <img
            className={`gpost__photo ${imgLoaded ? 'is-loaded' : ''}`}
            src={photo}
            alt={`Shared by ${name}`}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
          />
        </figure>
      )}

      <div className="gpost__actions">
        <button
          type="button"
          className={`gpost__act ${likes.me ? 'is-liked' : ''}`}
          onClick={toggleLike}
          aria-pressed={Boolean(likes.me)}
          aria-label={likes.me ? 'Unlike' : 'Like'}
        >
          <span className={`gpost__heart ${hearted ? 'is-beating' : ''}`} aria-hidden="true">
            {likes.me || hearted ? '♥' : '♡'}
          </span>
          {likeCount > 0 && <span className="gpost__count">{likeCount}</span>}
        </button>
        <button
          type="button"
          className="gpost__act"
          onClick={() => setShowComments((v) => !v)}
          aria-expanded={showComments}
          aria-label="Comments"
        >
          <span aria-hidden="true">💬</span>
          {comments.length > 0 && <span className="gpost__count">{comments.length}</span>}
        </button>
        <button type="button" className="gpost__act" onClick={sharePost} aria-label="Share">
          <span aria-hidden="true">↗</span>
        </button>
        <button
          type="button"
          className={`gpost__act gpost__act--save ${bookmarked ? 'is-saved' : ''}`}
          onClick={toggleBookmark}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? 'Remove keepsake' : 'Save as keepsake'}
        >
          <span aria-hidden="true">{bookmarked ? '⌘' : '♢'}</span>
        </button>
      </div>

      <p className="gpost__caption">
        <b>{name}</b> {message}
      </p>

      {comments.length > 2 && !showAllComments && (
        <button type="button" className="gpost__viewall" onClick={() => setShowAllComments(true)}>
          View all {comments.length} comments
        </button>
      )}

      {(showComments || showAllComments) && (
        <div className="gpost__comments">
          {comments.length === 0 && <p className="gpost__empty">No comments yet — say something kind.</p>}
          {shownComments.map((c, i) => (
            <p className="gpost__comment" key={i}>
              <b>{c.name}</b> <span>{c.text}</span>
            </p>
          ))}
          <form className="gpost__comment-form" onSubmit={commentNow}>
            <input
              type="text"
              placeholder="Add a comment…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={200}
              aria-label="Add a comment"
            />
            <button type="submit" className="btn btn--gold btn--small" disabled={!commentText.trim()}>
              Post
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

export default function GuestWall() {
  const { read, write } = useLocalStorage(STORAGE_KEY);
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState({ name: '', message: '' });
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [saved, setSaved] = useState(false);
  /* true once the shared board is live — posts, likes and comments are then
     visible to every guest, not just this browser. */
  const [shared, setShared] = useState(false);
  /* Profile photo (small circle), upload progress and the share toast. */
  const [avatar, setAvatar] = useState(null);
  const [progress, setProgress] = useState(false);
  const [toast, setToast] = useState('');
  const avatarInputRef = useRef(null);
  const toastTimer = useRef(null);
  /* Feed pagination — never fetch hundreds of posts at once. */
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /* Dynamically-loaded posts carry .reveal — the root observer's single
     sweep runs before they exist, so re-sweep whenever the feed grows. */
  useReveal(posts.length);

  const notify = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isSupabaseConfigured) {
        try {
          const { posts: rows, hasMore: more } = await listGuestPostsPage({ page: 0 });
          if (!cancelled) {
            setPosts(rows);
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
        if (Array.isArray(data)) setPosts(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* View More: append the next page. Existing posts are never re-fetched or
     reset — the page cursor just moves forward. */
  const showMorePosts = async () => {
    if (loadingMore || !shared) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { posts: rows, hasMore: more } = await listGuestPostsPage({ page: next });
      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      setHasMore(more);
      setPage(next);
    } catch {
      notify('Could not load more posts — please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

  /* Post photos are compressed to ~1280px before anything is stored, so the
     feed stays light on mobile data. A 50 MB ceiling is enforced before the
     (potentially heavy) client-side decode/compress step. */
  const pickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      notify('That photo is too large — please choose an image smaller than 50 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (!PHOTO_TYPES.includes(file.type) && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
      notify('That file does not look like a photo — please choose a JPEG, PNG, WebP or GIF.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setUploading(true);
    try {
      const url = await fileToDataUrl(file, 1280, 0.85);
      setPreview(url);
    } catch {
      setPreview(null);
      notify('Could not read that photo.');
    } finally {
      setUploading(false);
    }
  };

  /* Profile photo: a small square, compressed hard. */
  const pickAvatar = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      notify('That photo is too large — please choose an image smaller than 50 MB.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }
    if (!PHOTO_TYPES.includes(file.type) && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
      notify('That file does not look like a photo — please choose a JPEG, PNG, WebP or GIF.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }
    try {
      const url = await fileToDataUrl(file, 320, 0.85);
      setAvatar(url);
    } catch {
      setAvatar(null);
      notify('Could not read that photo.');
    }
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const clearPhoto = () => {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const addPost = async (e) => {
    e.preventDefault();
    const entry = {
      id: uid(),
      name: form.name.trim() || 'Anonymous Guest',
      message: form.message.trim(),
      photo: preview,
      avatar,
      createdAt: new Date().toISOString(),
      likes: {},
      comments: [],
    };
    if (!entry.message) return;

    if (shared) {
      try {
        setProgress(true);
        /* Photos are uploaded to storage; the preview stays a data URL until
           this moment, so a slow upload never blocks typing the message. */
        let imageUrl = null;
        let avatarUrl = null;
        if (preview) {
          imageUrl = await uploadGuestFile(dataUrlToBlob(preview), {
            folder: 'guest-wall',
            fallbackExt: 'jpg',
          });
        }
        if (avatar) {
          avatarUrl = await uploadAvatar(dataUrlToBlob(avatar));
        }
        const row = await insertGuestPost({
          name: entry.name,
          message: entry.message,
          imageUrl,
          avatarUrl,
        });
        setPosts((prev) => [row, ...prev]);
        setForm({ name: '', message: '' });
        clearPhoto();
        setSaved(true);
        setTimeout(() => setSaved(false), 2600);
        return;
      } catch {
        /* Upload or insert failed — save the post on this device instead. */
        setShared(false);
        notify('Could not reach the wall — saved on this device instead.');
      } finally {
        setProgress(false);
      }
    }

    const next = [entry, ...posts];
    setPosts(next);
    write(next);
    setForm({ name: '', message: '' });
    clearPhoto();
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  const likePost = (postId) => {
    let liked = false;
    const next = posts.map((p) => {
      if (p.id !== postId) return p;
      const likes = { ...(p.likes || {}) };
      if (likes.me) {
        delete likes.me;
      } else {
        likes.me = true;
      }
      if (typeof likes.count === 'number') {
        liked = likes.me === true;
        likes.count = Math.max(0, likes.count + (liked ? 1 : -1));
      } else {
        liked = likes.me === true;
      }
      return { ...p, likes };
    });
    setPosts(next);

    if (shared) {
      /* The row was already toggled in state — mirror it on the server.
         Failures are ignored: the like still shows locally this visit. */
      setLike(postId, liked).catch(() => {});
    } else {
      write(next);
    }
  };

  const commentPost = (postId, text) => {
    const name = form.name.trim() || 'Guest';
    const comment = { name, text, at: new Date().toISOString() };
    const next = posts.map((p) => {
      if (p.id !== postId) return p;
      return { ...p, comments: [...(p.comments || []), comment] };
    });
    setPosts(next);

    if (shared) {
      insertComment(postId, name, text).catch(() => {});
    } else {
      write(next);
    }
  };

  return (
    <section className="section section--light" aria-labelledby="guestwall-title">
      <Arabesque />
      <div className="section__inner">
        <SectionHead
          id="guestwall-title"
          eyebrow="Guest Book"
          title="Guest Wall"
          sub={
            shared
              ? `Share a photo, a message, and your love for ${couple.bride.name} & ${couple.groom.name} — visible to every guest.`
              : `Share a photo, a message, and your love for ${couple.bride.name} & ${couple.groom.name}. Everything stays in this browser.`
          }
        />

        <form className="wall-form wall-form--guest reveal" onSubmit={addPost}>
          <div className="wall-form__profile">
            <label className="wall-form__avatar" htmlFor="g-avatar" title="Choose a profile photo">
              {avatar ? (
                <img src={avatar} alt="Your profile photo" />
              ) : (
                <span aria-hidden="true">✦</span>
              )}
            </label>
            <input
              ref={avatarInputRef}
              type="file" accept="image/*" id="g-avatar"
              onChange={pickAvatar} className="sr-only"
            />
            <div className="wall-form__profile-text">
              <strong>Your profile photo</strong>
              <small>Optional — a little portrait beside your posts.</small>
            </div>
          </div>

          <div className="wall-form__photo">
            {preview ? (
              <img className="wall-form__preview" src={preview} alt="Your selected photo" />
            ) : (
              <div className="wall-form__photo-empty">
                <span aria-hidden="true">✿</span>
                <small>Add a photo</small>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              id="g-photo"
              onChange={pickPhoto}
              className="sr-only"
              disabled={uploading}
            />
            <div className="wall-form__photo-btns">
              <label
                htmlFor="g-photo"
                className={`btn btn--gold btn--small ${uploading ? 'is-disabled' : ''}`}
                aria-disabled={uploading}
              >
                {uploading ? '⏳ Reading…' : preview ? 'Change' : 'Upload Photo'}
              </label>
              {preview && (
                <button type="button" className="btn btn--small" onClick={clearPhoto} disabled={uploading}>Remove</button>
              )}
            </div>
            {uploading && (
              <div className="upload-progress" role="status" aria-label="Preparing photo">
                <span className="upload-progress__spinner" aria-hidden="true" />
                <span className="upload-progress__label">Preparing your photo…</span>
              </div>
            )}
            {progress && (
              <div className="upload-progress" role="status" aria-label="Uploading">
                <span className="upload-progress__spinner" aria-hidden="true" />
                <span className="upload-progress__label">Uploading your memory…</span>
              </div>
            )}
          </div>

          <div className="wall-form__fields">
            <div className="field">
              <label htmlFor="g-name">Your Name</label>
              <input
                id="g-name" type="text" placeholder="Your name"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={60}
              />
            </div>
            <div className="field">
              <label htmlFor="g-msg">Your Message</label>
              <textarea
                id="g-msg" rows={4} required placeholder="Share a memory or blessing…"
                value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                maxLength={600}
              />
            </div>
            <button type="submit" className="btn btn--gold" disabled={uploading || progress}>
              {progress ? 'Sharing…' : uploading ? 'Preparing…' : 'Post to Wall'}
            </button>
            {saved && (
              <p className="wall-form__note wall-form__note--pulse" role="status">
                {shared ? 'Posted to the wall ✦' : 'Posted on this device ✦'}
              </p>
            )}
          </div>
        </form>

        {loading && (
          <p className="wall-empty" role="status">Opening the guest wall…</p>
        )}

        <div className="guest-grid">
          {!loading && posts.length === 0 && (
            <div className="gfeed-empty">
              <span className="gfeed-empty__flower" aria-hidden="true">✿</span>
              <p className="gfeed-empty__title">Be the first to share a photo from the celebration</p>
              <p className="gfeed-empty__sub">
                Add your photo and share a little memory from our wedding.
              </p>
            </div>
          )}
          {posts.map((post) => (
            <GuestCard
              key={post.id}
              post={post}
              onLike={likePost}
              onComment={commentPost}
              notify={notify}
            />
          ))}
        </div>

        {hasMore && !loading && (
          <div className="wall-more">
            <button
              type="button"
              className="btn btn--gold"
              onClick={showMorePosts}
              disabled={loadingMore}
            >
              {loadingMore ? 'Gathering…' : 'View More Posts'}
            </button>
          </div>
        )}

        {toast && (
          <div className="toast" role="status">{toast}</div>
        )}
      </div>
    </section>
  );
}