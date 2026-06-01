-- Lumi Nails Supabase alap adatmodell
-- Futtasd a Supabase Dashboard > SQL Editor feluleten.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create table if not exists public.services (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text default '',
    price_text text default '',
    duration_minutes integer not null default 60 check (duration_minutes >= 0),
    booking_enabled boolean not null default true,
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists public.availability_rules (
    id uuid primary key default gen_random_uuid(),
    weekday integer not null check (weekday between 1 and 7),
    start_time time not null,
    end_time time not null,
    slot_step_minutes integer not null default 15 check (slot_step_minutes > 0),
    active boolean not null default true,
    created_at timestamptz not null default now(),
    unique (weekday, start_time, end_time),
    check (end_time > start_time)
);

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

create table if not exists public.blocked_times (
    id uuid primary key default gen_random_uuid(),
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    reason text default '',
    created_at timestamptz not null default now(),
    check (ends_at > starts_at)
);

create table if not exists public.bookings (
    id uuid primary key default gen_random_uuid(),
    service_id uuid not null references public.services(id),
    customer_name text not null,
    customer_phone text not null,
    customer_email text not null,
    note text default '',
    starts_at timestamptz not null,
    ends_at timestamptz not null,
    status text not null default 'pending' check (status in ('pending', 'confirmed', 'done', 'cancelled')),
    created_at timestamptz not null default now(),
    check (ends_at > starts_at)
);

create table if not exists public.site_settings (
    key text primary key,
    value jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'services_name_key'
    ) then
        alter table public.services
            add constraint services_name_key unique (name);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'availability_rules_weekday_start_time_end_time_key'
    ) then
        alter table public.availability_rules
            add constraint availability_rules_weekday_start_time_end_time_key unique (weekday, start_time, end_time);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'availability_windows_work_date_start_time_end_time_key'
    ) then
        alter table public.availability_windows
            add constraint availability_windows_work_date_start_time_end_time_key unique (work_date, start_time, end_time);
    end if;
end $$;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'bookings_no_overlap'
    ) then
        alter table public.bookings
            add constraint bookings_no_overlap
            exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
            where (status in ('pending', 'confirmed'));
    end if;
end $$;

do $$
begin
    alter table public.bookings
        drop constraint if exists bookings_status_check;

    alter table public.bookings
        add constraint bookings_status_check
        check (status in ('pending', 'confirmed', 'done', 'cancelled'));
end $$;

alter table public.services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_windows enable row level security;
alter table public.blocked_times enable row level security;
alter table public.bookings enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "public can read active services" on public.services;
create policy "public can read active services"
    on public.services for select
    to anon
    using (active = true);

drop policy if exists "admin can manage services" on public.services;
create policy "admin can manage services"
    on public.services for all
    to authenticated
    using (true)
    with check (true);

drop policy if exists "admin can manage availability" on public.availability_rules;
create policy "admin can manage availability"
    on public.availability_rules for all
    to authenticated
    using (true)
    with check (true);

drop policy if exists "admin can manage availability windows" on public.availability_windows;
create policy "admin can manage availability windows"
    on public.availability_windows for all
    to authenticated
    using (true)
    with check (true);

drop policy if exists "admin can manage blocked times" on public.blocked_times;
create policy "admin can manage blocked times"
    on public.blocked_times for all
    to authenticated
    using (true)
    with check (true);

drop policy if exists "admin can manage bookings" on public.bookings;
create policy "admin can manage bookings"
    on public.bookings for all
    to authenticated
    using (true)
    with check (true);

drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings"
    on public.site_settings for select
    to anon, authenticated
    using (true);

drop policy if exists "admin can manage site settings" on public.site_settings;
create policy "admin can manage site settings"
    on public.site_settings for all
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
        raise exception 'Ez a szolgáltatás jelenleg nem foglalható.';
    end if;

    v_ends_at := p_starts_at + make_interval(mins => v_duration);

    if not exists (
        select 1
        from public.get_available_slots(p_service_id, (p_starts_at at time zone 'Europe/Budapest')::date) s
        where s.starts_at = p_starts_at
    ) then
        raise exception 'Ez az időpont már nem szabad. Kérlek válassz másikat.';
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
        raise exception 'Ez az időpont közben betelt. Kérlek válassz másikat.';
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.services to anon, authenticated;
grant execute on function public.get_available_slots(uuid, date) to anon, authenticated;
grant execute on function public.get_available_dates(uuid, date, integer) to anon, authenticated;
grant execute on function public.create_booking(uuid, text, text, text, text, timestamptz) to anon, authenticated;
grant select, insert, update, delete on public.services to authenticated;
grant select, insert, update, delete on public.availability_rules to authenticated;
grant select, insert, update, delete on public.availability_windows to authenticated;
grant select, insert, update, delete on public.blocked_times to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

insert into public.services (name, price_text, duration_minutes, booking_enabled, active, sort_order)
values
    ('Építés - S méret', '5.500 Ft', 60, true, true, 10),
    ('Építés - M méret', '6.500 Ft', 60, true, true, 20),
    ('Építés - L méret', '7.500 Ft', 60, true, true, 30),
    ('Töltés - S méret', '5.000 Ft', 60, true, true, 40),
    ('Töltés - M méret', '6.000 Ft', 60, true, true, 50),
    ('Töltés - L méret', '7.000 Ft', 60, true, true, 60),
    ('Manikűr - Sima manikűr', '2.500 Ft', 60, true, true, 70),
    ('Manikűr - Gél lakk leszedés + manikűr', '3.000 Ft', 60, true, true, 80),
    ('Manikűr - Műköröm leszedés + manikűr', '3.500 Ft', 60, true, true, 90),
    ('Gél Lakk - Hagyományos gél lakk', '4.000 Ft', 60, true, true, 100),
    ('Gél Lakk - Erősített gél lakk', '5.000 Ft', 60, true, true, 110),
    ('Díszítés - Matrica', '150 Ft / db', 0, false, true, 120),
    ('Díszítés - Kő', '100 Ft / db', 0, false, true, 130),
    ('Díszítés - Beépített francia', '300 Ft / ujj', 0, false, true, 140),
    ('Díszítés - 3D dekor', '150 Ft / ujj', 0, false, true, 150),
    ('Díszítés - Teli kő', '500-800 Ft', 0, false, true, 160)
on conflict (name) do update set
    price_text = excluded.price_text,
    duration_minutes = excluded.duration_minutes,
    booking_enabled = excluded.booking_enabled,
    active = excluded.active,
    sort_order = excluded.sort_order;

insert into public.site_settings (key, value)
values ('telefon_lathato', '{"visible": true}'::jsonb)
on conflict (key) do nothing;
