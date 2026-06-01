-- Lumi Nails dátum szerinti foglalható idősávok
-- Ezt futtasd a Supabase Dashboard > SQL Editorben, ha a régi heti idősávos verzió már fent van.

create table if not exists public.availability_windows (
    id uuid primary key default gen_random_uuid(),
    work_date date not null,
    start_time time not null,
    end_time time not null,
    slot_step_minutes integer not null default 30 check (slot_step_minutes > 0),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (work_date, start_time, end_time),
    check (end_time > start_time)
);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'availability_windows_work_date_start_time_end_time_key'
    ) then
        alter table public.availability_windows
            add constraint availability_windows_work_date_start_time_end_time_key unique (work_date, start_time, end_time);
    end if;
end $$;

alter table public.availability_windows enable row level security;

drop policy if exists "admin can manage availability windows" on public.availability_windows;
create policy "admin can manage availability windows"
    on public.availability_windows for all
    to authenticated
    using (true)
    with check (true);

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
            and duration_minutes > 0
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
            gs + make_interval(mins => svc.duration_minutes) as ends_at
        from svc
        cross join windows
        cross join lateral generate_series(
            ((p_date::text || ' ' || windows.start_time::text)::timestamp at time zone 'Europe/Budapest'),
            ((p_date::text || ' ' || windows.end_time::text)::timestamp at time zone 'Europe/Budapest') - make_interval(mins => svc.duration_minutes),
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

create or replace function public.get_available_dates(
    p_service_id uuid,
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
        from public.get_available_slots(p_service_id, days.work_date)
        limit 1
    )
    order by days.work_date;
$$;

grant select, insert, update, delete on public.availability_windows to authenticated;
grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.get_available_dates(uuid, date, integer) to anon, authenticated;
