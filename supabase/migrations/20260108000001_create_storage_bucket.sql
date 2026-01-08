-- Create the storage bucket for generated images
insert into storage.buckets (id, name, public)
values ('generations', 'generations', true)
on conflict (id) do nothing;

-- Allow public read access to the bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'generations' );

-- Allow authenticated users to upload to the bucket
-- Note: Since we use Service Role in the API, this is permissive but safe as strict logic is server-side.
create policy "Authenticated users can upload"
  on storage.objects for insert
  with check ( bucket_id = 'generations' and auth.role() = 'authenticated' );
