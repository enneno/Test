-- Lumi Nails public booking management hardening
--
-- Security properties:
-- - a public booking can only be viewed/cancelled with LUMI reference + matching email OR phone;
-- - Hungarian phone formatting is ignored during comparison;
-- - browser clients cannot call the privileged lookup/cancellation RPCs directly;
-- - rate limiting is enforced server-side through the manage-booking Edge Function;
-- - only a SHA-256 client/IP hash is stored for the fixed 1-minute rate-limit window;
-- - legacy reference-only public RPC execution is revoked.

begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.booking_management_rate_limits (
    client_hash text primary key,
    window_started_at timestamptz not null default now(),
    request_count integer not null default 0 check (request_count >= 0),
    updated_at timestamptz not null default now()
);

revoke all on table private.booking_management_rate_limits from public, anon, authenticated;

create or replace function private.lumi_booking_phone_key(p_value text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
    v_digits text := regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g');
begin
    if char_length(v_digits) = 13 and left(v_digits, 4) = '0036' then
        v_digits := substr(v_digits, 5);
    elsif char_length(v_digits) = 11 and left(v_digits, 2) = '36' then
        v_digits := substr(v_digits, 3);
    elsif char_length(v_digits) = 11 and left(v_digits, 2) = '06' then
        v_digits := substr(v_digits, 3);
    end if;

    if char_length(v_digits) = 9 then
        return v_digits;
    end if;

    return '';
end;
$$;

revoke all on function private.lumi_booking_phone_key(text) from public, anon, authenticated;

create or replace function private.lumi_booking_contact_matches(
    p_booking_email text,
    p_booking_phone text,
    p_contact text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
    select case
        when position('@' in trim(coalesce(p_contact, ''))) > 1 then
            lower(trim(coalesce(p_booking_email, ''))) = lower(trim(coalesce(p_contact, '')))
        else
            private.lumi_booking_phone_key(p_booking_phone) <> ''
            and private.lumi_booking_phone_key(p_booking_phone) = private.lumi_booking_phone_key(p_contact)
    end;
$$;

revoke all on function private.lumi_booking_contact_matches(text, text, text) from public, anon, authenticated;

create or replace function public.consume_booking_management_rate_limit(p_client_hash text)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_hash text := lower(trim(coalesce(p_client_hash, '')));
    v_now timestamptz := clock_timestamp();
    v_window_started_at timestamptz;
    v_request_count integer;
begin
    if v_hash !~ '^[0-9a-f]{64}$' then
        raise exception using errcode = '22023', message = 'Érvénytelen kliensazonosító.';
    end if;

    insert into private.booking_management_rate_limits as limits (
        client_hash,
        window_started_at,
        request_count,
        updated_at
    ) values (
        v_hash,
        v_now,
        1,
        v_now
    )
    on conflict (client_hash) do update
    set window_started_at = case
            when limits.window_started_at <= v_now - interval '1 minute' then v_now
            else limits.window_started_at
        end,
        request_count = case
            when limits.window_started_at <= v_now - interval '1 minute' then 1
            else limits.request_count + 1
        end,
        updated_at = v_now
    returning window_started_at, request_count
    into v_window_started_at, v_request_count;

    allowed := v_request_count <= 5;
    retry_after_seconds := case
        when allowed then 0
        else greatest(
            1,
            ceil(extract(epoch from (v_window_started_at + interval '1 minute' - v_now)))::integer
        )
    end;

    return next;
end;
$$;

revoke all on function public.consume_booking_management_rate_limit(text) from public, anon, authenticated;
grant execute on function public.consume_booking_management_rate_limit(text) to service_role;

create or replace function public.get_booking_status_verified(
    p_reference text,
    p_contact text
)
returns table(
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
      and private.lumi_booking_contact_matches(b.customer_email, b.customer_phone, p_contact)
    limit 1;
$$;

revoke all on function public.get_booking_status_verified(text, text) from public, anon, authenticated;
grant execute on function public.get_booking_status_verified(text, text) to service_role;

create or replace function public.cancel_booking_by_verified_contact(
    p_reference text,
    p_contact text,
    p_note text default ''
)
returns table(success boolean, result text, message text)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_booking_id uuid;
begin
    select b.id
    into v_booking_id
    from public.bookings b
    where (
        upper(replace(b.public_reference, '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
        or upper(replace(coalesce(b.legacy_public_reference, ''), '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
    )
      and private.lumi_booking_contact_matches(b.customer_email, b.customer_phone, p_contact)
    limit 1;

    if not found then
        return query select false, 'not_found'::text, 'A megadott adatokkal nem található foglalás.'::text;
        return;
    end if;

    return query
    select cancellation.success, cancellation.result, cancellation.message
    from private.lumi_cancel_booking(v_booking_id, p_note, 'self_service') as cancellation;
end;
$$;

revoke all on function public.cancel_booking_by_verified_contact(text, text, text) from public, anon, authenticated;
grant execute on function public.cancel_booking_by_verified_contact(text, text, text) to service_role;

revoke execute on function public.get_booking_status(text) from public, anon, authenticated;
revoke execute on function public.cancel_booking_by_reference(text, text) from public, anon, authenticated;

comment on function public.consume_booking_management_rate_limit(text) is
'Service-role-only fixed-window rate limiter for public booking management. Stores only a SHA-256 client hash.';
comment on function public.get_booking_status_verified(text, text) is
'Service-role-only booking status lookup requiring LUMI reference plus matching email address or normalized phone number.';
comment on function public.cancel_booking_by_verified_contact(text, text, text) is
'Service-role-only self-service cancellation requiring LUMI reference plus matching email address or normalized phone number.';
comment on function public.get_booking_status(text) is
'Legacy reference-only lookup retained for database history; direct anon/authenticated execution is disabled. Use manage-booking Edge Function.';
comment on function public.cancel_booking_by_reference(text, text) is
'Legacy reference-only cancellation retained for database history; direct anon/authenticated execution is disabled. Use manage-booking Edge Function.';

commit;
