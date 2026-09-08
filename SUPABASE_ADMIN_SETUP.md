# Admin Setup — The Reply Book (`/#admin`)

The couple's private RSVP dashboard lives at **`/#admin`** (or `/admin` when your
host rewrites paths, e.g. Netlify/Vercel). Only accounts listed in the
database's `admin_users` table can ever see a reply — authorisation is decided
by Postgres RLS, never by anything in the browser. No admin password exists in
the source code, and only the publishable key is used in the frontend.

Follow the steps below **in order**.

---

## 1. Create the admin user in Supabase Auth

1. Open **https://supabase.com/dashboard** → your project.
2. Go to **Authentication → Users → Add user → Create new user**.
3. Enter the couple's **email** and a **strong password** (a password manager
   is a good idea — this inbox sees every reply).
4. Leave *Auto Confirm User* ticked and click **Create user**.
5. Copy the **User UID** shown in the users table — you need it in step 2.

## 2. Add that user to `admin_users`

In the **SQL Editor**, run (replacing the UUID):

```sql
insert into public.admin_users (id, email)
values ('PASTE-THE-USER-UID-HERE', 'you@example.com')
on conflict (id) do nothing;
```

To add a second admin later, repeat with their UID. To revoke one:
`delete from public.admin_users where id = '…';`

## 3. Run the SQL schema

If you have not already, open `supabase/schema.sql` and run **the entire file**
once in the SQL Editor. It is idempotent — running it again is safe.

The schema creates:

| Object | Purpose |
|---|---|
| `rsvps` (+ `contact`, `rsvp_identity`) | replies, with a **UNIQUE** index on the normalised identity so each guest can reply exactly once |
| `wishes`, `guest_posts`, `guest_post_likes`, `guest_post_comments`, `video_wishes` | the public guest features |
| `guest_posts.avatar_url` | the small profile photo carried with each wall post |
| `admin_users` | the allow-list, tied to `auth.users` |
| `is_admin()` | SECURITY DEFINER function used by RLS |
| `rsvp_submitted(identity)` | existence-only probe — the RSVP form asks "already replied?" without exposing any rows |

## 4. Storage buckets

The schema's storage section creates the public **`guest-uploads`** bucket with
read + insert policies for everyone, plus an **admin-delete** policy (V4).
Verify under **Storage** that it exists. Guests' wall photos live under
`guest-wall/…`, avatars under `avatars/…`, and video wishes under
`video-wishes/…`.

**Upload limit:** every photo/video uploaded through the site is capped at
**50 MB per file**, enforced in the browser before upload (and matched by the
storage object limits in your project settings). The schema's storage insert
policy also restricts uploads to exactly those three folders. For stricter
control, set a matching file-size cap in **Project Settings → Storage**. To
raise the client-side limit, change `MAX_UPLOAD_BYTES` in
`src/components/GuestWall.jsx` and `MAX_VIDEO_BYTES_SHARED` in
`src/components/VideoWishes.jsx` — keep both under any storage-policy cap.

## 5. RLS policies — what is already enforced

Nothing to configure manually; the schema ships the policies:

- **`rsvps`** — anonymous visitors may **insert only**. `SELECT` requires an
  authenticated user **and** a row in `admin_users` (checked by
  `public.is_admin()`). A signed-in non-admin sees zero rows.
- **`wishes`, `guest_posts`, `guest_post_likes`, `guest_post_comments`,
  `video_wishes`** — public read + insert; a like may be deleted only when its
  `visitor_id` matches the `x-wedding-visitor-id` header the client sends.
- **`admin_users`** — each authenticated user can read **only their own row**;
  the public cannot see the list exists.
- **Storage** — public read, public insert, no overwrite/delete from browsers.

## 6. Logging in

1. Visit **`https://your-site/#admin`**.
2. Sign in with the email + password from step 1.
3. The dashboard shows totals, attending/declined counts, the attending share,
   expected headcount, every reply with contact details and messages, plus
   search, filter (All / Attending / Not attending), newest/oldest sorting and
   **Export CSV**.
4. **Log out** with the button in the top bar. The session persists across
   reloads until you do.

Wrong password → a polite error. Signed in but not on the allow-list → a
"Not on the guest list" screen with instructions.

## 7. Changing or resetting the admin password

- **Change:** Authentication → Users → select the user → **Send password
  recovery** (they get an email), or **Update password** on the user's page.
- **Rotate the account entirely:** create a new auth user, insert it into
  `admin_users`, delete the old row from `admin_users`, and remove the old
  user in Authentication.

---

## 8. Deleting user-generated content (admin-only)

The site never exposes delete buttons to guests, and RLS forbids browsers from
deleting anyone's rows or storage objects. The **admin dashboard** now includes
a **Content Moderation** tab (RSVPs, Wishes, Guest Wall, Video Wishes) with
delete-with-confirmation for admins — no SQL needed for everyday moderation.
Everything below is also available as dashboard SQL for bulk/advanced use.

### 8.0 Admin delete via the dashboard

1. Log in at **`/#admin`**.
2. Open the **Content Moderation** tab.
3. Choose a section (Wishes / Guest Wall / Video Wishes), review the item, and
   press **Delete** → confirm. The UI removes the row, updates the list, and
   shows a success toast. Deleting a Guest Wall post also removes its comments,
   likes, and image/avatar from Storage; deleting a Video Wish also removes its
   video file. RSVP rows are deleted on the main RSVPs tab.

### 8.1 Delete a single record

```sql
-- RSVP reply
delete from public.rsvps where id = 'ROW-UUID';

-- A wish
delete from public.wishes where id = 'ROW-UUID';

-- A guest-wall post (also removes its likes + comments, see 8.4)
delete from public.guest_posts where id = 'ROW-UUID';

-- A single comment (the post stays)
delete from public.guest_post_comments where id = 'ROW-UUID';

-- A video wish (removes the row; the file stays in storage, see 8.2)
delete from public.video_wishes where id = 'ROW-UUID';
```

You can find a row's `id` in **Table Editor**, or by querying
(`select id, name, created_at from public.guest_posts order by created_at desc;`).

### 8.2 Delete uploaded Storage files

The file itself is not removed when its database row is deleted — Storage and
Postgres are separate. Open **Storage → guest-uploads**, browse the folder
(`guest-wall/…`, `avatars/…`, or `video-wishes/…`) and delete the object, or
run SQL:

```sql
-- Delete one object by its exact path (visible in the Storage UI)
delete from storage.objects where bucket_id = 'guest-uploads' and name = 'guest-wall/<id>/file.jpg';
```

### 8.3 Delete related comments / likes

Likes and comments use **`on delete cascade`** foreign keys back to
`guest_posts.id`. This means deleting a **post** automatically deletes every
like and comment pointing at it — you never clean those up by hand.

To clear only a post's comments/likes while keeping the post:

```sql
delete from public.guest_post_likes where post_id = 'POST-UUID';
delete from public.guest_post_comments where post_id = 'POST-UUID';
```

### 8.4 Permanently remove unwanted content

Order matters when the media is also in Storage:

1. Note the `image_url` / `avatar_url` / `video_url` of the row.
2. Delete the database row (cascades handle likes/comments).
3. Delete the storage object from **Storage → guest-uploads** (or the SQL in
   8.2), so the file stops being publicly downloadable.

### 8.5 What happens when a parent post is deleted

- **`guest_post_likes`** → every like on that post is deleted (cascade).
- **`guest_post_comments`** → every comment on that post is deleted (cascade).
- **`guest_posts`/`wishes`/`video_wishes`/`rsvps`** orphaned rows are impossible;
  `admin_users` rows cascade-delete if you delete the auth user.

This is the intended behaviour — deleting one post cleans up after itself.

---

**Security notes**

- The browser bundle contains only `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_PUBLISHABLE_KEY` — the publishable key is safe to expose; all
  privileges come from RLS.
- Never place the `SECRET_KEY` / service-role key in `.env`, the bundle, or
  this repository.
- The one-RSVP guarantee is enforced by a UNIQUE index in Postgres; the UI
  merely reacts to it (SQLSTATE `23505` → "already received" card). Duplicate
  detection never returns another guest's data — the probe is existence-only.
- Guest uploads are restricted by RLS to the `avatars/`, `guest-wall/` and
  `video-wishes/` folders inside the `guest-uploads` bucket, and insert
  policies validate names and message lengths at the database layer.
