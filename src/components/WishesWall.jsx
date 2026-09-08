import { useEffect, useState } from 'react';
import SectionHead from './SectionHead.jsx';
import Arabesque from './Arabesque.jsx';
import { useLocalStorage, useReveal } from '../lib/hooks.js';
import { couple } from '../data.js';
import {
  isSupabaseConfigured,
  listWishesPage,
  insertWish,
} from '../lib/supabase.js';

const STORAGE_KEY = 'wedding:wishes';

export default function WishesWall() {
  const { read, write } = useLocalStorage(STORAGE_KEY);
  const [wishes, setWishes] = useState([]);
  const [form, setForm] = useState({ name: '', message: '' });
  const [saved, setSaved] = useState(false);
  /* true once the shared board is live — wishes are then visible to everyone. */
  const [shared, setShared] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /* Re-sweep .reveal elements whenever the board content changes — the root
     observer only runs once, so dynamically-loaded wishes would otherwise
     stay at opacity: 0 forever. */
  useReveal(wishes.length);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (isSupabaseConfigured) {
        try {
          const { wishes: rows, hasMore: more } = await listWishesPage({ page: 0 });
          if (cancelled) return;
          setWishes(rows);
          setHasMore(more);
          setShared(true);
          setLoading(false);
          return;
        } catch {
          /* Supabase unreachable — fall through to the local copy. */
        }
      }
      const data = read();
      if (!cancelled) {
        if (Array.isArray(data)) setWishes(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showOlder = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { wishes: rows, hasMore: more } = await listWishesPage({ page: next });
      setWishes((prev) => [...prev, ...rows]);
      setHasMore(more);
      setPage(next);
    } catch {
      setError('Could not load more wishes — please try again.');
    } finally {
      setLoadingMore(false);
    }
  };

  const addWish = async (e) => {
    e.preventDefault();
    const message = form.message.trim();
    if (!message) return;
    const name = form.name.trim() || 'A Well-Wisher';

    if (shared) {
      try {
        const row = await insertWish({ name, message });
        setWishes((prev) => [row, ...prev]);
        setForm({ name: '', message: '' });
        setSaved(true);
        setTimeout(() => setSaved(false), 2600);
        return;
      } catch {
        /* Posting failed — keep the wish on this device instead. */
        setShared(false);
      }
    }

    const wish = {
      id: `w-${Date.now()}`,
      name,
      message,
      createdAt: new Date().toISOString(),
    };
    const next = [wish, ...wishes];
    setWishes(next);
    write(next);
    setForm({ name: '', message: '' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  return (
    <section className="section section--sand" aria-labelledby="wishes-title">
      <Arabesque />
      <div className="section__inner">
        <SectionHead
          id="wishes-title"
          eyebrow="From The Heart"
          title="Wishes Wall"
          sub={
            shared
              ? `Leave a blessing for ${couple.bride.name} & ${couple.groom.name} — every wish is shared with all the guests.`
              : `Leave a blessing for ${couple.bride.name} & ${couple.groom.name} — saved locally in this browser.`
          }
        />

        <form className="wall-form reveal" onSubmit={addWish}>
          <div className="field">
            <label htmlFor="wish-name">Your Name</label>
            <input
              id="wish-name" type="text" placeholder="Your name"
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              maxLength={60}
            />
          </div>
          <div className="field">
            <label htmlFor="wish-msg">Your Wish</label>
            <textarea
              id="wish-msg" rows={3} required placeholder="Write your dua or blessing…"
              value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              maxLength={500}
            />
          </div>
          <button type="submit" className="btn btn--gold">Post Wish</button>
          {saved && <p className="wall-form__note" role="status">Wish saved on this device ✦</p>}
        </form>

        {error && (
          <p className="wall-error" role="alert">{error}</p>
        )}

        {loading ? (
          <p className="wall-empty" role="status">Gathering the blessings…</p>
        ) : (
          <>
            {/* Three wishes at a time; the page itself grows downward. */}
            <div className="wish-grid">
              {wishes.length === 0 && (
                <p className="wall-empty">
                  {shared
                    ? 'No wishes yet — be the first to bless the couple.'
                    : 'No wishes yet.'}
                </p>
              )}
              {wishes.map((wish) => (
                <article className="wish-card" key={wish.id}>
                  <p className="wish-card__msg">{wish.message}</p>
                  <footer className="wish-card__foot">
                    <span className="wish-card__name">— {wish.name}</span>
                    <time className="wish-card__date" dateTime={wish.createdAt}>
                      {new Date(wish.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </time>
                  </footer>
                </article>
              ))}
            </div>

            {hasMore && (
              <div className="wall-more">
                <button
                  type="button"
                  className="btn btn--gold"
                  onClick={showOlder}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Gathering…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}