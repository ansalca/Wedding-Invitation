-- =========================================================================
-- Wedding site — Supabase schema
--
-- Public guest features backed by Postgres with the publishable (anon)
-- key only. Every table is protected by RLS: anonymous guests may insert
-- and read, never update or delete other guests' rows.
--
-- Run this once in the Supabase SQL editor.
-- =========================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------
-- RSVP replies
-- -----------------------------------------------------------------------
create table if not exists public.rsvps (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  guests     int  not null default 1 check (guests between 1 and 5),
  attend     text not null,
  message    text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- Wishes Wall — short text blessings
-- -----------------------------------------------------------------------
create table if not exists public.wishes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'A Well-Wisher',
  message    text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- Guest Wall — posts with an optional photo
-- -----------------------------------------------------------------------
create table if not exists public.guest_posts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  message    text not null check (char_length(message) between 1 and 600),
  image_url  text,
  created_at timestamptz not null default now()
);

-- One row per (post, visitor) — the "like". visitor_id is the browser-local
-- anonymous id minted in src/lib/supabase.js, not a personal identifier.
create table if not exists public.guest_post_likes (
  post_id    uuid not null references public.guest_posts (id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, visitor_id)
);

create table if not exists public.guest_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.guest_posts (id) on delete cascade,
  name       text not null,
  body       text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- Video Wishes — clips stored in the guest-uploads bucket
-- -----------------------------------------------------------------------
create table if not exists public.video_wishes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  video_url  text not null,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Row Level Security
--
-- The site has no sign-in, so policies target the anon + authenticated
-- roles with insert/select only. A guest may unlike only their own like
-- (verified by the x-wedding-visitor-id header the client sends), and
-- nobody can alter or remove someone else's wish, post, comment or video.
-- =========================================================================

alter table public.rsvps               enable row level security;
alter table public.wishes              enable row level security;
alter table public.guest_posts         enable row level security;
alter table public.guest_post_likes    enable row level security;
alter table public.guest_post_comments enable row level security;
alter table public.video_wishes        enable row level security;

-- RSVPs: anyone can reply. The list itself is NOT readable from the
-- browser, so guest replies stay private — the couple reads them from
-- the Supabase dashboard with their own signed-in account.
drop policy if exists "rsvps insert" on public.rsvps;
create policy "rsvps insert"
  on public.rsvps for insert to anon, authenticated with check (true);

-- Wishes: public board.
drop policy if exists "wishes select" on public.wishes;
create policy "wishes select"
  on public.wishes for select to anon, authenticated using (true);

drop policy if exists "wishes insert" on public.wishes;
create policy "wishes insert"
  on public.wishes for insert to anon, authenticated with check (true);

-- Guest posts: public board.
drop policy if exists "guest posts select" on public.guest_posts;
create policy "guest posts select"
  on public.guest_posts for select to anon, authenticated using (true);

drop policy if exists "guest posts insert" on public.guest_posts;
create policy "guest posts insert"
  on public.guest_posts for insert to anon, authenticated with check (true);

-- Likes: guests may read all, add one, and remove only their own
-- (matched against the x-wedding-visitor-id header the client sends).
drop policy if exists "guest likes select" on public.guest_post_likes;
create policy "guest likes select"
  on public.guest_post_likes for select to anon, authenticated using (true);

drop policy if exists "guest likes insert" on public.guest_post_likes;
create policy "guest likes insert"
  on public.guest_post_likes for insert to anon, authenticated
  with check (char_length(visitor_id) between 6 and 64);

drop policy if exists "guest likes delete" on public.guest_post_likes;
create policy "guest likes delete"
  on public.guest_post_likes for delete to anon, authenticated
  using (
    visitor_id = (current_setting('request.headers', true)::json ->> 'x-wedding-visitor-id')
  );

-- Comments: public board.
drop policy if exists "guest comments select" on public.guest_post_comments;
create policy "guest comments select"
  on public.guest_post_comments for select to anon, authenticated using (true);

drop policy if exists "guest comments insert" on public.guest_post_comments;
create policy "guest comments insert"
  on public.guest_post_comments for insert to anon, authenticated with check (true);

-- Video wishes: public board.
drop policy if exists "video wishes select" on public.video_wishes;
create policy "video wishes select"
  on public.video_wishes for select to anon, authenticated using (true);

drop policy if exists "video wishes insert" on public.video_wishes;
create policy "video wishes insert"
  on public.video_wishes for insert to anon, authenticated with check (true);

-- =========================================================================
-- Storage: public "guest-uploads" bucket for guest wall photos and video
-- wishes. Anyone may read and upload into it; nothing can be overwritten
-- or deleted from the browser.
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('guest-uploads', 'guest-uploads', true)
on conflict (id) do update set public = true;

drop policy if exists "guest uploads read" on storage.objects;
create policy "guest uploads read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'guest-uploads');

drop policy if exists "guest uploads insert" on storage.objects;
create policy "guest uploads insert"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'guest-uploads');

-- Helpful indexes for the order-by / joins the app performs.
create index if not exists wishes_created_at_idx
  on public.wishes (created_at desc);
create index if not exists guest_posts_created_at_idx
  on public.guest_posts (created_at desc);
create index if not exists guest_comments_post_idx
  on public.guest_post_comments (post_id, created_at);
create index if not exists video_wishes_created_at_idx
  on public.video_wishes (created_at desc);

-- =========================================================================
-- V2 — Admin access and one-RSVP-per-guest
--
-- Added later than the tables above, but safe to run on a fresh database
-- too: every statement is idempotent.
-- =========================================================================

-- -----------------------------------------------------------------------
-- RSVP identity — one reply per guest, enforced by the database.
--
-- contact is what the guest types (an email address or a phone number);
-- rsvp_identity is the normalised form (lower-cased email, or digits only)
-- and carries the UNIQUE index. Duplicate inserts fail with SQLSTATE 23505
-- and the UI responds with the "already received" card — no private row
-- data is ever returned to the guest.
-- -----------------------------------------------------------------------
alter table public.rsvps add column if not exists contact        text;
alter table public.rsvps add column if not exists rsvp_identity  text;

-- The guest wall feed carries a small profile photo per post.
alter table public.guest_posts add column if not exists avatar_url text;

create unique index if not exists rsvps_identity_unique
  on public.rsvps (rsvp_identity) where rsvp_identity is not null;

create index if not exists rsvps_created_at_idx
  on public.rsvps (created_at desc);

-- Backfill legacy rows where a contact was already stored.
update public.rsvps
  set rsvp_identity = lower(btrim(contact))
  where rsvp_identity is null
    and contact is not null
    and position('@' in contact) > 0;

update public.rsvps
  set rsvp_identity = regexp_replace(contact, '[^0-9]', '', 'g')
  where rsvp_identity is null
    and contact is not null
    and position('@' in contact) = 0;

-- -----------------------------------------------------------------------
-- Admin allow-list. Rows are tied to Supabase Auth users; there is no
-- client-side "isAdmin" boolean anywhere — every policy below asks
-- Postgres. The public website never sees this table.
-- -----------------------------------------------------------------------
create table if not exists public.admin_users (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin self read" on public.admin_users;
create policy "admin self read"
  on public.admin_users for select to authenticated
  using (id = auth.uid());

-- Server-side admin check. SECURITY DEFINER so the policy on rsvps can
-- consult admin_users without the caller needing any grant on it.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------
-- RSVP read access: admins only.
--
-- The v1 schema deliberately shipped NO select policy on rsvps, which
-- already blocked anonymous reads. This policy adds the admin path, so:
--   anon            → insert only, never select
--   authenticated
--     ├─ in admin_users → full select
--     └─ everyone else  → still no select
-- -----------------------------------------------------------------------
drop policy if exists "rsvps admin select" on public.rsvps;
create policy "rsvps admin select"
  on public.rsvps for select to authenticated
  using (public.is_admin());

drop policy if exists "rsvps insert" on public.rsvps;
create policy "rsvps insert"
  on public.rsvps for insert to anon, authenticated with check (true);

-- Existence-only probe so the form can say "already received" without
-- exposing anyone's reply. It answers a single question about a value the
-- caller must already know, and returns nothing else.
create or replace function public.rsvp_submitted(p_identity text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rsvps where rsvp_identity = p_identity
  );
$$;

revoke all on function public.rsvp_submitted(text) from public;
grant execute on function public.rsvp_submitted(text) to anon, authenticated;

-- =========================================================================
-- V3 — Security hardening
--
-- Stricter input validation at the database layer, plus insert policies
-- that verify instead of accepting anything. Everything below is additive
-- and idempotent — re-running the whole file stays safe.
-- =========================================================================

-- ---------------------------------------------------------------------------
-- Length / format constraints (additive; a DO block keeps them idempotent).
-- Names are short but non-empty; URLs must be real http(s) links.
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'wishes_name_len' and conrelid = 'public.wishes'::regclass) then
    alter table public.wishes add constraint wishes_name_len check (char_length(btrim(name)) between 1 and 60);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'guest_posts_name_len' and conrelid = 'public.guest_posts'::regclass) then
    alter table public.guest_posts add constraint guest_posts_name_len check (char_length(btrim(name)) between 1 and 60);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'guest_comments_name_len' and conrelid = 'public.guest_post_comments'::regclass) then
    alter table public.guest_post_comments add constraint guest_comments_name_len check (char_length(btrim(name)) between 1 and 60);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'video_wishes_name_len' and conrelid = 'public.video_wishes'::regclass) then
    alter table public.video_wishes add constraint video_wishes_name_len check (char_length(btrim(name)) between 1 and 60);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'guest_posts_urls' and conrelid = 'public.guest_posts'::regclass) then
    alter table public.guest_posts add constraint guest_posts_urls check (
      (image_url is null) or (image_url ~ '^https?://' and char_length(image_url) <= 2000)
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'guest_posts_avatar' and conrelid = 'public.guest_posts'::regclass) then
    alter table public.guest_posts add constraint guest_posts_avatar check (
      (avatar_url is null) or (avatar_url ~ '^https?://' and char_length(avatar_url) <= 2000)
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'video_wishes_url' and conrelid = 'public.video_wishes'::regclass) then
    alter table public.video_wishes add constraint video_wishes_url check (
      video_url ~ '^https?://' and char_length(video_url) <= 2000
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'rsvps_name_len' and conrelid = 'public.rsvps'::regclass) then
    alter table public.rsvps add constraint rsvps_name_len check (char_length(btrim(name)) between 1 and 80);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- RSVP insert now validates at the database instead of `with check (true)`.
-- The guest's contact is their unique identity, so it must be present and
-- plausible; attend/guests must match exactly what the form offers.
-- ---------------------------------------------------------------------------
drop policy if exists "rsvps insert" on public.rsvps;
create policy "rsvps insert"
  on public.rsvps for insert to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 80
    and guests between 1 and 5
    and attend in ('Joyfully Attending', 'Regretfully Declining')
    and coalesce(char_length(rsvp_identity), 0) between 4 and 320
    and (message is null or char_length(message) <= 600)
  );

-- ---------------------------------------------------------------------------
-- Likes must be attributed to the caller's own browser visitor id — the same
-- id the client already sends in the x-wedding-visitor-id header. This stops
-- a guest from fabricating likes on behalf of others (and doubles as the
-- RLS rule that lets a guest unlike only their own likes).
-- ---------------------------------------------------------------------------
drop policy if exists "guest likes insert" on public.guest_post_likes;
create policy "guest likes insert"
  on public.guest_post_likes for insert to anon, authenticated
  with check (
    char_length(visitor_id) between 6 and 64
    and visitor_id =
      (current_setting('request.headers', true)::json ->> 'x-wedding-visitor-id')
  );

-- ---------------------------------------------------------------------------
-- Storage uploads are restricted to exactly the folders the app writes to,
-- so junk can no longer be dropped into the public bucket root (and the
-- bucket cannot be turned into a general-purpose dumping ground).
-- ---------------------------------------------------------------------------
drop policy if exists "guest uploads insert" on storage.objects;
create policy "guest uploads insert"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'guest-uploads'
    and (storage.foldername(name))[1] in ('avatars', 'guest-wall', 'video-wishes')
  );
﻿
-- ==========================================================================
-- V4 - Admin-only DELETE for content moderation (RLS-enforced)
--
-- Guests have no delete rights. Only users listed in admin_users (checked
-- via public.is_admin()) can remove posts/comments/video wishes. Likes are
-- still deleted only by their owning visitor_id via the existing policy.
-- Storage objects are admin-deletable too, so moderators can remove media.
-- ==========================================================================

-- Wishes: admin delete (public insert/select only).
drop policy if exists "wishes admin delete" on public.wishes;
create policy "wishes admin delete"
  on public.wishes for delete to authenticated
  using (public.is_admin());

-- Guest posts: admin delete (cascades to comments/likes via FK).
drop policy if exists "guest posts admin delete" on public.guest_posts;
create policy "guest posts admin delete"
  on public.guest_posts for delete to authenticated
  using (public.is_admin());

-- Comments: admin delete.
drop policy if exists "guest comments admin delete" on public.guest_post_comments;
create policy "guest comments admin delete"
  on public.guest_post_comments for delete to authenticated
  using (public.is_admin());

-- Likes: admin delete (visitor-owned delete policy remains for guests).
drop policy if exists "guest likes admin delete" on public.guest_post_likes;
create policy "guest likes admin delete"
  on public.guest_post_likes for delete to authenticated
  using (public.is_admin());

-- Video wishes: admin delete.
drop policy if exists "video wishes admin delete" on public.video_wishes;
create policy "video wishes admin delete"
  on public.video_wishes for delete to authenticated
  using (public.is_admin());

-- RSVP: admins may also delete replies.
drop policy if exists "rsvps admin delete" on public.rsvps;
create policy "rsvps admin delete"
  on public.rsvps for delete to authenticated
  using (public.is_admin());

-- Storage: admins may delete any object in the guest-uploads bucket.
drop policy if exists "guest uploads admin delete" on storage.objects;
create policy "guest uploads admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'guest-uploads'
    and public.is_admin()
  );