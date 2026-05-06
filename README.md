# Music Ratings — Setup Guide

A shared music rating site for you and your friends.  
Stack: **React + Vite → Vercel** | **Supabase (Postgres)**

---

## Step 1 — Supabase (Database)

1. Go to **https://supabase.com** and sign up (free)
2. Click **New Project**, give it a name (e.g. `music-ratings`), set a database password, click **Create**
3. Wait ~2 minutes for it to spin up
4. In the left sidebar, click **SQL Editor**
5. Click **New query**, paste the entire contents of `supabase-schema.sql`, and click **Run**
6. Go to **Authentication → Providers → Email** and turn off **"Confirm email"**, then **Save**
   - Required because the app uses generated emails — without this, registration won't work
7. Go to **Project Settings → API** and copy two values for Step 3:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon / public** key (long string under "Project API keys")

---

## Step 2 — GitHub

1. Go to **https://github.com** and sign up / log in
2. Click **New repository**, name it `music-ratings`, make it **Private**, click **Create**
3. Open a terminal in the `music-ratings` folder and run:

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/music-ratings.git
git push -u origin main
```

---

## Step 3 — Vercel (Hosting)

1. Go to **https://vercel.com** and sign up with GitHub
2. Click **Add New → Project**, find your `music-ratings` repo, click **Import**
3. Before clicking Deploy, open **Environment Variables** and add:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

4. Click **Deploy** — you get a URL like `https://music-ratings-xyz.vercel.app`

---

## Step 4 — Make yourself Admin

Now that the site is live:

1. Visit your Vercel URL and click **Register**
2. Create your account with a username and password
3. Go to **Supabase → Authentication → Users** — you should see your user row
4. Copy your **UUID** (the ID column)
5. Go to **SQL Editor** and run:

```sql
INSERT INTO public.profiles (id, username, is_admin)
VALUES ('paste-your-uuid-here', 'your-username', true);
```

6. Log back into the site — you'll have full admin access

---

## Step 5 — Share with friends

Send friends your Vercel URL. They click **Register**, create a username + password, and can immediately start rating. Any artists you import as admin appear for everyone instantly.

---

## Updating the site later

```bash
git add .
git commit -m "describe what you changed"
git push
```

Vercel auto-deploys in ~60 seconds. Friends see the update, all data intact.

---

## Local development (optional)

```bash
cp .env.example .env   # then fill in your Supabase URL and key
npm install
npm run dev            # opens at http://localhost:5173
```

---

## File structure

```
music-ratings/
├── src/
│   ├── App.jsx              ← Main app
│   ├── components/
│   │   ├── Login.jsx        ← Login / register screen
│   │   ├── StarRating.jsx   ← 10-star rating widget
│   │   ├── AlbumChart.jsx   ← SVG line chart
│   │   └── ImportModal.jsx  ← CSV import (admin only)
│   ├── hooks/
│   │   └── useAuth.js       ← Auth state
│   └── lib/
│       └── supabase.js      ← Supabase client
├── supabase-schema.sql      ← Run once in Supabase SQL editor
├── .env.example             ← Copy to .env and fill in keys
└── package.json
```
