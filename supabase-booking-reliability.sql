-- Lumi Nails foglalasi megbizhatosagi es adatvedelmi frissites
-- Futtasd a Supabase Dashboard > SQL Editor feluleten.
-- Az admin jogosultsagokat es a rovid onkiszolgalo azonositot ez a fajl szandekosan nem modositja.

-- 1. A vendegkepek kulon, privat bucketbe kerulnek.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'booking-inspirations',
    'booking-inspirations',
    false,
    524288,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can upload booking inspiration images" on storage.objects;

drop policy if exists "admin can view private booking inspirations" on storage.objects;
create policy "admin can view private booking inspirations"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'booking-inspirations');

drop policy if exists "admin can delete private booking inspirations" on storage.objects;
create policy "admin can delete private booking inspirations"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'booking-inspirations');

do $$
begin
    if to_regprocedure('public.attach_booking_inspiration(uuid,jsonb,text,text)') is not null then
        execute 'revoke execute on function public.attach_booking_inspiration(uuid,jsonb,text,text) from public, anon, authenticated';
        execute 'grant execute on function public.attach_booking_inspiration(uuid,jsonb,text,text) to service_role';
    end if;
end;
$$;

-- 2. Egy foglalasi kerest ugyanazzal a kulccsal csak egyszer dolgozunk fel.
create table if not exists public.booking_request_keys (
    request_key uuid primary key,
    request_payload jsonb not null,
    booking_id uuid references public.bookings(id) on delete cascade,
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

alter table public.booking_request_keys
    add column if not exists inspiration_upload_started_at timestamptz,
    add column if not exists inspiration_uploaded_at timestamptz;


create index if not exists booking_request_keys_booking_idx
    on public.booking_request_keys (booking_id);

alter table public.booking_request_keys enable row level security;
revoke all on table public.booking_request_keys from public, anon, authenticated;
grant all on table public.booking_request_keys to service_role;

create or replace function public.create_booking_idempotent(
    p_request_key uuid,
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
    v_payload jsonb;
    v_existing_payload jsonb;
    v_booking_id uuid;
begin
    if p_request_key is null then
        raise exception 'Hianyzik a foglalasi muvelet azonositoja.';
    end if;

    v_payload := jsonb_build_object(
        'service_id', p_service_id,
        'customer_name', trim(coalesce(p_customer_name, '')),
        'customer_phone', trim(coalesce(p_customer_phone, '')),
        'customer_email', lower(trim(coalesce(p_customer_email, ''))),
        'note', trim(coalesce(p_note, '')),
        'starts_at', p_starts_at,
        'coupon_id', p_coupon_id,
        'coupon_code', upper(trim(coalesce(p_coupon_code, '')))
    );

    -- Ugyanazt a kulcsot parhuzamos keresek sem dolgozhatjak fel egyszerre.
    perform pg_advisory_xact_lock(hashtextextended(p_request_key::text, 0));

    select request_payload, booking_id
    into v_existing_payload, v_booking_id
    from public.booking_request_keys
    where request_key = p_request_key;

    if found then
        if v_existing_payload is distinct from v_payload then
            raise exception 'Ezt a foglalasi muveleti azonositot mas adatokkal mar hasznaltak.';
        end if;

        if v_booking_id is not null then
            return v_booking_id;
        end if;
    else
        insert into public.booking_request_keys (request_key, request_payload)
        values (p_request_key, v_payload);
    end if;

    v_booking_id := public.create_booking(
        p_service_id,
        p_customer_name,
        p_customer_phone,
        p_customer_email,
        p_note,
        p_starts_at,
        p_coupon_id,
        p_coupon_code
    );

    update public.booking_request_keys
    set booking_id = v_booking_id,
        completed_at = now()
    where request_key = p_request_key;

    return v_booking_id;
end;
$$;

revoke all on function public.create_booking_idempotent(uuid,uuid,text,text,text,text,timestamptz,uuid,text) from public, anon, authenticated;
grant execute on function public.create_booking_idempotent(uuid,uuid,text,text,text,text,timestamptz,uuid,text) to service_role;

-- 3. Tartos email-sor. A mar sikeres munka nem kerul ujra kikuldesre.
create table if not exists public.booking_email_jobs (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid not null references public.bookings(id) on delete cascade,
    kind text not null check (kind in ('new_booking', 'admin_update')),
    dedupe_key text not null unique,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'pending' check (status in ('pending', 'processing', 'retry', 'sent', 'failed')),
    attempts integer not null default 0,
    next_attempt_at timestamptz not null default now(),
    locked_at timestamptz,
    sent_at timestamptz,
    last_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (jsonb_typeof(payload) = 'object')
);

create index if not exists booking_email_jobs_due_idx
    on public.booking_email_jobs (next_attempt_at, created_at)
    where status in ('pending', 'processing', 'retry');

alter table public.booking_email_jobs enable row level security;
revoke all on table public.booking_email_jobs from public, anon, authenticated;
grant all on table public.booking_email_jobs to service_role;

create or replace function public.enqueue_new_booking_email(p_booking_id uuid)
returns table (id uuid, booking_id uuid, kind text, payload jsonb, status text)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    insert into public.booking_email_jobs (booking_id, kind, dedupe_key)
    values (p_booking_id, 'new_booking', 'new-booking/' || p_booking_id::text)
    on conflict (dedupe_key) do update
    set dedupe_key = excluded.dedupe_key
    returning
        booking_email_jobs.id,
        booking_email_jobs.booking_id,
        booking_email_jobs.kind,
        booking_email_jobs.payload,
        booking_email_jobs.status;
end;
$$;

create or replace function public.claim_due_booking_email_jobs(p_limit integer default 20)
returns table (id uuid, booking_id uuid, kind text, payload jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
    return query
    with candidates as (
        select j.id
        from public.booking_email_jobs j
        where j.sent_at is null
            and j.attempts < 8
            and j.next_attempt_at <= now()
            and (
                j.status in ('pending', 'retry')
                or (j.status = 'processing' and j.locked_at < now() - interval '30 minutes')
            )
        order by j.next_attempt_at, j.created_at
        limit least(greatest(coalesce(p_limit, 20), 1), 50)
        for update skip locked
    )
    update public.booking_email_jobs j
    set status = 'processing',
        locked_at = now(),
        updated_at = now()
    from candidates c
    where j.id = c.id
    returning j.id, j.booking_id, j.kind, j.payload;
end;
$$;

create or replace function public.finish_booking_email_job(
    p_job_id uuid,
    p_success boolean,
    p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_attempts integer;
begin
    select attempts + 1
    into v_attempts
    from public.booking_email_jobs
    where id = p_job_id and status <> 'sent'
    for update;

    if not found then
        if exists (select 1 from public.booking_email_jobs where id = p_job_id and status = 'sent') then
            return;
        end if;

        raise exception 'Az email munka nem talalhato.';
    end if;

    update public.booking_email_jobs
    set attempts = v_attempts,
        status = case
            when p_success then 'sent'
            when v_attempts >= 8 then 'failed'
            else 'retry'
        end,
        sent_at = case when p_success then now() else sent_at end,
        locked_at = null,
        last_error = case when p_success then null else left(coalesce(p_error, 'Ismeretlen email hiba'), 2000) end,
        next_attempt_at = case
            when p_success then next_attempt_at
            when v_attempts = 1 then now() + interval '1 minute'
            when v_attempts = 2 then now() + interval '5 minutes'
            when v_attempts = 3 then now() + interval '15 minutes'
            when v_attempts = 4 then now() + interval '1 hour'
            when v_attempts = 5 then now() + interval '3 hours'
            else now() + interval '6 hours'
        end,
        updated_at = now()
    where id = p_job_id;
end;
$$;

revoke all on function public.enqueue_new_booking_email(uuid) from public;
revoke all on function public.claim_due_booking_email_jobs(integer) from public;
revoke all on function public.finish_booking_email_job(uuid,boolean,text) from public;
grant execute on function public.enqueue_new_booking_email(uuid) to service_role;
grant execute on function public.claim_due_booking_email_jobs(integer) to service_role;
grant execute on function public.finish_booking_email_job(uuid,boolean,text) to service_role;

create table if not exists public.admin_booking_change_operations (
    operation_id uuid primary key,
    changes jsonb not null check (jsonb_typeof(changes) = 'array'),
    result jsonb,
    created_at timestamptz not null default now(),
    completed_at timestamptz
);

alter table public.admin_booking_change_operations enable row level security;
revoke all on table public.admin_booking_change_operations from public, anon, authenticated;
grant all on table public.admin_booking_change_operations to service_role;


-- 4. Az adminban egy mentes vagy teljesen sikerul, vagy egyetlen valtozas sem marad meg.
create or replace function public.apply_admin_booking_changes(
    p_operation_id uuid,
    p_changes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_change jsonb;
    v_id uuid;
    v_type text;
    v_status text;
    v_starts_at timestamptz;
    v_ends_at timestamptz;
    v_reason text;
    v_notification jsonb;
    v_job public.booking_email_jobs%rowtype;
    v_jobs jsonb := '[]'::jsonb;
    v_modified integer := 0;
    v_existing_changes jsonb;
    v_existing_result jsonb;
    v_result jsonb;
begin
    if p_operation_id is null then
        raise exception 'Hianyzik az admin mentési muvelet azonositoja.';
    end if;

    if jsonb_typeof(coalesce(p_changes, '[]'::jsonb)) <> 'array' then
        raise exception 'Ervenytelen admin modositaslista.';
    end if;

    if jsonb_array_length(coalesce(p_changes, '[]'::jsonb)) > 100 then
        raise exception 'Egyszerre legfeljebb 100 bejegyzes modosithato.';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(p_operation_id::text, 1));

    select changes, result
    into v_existing_changes, v_existing_result
    from public.admin_booking_change_operations
    where operation_id = p_operation_id;

    if found then
        if v_existing_changes is distinct from p_changes then
            raise exception 'Ezt az admin muveleti azonositot mas adatokkal mar hasznaltak.';
        end if;
        if v_existing_result is not null then
            return v_existing_result;
        end if;
        raise exception 'Az admin muvelet feldolgozasa meg nem fejezodott be.';
    end if;

    insert into public.admin_booking_change_operations (operation_id, changes) values (p_operation_id, p_changes);

    for v_change in
        select value from jsonb_array_elements(coalesce(p_changes, '[]'::jsonb))
    loop
        v_id := (v_change->>'id')::uuid;
        v_type := trim(coalesce(v_change->>'type', ''));
        v_status := trim(coalesce(v_change->>'status', ''));
        v_starts_at := (v_change->>'starts_at')::timestamptz;
        v_ends_at := (v_change->>'ends_at')::timestamptz;
        v_reason := left(trim(coalesce(v_change->>'reason', '')), 500);
        v_notification := coalesce(v_change->'email_notification', 'null'::jsonb);

        if v_starts_at >= v_ends_at then
            raise exception 'A befejezesnek kesobbinek kell lennie a kezdesnel.';
        end if;

        if v_type = 'booking' then
            if v_status not in ('pending', 'confirmed', 'done', 'cancelled', 'cancelled_by_customer') then
                raise exception 'Ervenytelen foglalasi statusz.';
            end if;

            update public.bookings
            set status = v_status,
                starts_at = v_starts_at,
                ends_at = v_ends_at
            where id = v_id;

            if not found then
                raise exception 'Az egyik foglalas mar nem talalhato.';
            end if;

            if v_notification <> 'null'::jsonb then
                insert into public.booking_email_jobs (
                    booking_id,
                    kind,
                    dedupe_key,
                    payload
                ) values (
                    v_id,
                    'admin_update',
                    'admin-update/' || p_operation_id::text || '/' || v_id::text,
                    jsonb_build_object('notification', v_notification)
                )
                on conflict (dedupe_key) do update
                set dedupe_key = excluded.dedupe_key
                returning * into v_job;

                v_jobs := v_jobs || jsonb_build_array(jsonb_build_object(
                    'id', v_job.id,
                    'booking_id', v_job.booking_id,
                    'kind', v_job.kind,
                    'payload', v_job.payload,
                    'status', v_job.status
                ));
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
                v_id,
                case when v_status = 'cancelled_by_customer' then 'customer_cancelled' else 'admin_booking_updated' end,
                'admin',
                'info',
                case when v_status = 'cancelled_by_customer' then 'A vendeg mondta le' else 'Admin modositas mentve' end,
                case when v_status = 'cancelled_by_customer'
                    then 'A foglalast a vendeg lemondasakent rogzitettek. Automatikus email nem ment ki.'
                    else 'A foglalas adatai az admin feluleten modosultak.'
                end,
                jsonb_build_object('operation_id', p_operation_id, 'change', v_change)
            );
        elsif v_type = 'blocked' then
            if v_status not in ('blocked', 'done', 'cancelled_by_customer') then
                raise exception 'Ervenytelen kezi idopont statusz.';
            end if;

            if v_reason = '' then
                raise exception 'A kezi idopont neve vagy megjegyzese nem lehet ures.';
            end if;

            update public.blocked_times
            set status = v_status,
                starts_at = v_starts_at,
                ends_at = v_ends_at,
                reason = v_reason
            where id = v_id;

            if not found then
                raise exception 'Az egyik kezi idopont mar nem talalhato.';
            end if;
        else
            raise exception 'Ismeretlen admin bejegyzestipus.';
        end if;

        v_modified := v_modified + 1;
    end loop;

    v_result := jsonb_build_object(
        'ok', true,
        'modified_count', v_modified,
        'email_jobs', v_jobs
    );

    update public.admin_booking_change_operations
    set result = v_result, completed_at = now()
    where operation_id = p_operation_id;


    return v_result;
exception
    when exclusion_violation then
        raise exception 'Az egyik modositott idopont utkozik egy masik foglalassal vagy a kotelezo szunettel.';
end;
$$;

revoke all on function public.apply_admin_booking_changes(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.apply_admin_booking_changes(uuid,jsonb) to authenticated;
