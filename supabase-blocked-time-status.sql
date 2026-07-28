-- Lumi Nails: Foglalt / Kész / Vendég mondta le státuszok
-- Supabase Dashboard > SQL Editor felületén egyszer futtasd.
-- Biztonságosan újrafuttatható, meglévő időpontot nem töröl.

alter table public.blocked_times
    add column if not exists status text not null default 'blocked';

update public.blocked_times
set status = 'blocked'
where status is null or status not in ('blocked', 'done', 'cancelled_by_customer');

alter table public.blocked_times
    alter column status set default 'blocked',
    alter column status set not null;

do $$
begin
    alter table public.blocked_times
        drop constraint if exists blocked_times_status_check;

    alter table public.blocked_times
        add constraint blocked_times_status_check
        check (status in ('blocked', 'done', 'cancelled_by_customer'));
end
$$;
do $$
begin
    alter table public.bookings
        drop constraint if exists bookings_no_overlap;

    alter table public.bookings
        add constraint bookings_no_overlap
        exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
        where (status in ('pending', 'confirmed', 'done'));
end
$$;
do $$
begin
    alter table public.bookings
        drop constraint if exists bookings_status_check;

    alter table public.bookings
        add constraint bookings_status_check
        check (status in ('pending', 'confirmed', 'done', 'cancelled', 'cancelled_by_customer'));
end
$$;
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
            where b.status in ('pending', 'confirmed', 'done')
                and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(slots.starts_at, slots.ends_at, '[)')
        )
        and not exists (
            select 1
            from public.blocked_times bt
            where coalesce(bt.status, 'blocked') <> 'cancelled_by_customer'
                and tstzrange(bt.starts_at, bt.ends_at, '[)') && tstzrange(slots.starts_at, slots.ends_at, '[)')
        )
    order by slots.starts_at;
$$;

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
                and tstzrange(b.starts_at, b.ends_at, '[)')
                    && tstzrange(slots.starts_at, slots.ends_at, '[)')
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