-- Lumi Nails esemenynaplo migracio
-- Ezt futtasd a Supabase Dashboard > SQL Editor feluleten.
-- Csak az esemenynaplot es a create_booking naplozast frissiti, arlistat nem ir at.

create table if not exists public.booking_events (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid references public.bookings(id) on delete set null,
    event_type text not null,
    channel text default '',
    status text not null default 'info' check (status in ('info', 'success', 'warning', 'error')),
    title text not null default '',
    message text default '',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

alter table public.booking_events enable row level security;

drop policy if exists "admin can read booking events" on public.booking_events;
create policy "admin can read booking events"
    on public.booking_events for select
    to authenticated
    using (true);

drop policy if exists "admin can manage booking events" on public.booking_events;
create policy "admin can manage booking events"
    on public.booking_events for all
    to authenticated
    using (true)
    with check (true);

grant select, insert, update, delete on public.booking_events to authenticated;

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
            'customer_email', lower(trim(p_customer_email))
        )
    );

    return v_booking_id;
exception
    when exclusion_violation then
        raise exception 'Ez az idopont kozben betelt. Kerlek valassz masikat.';
end;
$$;

grant execute on function public.create_booking(uuid, text, text, text, text, timestamptz) to anon, authenticated;
