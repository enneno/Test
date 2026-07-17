-- Lumi Nails automatikus értesítés claim függvény javítás
-- Futtasd Supabase SQL Editorban, ha a function logban ez látszik:
-- claim_due_booking_review_requests: column reference "id" is ambiguous

create or replace function public.claim_due_booking_reminders(p_limit integer default 20)
returns table (
    id uuid,
    customer_name text,
    customer_email text,
    customer_phone text,
    note text,
    starts_at timestamptz,
    ends_at timestamptz,
    created_at timestamptz,
    status text,
    service_name text,
    service_price_text text
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    with candidates as (
        select b.id as booking_id
        from public.bookings b
        where b.reminder_scheduled_for <= now()
            and b.reminder_sent_at is null
            and b.status in ('pending', 'confirmed')
            and b.starts_at > now()
            and coalesce(b.reminder_attempts, 0) < 5
            and (b.reminder_locked_at is null or b.reminder_locked_at < now() - interval '30 minutes')
        order by b.reminder_scheduled_for asc
        limit least(greatest(coalesce(p_limit, 20), 1), 50)
        for update skip locked
    )
    update public.bookings b
    set reminder_locked_at = now()
    from candidates c, public.services s
    where b.id = c.booking_id
        and s.id = b.service_id
    returning
        b.id,
        b.customer_name,
        b.customer_email,
        b.customer_phone,
        b.note,
        b.starts_at,
        b.ends_at,
        b.created_at,
        b.status,
        s.name,
        s.price_text;
end;
$$;

create or replace function public.claim_due_booking_review_requests(p_limit integer default 20)
returns table (
    id uuid,
    customer_name text,
    customer_email text,
    customer_phone text,
    note text,
    starts_at timestamptz,
    ends_at timestamptz,
    created_at timestamptz,
    status text,
    service_name text,
    service_price_text text
)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    with ranked as (
        select
            b.id as booking_id,
            row_number() over (
                partition by lower(trim(b.customer_email))
                order by b.review_request_scheduled_for asc, b.created_at asc
            ) as rn
        from public.bookings b
        where b.review_request_scheduled_for <= now()
            and b.review_request_sent_at is null
            and b.status = 'done'
            and coalesce(b.review_request_attempts, 0) < 5
            and (b.review_request_locked_at is null or b.review_request_locked_at < now() - interval '30 minutes')
            and not exists (
                select 1
                from public.booking_review_recipients r
                where r.email = lower(trim(b.customer_email))
            )
            and not exists (
                select 1
                from public.bookings sent
                where lower(trim(sent.customer_email)) = lower(trim(b.customer_email))
                    and sent.review_request_sent_at is not null
            )
    ),
    candidates as (
        select ranked.booking_id
        from ranked
        where ranked.rn = 1
        limit least(greatest(coalesce(p_limit, 20), 1), 50)
    )
    update public.bookings b
    set review_request_locked_at = now()
    from candidates c, public.services s
    where b.id = c.booking_id
        and s.id = b.service_id
    returning
        b.id,
        b.customer_name,
        b.customer_email,
        b.customer_phone,
        b.note,
        b.starts_at,
        b.ends_at,
        b.created_at,
        b.status,
        s.name,
        s.price_text;
end;
$$;

revoke all on function public.claim_due_booking_reminders(integer) from public;
revoke all on function public.claim_due_booking_review_requests(integer) from public;

grant execute on function public.claim_due_booking_reminders(integer) to service_role;
grant execute on function public.claim_due_booking_review_requests(integer) to service_role;