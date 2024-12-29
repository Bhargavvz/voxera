-- Create notifications table
create table public.notifications (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    actor_id uuid not null references public.profiles(id) on delete cascade,
    type text not null check (type in ('follow', 'like', 'comment')),
    post_id uuid references public.posts(id) on delete cascade,
    read boolean not null default false,
    created_at timestamptz not null default now()
);

-- Create messages table
create table public.messages (
    id uuid primary key default uuid_generate_v4(),
    sender_id uuid not null references public.profiles(id) on delete cascade,
    receiver_id uuid not null references public.profiles(id) on delete cascade,
    content text not null,
    read boolean not null default false,
    created_at timestamptz not null default now()
);

-- Create follows table
create table public.follows (
    follower_id uuid not null references public.profiles(id) on delete cascade,
    following_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (follower_id, following_id)
);

-- Enable RLS
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.follows enable row level security;

-- Notifications policies
create policy "Users can view their own notifications"
    on public.notifications for select
    using (auth.uid() = user_id);

create policy "Users can update their own notifications"
    on public.notifications for update
    using (auth.uid() = user_id);

-- Messages policies
create policy "Users can view their own messages"
    on public.messages for select
    using (auth.uid() = sender_id or auth.uid() = receiver_id);

create policy "Users can send messages"
    on public.messages for insert
    with check (auth.uid() = sender_id);

create policy "Users can update their own messages"
    on public.messages for update
    using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Follows policies
create policy "Anyone can view follows"
    on public.follows for select
    using (true);

create policy "Users can manage their own follows"
    on public.follows
    using (auth.uid() = follower_id);

-- Create indexes for better performance
create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_actor_id_idx on public.notifications(actor_id);
create index notifications_post_id_idx on public.notifications(post_id);
create index messages_sender_id_idx on public.messages(sender_id);
create index messages_receiver_id_idx on public.messages(receiver_id);
create index follows_follower_id_idx on public.follows(follower_id);
create index follows_following_id_idx on public.follows(following_id); 