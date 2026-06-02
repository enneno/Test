-- Run this in Supabase SQL Editor on an existing Lumi Nails database.
-- It allows services with 0 minute duration to generate slots.
-- A 0 minute service blocks one configured slot step, for example 30 minutes.

create or replace function public.get_available_slots(p_service_id uuid, p_date date)
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
            select case
                when svc.duration_minutes > 0 then svc.duration_minutes
                else windows.slot_step_minutes
            end as effective_minutes
        ) duration
        cross join lateral generate_series(
            ((p_date::text || ' ' || windows.start_time::text)::timestamp at time zone 'Europe/Budapest'),
            ((p_date::text || ' ' || windows.end_time::text)::timestamp at time zone 'Europe/Budapest') - make_interval(mins => duration.effective_minutes),
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
            where b.status in ('pending', 'confirmed')
                and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(slots.starts_at, slots.ends_at, '[)')
        )
        and not exists (
            select 1
            from public.blocked_times bt
            where tstzrange(bt.starts_at, bt.ends_at, '[)') && tstzrange(slots.starts_at, slots.ends_at, '[)')
        )
    order by slots.starts_at;
$$;

create or replace function public.create_booking(
    p_service_id uuid,
    p_customer_name text,
    p_customer_phone text,
    p_customer_email text,
    p_note text,
    p_starts_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_duration integer;
    v_ends_at timestamptz;
    v_booking_id uuid;
begin
    select duration_minutes
    into v_duration
    from public.services
    where id = p_service_id
        and active = true
        and booking_enabled = true;

    if v_duration is null then
        raise exception 'Ez a szolgaltatas jelenleg nem foglalhato.';
    end if;

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

    insert into public.bookings (
        service_id,
        customer_name,
        customer_phone,
        customer_email,
        note,
        starts_at,
        ends_at
    )
    values (
        p_service_id,
        trim(p_customer_name),
        trim(p_customer_phone),
        lower(trim(p_customer_email)),
        coalesce(trim(p_note), ''),
        p_starts_at,
        v_ends_at
    )
    returning id into v_booking_id;

    return v_booking_id;
exception
    when exclusion_violation then
        raise exception 'Ez az idopont kozben betelt. Kerlek valassz masikat.';
end;
$$;

grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.create_booking(uuid, text, text, text, text, timestamptz) to anon, authenticated;
