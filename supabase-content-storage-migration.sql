-- Lumi Nails tartalom- és képkezelő migráció
-- Supabase Dashboard > SQL Editor alatt egyszer futtasd.
-- A foglalásokat, szolgáltatásokat és árakat nem módosítja.

create table if not exists public.site_settings (
    key text primary key,
    value jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings"
    on public.site_settings for select
    to anon, authenticated
    using (true);

drop policy if exists "admin can manage site settings" on public.site_settings;
create policy "admin can manage site settings"
    on public.site_settings for all
    to authenticated
    using (true)
    with check (true);

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

insert into public.site_settings (key, value)
values
    ('site_content', '{}'::jsonb),
    ('telefon_lathato', '{"visible": true}'::jsonb)
on conflict (key) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'site-media',
    'site-media',
    true,
    12582912,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view site media" on storage.objects;
create policy "public can view site media"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'site-media');

drop policy if exists "admin can upload site media" on storage.objects;
create policy "admin can upload site media"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'site-media');

drop policy if exists "admin can update site media" on storage.objects;
create policy "admin can update site media"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'site-media')
    with check (bucket_id = 'site-media');

drop policy if exists "admin can delete site media" on storage.objects;
create policy "admin can delete site media"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'site-media');