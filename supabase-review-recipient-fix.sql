-- Lumi Nails értékeléskérő email tartós címzettlista javítás
-- Futtasd a Supabase Dashboard > SQL Editor felületén.
-- Cél: ha egy foglalást törölsz adminból, attól még megmaradjon, hogy arra az email címre már ment értékeléskérés.

create table if not exists public.booking_review_recipients (
    email text primary key,
    first_booking_id uuid references public.bookings(id) on delete set null,
    sent_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    check (email = lower(trim(email))),
    check (position('@' in email) > 1)
);

alter table public.booking_review_recipients enable row level security;

drop policy if exists "admin can read booking review recipients" on public.booking_review_recipients;
create policy "admin can read booking review recipients"
    on public.booking_review_recipients for select
    to authenticated
    using (true);

drop policy if exists "admin can delete booking review recipients" on public.booking_review_recipients;
create policy "admin can delete booking review recipients"
    on public.booking_review_recipients for delete
    to authenticated
    using (true);

grant select, delete on public.booking_review_recipients to authenticated;

insert into public.booking_review_recipients (email, first_booking_id, sent_at)
select distinct on (lower(trim(customer_email)))
    lower(trim(customer_email)) as email,
    id as first_booking_id,
    review_request_sent_at as sent_at
from public.bookings
where review_request_sent_at is not null
    and nullif(trim(customer_email), '') is not null
order by lower(trim(customer_email)), review_request_sent_at asc
on conflict (email) do nothing;

create or replace function public.set_booking_notification_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_reference timestamptz;
begin
    v_reference := coalesce(new.created_at, now());

    if tg_op = 'INSERT' then
        if new.starts_at > v_reference + interval '48 hours' then
            new.reminder_scheduled_for := public.lumi_booking_previous_day_noon(new.starts_at);
        else
            new.reminder_scheduled_for := null;
        end if;
    elsif tg_op = 'UPDATE' and new.starts_at is distinct from old.starts_at and new.reminder_sent_at is null then
        if new.starts_at > now() + interval '48 hours' then
            new.reminder_scheduled_for := public.lumi_booking_previous_day_noon(new.starts_at);
        else
            new.reminder_scheduled_for := null;
        end if;

        new.reminder_locked_at := null;
        new.reminder_last_error := null;
    end if;

    if new.status in ('cancelled', 'done') and new.reminder_sent_at is null then
        new.reminder_scheduled_for := null;
        new.reminder_locked_at := null;
    end if;

    if tg_op = 'UPDATE'
        and new.status = 'done'
        and old.status is distinct from new.status
        and new.review_request_scheduled_for is null
        and new.review_request_sent_at is null
        and not exists (
            select 1
            from public.booking_review_recipients r
            where r.email = lower(trim(new.customer_email))
        )
        and not exists (
            select 1
            from public.bookings b
            where lower(trim(b.customer_email)) = lower(trim(new.customer_email))
                and b.review_request_sent_at is not null
        )
    then
        new.review_request_scheduled_for := public.lumi_booking_two_days_later_noon(now());
        new.review_request_locked_at := null;
        new.review_request_last_error := null;
    end if;

    if tg_op = 'UPDATE'
        and old.status = 'done'
        and new.status <> 'done'
        and new.review_request_sent_at is null
    then
        new.review_request_scheduled_for := null;
        new.review_request_locked_at := null;
    end if;

    return new;
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
            b.id,
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
        select id
        from ranked
        where rn = 1
        limit least(greatest(coalesce(p_limit, 20), 1), 50)
    )
    update public.bookings b
    set review_request_locked_at = now()
    from candidates c, public.services s
    where b.id = c.id
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

create or replace function public.finish_booking_review_request(
    p_booking_id uuid,
    p_success boolean,
    p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    update public.bookings
    set
        review_request_locked_at = null,
        review_request_attempts = coalesce(review_request_attempts, 0) + 1,
        review_request_sent_at = case when p_success then now() else review_request_sent_at end,
        review_request_last_error = case when p_success then null else left(coalesce(p_error, 'Ismeretlen email hiba'), 2000) end
    where id = p_booking_id;

    if p_success then
        insert into public.booking_review_recipients (email, first_booking_id, sent_at)
        select lower(trim(customer_email)), id, now()
        from public.bookings
        where id = p_booking_id
            and nullif(trim(customer_email), '') is not null
        on conflict (email) do nothing;
    end if;

    insert into public.booking_events (
        booking_id,
        event_type,
        channel,
        status,
        title,
        message,
        metadata
    ) values (
        p_booking_id,
        'booking_review_request_email',
        'email',
        case when p_success then 'success' else 'error' end,
        case when p_success then 'Értékeléskérő email elküldve' else 'Értékeléskérő email hiba' end,
        case when p_success then 'A vendég megkapta a köszönő és Google értékeléskérő emailt.' else left(coalesce(p_error, 'Az értékeléskérő email nem ment ki.'), 2000) end,
        jsonb_build_object('ok', p_success, 'error', p_error)
    );
end;
$$;

revoke all on function public.claim_due_booking_review_requests(integer) from public;
revoke all on function public.finish_booking_review_request(uuid, boolean, text) from public;

grant execute on function public.claim_due_booking_review_requests(integer) to service_role;
grant execute on function public.finish_booking_review_request(uuid, boolean, text) to service_role;