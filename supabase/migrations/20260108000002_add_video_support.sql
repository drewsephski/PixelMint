-- Add metadata column to support video generations and additional features
alter table public.generations add column metadata jsonb default '{}'::jsonb;

-- Add index on metadata for efficient querying
create index generations_metadata_idx on public.generations using gin (metadata);

-- Add type column to distinguish between images and videos
alter table public.generations add column type text default 'image' check (type in ('image', 'video'));

-- Update existing records to have type = 'image'
update public.generations set type = 'image' where type is null;

-- Add constraint to ensure metadata is not null
alter table public.generations alter column metadata set not null;