-- Lumi Nails customer accounts
--
-- Security properties:
-- - a usable profile can only be created for a non-anonymous, email-confirmed Auth user;
-- - the browser never chooses the user id that owns a booking;
-- - customer booking history is exposed only through a curated SECURITY DEFINER RPC;
-- - existing bookings are linked only to the currently authenticated user's verified email;
-- - no password or authentication secret is stored in the public schema.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.customer_profiles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    full_name text not null,
    phone text not null,
    nail_shape text,
    nail_length text,
    preferred_nail_style text,
    nail_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint customer_profiles_full_name_length
        check (char_length(full_name) between 2 and 120),
    constraint customer_profiles_full_name_no_control_characters
        check (full_name !~ '[[:cntrl:]]'),
    constraint customer_profiles_phone_hungarian
        check (phone ~ '^\+36 [0-9]{9}$')
);

alter table public.customer_profiles
    add column if not exists nail_shape text,
    add column if not exists nail_length text,
    add column if not exists preferred_nail_style text,
    add column if not exists nail_notes text;

alter table public.customer_profiles
    drop constraint if exists customer_profiles_nail_shape_allowed,
    drop constraint if exists customer_profiles_nail_length_allowed,
    drop constraint if exists customer_profiles_nail_style_allowed,
    drop constraint if exists customer_profiles_nail_notes_length;

alter table public.customer_profiles
    add constraint customer_profiles_nail_shape_allowed
        check (nail_shape is null or nail_shape in ('Mandula', 'Kocka', 'Ovális', 'Balerina', 'Stiletto')),
    add constraint customer_profiles_nail_length_allowed
        check (nail_length is null or nail_length in ('Rövid', 'Közepes', 'Hosszú')),
    add constraint customer_profiles_nail_style_allowed
        check (
            preferred_nail_style is null
            or preferred_nail_style in ('Egyszerű / egyszínű köröm', 'Francia köröm', 'Festés / díszítés')
        ),
    add constraint customer_profiles_nail_notes_length
        check (nail_notes is null or char_length(nail_notes) <= 500);

alter table public.customer_profiles enable row level security;
alter table public.customer_profiles force row level security;

alter table public.bookings
    add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists bookings_customer_user_starts_at_idx
    on public.bookings (customer_user_id, starts_at desc)
    where customer_user_id is not null;

create index if not exists bookings_unlinked_customer_email_idx
    on public.bookings ((lower(trim(customer_email))))
    where customer_user_id is null;

insert into public.site_settings (key, value)
values ('customer_accounts', jsonb_build_object('enabled', false))
on conflict (key) do nothing;

create or replace function public.customer_accounts_ready()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $customer_accounts_ready$
    select coalesce((
        select lower(coalesce(settings.value ->> 'enabled', 'false')) = 'true'
        from public.site_settings as settings
        where settings.key = 'customer_accounts'
    ), false);
$customer_accounts_ready$;

revoke all on function public.customer_accounts_ready() from public;
grant execute on function public.customer_accounts_ready() to anon, authenticated, service_role;

create or replace function private.lumi_customer_name(p_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_value text := regexp_replace(trim(coalesce(p_value, '')), '[[:space:]]+', ' ', 'g');
begin
    if char_length(v_value) < 2 or char_length(v_value) > 120 or v_value ~ '[[:cntrl:]]' then
        raise exception using
            errcode = '22023',
            message = 'A teljes név 2 és 120 karakter közötti lehet.';
    end if;

    return v_value;
end;
$$;

create or replace function private.lumi_customer_phone(p_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_digits text := regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g');
begin
    if char_length(v_digits) = 11 and left(v_digits, 2) = '36' then
        v_digits := substr(v_digits, 3);
    end if;

    if char_length(v_digits) <> 9 then
        raise exception using
            errcode = '22023',
            message = 'Adj meg egy érvényes magyar telefonszámot.';
    end if;

    return '+36 ' || v_digits;
end;
$$;

create or replace function private.lumi_customer_preference(
    p_value text,
    p_allowed text[],
    p_label text
)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_value text := nullif(trim(coalesce(p_value, '')), '');
begin
    if v_value is null then
        return null;
    end if;

    if not (v_value = any(p_allowed)) then
        raise exception using
            errcode = '22023',
            message = 'Érvénytelen ' || p_label || '.';
    end if;

    return v_value;
end;
$$;

create or replace function private.lumi_customer_notes(p_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_value text := nullif(trim(coalesce(p_value, '')), '');
begin
    if v_value is null then
        return null;
    end if;

    if char_length(v_value) > 500 or v_value ~ E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]' then
        raise exception using
            errcode = '22023',
            message = 'Az egyéb kérés legfeljebb 500 karakter lehet.';
    end if;

    return v_value;
end;
$$;

create or replace function public.is_verified_customer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $verified_customer$
    select public.customer_accounts_ready()
       and exists (
        select 1
        from auth.users as users
        where users.id = auth.uid()
          and users.email_confirmed_at is not null
          and coalesce(users.is_anonymous, false) = false
          and users.deleted_at is null
          and (users.banned_until is null or users.banned_until <= now())
    );
$verified_customer$;

revoke all on function public.is_verified_customer() from public, anon;
grant execute on function public.is_verified_customer() to authenticated, service_role;

drop policy if exists "customer can read own profile" on public.customer_profiles;
drop policy if exists "admin can read customer profiles" on public.customer_profiles;
drop policy if exists "customer or admin can read customer profiles" on public.customer_profiles;
create policy "customer or admin can read customer profiles"
on public.customer_profiles
for select
to authenticated
using (
    (
        user_id = (select auth.uid())
        and (select public.is_verified_customer())
    )
    or (select public.is_lumi_admin())
);

revoke all on table public.customer_profiles from public, anon, authenticated;
grant select on table public.customer_profiles to authenticated, service_role;
grant all on table public.customer_profiles to service_role;

create or replace function public.ensure_customer_account(
    p_full_name text default null,
    p_phone text default null
)
returns public.customer_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_email text;
    v_metadata jsonb;
    v_full_name text;
    v_phone text;
    v_profile public.customer_profiles;
begin
    if not public.customer_accounts_ready() then
        raise exception using errcode = '42501', message = 'A vendégfiók még nincs engedélyezve.';
    end if;

    if v_user_id is null then
        raise exception using errcode = '42501', message = 'Bejelentkezés szükséges.';
    end if;

    select lower(trim(users.email)), coalesce(users.raw_user_meta_data, '{}'::jsonb)
    into v_email, v_metadata
    from auth.users as users
    where users.id = v_user_id
      and users.email_confirmed_at is not null
      and coalesce(users.is_anonymous, false) = false
      and users.deleted_at is null
      and (users.banned_until is null or users.banned_until <= now());

    if not found or v_email is null or v_email = '' then
        raise exception using errcode = '42501', message = 'A fiók e-mail-címe még nincs hitelesítve.';
    end if;

    select profiles.*
    into v_profile
    from public.customer_profiles as profiles
    where profiles.user_id = v_user_id;

    if found then
        update public.bookings
        set customer_user_id = v_user_id
        where customer_user_id is null
          and lower(trim(customer_email)) = v_email;

        return v_profile;
    end if;

    v_full_name := private.lumi_customer_name(
        coalesce(nullif(trim(p_full_name), ''), nullif(trim(v_metadata ->> 'full_name'), ''))
    );
    v_phone := private.lumi_customer_phone(
        coalesce(nullif(trim(p_phone), ''), nullif(trim(v_metadata ->> 'phone'), ''))
    );

    insert into public.customer_profiles (user_id, full_name, phone)
    values (v_user_id, v_full_name, v_phone)
    on conflict (user_id) do nothing;

    update public.bookings
    set customer_user_id = v_user_id
    where customer_user_id is null
      and lower(trim(customer_email)) = v_email;

    select profiles.*
    into strict v_profile
    from public.customer_profiles as profiles
    where profiles.user_id = v_user_id;

    return v_profile;
end;
$$;

revoke all on function public.ensure_customer_account(text, text) from public, anon;
grant execute on function public.ensure_customer_account(text, text) to authenticated, service_role;

create or replace function public.save_customer_profile(
    p_full_name text,
    p_phone text
)
returns public.customer_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_profile public.customer_profiles;
begin
    perform public.ensure_customer_account(p_full_name, p_phone);

    update public.customer_profiles
    set full_name = private.lumi_customer_name(p_full_name),
        phone = private.lumi_customer_phone(p_phone),
        updated_at = now()
    where user_id = auth.uid()
    returning * into strict v_profile;

    return v_profile;
end;
$$;

revoke all on function public.save_customer_profile(text, text) from public, anon;
grant execute on function public.save_customer_profile(text, text) to authenticated, service_role;

create or replace function public.save_customer_preferences(
    p_nail_shape text default null,
    p_nail_length text default null,
    p_preferred_nail_style text default null,
    p_nail_notes text default null
)
returns public.customer_profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_profile public.customer_profiles;
begin
    perform public.ensure_customer_account();

    update public.customer_profiles
    set nail_shape = private.lumi_customer_preference(
            p_nail_shape,
            array['Mandula', 'Kocka', 'Ovális', 'Balerina', 'Stiletto'],
            'körömforma'
        ),
        nail_length = private.lumi_customer_preference(
            p_nail_length,
            array['Rövid', 'Közepes', 'Hosszú'],
            'körömhossz'
        ),
        preferred_nail_style = private.lumi_customer_preference(
            p_preferred_nail_style,
            array['Egyszerű / egyszínű köröm', 'Francia köröm', 'Festés / díszítés'],
            'körömstílus'
        ),
        nail_notes = private.lumi_customer_notes(p_nail_notes),
        updated_at = now()
    where user_id = auth.uid()
    returning * into strict v_profile;

    return v_profile;
end;
$$;

revoke all on function public.save_customer_preferences(text, text, text, text) from public, anon;
grant execute on function public.save_customer_preferences(text, text, text, text) to authenticated, service_role;

drop function if exists public.get_my_booking_history(integer, integer);

create or replace function public.get_my_booking_history(
    p_limit integer default 50,
    p_offset integer default 0
)
returns table (
    booking_id uuid,
    public_reference text,
    service_id uuid,
    service_name text,
    starts_at timestamptz,
    ends_at timestamptz,
    status text,
    nail_style text,
    note text,
    final_price_amount integer,
    service_price_unit text,
    service_price_suffix text,
    total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
    if not public.is_verified_customer() then
        raise exception using errcode = '42501', message = 'Hitelesített vendégfiók szükséges.';
    end if;

    return query
    select
        bookings.id,
        bookings.public_reference,
        bookings.service_id,
        services.name,
        bookings.starts_at,
        bookings.ends_at,
        bookings.status,
        nullif(trim(bookings.nail_style), ''),
        nullif(trim(bookings.note), ''),
        bookings.final_price_amount,
        bookings.service_price_unit,
        bookings.service_price_suffix,
        count(*) over ()
    from public.bookings as bookings
    left join public.services as services on services.id = bookings.service_id
    where bookings.customer_user_id = auth.uid()
    order by bookings.starts_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.get_my_booking_history(integer, integer) from public, anon;
grant execute on function public.get_my_booking_history(integer, integer) to authenticated, service_role;

create or replace function public.create_booking_idempotent_for_user(
    p_request_key uuid,
    p_service_id uuid,
    p_customer_name text,
    p_customer_phone text,
    p_customer_email text,
    p_note text,
    p_starts_at timestamptz,
    p_customer_user_id uuid,
    p_coupon_id uuid default null,
    p_coupon_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_booking_id uuid;
    v_verified_email text;
    v_linked_user_id uuid;
begin
    if not public.customer_accounts_ready() then
        raise exception using errcode = '42501', message = 'A vendégfiók még nincs engedélyezve.';
    end if;

    if p_customer_user_id is null then
        raise exception using errcode = '22023', message = 'Hiányzó vendégfiók-azonosító.';
    end if;

    select lower(trim(users.email))
    into v_verified_email
    from auth.users as users
    where users.id = p_customer_user_id
      and users.email_confirmed_at is not null
      and coalesce(users.is_anonymous, false) = false
      and users.deleted_at is null
      and (users.banned_until is null or users.banned_until <= now());

    if not found or v_verified_email is distinct from lower(trim(p_customer_email)) then
        raise exception using errcode = '42501', message = 'A foglalási e-mail nem egyezik a hitelesített fiókkal.';
    end if;

    v_booking_id := public.create_booking_idempotent(
        p_request_key,
        p_service_id,
        p_customer_name,
        p_customer_phone,
        v_verified_email,
        p_note,
        p_starts_at,
        p_coupon_id,
        p_coupon_code
    );

    select bookings.customer_user_id
    into v_linked_user_id
    from public.bookings as bookings
    where bookings.id = v_booking_id
    for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'A létrehozott foglalás nem található.';
    end if;

    if v_linked_user_id is not null and v_linked_user_id <> p_customer_user_id then
        raise exception using errcode = '42501', message = 'A foglalás már másik fiókhoz tartozik.';
    end if;

    if v_linked_user_id is null then
        update public.bookings
        set customer_user_id = p_customer_user_id
        where id = v_booking_id;
    end if;

    return v_booking_id;
end;
$$;

revoke all on function public.create_booking_idempotent_for_user(
    uuid, uuid, text, text, text, text, timestamptz, uuid, uuid, text
) from public, anon, authenticated;
grant execute on function public.create_booking_idempotent_for_user(
    uuid, uuid, text, text, text, text, timestamptz, uuid, uuid, text
) to service_role;

comment on table public.customer_profiles is
'Verified customer profile data. Authentication secrets remain in Supabase Auth.';
comment on column public.bookings.customer_user_id is
'Server-assigned owner of a booking. Clients must never provide this value directly.';
comment on function public.save_customer_preferences(text, text, text, text) is
'Stores optional booking preferences only for the currently authenticated, verified customer.';
comment on function public.get_my_booking_history(integer, integer) is
'Curated booking history for the currently authenticated, email-verified customer.';
comment on function public.create_booking_idempotent_for_user(
    uuid, uuid, text, text, text, text, timestamptz, uuid, uuid, text
) is
'Service-role-only atomic booking creation and verified customer ownership binding.';

commit;
