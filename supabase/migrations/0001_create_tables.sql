-- Drop existing objects if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop tables in correct order (dependent tables first)
drop table if exists public.post_likes;
drop table if exists public.posts;
drop table if exists public.profiles;

-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
    id uuid not null references auth.users(id) on delete cascade,
    username text not null,
    name text not null,
    bio text,
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id),
    constraint username_unique unique(username)
);

-- Create posts table
create table public.posts (
    id uuid not null default uuid_generate_v4(),
    author_id uuid not null references public.profiles(id) on delete cascade,
    content text not null,
    image_url text,
    likes_count integer not null default 0,
    comments_count integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (id)
);

-- Create post_likes table
create table public.post_likes (
    post_id uuid not null references public.posts(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;

-- Create profiles policies
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
    on public.profiles for select
    using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Create posts policies
drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
    on public.posts for select
    using (true);

drop policy if exists "Users can create their own posts" on public.posts;
create policy "Users can create their own posts"
    on public.posts for insert
    with check (auth.uid() = author_id);

drop policy if exists "Users can update their own posts" on public.posts;
create policy "Users can update their own posts"
    on public.posts for update
    using (auth.uid() = author_id);

drop policy if exists "Users can delete their own posts" on public.posts;
create policy "Users can delete their own posts"
    on public.posts for delete
    using (auth.uid() = author_id);

-- Create post_likes policies
drop policy if exists "Post likes are viewable by everyone" on public.post_likes;
create policy "Post likes are viewable by everyone"
    on public.post_likes for select
    using (true);

drop policy if exists "Users can manage their own likes" on public.post_likes;
create policy "Users can manage their own likes"
    on public.post_likes
    using (auth.uid() = user_id);

-- Grant necessary permissions
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, service_role;
grant all privileges on all sequences in schema public to postgres, service_role;
grant all privileges on all functions in schema public to postgres, service_role;

-- Allow public read access
grant select on public.profiles to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant select on public.post_likes to anon, authenticated;

-- Allow authenticated users to modify their own data
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.posts to authenticated;
grant insert, delete on public.post_likes to authenticated; 