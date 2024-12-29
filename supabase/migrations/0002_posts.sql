-- Create posts table
create table public.posts (
    id uuid primary key default uuid_generate_v4(),
    content text not null,
    author_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now()
);

-- Create post_likes table
create table public.post_likes (
    post_id uuid not null references public.posts(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (post_id, user_id)
);

-- Create post_comments table
create table public.post_comments (
    id uuid primary key default uuid_generate_v4(),
    post_id uuid not null references public.posts(id) on delete cascade,
    author_id uuid not null references public.profiles(id) on delete cascade,
    content text not null,
    created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Anyone can view posts" on posts;
drop policy if exists "Authenticated users can create posts" on posts;
drop policy if exists "Users can update their own posts" on posts;
drop policy if exists "Users can delete their own posts" on posts;

-- Create policies
create policy "Anyone can view posts"
on posts for select
using (true);

create policy "Authenticated users can create posts"
on posts for insert
with check (auth.uid() = author_id);

create policy "Users can update their own posts"
on posts for update
using (auth.uid() = author_id);

create policy "Users can delete their own posts"
on posts for delete
using (auth.uid() = author_id);

-- Grant permissions
grant usage on schema public to authenticated;
grant usage on schema public to anon;

grant all on posts to authenticated;
grant select on posts to anon;

-- Post likes policies
create policy "Anyone can view post likes"
    on public.post_likes for select
    using (true);

create policy "Authenticated users can like posts"
    on public.post_likes for insert
    with check (auth.uid() = user_id);

create policy "Users can unlike posts"
    on public.post_likes for delete
    using (auth.uid() = user_id);

-- Post comments policies
create policy "Anyone can view comments"
    on public.post_comments for select
    using (true);

create policy "Authenticated users can create comments"
    on public.post_comments for insert
    with check (auth.uid() = author_id);

create policy "Users can update their own comments"
    on public.post_comments for update
    using (auth.uid() = author_id);

create policy "Users can delete their own comments"
    on public.post_comments for delete
    using (auth.uid() = author_id);

-- Create indexes
create index posts_author_id_idx on public.posts(author_id);
create index post_likes_post_id_idx on public.post_likes(post_id);
create index post_likes_user_id_idx on public.post_likes(user_id);
create index post_comments_post_id_idx on public.post_comments(post_id);
create index post_comments_author_id_idx on public.post_comments(author_id); 