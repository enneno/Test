-- Lumi Nails: stílusfüggő foglalási idő
-- Supabase Dashboard > SQL Editor felületén futtasd.
-- Biztonságosan újrafuttatható, meglévő foglalást nem módosít.

create or replace function public.lumi_booking_style_extra_minutes(p_style text)
returns integer
language sql
immutable
as $$
    with normalized as (
        select translate(
            lower(coalesce(p_style, '')),
            'áéíóöőúüű',
            'aeiooouuu'
        ) as value
    )
    select case
        when value like '%francia%'
            or value like '%festes%'
            or value like '%diszites%'
        then 30
        else 0
    end
    from normalized;
$$;

create or replace function public.get_available_slots_for_style(
    p_service_id uuid,
    p_date date,
    p_nail_style text default ''
)
returns table(starts_at timestamptz, label text)
language sql
stable
security definer
set search_path = public
as $$
    with svc as (
        select id, duration_minutes
        from public.services
        where id = p_service_id
            and active = true
            and booking_enabled = true
    ),
    windows as (
        select *
        from public.availability_windows
        where active = true
            and work_date = p_date
    ),
    slots as (
        select
            gs as starts_at,
            gs + make_interval(mins => duration.effective_minutes) as ends_at
        from svc
        cross join windows
        cross join lateral (
            select
                (
                    case
                        when svc.duration_minutes > 0 then svc.duration_minutes
                        else windows.slot_step_minutes
                    end
                    + public.lumi_booking_style_extra_minutes(p_nail_style)
                ) as effective_minutes
        ) duration
        cross join lateral generate_series(
            ((p_date::text || ' ' || windows.start_time::text)::timestamp at time zone 'Europe/Budapest'),
            ((p_date::text || ' ' || windows.end_time::text)::timestamp at time zone 'Europe/Budapest')
                - make_interval(mins => duration.effective_minutes),
            make_interval(mins => windows.slot_step_minutes)
        ) as gs
    )
    select
        slots.starts_at,
        to_char(slots.starts_at at time zone 'Europe/Budapest', 'HH24:MI') as label
    from slots
    where slots.starts_at > now()
        and not exists (
            select 1
            from public.bookings b
            where b.status in ('pending', 'confirmed', 'done')
                and tstzrange(b.starts_at, b.ends_at + interval '30 minutes', '[)')
                    && tstzrange(slots.starts_at, slots.ends_at + interval '30 minutes', '[)')
        )
        and not exists (
            select 1
            from public.blocked_times bt
            where coalesce(bt.status, 'blocked') <> 'cancelled_by_customer'
                and tstzrange(bt.starts_at, bt.ends_at, '[)')
                && tstzrange(slots.starts_at, slots.ends_at, '[)')
        )
    order by slots.starts_at;
$$;

create or replace function public.get_available_dates_for_style(
    p_service_id uuid,
    p_nail_style text default '',
    p_start_date date default current_date,
    p_days integer default 90
)
returns table(work_date date, label text)
language sql
stable
security definer
set search_path = public
as $$
    with days as (
        select gs::date as work_date
        from generate_series(
            p_start_date,
            p_start_date + (least(greatest(coalesce(p_days, 90), 1), 180) - 1),
            interval '1 day'
        ) as gs
    )
    select
        days.work_date,
        to_char(days.work_date, 'YYYY. MM. DD.') as label
    from days
    where exists (
        select 1
        from public.get_available_slots_for_style(
            p_service_id,
            days.work_date,
            p_nail_style
        )
        limit 1
    )
    order by days.work_date;
$$;

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
    v_style_extra_minutes integer := 0;
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
            and p_starts_at >= (
                (
                    (p_starts_at at time zone 'Europe/Budapest')::date::text
                    || ' '
                    || aw.start_time::text
                )::timestamp at time zone 'Europe/Budapest'
            )
            and p_starts_at < (
                (
                    (p_starts_at at time zone 'Europe/Budapest')::date::text
                    || ' '
                    || aw.end_time::text
                )::timestamp at time zone 'Europe/Budapest'
            )
        order by aw.start_time
        limit 1;
    end if;

    v_style_extra_minutes := public.lumi_booking_style_extra_minutes(
        split_part(coalesce(p_note, ''), E'\n', 1)
    );
    v_duration := v_duration + v_style_extra_minutes;
    v_ends_at := p_starts_at + make_interval(mins => v_duration);

    if not exists (
        select 1
        from public.get_available_slots_for_style(
            p_service_id,
            (p_starts_at at time zone 'Europe/Budapest')::date,
            split_part(coalesce(p_note, ''), E'\n', 1)
        ) s
        where s.starts_at = p_starts_at
    ) then
        raise exception 'Ez az idopont mar nem szabad. Kerlek valassz masikat.';
    end if;

    if p_coupon_id is not null
        or nullif(trim(coalesce(p_coupon_code, '')), '') is not null
    then
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
                or lower(trim(c.service_category))
                    = lower(trim(coalesce(v_service_category, '')))
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

        v_discount_amount := public.lumi_coupon_discount_amount(
            v_price_amount,
            v_coupon.discount_type,
            v_coupon.discount_value
        );
    end if;

    v_final_price := case
        when coalesce(v_price_amount, 0) > 0
        then greatest(0, v_price_amount - coalesce(v_discount_amount, 0))
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
            'style_extra_minutes', v_style_extra_minutes,
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

grant execute on function public.lumi_booking_style_extra_minutes(text)
    to anon, authenticated;
grant execute on function public.get_available_slots_for_style(uuid, date, text)
    to anon, authenticated;
grant execute on function public.get_available_dates_for_style(uuid, text, date, integer)
    to anon, authenticated;
grant execute on function public.create_booking(
    uuid,
    text,
    text,
    text,
    text,
    timestamptz,
    uuid,
    text
) to anon, authenticated;
