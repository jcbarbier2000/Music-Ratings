-- ============================================================
-- Music Ratings App - Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

-- Artists table
create table public.artists (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  genre text,
  subgenre text,
  created_at timestamptz default now()
);

-- Albums table
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete cascade not null,
  name text not null,
  year text,
  created_at timestamptz default now(),
  unique(artist_id, name)
);

-- Songs table
create table public.songs (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.albums(id) on delete cascade not null,
  name text not null,
  track_order integer default 0,
  created_at timestamptz default now(),
  unique(album_id, name)
);

-- Ratings table
create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  song_id uuid references public.songs(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 10),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, song_id)
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.artists enable row level security;
alter table public.albums enable row level security;
alter table public.songs enable row level security;
alter table public.ratings enable row level security;

-- Profiles: users can read all, only update their own
create policy "Profiles are viewable by all users"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Artists: readable by all, writable only by admin
create policy "Artists are viewable by all"
  on public.artists for select using (true);

create policy "Only admins can insert artists"
  on public.artists for insert
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

create policy "Only admins can update artists"
  on public.artists for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

create policy "Only admins can delete artists"
  on public.artists for delete
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

-- Albums: same pattern as artists
create policy "Albums are viewable by all"
  on public.albums for select using (true);

create policy "Only admins can insert albums"
  on public.albums for insert
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

create policy "Only admins can update albums"
  on public.albums for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

create policy "Only admins can delete albums"
  on public.albums for delete
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

-- Songs: same pattern
create policy "Songs are viewable by all"
  on public.songs for select using (true);

create policy "Only admins can insert songs"
  on public.songs for insert
  with check (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

create policy "Only admins can update songs"
  on public.songs for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

create policy "Only admins can delete songs"
  on public.songs for delete
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  ));

-- Ratings: users manage their own, all can read
create policy "Ratings are viewable by all"
  on public.ratings for select using (true);

create policy "Users can insert their own ratings"
  on public.ratings for insert with check (auth.uid() = user_id);

create policy "Users can update their own ratings"
  on public.ratings for update using (auth.uid() = user_id);

create policy "Users can delete their own ratings"
  on public.ratings for delete using (auth.uid() = user_id);

-- ============================================================
-- Helper function: upsert rating
-- ============================================================
create or replace function upsert_rating(
  p_song_id uuid,
  p_rating integer
) returns void language plpgsql security definer as $$
begin
  insert into public.ratings (user_id, song_id, rating, updated_at)
  values (auth.uid(), p_song_id, p_rating, now())
  on conflict (user_id, song_id)
  do update set rating = p_rating, updated_at = now();
end;
$$;

-- ============================================================
-- Make the first registered user an admin automatically
-- You can also manually set is_admin = true in the profiles table
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Request tables
-- ============================================================

-- Artist requests
create table if not exists public.artist_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users(id) on delete cascade not null,
  username text not null,
  artist_name text not null,
  notes text,
  status text default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz default now()
);
alter table public.artist_requests enable row level security;
create policy "Artist requests viewable by all" on public.artist_requests for select using (true);
create policy "Users can insert artist requests" on public.artist_requests for insert with check (auth.uid() = requested_by);
create policy "Admins can update artist requests" on public.artist_requests for update using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "Admins can delete artist requests" on public.artist_requests for delete using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Re-rate requests
create table if not exists public.rerate_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users(id) on delete cascade not null,
  username text not null,
  artist_name text not null,
  album_name text not null,
  notes text,
  status text default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz default now()
);
alter table public.rerate_requests enable row level security;
create policy "Rerate requests viewable by all" on public.rerate_requests for select using (true);
create policy "Users can insert rerate requests" on public.rerate_requests for insert with check (auth.uid() = requested_by);
create policy "Admins can update rerate requests" on public.rerate_requests for update using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "Admins can delete rerate requests" on public.rerate_requests for delete using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Site requests
create table if not exists public.site_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references auth.users(id) on delete cascade not null,
  username text not null,
  title text not null,
  description text,
  status text default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz default now()
);
alter table public.site_requests enable row level security;
create policy "Site requests viewable by all" on public.site_requests for select using (true);
create policy "Users can insert site requests" on public.site_requests for insert with check (auth.uid() = requested_by);
create policy "Admins can update site requests" on public.site_requests for update using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "Admins can delete site requests" on public.site_requests for delete using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
