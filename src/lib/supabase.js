/* =========================================================================
   Supabase client for the guest features.

   Reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from .env.
   The publishable (anon) key is safe for the browser — all access is
   governed by RLS policies; no service-role or secret key is used anywhere.

   When Supabase is not configured the components fall back to their
   original localStorage behaviour, so the site never breaks.
   ========================================================================= */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/* --------------------------------------------------------------------------
   Anonymous visitor id.

   Guests never sign in, so each browser mints its own id and keeps it in
   localStorage. It is what a "like" is attributed to — it lets someone
   unlike their own like and stops double-liking, without any account.

   The id is also sent as a request header with every Supabase call so the
   "delete only your own like" RLS policy can verify ownership.
   -------------------------------------------------------------------------- */
const VISITOR_KEY = 'wedding:visitorId';

function mintVisitorId() {
  try {
    let id = window.localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        (crypto.randomUUID && crypto.randomUUID()) ||
        `v-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      window.localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    /* storage blocked — fall back to a per-tab id (likes still count) */
    if (!window.__weddingVisitorId) {
      window.__weddingVisitorId = `v-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    }
    return window.__weddingVisitorId;
  }
}

export function getVisitorId() {
  if (!window.__weddingVisitorIdResolved) window.__weddingVisitorIdResolved = mintVisitorId();
  return window.__weddingVisitorIdResolved;
}

const VISITOR_HEADER = 'x-wedding-visitor-id';

export const BUCKET = 'guest-uploads';

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      /* Sessions persist so the /admin dashboard survives a reload. Guests
         never sign in, so this changes nothing for them. */
      auth: { persistSession: true, autoRefreshToken: true },
      global: { headers: { [VISITOR_HEADER]: getVisitorId() } },
    })
  : null;


/* --------------------------------------------------------------------------
   Storage upload. Returns the public URL of the stored object.
   Paths are namespaced by visitor id and timestamped so uploads never
   collide and objects stay traceable without exposing any personal data.
   -------------------------------------------------------------------------- */
function safeExt(file, fallback) {
  const fromName = (file.name || '').split('.').pop();
  const ext = fromName && fromName.length <= 5 ? fromName.toLowerCase() : fallback;
  return ext.replace(/[^a-z0-9]/g, '') || fallback;
}

export async function uploadGuestFile(blob, { folder, fallbackExt }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const ext = safeExt(blob, fallbackExt);
  const path = `${folder}/${getVisitorId()}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || undefined,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error('Upload succeeded but no public URL was returned');
  return data.publicUrl;
}

/* Turn a data: URL (the compressed photo preview) into a Blob for upload. */
export function dataUrlToBlob(dataUrl) {
  const [meta, base64] = String(dataUrl).split(',');
  const mimeMatch = meta && meta.match(/data:([^;]+)/);
  const mime = (mimeMatch && mimeMatch[1]) || 'application/octet-stream';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/* ---------------------------------------------------------------------------
   Data helpers. Each one throws on failure so components can fall back to
   their localStorage behaviour. Rows are normalised to the shapes the
   components already used before Supabase existed.
   --------------------------------------------------------------------------- */

/* RSVP — insert only. The reply list is deliberately NOT readable from the
   browser (see the RLS policies in supabase/schema.sql): anonymous guests
   may insert, and only members of admin_users may ever select rows. */

/* Normalise a guest's contact into a stable RSVP identity: e-mail becomes
   lower-cased trimmed text, a phone number becomes digits only. Returns
   null when nothing usable was given. */
export function normalizeContact(contact) {
  const raw = String(contact || '').trim();
  if (!raw) return null;
  if (raw.includes('@')) {
    const email = raw.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
  }
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length >= 7 ? digits : null;
}

export async function saveRsvp({ name, guests, attend, message, contact }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const identity = normalizeContact(contact);
  if (!identity) {
    throw new Error('Please enter a valid email address or phone number.');
  }
  const { error } = await supabase.from('rsvps').insert({
    name,
    guests: Number(guests) || 1,
    attend,
    message: message || null,
    contact: String(contact || '').trim(),
    rsvp_identity: identity,
  });
  /* A unique-index violation (SQLSTATE 23505) means this guest has already
     replied — the caller shows the "already received" card. */
  if (error) throw error;
}

/* Ask the database whether this contact has already replied. The RPC is
   SECURITY DEFINER and returns only true/false — never any row data — so
   the check cannot leak another guest's reply. */
export async function checkRsvpSubmitted(contact) {
  if (!isSupabaseConfigured) return false;
  const identity = normalizeContact(contact);
  if (!identity) return false;
  try {
    const { data, error } = await supabase.rpc('rsvp_submitted', { p_identity: identity });
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ Wishes */
function normalizeWish(row) {
  return { id: row.id, name: row.name, message: row.message, createdAt: row.created_at };
}

export const WISHES_PAGE_SIZE = 3;

/* One page of wishes, newest first. `hasMore` tells the caller whether to
   keep the "show older" affordance. Page-based range pagination on a
   (created_at desc, id desc) order is stable for this volume. */
export async function listWishesPage({ page = 0, pageSize = WISHES_PAGE_SIZE } = {}) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const from = page * pageSize;
  const { data, error } = await supabase
    .from('wishes')
    .select('id, name, message, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return { wishes: (data || []).map(normalizeWish), hasMore: (data || []).length === pageSize };
}

export async function insertWish({ name, message }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('wishes')
    .insert({ name: name || 'A Well-Wisher', message })
    .select('id, name, message, created_at')
    .single();
  if (error) throw error;
  return normalizeWish(data);
}

/* -------------------------------------------------------------- Guest Wall */
function normalizePost(row, likeRows, commentRows, visitorId) {
  const likesForPost = (likeRows || []).filter((l) => l.post_id === row.id);
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    photo: row.image_url || null,
    avatar: row.avatar_url || null,
    createdAt: row.created_at,
    likes: {
      me: likesForPost.some((l) => l.visitor_id === visitorId),
      count: likesForPost.length,
    },
    comments: (commentRows || [])
      .filter((c) => c.post_id === row.id)
      .map((c) => ({ name: c.name, text: c.body, at: c.created_at })),
  };
}

/* Loads one page of the feed: posts plus the likes and comments belonging
   to just those posts, joined client-side. Ordering is (created_at desc,
   id desc) so duplicate timestamps can never shuffle rows between pages. */
export const FEED_PAGE_SIZE = 6;

export async function listGuestPostsPage({ page = 0, pageSize = FEED_PAGE_SIZE } = {}) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const from = page * pageSize;

  const postsRes = await supabase
    .from('guest_posts')
    .select('id, name, message, image_url, avatar_url, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1);
  if (postsRes.error) throw postsRes.error;

  const posts = postsRes.data || [];
  const ids = posts.map((p) => p.id);

  let likeRows = [];
  let commentRows = [];
  if (ids.length) {
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from('guest_post_likes').select('post_id, visitor_id').in('post_id', ids),
      supabase
        .from('guest_post_comments')
        .select('id, post_id, name, body, created_at')
        .in('post_id', ids)
        .order('created_at', { ascending: true }),
    ]);
    if (likesRes.error) throw likesRes.error;
    if (commentsRes.error) throw commentsRes.error;
    likeRows = likesRes.data || [];
    commentRows = commentsRes.data || [];
  }

  const visitorId = getVisitorId();
  return {
    posts: posts.map((row) => normalizePost(row, likeRows, commentRows, visitorId)),
    hasMore: posts.length === pageSize,
  };
}

export async function insertGuestPost({ name, message, imageUrl, avatarUrl }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('guest_posts')
    .insert({ name, message, image_url: imageUrl || null, avatar_url: avatarUrl || null })
    .select('id, name, message, image_url, avatar_url, created_at')
    .single();
  if (error) throw error;
  return normalizePost(data, [], [], getVisitorId());
}

/* Add or remove this browser's like on a post. The delete is protected by
   the visitor-id RLS policy — nobody can unlike someone else's like. */
export async function setLike(postId, liked) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (liked) {
    const { error } = await supabase
      .from('guest_post_likes')
      .insert({ post_id: postId, visitor_id: getVisitorId() });
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('guest_post_likes')
      .delete()
      .match({ post_id: postId, visitor_id: getVisitorId() });
    if (error) throw error;
  }
}

export async function insertComment(postId, name, body) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { error } = await supabase
    .from('guest_post_comments')
    .insert({ post_id: postId, name, body });
  if (error) throw error;
}

/* ------------------------------------------------------------ Video Wishes */
function normalizeVideoWish(row) {
  return { id: row.id, name: row.name, url: row.video_url, createdAt: row.created_at };
}

export const VIDEOS_PAGE_SIZE = 6;

export async function listVideoWishesPage({ page = 0, pageSize = VIDEOS_PAGE_SIZE } = {}) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const from = page * pageSize;
  const { data, error } = await supabase
    .from('video_wishes')
    .select('id, name, video_url, created_at')
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  return {
    videos: (data || []).map(normalizeVideoWish),
    hasMore: (data || []).length === pageSize,
  };
}

export async function insertVideoWish({ name, videoUrl }) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('video_wishes')
    .insert({ name, video_url: videoUrl })
    .select('id, name, video_url, created_at')
    .single();
  if (error) throw error;
  return normalizeVideoWish(data);
}

/* ------------------------------------------------------------- Avatars ----
   One small profile photo per visitor, stored under a fixed path and
   upserted — a guest who changes their avatar simply replaces it. The
   cache-busting query keeps every device showing the latest version. */
export async function uploadAvatar(blob) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const path = `avatars/${getVisitorId()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data || !data.publicUrl) throw new Error('Upload succeeded but no public URL was returned');
  return `${data.publicUrl}?v=${Date.now()}`;
}

/* ---------------------------------------------------------------- Admin ---
   Everything below speaks to Supabase Auth. The publishable key is the only
   key in the browser; authorisation is decided by RLS (public.is_admin()),
   never by anything the client claims. */
export async function getAdminSession() {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return (data && data.session) || null;
  } catch {
    return null;
  }
}

export async function signInAdmin(email, password) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return (data && data.session) || null;
}

export async function signOutAdmin() {
  if (!isSupabaseConfigured) return;
  await supabase.auth.signOut();
}

/* Subscribe to session changes (sign-in, sign-out, token refresh). */
export function onAuthChange(callback) {
  if (!isSupabaseConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

/* Verified server-side: RLS on admin_users only ever returns the caller's
   own row, and only when they are on the allow-list. */
export async function isRsvpAdmin() {
  const session = await getAdminSession();
  if (!session || !session.user) return false;
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();
    return !error && Boolean(data);
  } catch {
    return false;
  }
}

/* Admin-only read of every reply. RLS returns an empty list — not an
   error — for anyone signed in but not on the allow-list. */
export async function listRsvps() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('rsvps')
    .select('id, name, contact, guests, attend, message, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data || [];
}

/* ---- Content moderation (admin) ---- */

export async function listAllWishes() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('wishes')
    .select('id, name, message, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

export async function listAllGuestPosts() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('guest_posts')
    .select('id, name, message, image_url, avatar_url, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

export async function listAllVideoWishes() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('video_wishes')
    .select('id, name, video_url, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data || [];
}

/* ---- Admin deletes (V4 RLS-gated) ----

   CRITICAL: PostgREST returns HTTP 200 with an EMPTY result when RLS blocks
   a DELETE — it does not error. Chaining .select('id') makes PostgREST
   return the deleted rows; if zero rows came back, the policy blocked it
   and we MUST throw, or the admin UI would silently "succeed". */

function assertDeleted(rows, label) {
  if (!rows || rows.length === 0) {
    throw new Error(
      `${label} was not deleted. The V4 admin-delete policies in ` +
      'supabase/schema.sql must be applied to the live database, and you ' +
      'must be signed in as an admin (admin_users table).'
    );
  }
}

export async function adminDeleteWish(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('wishes')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertDeleted(data, 'Wish');
}

export async function adminDeleteGuestPost(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  /* FK cascades remove the post's comments + likes. */
  const { data, error } = await supabase
    .from('guest_posts')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertDeleted(data, 'Guest post');
}

export async function adminDeleteComment(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('guest_post_comments')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertDeleted(data, 'Comment');
}

export async function adminDeleteVideoWish(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('video_wishes')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertDeleted(data, 'Video wish');
}

export async function adminDeleteRsvp(id) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('rsvps')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertDeleted(data, 'RSVP');
}

/* Remove an object from the guest-uploads bucket (admin-only via RLS). */
export async function adminDeleteStorageObject(path) {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured');
  if (!path) return;
  const clean = path.split('?')[0];
  /* Accept both the full public URL and a raw object path. */
  const name =
    clean.includes('/object/public/guest-uploads/')
      ? clean.split('/object/public/guest-uploads/')[1]
      : clean;
  const { data, error } = await supabase.storage.from(BUCKET).remove([name]);
  if (error) throw error;
  /* Storage remove returns an array of results; if the object wasn't
     deleted (e.g. RLS denied or not found), the entry carries an error. */
  const result = data && data[0];
  if (result && result.error) {
    throw new Error(`Storage file "${name}" could not be deleted: ${result.error.message}`);
  }
}

/* Remove a guest post AND its associated storage objects. Storage deletion
   is best-effort (an orphaned file is reported but does not block the row
   delete); the DB row delete is authoritative and throws on failure. */
export async function adminDeleteGuestPostFull(post) {
  const storageErrors = [];
  try {
    if (post?.image_url) await adminDeleteStorageObject(post.image_url);
  } catch (e) { storageErrors.push(`photo: ${e.message}`); }
  try {
    if (post?.avatar_url) await adminDeleteStorageObject(post.avatar_url);
  } catch (e) { storageErrors.push(`avatar: ${e.message}`); }
  await adminDeleteGuestPost(post.id);
  if (storageErrors.length) {
    throw new Error(
      `Post deleted, but some media could not be removed from Storage: ${storageErrors.join('; ')}` +
      '. Remove them manually via Supabase Dashboard → Storage.'
    );
  }
}

/* Remove a video wish AND its storage object. */
export async function adminDeleteVideoWishFull(wish) {
  let storageError = null;
  try {
    if (wish?.video_url) await adminDeleteStorageObject(wish.video_url);
  } catch (e) { storageError = e.message; }
  await adminDeleteVideoWish(wish.id);
  if (storageError) {
    throw new Error(
      `Video wish deleted, but the video file could not be removed from Storage: ${storageError}` +
      '. Remove it manually via Supabase Dashboard → Storage.'
    );
  }
}
