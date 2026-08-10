-- Lumi Nails: kotelezo 30 perces szunet a foglalasok kozott.
-- Supabase Dashboard > SQL Editor feluleten futtasd a tobbi foglalasi
-- frissites utan. Biztonsagosan ujrafuttathato, meglevo foglalast nem modosit.

create or replace function public.lumi_enforce_booking_buffer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.status in ('pending', 'confirmed', 'done') then
        -- A kis forgalmu foglalasi rendszer irasait roviden sorba allitja,
        -- hogy ket egyideju keres se tudja megkerulni a szunetet.
        perform pg_catalog.pg_advisory_xact_lock(1280266226::bigint);

        if exists (
            select 1
            from public.bookings b
            where b.id is distinct from new.id
                and b.status in ('pending', 'confirmed', 'done')
                and b.starts_at < new.ends_at + interval '30 minutes'
                and b.ends_at + interval '30 minutes' > new.starts_at
        ) then
            raise exception 'A foglalasok kozott legalabb 30 perc szunet szukseges.'
                using errcode = '23P01';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists bookings_enforce_buffer on public.bookings;
create trigger bookings_enforce_buffer
before insert or update of starts_at, ends_at, status on public.bookings
for each row execute function public.lumi_enforce_booking_buffer();

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

grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.get_available_slots_for_style(uuid, date, text) to anon, authenticated;
