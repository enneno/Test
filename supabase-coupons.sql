-- Lumi Nails kuponok es szamolhato arak
-- Supabase Dashboard > SQL Editor feluleten futtasd.
-- Biztonsagosan ujrafuttathato: nem torli a meglevo adatokat.

create extension if not exists pgcrypto;

alter table public.services
    add column if not exists price_amount integer,
    add column if not exists price_unit text not null default 'Ft',
    add column if not exists price_suffix text not null default '';

-- Az ar szamolhato resze csak akkor kerul a price_amount mezobe,
-- ha egyertelmu egy darab osszeg. Pl. a "500-800 Ft" tartomany nem szamolhato,
-- ezert price_amount = null marad, es csak megjelenitesi szovegkent hasznaljuk.
update public.services
set
    price_amount = case
        when coalesce(price_text, '') ~ '\d+\s*[-–]\s*\d+' then null
        else nullif(regexp_replace(coalesce(price_text, ''), '\D', '', 'g'), '')::integer
    end,
    price_unit = case
        when lower(coalesce(price_text, '')) like '%/ db%' then 'Ft / db'
        when lower(coalesce(price_text, '')) like '%/ ujj%' then 'Ft / ujj'
        when lower(coalesce(price_text, '')) like '%-tól%' or lower(coalesce(price_text, '')) like '%-tol%' then 'Ft-tól'
        when lower(coalesce(price_text, '')) like '%db%' then 'db'
        else 'Ft'
    end,
    price_suffix = ''
where price_amount is null
    and nullif(regexp_replace(coalesce(price_text, ''), '\D', '', 'g'), '') is not null;

-- Ha a korabbi verzio mar tartomanyos arbol keszitett volna szamot, javitjuk.
update public.services
set price_amount = null
where coalesce(price_text, '') ~ '\d+\s*[-–]\s*\d+';

-- A regi kulon utotag mezot osszevonjuk az egyseggel, de az oszlopot kompatibilitas miatt meghagyjuk.
update public.services
set
    price_unit = trim(coalesce(price_unit, 'Ft') || case
        when coalesce(price_suffix, '') = '' then ''
        when left(price_suffix, 1) = '-' then price_suffix
        else ' ' || price_suffix
    end),
    price_suffix = ''
where coalesce(price_suffix, '') <> '';

create table if not exists public.coupons (
    id uuid primary key default gen_random_uuid(),
    code text not null unique,
    title text not null default '',
    description text not null default '',
    discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed', 'text')),
    discount_value integer not null default 0 check (discount_value >= 0),
    discount_text text not null default '',
    service_id uuid references public.services(id) on delete set null,
    service_category text,
    customer_scope text not null default 'all' check (customer_scope in ('all', 'new_customer')),
    valid_from date,
    valid_until date,
    active boolean not null default true,
    show_on_home boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.coupons
    add column if not exists service_category text,
    add column if not exists customer_scope text not null default 'all';

alter table public.coupons
    alter column customer_scope set default 'all';

update public.coupons
set customer_scope = 'all'
where customer_scope is null
    or customer_scope not in ('all', 'new_customer');

alter table public.coupons
    alter column customer_scope set not null;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'coupons_customer_scope_check'
            and conrelid = 'public.coupons'::regclass
    ) then
        alter table public.coupons
            add constraint coupons_customer_scope_check
            check (customer_scope in ('all', 'new_customer'));
    end if;
end $$;

alter table public.coupons enable row level security;

drop policy if exists "public can read active coupons" on public.coupons;
create policy "public can read active coupons"
    on public.coupons for select
    using (
        active = true
        and (valid_from is null or valid_from <= current_date)
        and (valid_until is null or valid_until >= current_date)
    );

drop policy if exists "admin can manage coupons" on public.coupons;
create policy "admin can manage coupons"
    on public.coupons for all
    using (auth.role() = 'authenticated')
    with check (auth.role() = 'authenticated');

grant select on public.coupons to anon, authenticated;
grant insert, update, delete on public.coupons to authenticated;

alter table public.bookings
    add column if not exists service_price_amount integer,
    add column if not exists service_price_unit text,
    add column if not exists service_price_suffix text,
    add column if not exists coupon_id uuid references public.coupons(id) on delete set null,
    add column if not exists coupon_code text,
    add column if not exists coupon_title text,
    add column if not exists coupon_discount_type text,
    add column if not exists coupon_discount_value integer,
    add column if not exists coupon_discount_amount integer,
    add column if not exists final_price_amount integer;

create or replace function public.lumi_coupon_discount_amount(
    p_price_amount integer,
    p_discount_type text,
    p_discount_value integer
)
returns integer
language sql
immutable
as $$
    select case
        when coalesce(p_price_amount, 0) <= 0 then 0
        when p_discount_type = 'percent' then least(p_price_amount, greatest(0, round(p_price_amount * coalesce(p_discount_value, 0)::numeric / 100)::integer))
        when p_discount_type = 'fixed' then least(p_price_amount, greatest(0, coalesce(p_discount_value, 0)))
        else 0
    end;
$$;


create or replace function public.lumi_service_coupon_category(p_service_name text)
returns text
language sql
immutable
as $$
    select case
        when lower(coalesce(p_service_name, '')) like '%épít%' or lower(coalesce(p_service_name, '')) like '%epit%' then 'Építés'
        when lower(coalesce(p_service_name, '')) like '%tölt%' or lower(coalesce(p_service_name, '')) like '%tolt%' then 'Töltés'
        when lower(coalesce(p_service_name, '')) like '%gél lakk%' or lower(coalesce(p_service_name, '')) like '%géllakk%' or lower(coalesce(p_service_name, '')) like '%gel lakk%' then 'Gél lakk'
        when lower(coalesce(p_service_name, '')) like '%manik%' then 'Manikűr'
        when lower(coalesce(p_service_name, '')) like '%dísz%' or lower(coalesce(p_service_name, '')) like '%disz%' or lower(coalesce(p_service_name, '')) like '%nail art%' or lower(coalesce(p_service_name, '')) like '%kő%' or lower(coalesce(p_service_name, '')) like '%ko%' then 'Díszítés'
        when lower(coalesce(p_service_name, '')) like '%leszed%' then 'Leszedés'
        else null
    end;
$$;


create or replace function public.lumi_customer_has_previous_booking(
    p_customer_email text
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.bookings b
        where nullif(trim(coalesce(p_customer_email, '')), '') is not null
            and lower(trim(b.customer_email)) = lower(trim(p_customer_email))
            and coalesce(b.status, '') <> 'cancelled'
    );
$$;

grant execute on function public.lumi_customer_has_previous_booking(text) to anon, authenticated;

drop function if exists public.create_booking(uuid, text, text, text, text, timestamptz);

create or replace function public.create_booking(
    p_service_id uuid,
    p_customer_name text,
    p_customer_phone text,
    p_customer_email text,
    p_note text,
    p_starts_at timestamptz,
    p_coupon_id uuid default null,
    p_coupon_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_duration integer;
    v_price_amount integer;
    v_price_unit text;
    v_price_suffix text;
    v_service_name text;
    v_service_category text;
    v_ends_at timestamptz;
    v_booking_id uuid;
    v_coupon public.coupons%rowtype;
    v_discount_amount integer := 0;
    v_final_price integer;
begin
    select duration_minutes, price_amount, price_unit, price_suffix, name
    into v_duration, v_price_amount, v_price_unit, v_price_suffix, v_service_name
    from public.services
    where id = p_service_id
        and active = true
        and booking_enabled = true;

    if v_duration is null then
        raise exception 'Ez a szolgaltatas jelenleg nem foglalhato.';
    end if;

    v_service_category := public.lumi_service_coupon_category(v_service_name);

    if v_duration = 0 then
        select aw.slot_step_minutes
        into v_duration
        from public.availability_windows aw
        where aw.active = true
            and aw.work_date = (p_starts_at at time zone 'Europe/Budapest')::date
            and p_starts_at >= (((p_starts_at at time zone 'Europe/Budapest')::date::text || ' ' || aw.start_time::text)::timestamp at time zone 'Europe/Budapest')
            and p_starts_at < (((p_starts_at at time zone 'Europe/Budapest')::date::text || ' ' || aw.end_time::text)::timestamp at time zone 'Europe/Budapest')
        order by aw.start_time
        limit 1;
    end if;

    v_ends_at := p_starts_at + make_interval(mins => v_duration);

    if not exists (
        select 1
        from public.get_available_slots(p_service_id, (p_starts_at at time zone 'Europe/Budapest')::date) s
        where s.starts_at = p_starts_at
    ) then
        raise exception 'Ez az idopont mar nem szabad. Kerlek valassz masikat.';
    end if;

    if p_coupon_id is not null or nullif(trim(coalesce(p_coupon_code, '')), '') is not null then
        select *
        into v_coupon
        from public.coupons c
        where c.active = true
            and (p_coupon_id is null or c.id = p_coupon_id)
            and (
                nullif(trim(coalesce(p_coupon_code, '')), '') is null
                or upper(trim(c.code)) = upper(trim(p_coupon_code))
            )
            and (c.valid_from is null or c.valid_from <= current_date)
            and (c.valid_until is null or c.valid_until >= current_date)
            and (c.service_id is null or c.service_id = p_service_id)
            and (
                nullif(trim(coalesce(c.service_category, '')), '') is null
                or lower(trim(c.service_category)) = lower(trim(coalesce(v_service_category, '')))
            )
            and (
                coalesce(c.customer_scope, 'all') <> 'new_customer'
                or not public.lumi_customer_has_previous_booking(p_customer_email)
            )
        order by c.sort_order asc, c.created_at asc
        limit 1;

        if v_coupon.id is null then
            raise exception 'Ez a kupon nem ervenyes ehhez a foglalashoz, vagy ezzel az email cimmel mar volt foglalas.';
        end if;

        v_discount_amount := public.lumi_coupon_discount_amount(v_price_amount, v_coupon.discount_type, v_coupon.discount_value);
    end if;

    v_final_price := case
        when coalesce(v_price_amount, 0) > 0 then greatest(0, v_price_amount - coalesce(v_discount_amount, 0))
        else null
    end;

    insert into public.bookings (
        service_id,
        customer_name,
        customer_phone,
        customer_email,
        note,
        starts_at,
        ends_at,
        service_price_amount,
        service_price_unit,
        service_price_suffix,
        coupon_id,
        coupon_code,
        coupon_title,
        coupon_discount_type,
        coupon_discount_value,
        coupon_discount_amount,
        final_price_amount
    )
    values (
        p_service_id,
        trim(p_customer_name),
        trim(p_customer_phone),
        lower(trim(p_customer_email)),
        coalesce(trim(p_note), ''),
        p_starts_at,
        v_ends_at,
        v_price_amount,
        v_price_unit,
        v_price_suffix,
        v_coupon.id,
        nullif(v_coupon.code, ''),
        nullif(v_coupon.title, ''),
        nullif(v_coupon.discount_type, ''),
        v_coupon.discount_value,
        nullif(v_discount_amount, 0),
        v_final_price
    )
    returning id into v_booking_id;

    insert into public.booking_events (
        booking_id,
        event_type,
        channel,
        status,
        title,
        message,
        metadata
    )
    values (
        v_booking_id,
        'booking_created',
        'booking',
        'success',
        'Foglalas rogzitve',
        'A vendeg foglalasa bekerult az adatbazisba.',
        jsonb_build_object(
            'service_id', p_service_id,
            'starts_at', p_starts_at,
            'ends_at', v_ends_at,
            'customer_email', lower(trim(p_customer_email)),
            'coupon_code', v_coupon.code,
            'final_price_amount', v_final_price
        )
    );

    return v_booking_id;
exception
    when exclusion_violation then
        raise exception 'Ez az idopont kozben betelt. Kerlek valassz masikat.';
end;
$$;

grant execute on function public.create_booking(uuid, text, text, text, text, timestamptz, uuid, text) to anon, authenticated;

-- Opcionális kezdő kupon teszteléshez. Ha nem kell, hagyd inaktívan.
insert into public.coupons (
    code,
    title,
    description,
    discount_type,
    discount_value,
    discount_text,
    customer_scope,
    active,
    show_on_home,
    sort_order
)
values (
    'LUMI10',
    '10% kedvezmeny uj vendegeknek',
    'Ird be foglalasnal a LUMI10 kuponkodot, es az osszefoglalo kiszamolja a kedvezmenyt.',
    'percent',
    10,
    '10% kedvezmeny',
    'new_customer',
    false,
    true,
    10
)
on conflict (code) do nothing;
