-- Lumi Nails foglalási inspirációs képek
-- Futtasd a Supabase Dashboard > SQL Editor felületen.
-- Nem töröl meglévő foglalást, csak új opcionális mezőket és biztonságosabb feltöltési útvonalat ad hozzá.

alter table public.bookings
    add column if not exists inspiration_image_url text,
    add column if not exists inspiration_image_path text,
    add column if not exists inspiration_image_name text,
    add column if not exists inspiration_image_type text,
    add column if not exists inspiration_image_size integer,
    add column if not exists inspiration_images jsonb not null default '[]'::jsonb,
    add column if not exists nail_style text default '',
    add column if not exists nail_style_note text default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'site-media',
    'site-media',
    true,
    12582912,
    array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'image/heic', 'image/heif']
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

drop policy if exists "public can upload booking inspiration images" on storage.objects;
create policy "public can upload booking inspiration images"
    on storage.objects for insert
    to anon, authenticated
    with check (
        bucket_id = 'site-media'
        and name like 'booking-inspirations/%'
    );

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

drop function if exists public.attach_booking_inspiration(uuid, text, text, text, text, integer, text, text);
drop function if exists public.attach_booking_inspiration(uuid, jsonb, text, text);

create or replace function public.attach_booking_inspiration(
    p_booking_id uuid,
    p_images jsonb,
    p_nail_style text,
    p_nail_style_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_first jsonb;
begin
    if p_booking_id is null then
        raise exception 'Hiányzó foglalás azonosító.';
    end if;

    if jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array' then
        raise exception 'Érvénytelen kép lista.';
    end if;

    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) as kep
        where coalesce(kep->>'path', '') <> ''
            and kep->>'path' not like 'booking-inspirations/%'
    ) then
        raise exception 'Érvénytelen képútvonal.';
    end if;

    v_first := coalesce(p_images->0, '{}'::jsonb);

    update public.bookings
    set
        inspiration_images = coalesce(p_images, '[]'::jsonb),
        inspiration_image_url = nullif(trim(coalesce(v_first->>'url', '')), ''),
        inspiration_image_path = nullif(trim(coalesce(v_first->>'path', '')), ''),
        inspiration_image_name = left(nullif(trim(coalesce(v_first->>'name', '')), ''), 240),
        inspiration_image_type = left(nullif(trim(coalesce(v_first->>'type', '')), ''), 120),
        inspiration_image_size = nullif(coalesce(v_first->>'size', ''), '')::integer,
        nail_style = left(trim(coalesce(p_nail_style, '')), 120),
        nail_style_note = left(trim(coalesce(p_nail_style_note, '')), 1200)
    where id = p_booking_id
        and created_at > now() - interval '2 hours';

    if not found then
        raise exception 'A foglaláshoz már nem lehet inspirációs képet csatolni.';
    end if;
end;
$$;

create or replace function public.clear_booking_inspiration(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.bookings
    set
        inspiration_images = '[]'::jsonb,
        inspiration_image_url = null,
        inspiration_image_path = null,
        inspiration_image_name = null,
        inspiration_image_type = null,
        inspiration_image_size = null
    where id = p_booking_id;
end;
$$;

grant execute on function public.attach_booking_inspiration(uuid, jsonb, text, text) to anon, authenticated;
grant execute on function public.clear_booking_inspiration(uuid) to authenticated;