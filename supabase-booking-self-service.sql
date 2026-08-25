-- Lumi Nails vendegoldali foglalas-ellenorzes es lemondas.
-- Futtasd a Supabase SQL Editorban a tobbi foglalasi frissites utan.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function public.lumi_new_booking_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
    v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    v_bytes bytea;
    v_reference text;
begin
    loop
        v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
        v_reference := 'LUMI-'
            || substr(v_alphabet, (get_byte(v_bytes, 0) % 32) + 1, 1)
            || substr(v_alphabet, (get_byte(v_bytes, 1) % 32) + 1, 1)
            || substr(v_alphabet, (get_byte(v_bytes, 2) % 32) + 1, 1)
            || substr(v_alphabet, (get_byte(v_bytes, 3) % 32) + 1, 1);

        exit when not exists (
            select 1
            from public.bookings b
            where b.public_reference = v_reference
        );
    end loop;

    return v_reference;
end;
$$;

alter table public.bookings add column if not exists public_reference text;
alter table public.bookings add column if not exists legacy_public_reference text;
alter table public.bookings alter column public_reference set default public.lumi_new_booking_reference();

update public.bookings
set public_reference = public.lumi_new_booking_reference()
where public_reference is null or trim(public_reference) = '';

alter table public.bookings alter column public_reference set not null;

create unique index if not exists bookings_public_reference_key
    on public.bookings (public_reference);

-- A korabbi, hosszu kodokat csendben rovidre csereli az admin es az uj
-- visszaigazolasok szamara. A regi kod aliaszkent megmarad, igy a mar
-- kikuldott emailekben szereplo azonosito tovabbra is hasznalhato.
do $$
declare
    v_booking record;
begin
    for v_booking in
        select b.id, b.public_reference, b.legacy_public_reference
        from public.bookings b
        where b.public_reference ~* '^LUMI(?:-[A-Z0-9]{4}){5}$'
        order by b.id
        for update
    loop
        update public.bookings
        set legacy_public_reference = coalesce(
                nullif(trim(v_booking.legacy_public_reference), ''),
                v_booking.public_reference
            ),
            public_reference = public.lumi_new_booking_reference()
        where id = v_booking.id;
    end loop;
end;
$$;

create unique index if not exists bookings_legacy_public_reference_key
    on public.bookings (legacy_public_reference)
    where legacy_public_reference is not null;

create or replace function public.get_booking_reference_after_creation(p_booking_id uuid, p_customer_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select b.public_reference
    from public.bookings b
    where b.id = p_booking_id
      and lower(trim(b.customer_email)) = lower(trim(coalesce(p_customer_email, '')))
    limit 1;
$$;

drop function if exists public.get_booking_status(text);

create or replace function public.get_booking_status(p_reference text)
returns table (
    booking_reference text,
    service_name text,
    service_price_amount integer,
    final_price_amount integer,
    service_price_unit text,
    service_price_text text,
    nail_style text,
    starts_at timestamptz,
    ends_at timestamptz,
    status text,
    status_label text,
    coupon_label text,
    can_cancel boolean,
    cancellation_note_required boolean
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        b.public_reference,
        coalesce(s.name, s.description, 'Szolgaltatas')::text,
        b.service_price_amount,
        b.final_price_amount,
        coalesce(nullif(trim(b.service_price_unit), ''), 'Ft')::text,
        nullif(trim(coalesce(s.price_text, '')), '')::text,
        nullif(trim(coalesce(b.nail_style, '')), '')::text,
        b.starts_at,
        b.ends_at,
        b.status,
        case b.status
            when 'pending' then 'Fuggoben'
            when 'confirmed' then 'Visszaigazolva'
            when 'done' then 'Teljesitve'
            when 'cancelled' then 'Lemondva'
            when 'cancelled_by_customer' then 'Altalad lemondva'
            else 'Ismeretlen'
        end::text,
        nullif(concat_ws(' - ', nullif(trim(coalesce(b.coupon_code, '')), ''), nullif(trim(coalesce(b.coupon_title, '')), '')), '')::text,
        (b.status in ('pending', 'confirmed') and b.starts_at > now()),
        (b.status in ('pending', 'confirmed') and b.starts_at > now() and b.starts_at <= now() + interval '24 hours')
    from public.bookings b
    left join public.services s on s.id = b.service_id
    where (
        upper(replace(b.public_reference, '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
        or upper(replace(coalesce(b.legacy_public_reference, ''), '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
    )
    limit 1;
$$;

create or replace function private.lumi_cancel_booking(
    p_booking_id uuid,
    p_note text,
    p_channel text
)
returns table (success boolean, result text, message text)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_booking public.bookings%rowtype;
    v_note text := left(trim(coalesce(p_note, '')), 500);
    v_channel text := case when p_channel = 'customer_account' then 'customer_account' else 'self_service' end;
begin
    select bookings.*
    into v_booking
    from public.bookings as bookings
    where bookings.id = p_booking_id
    for update;

    if not found then
        return query select false, 'not_found'::text, 'Nem található ez a foglalás.'::text;
        return;
    end if;

    if v_booking.status = 'cancelled_by_customer' then
        return query select true, 'already_cancelled'::text, 'Az időpontot már lemondtad.'::text;
        return;
    end if;

    if v_booking.status not in ('pending', 'confirmed') or v_booking.starts_at <= now() then
        return query select false, 'status_locked'::text, 'Ez a foglalás már nem mondható le online.'::text;
        return;
    end if;

    if v_booking.starts_at <= now() + interval '24 hours' and v_note = '' then
        return query select false, 'note_required'::text, 'A 24 órán belüli lemondáshoz rövid indok szükséges.'::text;
        return;
    end if;

    update public.bookings
    set status = 'cancelled_by_customer'
    where id = v_booking.id;

    insert into public.booking_events (booking_id, event_type, channel, status, title, message, metadata)
    values (
        v_booking.id,
        'customer_cancelled',
        v_channel,
        'info',
        'A vendég online lemondta',
        case
            when v_note <> '' then 'Vendég megjegyzése: ' || v_note
            else 'A foglalást a vendég online mondta le.'
        end,
        jsonb_build_object(
            'from_status', v_booking.status,
            'to_status', 'cancelled_by_customer',
            'cancellation_note', nullif(v_note, ''),
            'source', v_channel
        )
    );

    insert into public.booking_email_jobs (booking_id, kind, dedupe_key, payload)
    values (
        v_booking.id,
        'admin_update',
        'customer-cancellation/' || v_booking.id::text,
        jsonb_build_object(
            'cancellation_note', nullif(v_note, ''),
            'customer_cancellation', true,
            'source', v_channel
        )
    )
    on conflict (dedupe_key) do nothing;

    return query select true, 'cancelled'::text, 'Az időpontot sikeresen lemondtad.'::text;
end;
$$;

drop function if exists public.cancel_booking_by_reference(text);
drop function if exists public.cancel_booking_by_reference(text, text);

create or replace function public.cancel_booking_by_reference(p_reference text, p_note text default '')
returns table (success boolean, result text, message text)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_booking_id uuid;
begin
    select bookings.id
    into v_booking_id
    from public.bookings as bookings
    where (
        upper(replace(bookings.public_reference, '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
        or upper(replace(coalesce(bookings.legacy_public_reference, ''), '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
    );

    if not found then
        return query select false, 'not_found'::text, 'Nem található foglalás ezzel az azonosítóval.'::text;
        return;
    end if;

    return query
    select cancellation.success, cancellation.result, cancellation.message
    from private.lumi_cancel_booking(v_booking_id, p_note, 'self_service') as cancellation;
end;
$$;

drop function if exists public.cancel_my_booking(uuid, text);

create or replace function public.cancel_my_booking(p_booking_id uuid, p_note text default '')
returns table (success boolean, result text, message text)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_booking_id uuid;
begin
    if not public.is_verified_customer() then
        raise exception using errcode = '42501', message = 'Hitelesített vendégfiók szükséges.';
    end if;

    select bookings.id
    into v_booking_id
    from public.bookings as bookings
    where bookings.id = p_booking_id
      and bookings.customer_user_id = auth.uid();

    if not found then
        return query select false, 'not_found'::text, 'Nem található ez a foglalás.'::text;
        return;
    end if;

    return query
    select cancellation.success, cancellation.result, cancellation.message
    from private.lumi_cancel_booking(v_booking_id, p_note, 'customer_account') as cancellation;
end;
$$;

revoke all on function private.lumi_cancel_booking(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_booking_reference_after_creation(uuid, text) from public;
revoke all on function public.get_booking_status(text) from public;
revoke all on function public.cancel_booking_by_reference(text, text) from public;
revoke all on function public.cancel_my_booking(uuid, text) from public, anon;

grant execute on function public.get_booking_reference_after_creation(uuid, text) to anon, authenticated, service_role;
grant execute on function public.get_booking_status(text) to anon, authenticated, service_role;
grant execute on function public.cancel_booking_by_reference(text, text) to anon, authenticated, service_role;
grant execute on function public.cancel_my_booking(uuid, text) to authenticated, service_role;
