create table public.generations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id text not null,
  prompt text not null,
  style text not null,
  aspect_ratio text not null,
  image_url text not null,
  storage_path text not null
);

-- Set up Row Level Security (RLS)
alter table public.generations enable row level security;

-- Create policy to allow users to see only their own generations
create policy "Users can see their own generations"
  on public.generations
  for select
  using (auth.uid() = user_id);

-- Create policy to allow users to insert their own generations
create policy "Users can insert their own generations"
  on public.generations
  for insert
  with check (auth.uid() = user_id);
