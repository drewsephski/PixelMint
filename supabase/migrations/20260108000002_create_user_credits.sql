create table public.user_credits (
  user_id text primary key, -- Clerk User ID
  credits integer not null default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.user_credits enable row level security;

-- Create policy to allow users to see only their own credits
-- Since we are using Clerk and Supabase-Clerk integration, auth.uid() should return the Clerk user ID
create policy "Users can see their own credits"
  on public.user_credits
  for select
  using (auth.uid()::text = user_id);

-- Create function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger on_user_credits_updated
  before update on public.user_credits
  for each row
  execute procedure public.handle_updated_at();