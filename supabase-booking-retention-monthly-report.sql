-- Lumi Nails: 6 hónapos adatmegőrzés és havi, névtelen foglalási összesítő
-- A havi riport minden hónap 1-jén az előző teljes naptári hónapot teszi sorba.

create schema if not exists private;
revoke all on schema private from public;

alter table public.bookings
    add column if not exists retention_locked_at timestamptz,
    add column if not exists retention_attempts integer not null default 0,
    add column if not exists retention_next_attempt_at timestamptz not null default now(),
    add column if not exists retention_last_error text;

create index if not exists bookings_retention_due_idx
    on public.bookings (ends_at, retention_next_attempt_at)
    where retention_locked_at is null;

create table if not exists public.booking_monthly_report_jobs (
    report_month date primary key,
    status text not null default 'pending',
    attempts integer not null default 0,
    next_attempt_at timestamptz not null default now(),
    locked_at timestamptz,
    sent_at timestamptz,
    last_error text,
    report_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint booking_monthly_report_month_start_check
        check (report_month = date_trunc('month', report_month)::date),
    constraint booking_monthly_report_status_check
        check (status in ('pending', 'processing', 'retry', 'sent')),
    constraint booking_monthly_report_attempts_check
        check (attempts >= 0)
);

alter table public.booking_monthly_report_jobs enable row level security;
revoke all on public.booking_monthly_report_jobs from anon, authenticated;
grant select, insert, update on public.booking_monthly_report_jobs to service_role;

create or replace function private.enqueue_previous_month_booking_report()
returns date
language plpgsql
set search_path = ''
as $$
declare
    v_today date := (now() at time zone 'Europe/Budapest')::date;
    v_report_month date := date_trunc('month', v_today - interval '1 month')::date;
begin
    insert into public.booking_monthly_report_jobs (report_month)
    values (v_report_month)
    on conflict (report_month) do nothing;

    return v_report_month;
end;
$$;

revoke all on function private.enqueue_previous_month_booking_report() from public;

create or replace function public.claim_due_booking_monthly_reports(p_limit integer default 3)
returns table (report_month date)
language plpgsql
set search_path = ''
as $$
begin
    return query
    with candidates as (
        select j.report_month
        from public.booking_monthly_report_jobs j
        where j.sent_at is null
            and j.next_attempt_at <= now()
            and (
                j.status in ('pending', 'retry')
                or (j.status = 'processing' and j.locked_at < now() - interval '30 minutes')
            )
        order by j.report_month
        limit least(greatest(coalesce(p_limit, 3), 1), 12)
        for update skip locked
    )
    update public.booking_monthly_report_jobs j
    set status = 'processing',
        locked_at = now(),
        updated_at = now()
    from candidates c
    where j.report_month = c.report_month
    returning j.report_month;
end;
$$;

create or replace function public.finish_booking_monthly_report(
    p_report_month date,
    p_success boolean,
    p_error text default null,
    p_report_data jsonb default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
    v_attempts integer;
begin
    select attempts + 1
    into v_attempts
    from public.booking_monthly_report_jobs
    where report_month = p_report_month
        and sent_at is null
    for update;

    if not found then
        if exists (
            select 1
            from public.booking_monthly_report_jobs
            where report_month = p_report_month and sent_at is not null
        ) then
            return;
        end if;

        raise exception 'A havi riport munka nem található.';
    end if;

    update public.booking_monthly_report_jobs
    set attempts = v_attempts,
        status = case when p_success then 'sent' else 'retry' end,
        sent_at = case when p_success then now() else sent_at end,
        locked_at = null,
        last_error = case
            when p_success then null
            else left(coalesce(p_error, 'Ismeretlen havi riport hiba'), 2000)
        end,
        report_data = case
            when p_success and p_report_data is not null then p_report_data
            else report_data
        end,
        next_attempt_at = case
            when p_success then next_attempt_at
            when v_attempts = 1 then now() + interval '10 minutes'
            when v_attempts = 2 then now() + interval '30 minutes'
            when v_attempts = 3 then now() + interval '2 hours'
            when v_attempts = 4 then now() + interval '6 hours'
            else now() + interval '1 day'
        end,
        updated_at = now()
    where report_month = p_report_month;
end;
$$;

create or replace function public.get_booking_monthly_report_data(p_report_month date)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
    v_month date := date_trunc('month', p_report_month)::date;
    v_start timestamptz := (v_month::timestamp at time zone 'Europe/Budapest');
    v_end timestamptz := ((v_month + interval '1 month')::timestamp at time zone 'Europe/Budapest');
    v_result jsonb;
begin
    if p_report_month is null or p_report_month <> v_month then
        raise exception 'A riport hónapjának első napját kell megadni.';
    end if;

    with online_base as (
        select
            b.status,
            coalesce(s.name, 'Ismeretlen szolgáltatás') as service_name,
            greatest(round(extract(epoch from (b.ends_at - b.starts_at)) / 60.0), 0)::integer as duration_minutes,
            greatest(coalesce(b.final_price_amount, b.service_price_amount, s.price_amount, 0), 0)::integer as price_amount,
            greatest(coalesce(b.coupon_discount_amount, 0), 0)::integer as discount_amount,
            nullif(trim(b.coupon_code), '') is not null as used_coupon,
            nullif(lower(trim(b.customer_email)), '') as normalized_email
        from public.bookings b
        left join public.services s on s.id = b.service_id
        where b.starts_at >= v_start and b.starts_at < v_end
    ),
    manual_base as (
        select
            coalesce(nullif(trim(bt.status), ''), 'blocked') as status,
            greatest(round(extract(epoch from (bt.ends_at - bt.starts_at)) / 60.0), 0)::integer as duration_minutes
        from public.blocked_times bt
        where bt.starts_at >= v_start and bt.starts_at < v_end
    ),
    online_summary as (
        select
            count(*)::integer as total,
            count(*) filter (where status = 'done')::integer as done,
            count(*) filter (where status = 'confirmed')::integer as confirmed,
            count(*) filter (where status = 'pending')::integer as pending,
            count(*) filter (where status = 'cancelled')::integer as cancelled_owner,
            count(*) filter (where status = 'cancelled_by_customer')::integer as cancelled_customer,
            count(distinct normalized_email)::integer as unique_customers,
            count(*) filter (where used_coupon)::integer as coupon_bookings,
            coalesce(sum(discount_amount) filter (where used_coupon), 0)::integer as discount_total_amount,
            coalesce(sum(price_amount) filter (where status = 'done'), 0)::integer as completed_revenue_amount,
            coalesce(sum(duration_minutes) filter (where status not in ('cancelled', 'cancelled_by_customer')), 0)::integer as booked_minutes,
            coalesce(sum(duration_minutes) filter (where status = 'done'), 0)::integer as completed_minutes
        from online_base
    ),
    manual_summary as (
        select
            count(*)::integer as total,
            count(*) filter (where status = 'done')::integer as done,
            count(*) filter (where status = 'cancelled_by_customer')::integer as cancelled_customer,
            coalesce(sum(duration_minutes) filter (where status <> 'cancelled_by_customer'), 0)::integer as booked_minutes,
            coalesce(sum(duration_minutes) filter (where status = 'done'), 0)::integer as completed_minutes
        from manual_base
    ),
    service_summary as (
        select
            service_name,
            count(*)::integer as bookings,
            count(*) filter (where status = 'done')::integer as done,
            count(*) filter (where status in ('cancelled', 'cancelled_by_customer'))::integer as cancelled,
            coalesce(sum(price_amount) filter (where status = 'done'), 0)::integer as completed_revenue_amount
        from online_base
        group by service_name
    )
    select jsonb_build_object(
        'report_month', v_month,
        'period_start', v_start,
        'period_end', v_end,
        'online', jsonb_build_object(
            'total', o.total,
            'done', o.done,
            'confirmed', o.confirmed,
            'pending', o.pending,
            'cancelled_owner', o.cancelled_owner,
            'cancelled_customer', o.cancelled_customer,
            'unique_customers', o.unique_customers,
            'coupon_bookings', o.coupon_bookings,
            'discount_total_amount', o.discount_total_amount,
            'completed_revenue_amount', o.completed_revenue_amount,
            'booked_minutes', o.booked_minutes,
            'completed_minutes', o.completed_minutes
        ),
        'manual', jsonb_build_object(
            'total', m.total,
            'done', m.done,
            'cancelled_customer', m.cancelled_customer,
            'booked_minutes', m.booked_minutes,
            'completed_minutes', m.completed_minutes
        ),
        'services', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'name', service_name,
                    'bookings', bookings,
                    'done', done,
                    'cancelled', cancelled,
                    'completed_revenue_amount', completed_revenue_amount
                )
                order by bookings desc, service_name
            )
            from service_summary
        ), '[]'::jsonb)
    )
    into v_result
    from online_summary o
    cross join manual_summary m;

    return coalesce(v_result, '{}'::jsonb);
end;
$$;

revoke all on function public.claim_due_booking_monthly_reports(integer) from public, anon, authenticated;
revoke all on function public.finish_booking_monthly_report(date, boolean, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_booking_monthly_report_data(date) from public, anon, authenticated;
grant execute on function public.claim_due_booking_monthly_reports(integer) to service_role;
grant execute on function public.finish_booking_monthly_report(date, boolean, text, jsonb) to service_role;
grant execute on function public.get_booking_monthly_report_data(date) to service_role;

create or replace function public.claim_expired_bookings_for_retention(p_limit integer default 20)
returns table (
    id uuid,
    inspiration_image_path text,
    inspiration_images jsonb
)
language plpgsql
set search_path = ''
as $$
begin
    return query
    with candidates as (
        select b.id
        from public.bookings b
        where b.ends_at < now() - interval '6 months'
            and b.retention_next_attempt_at <= now()
            and (b.retention_locked_at is null or b.retention_locked_at < now() - interval '30 minutes')
        order by b.ends_at
        limit least(greatest(coalesce(p_limit, 20), 1), 100)
        for update skip locked
    )
    update public.bookings b
    set retention_locked_at = now(),
        retention_attempts = b.retention_attempts + 1,
        retention_last_error = null
    from candidates c
    where b.id = c.id
    returning b.id, b.inspiration_image_path, b.inspiration_images;
end;
$$;

create or replace function public.finish_expired_booking_retention(
    p_booking_id uuid,
    p_success boolean,
    p_error text default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
    v_attempts integer;
begin
    select retention_attempts
    into v_attempts
    from public.bookings
    where id = p_booking_id
    for update;

    if not found then
        return;
    end if;

    if p_success then
        delete from public.booking_events where booking_id = p_booking_id;
        delete from public.bookings where id = p_booking_id;
        return;
    end if;

    update public.bookings
    set retention_locked_at = null,
        retention_last_error = left(coalesce(p_error, 'Ismeretlen adatmegőrzési hiba'), 2000),
        retention_next_attempt_at = case
            when v_attempts <= 1 then now() + interval '30 minutes'
            when v_attempts = 2 then now() + interval '2 hours'
            when v_attempts = 3 then now() + interval '6 hours'
            else now() + interval '1 day'
        end
    where id = p_booking_id;
end;
$$;

revoke all on function public.claim_expired_bookings_for_retention(integer) from public, anon, authenticated;
revoke all on function public.finish_expired_booking_retention(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.claim_expired_bookings_for_retention(integer) to service_role;
grant execute on function public.finish_expired_booking_retention(uuid, boolean, text) to service_role;

create or replace function private.purge_expired_non_booking_data()
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
    v_cutoff timestamptz := now() - interval '6 months';
    v_blocked_times integer := 0;
    v_orphan_events integer := 0;
    v_review_recipients integer := 0;
    v_request_keys integer := 0;
begin
    delete from public.blocked_times where ends_at < v_cutoff;
    get diagnostics v_blocked_times = row_count;

    delete from public.booking_events
    where booking_id is null and created_at < v_cutoff;
    get diagnostics v_orphan_events = row_count;

    delete from public.booking_review_recipients where sent_at < v_cutoff;
    get diagnostics v_review_recipients = row_count;

    delete from public.booking_request_keys where created_at < v_cutoff;
    get diagnostics v_request_keys = row_count;

    return jsonb_build_object(
        'cutoff', v_cutoff,
        'blocked_times', v_blocked_times,
        'orphan_events', v_orphan_events,
        'review_recipients', v_review_recipients,
        'request_keys', v_request_keys
    );
end;
$$;

revoke all on function private.purge_expired_non_booking_data() from public;

insert into public.site_settings (key, value)
values ('site_content', '{}'::jsonb)
on conflict (key) do nothing;

update public.site_settings
set value = coalesce(value, '{}'::jsonb) || jsonb_build_object(
    'email',
    coalesce(value->'email', '{}'::jsonb) || jsonb_build_object(
        'haviStatisztika',
        coalesce(value #> '{email,haviStatisztika}', '{}'::jsonb) || jsonb_build_object(
            'targy', coalesce(value #>> '{email,haviStatisztika,targy}', 'Lumi Nails havi összesítő – {honap}'),
            'cim', coalesce(value #>> '{email,haviStatisztika,cim}', '{honap} havi összesítő'),
            'szoveg', coalesce(value #>> '{email,haviStatisztika,szoveg}', 'Az előző teljes naptári hónap foglalási összesítője. A riport csak névtelen, összesített adatokat tartalmaz.')
        )
    )
)
where key = 'site_content';

do $do$
declare
    v_jobid bigint;
begin
    select jobid into v_jobid from cron.job where jobname = 'lumi-monthly-booking-report';
    if found then perform cron.unschedule(v_jobid); end if;

    select jobid into v_jobid from cron.job where jobname = 'lumi-data-retention-cleanup';
    if found then perform cron.unschedule(v_jobid); end if;
end;
$do$;

select cron.schedule(
    'lumi-monthly-booking-report',
    '5 8 1 * *',
    $cron$select private.enqueue_previous_month_booking_report();$cron$
);

select cron.schedule(
    'lumi-data-retention-cleanup',
    '20 2 * * *',
    $cron$select private.purge_expired_non_booking_data();$cron$
);
