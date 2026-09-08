import { useEffect, useMemo, useState, useRef } from 'react';
import Arabesque from './Arabesque.jsx';
import {
  isSupabaseConfigured,
  getAdminSession,
  signInAdmin,
  signOutAdmin,
  onAuthChange,
  isRsvpAdmin,
  listRsvps,
  listAllWishes,
  listAllGuestPosts,
  listAllVideoWishes,
  adminDeleteWish,
  adminDeleteGuestPost,
  adminDeleteGuestPostFull,
  adminDeleteVideoWish,
  adminDeleteVideoWishFull,
  adminDeleteRsvp,
} from '../lib/supabase.js';
import { couple, dates } from '../data.js';

const ATTENDING = 'Joyfully Attending';

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso || '';
  }
}

/* CSV with a BOM so Excel opens the accents correctly. */
function downloadCsv(rows) {
  const head = ['Name', 'Contact', 'Guests', 'Status', 'Message', 'Submitted'];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [
    head.join(','),
    ...rows.map((r) =>
      [r.name, r.contact || '', r.guests, r.attend, r.message || '', fmtDate(r.created_at)]
        .map(esc)
        .join(',')
    ),
  ].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ------------------------------------------------------------- Login ---- */
function AdminLogin({ onSignedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const session = await signInAdmin(email.trim(), password);
      onSignedIn(session);
    } catch (err) {
      setError(
        err && err.message
          ? err.message
          : 'Could not sign in. Check the email and password, then try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin">
      <Arabesque />
      <div className="admin__inner">
        <header className="admin__brand">
          <p className="admin__eyebrow">Private Office</p>
          <h1 className="admin__title">
            {couple.bride.name} <span className="admin__amp">&amp;</span> {couple.groom.name}
          </h1>
          <p className="admin__sub">The guest reply book — for the two of you only.</p>
        </header>

        <form className="admin__login" onSubmit={submit}>
          <div className="field">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email" type="email" required autoComplete="username"
              placeholder="you@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="admin-pass">Password</label>
            <input
              id="admin-pass" type="password" required autoComplete="current-password"
              placeholder="Your password" value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--gold admin__submit" disabled={busy}>
            {busy ? 'Opening…' : 'Enter the Reply Book'}
          </button>
          {error && (
            <p className="admin__error" role="alert">{error}</p>
          )}
          <p className="admin__hint">
            Invitations are sent by hand — this page is for the couple's records.
          </p>
        </form>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- Dashboard ---- */
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'yes', label: 'Attending' },
  { id: 'no', label: 'Not attending' },
];

function AdminDashboard({ session }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('new');
  const [tab, setTab] = useState('rsvps'); // rsvps | moderation
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const notify = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  };

  const delRsvp = async (id) => {
    if (!window.confirm('Delete this RSVP permanently?')) return;
    setDeletingId(id);
    try {
      await adminDeleteRsvp(id);
      setRows((l) => (l ? l.filter((x) => x.id !== id) : l));
      notify('RSVP deleted.');
    } catch (e) {
      notify(e?.message || 'Delete failed.');
      listRsvps().then(setRows).catch(() => {});
    } finally { setDeletingId(null); }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await listRsvps();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Could not load replies.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const list = rows || [];
    const yes = list.filter((r) => r.attend === ATTENDING);
    const no = list.filter((r) => r.attend !== ATTENDING);
    const headcount = yes.reduce((sum, r) => sum + (Number(r.guests) || 1), 0);
    return {
      total: list.length,
      yes: yes.length,
      no: no.length,
      headcount,
      pct: list.length ? Math.round((yes.length / list.length) * 100) : 0,
    };
  }, [rows]);

  const shown = useMemo(() => {
    let list = rows || [];
    if (filter === 'yes') list = list.filter((r) => r.attend === ATTENDING);
    if (filter === 'no') list = list.filter((r) => r.attend !== ATTENDING);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.name, r.contact, r.message, r.attend]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) =>
      sort === 'new'
        ? new Date(b.created_at) - new Date(a.created_at)
        : new Date(a.created_at) - new Date(b.created_at)
    );
    return sorted;
  }, [rows, filter, query, sort]);

  return (
    <div className="admin">
      <Arabesque />
      <div className="admin__inner admin__inner--wide">
        <header className="admin__topbar">
          <div>
            <p className="admin__eyebrow"><a href="/">Home</a>&nbsp;- The Reply Book</p>
            <h1 className="admin__title admin__title--small">
              {couple.bride.name} &amp; {couple.groom.name}
            </h1>
            <p className="admin__sub">{dates.long} · replies by {dates.rsvpBy}</p>
          </div>
          <div className="admin__topbar-actions">
            <button
              type="button" className="btn btn--small"
              onClick={() => downloadCsv(shown)} disabled={!shown.length}
            >
              Export CSV
            </button>
            <button
              type="button" className="btn btn--small"
              onClick={async () => { await signOutAdmin(); }}
            >
              Log out
            </button>
          </div>
        </header>

        <section className="admin__mod-tabs admin__mod-tabs--top" role="tablist" aria-label="Admin sections">
          <button type="button" role="tab" aria-selected={tab === 'rsvps'}
            className={`admin__chip ${tab === 'rsvps' ? 'is-active' : ''}`}
            onClick={() => setTab('rsvps')}>RSVPs</button>
          <button type="button" role="tab" aria-selected={tab === 'moderation'}
            className={`admin__chip ${tab === 'moderation' ? 'is-active' : ''}`}
            onClick={() => setTab('moderation')}>Content Moderation</button>
        </section>

        {tab === 'rsvps' && (
          <>
        <section className="admin__stats" aria-label="Summary">
          <div className="admin__stat">
            <span className="admin__stat-num">{stats.total}</span>
            <span className="admin__stat-label">Total replies</span>
          </div>
          <div className="admin__stat admin__stat--gold">
            <span className="admin__stat-num">{stats.yes}</span>
            <span className="admin__stat-label">Attending</span>
          </div>
          <div className="admin__stat">
            <span className="admin__stat-num">{stats.no}</span>
            <span className="admin__stat-label">Not attending</span>
          </div>
          <div className="admin__stat">
            <span className="admin__stat-num">{stats.pct}%</span>
            <span className="admin__stat-label">Attending share</span>
          </div>
          <div className="admin__stat admin__stat--gold">
            <span className="admin__stat-num">{stats.headcount}</span>
            <span className="admin__stat-label">Guests expected</span>
          </div>
        </section>

        <section className="admin__controls" aria-label="Search and filter">
          <input
            className="admin__search" type="search"
            placeholder="Search a name, contact or message…"
            value={query} onChange={(e) => setQuery(e.target.value)}
            aria-label="Search replies"
          />
          <div className="admin__filter" role="group" aria-label="Filter replies">
            {FILTERS.map((f) => (
              <button
                key={f.id} type="button"
                className={`admin__chip ${filter === f.id ? 'is-active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            type="button" className="admin__sort"
            onClick={() => setSort((s) => (s === 'new' ? 'old' : 'new'))}
          >
            {sort === 'new' ? '↓ Newest first' : '↑ Oldest first'}
          </button>
        </section>

        {error && <p className="admin__error" role="alert">{error}</p>}
        {rows && rows.length === 0 && !error && (
          <p className="admin__empty">
            No replies yet. If you have already received some, check that your
            account's email was added to <code>admin_users</code>.
          </p>
        )}
        {rows && rows.length > 0 && shown.length === 0 && (
          <p className="admin__empty">No replies match that search.</p>
        )}

        <ul className="admin__list">
          {shown.map((r) => {
            const attending = r.attend === ATTENDING;
            const count = Number(r.guests) || 1;
            return (
              <li className={`admin__row ${attending ? 'is-yes' : 'is-no'}`} key={r.id}>
                <div className="admin__row-main">
                  <h3 className="admin__row-name">{r.name}</h3>
                  {r.contact && <p className="admin__row-contact">{r.contact}</p>}
                  {r.message && <p className="admin__row-msg">“{r.message}”</p>}
                </div>
                <div className="admin__row-meta">
                  <span className={`admin__pill ${attending ? 'admin__pill--yes' : 'admin__pill--no'}`}>
                    {attending ? 'Attending' : 'Not attending'}
                  </span>
                  <span className="admin__row-guests">
                    {attending ? `${count} guest${count > 1 ? 's' : ''}` : '—'}
                  </span>
                  <time className="admin__row-date">{fmtDate(r.created_at)}</time>
                  <button type="button" className="btn btn--small admin__danger"
                    disabled={deletingId === r.id}
                    onClick={() => delRsvp(r.id)}>
                    {deletingId === r.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {toast && <div className="toast" role="status">{toast}</div>}

        <footer className="admin__foot">
          Signed in as {session?.user?.email || 'admin'} · every read is authorised
          in Postgres, never in this page.
        </footer>
          </>
        )}

        {tab === 'moderation' && <ModerationPanel />}
      </div>
    </div>
  );
}

/* --------------------------------------------------- Content moderation ---- */
function confirmDelete(message) {
  return window.confirm(message);
}

function ModerationPanel() {
  const [tab, setTab] = useState('wishes'); // wishes | posts | videos
  const [wishes, setWishes] = useState(null);
  const [posts, setPosts] = useState(null);
  const [videos, setVideos] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

  const notify = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2800);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [w, p, v] = await Promise.all([
          listAllWishes(), listAllGuestPosts(), listAllVideoWishes(),
        ]);
        if (!cancelled) { setWishes(w); setPosts(p); setVideos(v); }
      } catch {
        if (!cancelled) notify('Could not load content — check you are an admin.');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const delWish = async (id) => {
    if (!confirmDelete('Delete this wish permanently?')) return;
    setBusyId(id);
    try {
      await adminDeleteWish(id);
      setWishes((l) => l.filter((x) => x.id !== id));
      notify('Wish deleted.');
    } catch (e) {
      notify(e?.message || 'Delete failed.');
    } finally { setBusyId(null); }
  };
  const delPost = async (post) => {
    if (!confirmDelete('Delete this post permanently? Its comments, likes and media files will also be removed.')) return;
    setBusyId(post.id);
    try {
      await adminDeleteGuestPostFull(post);
      setPosts((l) => l.filter((x) => x.id !== post.id));
      notify('Post deleted (incl. comments/likes + media).');
    } catch (e) {
      notify(e?.message || 'Delete failed.');
      /* Reload to show the true DB state — the row may or may not be gone. */
      listAllGuestPosts().then(setPosts).catch(() => {});
    } finally { setBusyId(null); }
  };
  const delVideo = async (video) => {
    if (!confirmDelete('Delete this video wish permanently? Its video file will also be removed from Storage.')) return;
    setBusyId(video.id);
    try {
      await adminDeleteVideoWishFull(video);
      setVideos((l) => l.filter((x) => x.id !== video.id));
      notify('Video wish deleted (incl. file).');
    } catch (e) {
      notify(e?.message || 'Delete failed.');
      listAllVideoWishes().then(setVideos).catch(() => {});
    } finally { setBusyId(null); }
  };

  return (
    <section className="admin__mod" aria-label="Content moderation">
      <div className="admin__mod-tabs" role="tablist">
        {[['wishes','Wishes'],['posts','Guest Wall'],['videos','Video Wishes']].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id}
            className={`admin__chip ${tab === id ? 'is-active' : ''}`}
            onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}

      {tab === 'wishes' && (
        <ul className="admin__list">
          {wishes === null && <li className="admin__empty">Loading…</li>}
          {wishes !== null && wishes.length === 0 && <li className="admin__empty">No wishes yet.</li>}
          {(wishes || []).map((w) => (
            <li className="admin__row" key={w.id}>
              <div className="admin__row-main">
                <h3 className="admin__row-name">{w.name}</h3>
                <p className="admin__row-msg">“{w.message}”</p>
              </div>
              <div className="admin__row-meta">
                <time className="admin__row-date">{fmtDate(w.created_at)}</time>
                <button type="button" className="btn btn--small admin__danger"
                  disabled={busyId === w.id} onClick={() => delWish(w.id)}>
                  {busyId === w.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'posts' && (
        <ul className="admin__list">
          {posts === null && <li className="admin__empty">Loading…</li>}
          {posts !== null && posts.length === 0 && <li className="admin__empty">No guest posts yet.</li>}
          {(posts || []).map((p) => (
            <li className="admin__row" key={p.id}>
              <div className="admin__row-main">
                <h3 className="admin__row-name">{p.name}</h3>
                <p className="admin__row-msg">“{p.message}”</p>
                {p.image_url && <span className="admin__row-date">has photo</span>}
              </div>
              <div className="admin__row-meta">
                <time className="admin__row-date">{fmtDate(p.created_at)}</time>
                <button type="button" className="btn btn--small admin__danger"
                  disabled={busyId === p.id} onClick={() => delPost(p)}>
                  {busyId === p.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === 'videos' && (
        <ul className="admin__list">
          {videos === null && <li className="admin__empty">Loading…</li>}
          {videos !== null && videos.length === 0 && <li className="admin__empty">No video wishes yet.</li>}
          {(videos || []).map((v) => (
            <li className="admin__row" key={v.id}>
              <div className="admin__row-main">
                <h3 className="admin__row-name">{v.name}</h3>
                {v.video_url && <span className="admin__row-date">has video</span>}
              </div>
              <div className="admin__row-meta">
                <time className="admin__row-date">{fmtDate(v.created_at)}</time>
                <button type="button" className="btn btn--small admin__danger"
                  disabled={busyId === v.id} onClick={() => delVideo(v)}>
                  {busyId === v.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ Router ---- */
export default function AdminRsvp() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await getAdminSession();
      if (cancelled) return;
      setSession(current);
      setAdmin(current ? await isRsvpAdmin() : false);
      setReady(true);
    })();
    const unsub = onAuthChange(async (next) => {
      setSession(next);
      setAdmin(next ? await isRsvpAdmin() : false);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="admin">
        <div className="admin__inner">
          <p className="admin__error">
            Supabase is not configured on this deployment — add
            VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) return <div className="admin-boot" aria-label="Loading" />;

  if (session && admin) return <AdminDashboard session={session} />;

  if (session && !admin) {
    return (
      <div className="admin">
        <div className="admin__inner">
          <header className="admin__brand">
            <p className="admin__eyebrow">Private Office</p>
            <h1 className="admin__title admin__title--small">Not on the guest list</h1>
            <p className="admin__sub">
              This account is signed in but is not listed in <code>admin_users</code>,
              so the reply book stays closed. See SUPABASE_ADMIN_SETUP.md.
            </p>
          </header>
          <button
            type="button" className="btn admin__submit"
            onClick={async () => { await signOutAdmin(); }}
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return <AdminLogin onSignedIn={setSession} />;
}