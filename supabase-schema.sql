


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "private"."enqueue_previous_month_booking_report"() RETURNS "date"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."enqueue_previous_month_booking_report"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."lumi_booking_contact_matches"("p_booking_email" "text", "p_booking_phone" "text", "p_contact" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
    select case
        when position('@' in trim(coalesce(p_contact, ''))) > 1 then
            lower(trim(coalesce(p_booking_email, ''))) = lower(trim(coalesce(p_contact, '')))
        else
            private.lumi_booking_phone_key(p_booking_phone) <> ''
            and private.lumi_booking_phone_key(p_booking_phone) = private.lumi_booking_phone_key(p_contact)
    end;
$$;


ALTER FUNCTION "private"."lumi_booking_contact_matches"("p_booking_email" "text", "p_booking_phone" "text", "p_contact" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."lumi_booking_phone_key"("p_value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare
    v_digits text := regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g');
begin
    if char_length(v_digits) = 13 and left(v_digits, 4) = '0036' then
        v_digits := substr(v_digits, 5);
    elsif char_length(v_digits) = 11 and left(v_digits, 2) = '36' then
        v_digits := substr(v_digits, 3);
    elsif char_length(v_digits) = 11 and left(v_digits, 2) = '06' then
        v_digits := substr(v_digits, 3);
    end if;

    if char_length(v_digits) = 9 then
        return v_digits;
    end if;

    return '';
end;
$$;


ALTER FUNCTION "private"."lumi_booking_phone_key"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."lumi_cancel_booking"("p_booking_id" "uuid", "p_note" "text", "p_channel" "text") RETURNS TABLE("success" boolean, "result" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
    v_booking public.bookings%rowtype;
    v_note text := left(trim(coalesce(p_note, '')), 500);
    v_channel text := case when p_channel = 'customer_account' then 'customer_account' else 'self_service' end;
begin
    select bookings.*
    into v_booking
    from public.bookings as bookings
    where bookings.id = p_booking_id
    for update;

    if not found then
        return query select false, 'not_found'::text, 'Nem található ez a foglalás.'::text;
        return;
    end if;

    if v_booking.status = 'cancelled_by_customer' then
        return query select true, 'already_cancelled'::text, 'Az időpontot már lemondtad.'::text;
        return;
    end if;

    if v_booking.status not in ('pending', 'confirmed') or v_booking.starts_at <= now() then
        return query select false, 'status_locked'::text, 'Ez a foglalás már nem mondható le online.'::text;
        return;
    end if;

    if v_booking.starts_at <= now() + interval '24 hours' and v_note = '' then
        return query select false, 'note_required'::text, 'A 24 órán belüli lemondáshoz rövid indok szükséges.'::text;
        return;
    end if;

    update public.bookings
    set status = 'cancelled_by_customer'
    where id = v_booking.id;

    insert into public.booking_events (booking_id, event_type, channel, status, title, message, metadata)
    values (
        v_booking.id,
        'customer_cancelled',
        v_channel,
        'info',
        'A vendég online lemondta',
        case
            when v_note <> '' then 'Vendég megjegyzése: ' || v_note
            else 'A foglalást a vendég online mondta le.'
        end,
        jsonb_build_object(
            'from_status', v_booking.status,
            'to_status', 'cancelled_by_customer',
            'cancellation_note', nullif(v_note, ''),
            'source', v_channel
        )
    );

    insert into public.booking_email_jobs (booking_id, kind, dedupe_key, payload)
    values (
        v_booking.id,
        'admin_update',
        'customer-cancellation/' || v_booking.id::text,
        jsonb_build_object(
            'cancellation_note', nullif(v_note, ''),
            'customer_cancellation', true,
            'source', v_channel
        )
    )
    on conflict (dedupe_key) do nothing;

    return query select true, 'cancelled'::text, 'Az időpontot sikeresen lemondtad.'::text;
end;
$$;


ALTER FUNCTION "private"."lumi_cancel_booking"("p_booking_id" "uuid", "p_note" "text", "p_channel" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."lumi_customer_name"("p_value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare
    v_value text := regexp_replace(trim(coalesce(p_value, '')), '[[:space:]]+', ' ', 'g');
begin
    if char_length(v_value) < 2 or char_length(v_value) > 120 or v_value ~ '[[:cntrl:]]' then
        raise exception using
            errcode = '22023',
            message = 'A teljes név 2 és 120 karakter közötti lehet.';
    end if;

    return v_value;
end;
$$;


ALTER FUNCTION "private"."lumi_customer_name"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."lumi_customer_notes"("p_value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare
    v_value text := nullif(trim(coalesce(p_value, '')), '');
begin
    if v_value is null then
        return null;
    end if;

    if char_length(v_value) > 500 or v_value ~ E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]' then
        raise exception using
            errcode = '22023',
            message = 'Az egyéb kérés legfeljebb 500 karakter lehet.';
    end if;

    return v_value;
end;
$$;


ALTER FUNCTION "private"."lumi_customer_notes"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."lumi_customer_phone"("p_value" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare
    v_digits text := regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g');
begin
    if char_length(v_digits) = 11 and left(v_digits, 2) = '36' then
        v_digits := substr(v_digits, 3);
    end if;

    if char_length(v_digits) <> 9 then
        raise exception using
            errcode = '22023',
            message = 'Adj meg egy érvényes magyar telefonszámot.';
    end if;

    return '+36 ' || v_digits;
end;
$$;


ALTER FUNCTION "private"."lumi_customer_phone"("p_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."lumi_customer_preference"("p_value" "text", "p_allowed" "text"[], "p_label" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare
    v_value text := nullif(trim(coalesce(p_value, '')), '');
begin
    if v_value is null then
        return null;
    end if;

    if not (v_value = any(p_allowed)) then
        raise exception using
            errcode = '22023',
            message = 'Érvénytelen ' || p_label || '.';
    end if;

    return v_value;
end;
$$;


ALTER FUNCTION "private"."lumi_customer_preference"("p_value" "text", "p_allowed" "text"[], "p_label" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "private"."purge_expired_non_booking_data"() RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "private"."purge_expired_non_booking_data"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_registered_customer_profiles"() RETURNS TABLE("user_id" "uuid", "customer_name" "text", "customer_email" "text", "customer_phone" "text")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
    if not public.is_lumi_admin() then
        raise exception 'Admin jogosultság szükséges.' using errcode = '42501';
    end if;

    return query
    select
        users.id as user_id,
        coalesce(
            nullif(trim(profiles.full_name), ''),
            nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
            nullif(trim(users.raw_user_meta_data ->> 'name'), ''),
            split_part(users.email, '@', 1)
        )::text as customer_name,
        trim(users.email)::text as customer_email,
        coalesce(
            nullif(trim(profiles.phone), ''),
            nullif(trim(users.raw_user_meta_data ->> 'phone'), ''),
            nullif(trim(users.phone), '')
        )::text as customer_phone
    from auth.users as users
    left join public.customer_profiles as profiles
        on profiles.user_id = users.id
    where coalesce(users.is_anonymous, false) = false
      and users.deleted_at is null
      and nullif(trim(users.email), '') is not null
    order by users.created_at desc;
end;
$$;


ALTER FUNCTION "public"."admin_registered_customer_profiles"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_registered_customer_profiles"() IS 'Admin-only list of real, non-anonymous Supabase Auth registrations with name, email and phone.';



CREATE OR REPLACE FUNCTION "public"."apply_admin_booking_changes"("p_operation_id" "uuid", "p_changes" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
    if not public.is_lumi_admin() then
        raise exception 'Admin jogosultság szükséges.' using errcode = '42501';
    end if;
    return public.apply_admin_booking_changes_internal(p_operation_id, p_changes);
end;
$$;


ALTER FUNCTION "public"."apply_admin_booking_changes"("p_operation_id" "uuid", "p_changes" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_admin_booking_changes_internal"("p_operation_id" "uuid", "p_changes" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."apply_admin_booking_changes_internal"("p_operation_id" "uuid", "p_changes" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."attach_booking_inspiration"("p_booking_id" "uuid", "p_images" "jsonb", "p_nail_style" "text", "p_nail_style_note" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_first jsonb;
begin
    if p_booking_id is null then
        raise exception 'Hiányzó foglalás azonosító.';
    end if;

    if jsonb_typeof(coalesce(p_images, '[]'::jsonb)) <> 'array' then
        raise exception 'Érvénytelen kép lista.';
    end if;

    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) as kep
        where coalesce(kep->>'path', '') <> ''
            and kep->>'path' not like 'booking-inspirations/%'
    ) then
        raise exception 'Érvénytelen képútvonal.';
    end if;

    v_first := coalesce(p_images->0, '{}'::jsonb);

    update public.bookings
    set
        inspiration_images = coalesce(p_images, '[]'::jsonb),
        inspiration_image_url = nullif(trim(coalesce(v_first->>'url', '')), ''),
        inspiration_image_path = nullif(trim(coalesce(v_first->>'path', '')), ''),
        inspiration_image_name = left(nullif(trim(coalesce(v_first->>'name', '')), ''), 240),
        inspiration_image_type = left(nullif(trim(coalesce(v_first->>'type', '')), ''), 120),
        inspiration_image_size = nullif(coalesce(v_first->>'size', ''), '')::integer,
        nail_style = left(trim(coalesce(p_nail_style, '')), 120),
        nail_style_note = left(trim(coalesce(p_nail_style_note, '')), 1200)
    where id = p_booking_id
        and created_at > now() - interval '2 hours';

    if not found then
        raise exception 'A foglaláshoz már nem lehet inspirációs képet csatolni.';
    end if;
end;
$$;


ALTER FUNCTION "public"."attach_booking_inspiration"("p_booking_id" "uuid", "p_images" "jsonb", "p_nail_style" "text", "p_nail_style_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_booking_by_reference"("p_reference" "text", "p_note" "text" DEFAULT ''::"text") RETURNS TABLE("success" boolean, "result" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
    v_booking_id uuid;
begin
    select bookings.id
    into v_booking_id
    from public.bookings as bookings
    where (
        upper(replace(bookings.public_reference, '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
        or upper(replace(coalesce(bookings.legacy_public_reference, ''), '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
    );

    if not found then
        return query select false, 'not_found'::text, 'Nem található foglalás ezzel az azonosítóval.'::text;
        return;
    end if;

    return query
    select cancellation.success, cancellation.result, cancellation.message
    from private.lumi_cancel_booking(v_booking_id, p_note, 'self_service') as cancellation;
end;
$$;


ALTER FUNCTION "public"."cancel_booking_by_reference"("p_reference" "text", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_booking_by_reference"("p_reference" "text", "p_note" "text") IS 'Legacy reference-only cancellation retained for database history; direct anon/authenticated execution is disabled. Use manage-booking Edge Function.';



CREATE OR REPLACE FUNCTION "public"."cancel_booking_by_verified_contact"("p_reference" "text", "p_contact" "text", "p_note" "text" DEFAULT ''::"text") RETURNS TABLE("success" boolean, "result" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
    v_booking_id uuid;
begin
    select b.id
    into v_booking_id
    from public.bookings b
    where (
        upper(replace(b.public_reference, '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
        or upper(replace(coalesce(b.legacy_public_reference, ''), '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
    )
      and private.lumi_booking_contact_matches(b.customer_email, b.customer_phone, p_contact)
    limit 1;

    if not found then
        return query select false, 'not_found'::text, 'A megadott adatokkal nem található foglalás.'::text;
        return;
    end if;

    return query
    select cancellation.success, cancellation.result, cancellation.message
    from private.lumi_cancel_booking(v_booking_id, p_note, 'self_service') as cancellation;
end;
$$;


ALTER FUNCTION "public"."cancel_booking_by_verified_contact"("p_reference" "text", "p_contact" "text", "p_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_booking_by_verified_contact"("p_reference" "text", "p_contact" "text", "p_note" "text") IS 'Service-role-only self-service cancellation requiring LUMI reference plus matching email address or normalized phone number.';



CREATE OR REPLACE FUNCTION "public"."cancel_my_booking"("p_booking_id" "uuid", "p_note" "text" DEFAULT ''::"text") RETURNS TABLE("success" boolean, "result" "text", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
    v_booking_id uuid;
begin
    if not public.is_verified_customer() then
        raise exception using errcode = '42501', message = 'Hitelesített vendégfiók szükséges.';
    end if;

    select bookings.id
    into v_booking_id
    from public.bookings as bookings
    where bookings.id = p_booking_id
      and bookings.customer_user_id = auth.uid();

    if not found then
        return query select false, 'not_found'::text, 'Nem található ez a foglalás.'::text;
        return;
    end if;

    return query
    select cancellation.success, cancellation.result, cancellation.message
    from private.lumi_cancel_booking(v_booking_id, p_note, 'customer_account') as cancellation;
end;
$$;


ALTER FUNCTION "public"."cancel_my_booking"("p_booking_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_due_booking_email_jobs"("p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "booking_id" "uuid", "kind" "text", "payload" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."claim_due_booking_email_jobs"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_due_booking_monthly_reports"("p_limit" integer DEFAULT 3) RETURNS TABLE("report_month" "date")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."claim_due_booking_monthly_reports"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_due_booking_reminders"("p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "customer_name" "text", "customer_email" "text", "customer_phone" "text", "note" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "created_at" timestamp with time zone, "status" "text", "service_name" "text", "service_price_text" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."claim_due_booking_reminders"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_due_booking_review_requests"("p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "customer_name" "text", "customer_email" "text", "customer_phone" "text", "note" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "created_at" timestamp with time zone, "status" "text", "service_name" "text", "service_price_text" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."claim_due_booking_review_requests"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_expired_bookings_for_retention"("p_limit" integer DEFAULT 20) RETURNS TABLE("id" "uuid", "inspiration_image_path" "text", "inspiration_images" "jsonb")
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."claim_expired_bookings_for_retention"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_booking_inspiration"("p_booking_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
    if not public.is_lumi_admin() then
        raise exception 'Admin jogosultság szükséges.' using errcode = '42501';
    end if;
    perform public.clear_booking_inspiration_internal(p_booking_id);
end;
$$;


ALTER FUNCTION "public"."clear_booking_inspiration"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_booking_inspiration_internal"("p_booking_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    update public.bookings
    set
        inspiration_images = '[]'::jsonb,
        inspiration_image_url = null,
        inspiration_image_path = null,
        inspiration_image_name = null,
        inspiration_image_type = null,
        inspiration_image_size = null
    where id = p_booking_id;
end;
$$;


ALTER FUNCTION "public"."clear_booking_inspiration_internal"("p_booking_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_booking_management_rate_limit"("p_client_hash" "text") RETURNS TABLE("allowed" boolean, "retry_after_seconds" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
    v_hash text := lower(trim(coalesce(p_client_hash, '')));
    v_now timestamptz := clock_timestamp();
    v_window_started_at timestamptz;
    v_request_count integer;
begin
    if v_hash !~ '^[0-9a-f]{64}$' then
        raise exception using errcode = '22023', message = 'Érvénytelen kliensazonosító.';
    end if;

    insert into private.booking_management_rate_limits as limits (
        client_hash,
        window_started_at,
        request_count,
        updated_at
    ) values (
        v_hash,
        v_now,
        1,
        v_now
    )
    on conflict (client_hash) do update
    set window_started_at = case
            when limits.window_started_at <= v_now - interval '1 minute' then v_now
            else limits.window_started_at
        end,
        request_count = case
            when limits.window_started_at <= v_now - interval '1 minute' then 1
            else limits.request_count + 1
        end,
        updated_at = v_now
    returning window_started_at, request_count
    into v_window_started_at, v_request_count;

    allowed := v_request_count <= 5;
    retry_after_seconds := case
        when allowed then 0
        else greatest(
            1,
            ceil(extract(epoch from (v_window_started_at + interval '1 minute' - v_now)))::integer
        )
    end;

    return next;
end;
$_$;


ALTER FUNCTION "public"."consume_booking_management_rate_limit"("p_client_hash" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."consume_booking_management_rate_limit"("p_client_hash" "text") IS 'Service-role-only fixed-window rate limiter for public booking management. Stores only a SHA-256 client hash.';



CREATE OR REPLACE FUNCTION "public"."create_booking"("p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_coupon_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    v_duration integer;
    v_style_extra_minutes integer := 0;
    v_price_amount integer;
    v_price_unit text;
    v_price_suffix text;
    v_service_name text;
    v_service_category text;
    v_ends_at timestamptz;
    v_booking_id uuid;
    v_coupon public.coupons%rowtype;
    v_discount_amount integer := 0;
    v_final_price integer;
begin
    select duration_minutes, price_amount, price_unit, price_suffix, name
    into v_duration, v_price_amount, v_price_unit, v_price_suffix, v_service_name
    from public.services
    where id = p_service_id
        and active = true
        and booking_enabled = true;

    if v_duration is null then
        raise exception 'Ez a szolgaltatas jelenleg nem foglalhato.';
    end if;

    v_service_category := public.lumi_service_coupon_category(v_service_name);

    if v_duration = 0 then
        select aw.slot_step_minutes
        into v_duration
        from public.availability_windows aw
        where aw.active = true
            and aw.work_date = (p_starts_at at time zone 'Europe/Budapest')::date
            and p_starts_at >= (
                (
                    (p_starts_at at time zone 'Europe/Budapest')::date::text
                    || ' '
                    || aw.start_time::text
                )::timestamp at time zone 'Europe/Budapest'
            )
            and p_starts_at < (
                (
                    (p_starts_at at time zone 'Europe/Budapest')::date::text
                    || ' '
                    || aw.end_time::text
                )::timestamp at time zone 'Europe/Budapest'
            )
        order by aw.start_time
        limit 1;
    end if;

    v_style_extra_minutes := public.lumi_booking_style_extra_minutes(
        split_part(coalesce(p_note, ''), E'\n', 1)
    );
    v_duration := v_duration + v_style_extra_minutes;
    v_ends_at := p_starts_at + make_interval(mins => v_duration);

    if not exists (
        select 1
        from public.get_available_slots_for_style(
            p_service_id,
            (p_starts_at at time zone 'Europe/Budapest')::date,
            split_part(coalesce(p_note, ''), E'\n', 1)
        ) s
        where s.starts_at = p_starts_at
    ) then
        raise exception 'Ez az idopont mar nem szabad. Kerlek valassz masikat.';
    end if;

    if p_coupon_id is not null
        or nullif(trim(coalesce(p_coupon_code, '')), '') is not null
    then
        select *
        into v_coupon
        from public.coupons c
        where c.active = true
            and (p_coupon_id is null or c.id = p_coupon_id)
            and (
                nullif(trim(coalesce(p_coupon_code, '')), '') is null
                or upper(trim(c.code)) = upper(trim(p_coupon_code))
            )
            and (c.valid_from is null or c.valid_from <= current_date)
            and (c.valid_until is null or c.valid_until >= current_date)
            and (c.service_id is null or c.service_id = p_service_id)
            and (
                nullif(trim(coalesce(c.service_category, '')), '') is null
                or lower(trim(c.service_category))
                    = lower(trim(coalesce(v_service_category, '')))
            )
            and (
                coalesce(c.customer_scope, 'all') <> 'new_customer'
                or not public.lumi_customer_has_previous_booking(p_customer_email)
            )
        order by c.sort_order asc, c.created_at asc
        limit 1;

        if v_coupon.id is null then
            raise exception 'Ez a kupon nem ervenyes ehhez a foglalashoz, vagy ezzel az email cimmel mar volt foglalas.';
        end if;

        v_discount_amount := public.lumi_coupon_discount_amount(
            v_price_amount,
            v_coupon.discount_type,
            v_coupon.discount_value
        );
    end if;

    v_final_price := case
        when coalesce(v_price_amount, 0) > 0
        then greatest(0, v_price_amount - coalesce(v_discount_amount, 0))
        else null
    end;

    insert into public.bookings (
        service_id,
        customer_name,
        customer_phone,
        customer_email,
        note,
        starts_at,
        ends_at,
        service_price_amount,
        service_price_unit,
        service_price_suffix,
        coupon_id,
        coupon_code,
        coupon_title,
        coupon_discount_type,
        coupon_discount_value,
        coupon_discount_amount,
        final_price_amount
    )
    values (
        p_service_id,
        trim(p_customer_name),
        trim(p_customer_phone),
        lower(trim(p_customer_email)),
        coalesce(trim(p_note), ''),
        p_starts_at,
        v_ends_at,
        v_price_amount,
        v_price_unit,
        v_price_suffix,
        v_coupon.id,
        nullif(v_coupon.code, ''),
        nullif(v_coupon.title, ''),
        nullif(v_coupon.discount_type, ''),
        v_coupon.discount_value,
        nullif(v_discount_amount, 0),
        v_final_price
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
            'customer_email', lower(trim(p_customer_email)),
            'style_extra_minutes', v_style_extra_minutes,
            'coupon_code', v_coupon.code,
            'final_price_amount', v_final_price
        )
    );

    return v_booking_id;
exception
    when exclusion_violation then
        raise exception 'Ez az idopont kozben betelt. Kerlek valassz masikat.';
end;
$$;


ALTER FUNCTION "public"."create_booking"("p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_coupon_id" "uuid", "p_coupon_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_booking_idempotent"("p_request_key" "uuid", "p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_coupon_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."create_booking_idempotent"("p_request_key" "uuid", "p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_coupon_id" "uuid", "p_coupon_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_booking_idempotent_for_user"("p_request_key" "uuid", "p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_customer_user_id" "uuid", "p_coupon_id" "uuid" DEFAULT NULL::"uuid", "p_coupon_code" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
    v_booking_id uuid;
    v_verified_email text;
    v_linked_user_id uuid;
begin
    if not public.customer_accounts_ready() then
        raise exception using errcode = '42501', message = 'A vendégfiók még nincs engedélyezve.';
    end if;

    if p_customer_user_id is null then
        raise exception using errcode = '22023', message = 'Hiányzó vendégfiók-azonosító.';
    end if;

    select lower(trim(users.email))
    into v_verified_email
    from auth.users as users
    where users.id = p_customer_user_id
      and users.email_confirmed_at is not null
      and coalesce(users.is_anonymous, false) = false
      and users.deleted_at is null
      and (users.banned_until is null or users.banned_until <= now());

    if not found or v_verified_email is distinct from lower(trim(p_customer_email)) then
        raise exception using errcode = '42501', message = 'A foglalási e-mail nem egyezik a hitelesített fiókkal.';
    end if;

    v_booking_id := public.create_booking_idempotent(
        p_request_key,
        p_service_id,
        p_customer_name,
        p_customer_phone,
        v_verified_email,
        p_note,
        p_starts_at,
        p_coupon_id,
        p_coupon_code
    );

    select bookings.customer_user_id
    into v_linked_user_id
    from public.bookings as bookings
    where bookings.id = v_booking_id
    for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'A létrehozott foglalás nem található.';
    end if;

    if v_linked_user_id is not null and v_linked_user_id <> p_customer_user_id then
        raise exception using errcode = '42501', message = 'A foglalás már másik fiókhoz tartozik.';
    end if;

    if v_linked_user_id is null then
        update public.bookings
        set customer_user_id = p_customer_user_id
        where id = v_booking_id;
    end if;

    return v_booking_id;
end;
$$;


ALTER FUNCTION "public"."create_booking_idempotent_for_user"("p_request_key" "uuid", "p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_customer_user_id" "uuid", "p_coupon_id" "uuid", "p_coupon_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_booking_idempotent_for_user"("p_request_key" "uuid", "p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_customer_user_id" "uuid", "p_coupon_id" "uuid", "p_coupon_code" "text") IS 'Service-role-only atomic booking creation and verified customer ownership binding.';



CREATE OR REPLACE FUNCTION "public"."customer_accounts_ready"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
    select coalesce((
        select lower(coalesce(settings.value ->> 'enabled', 'false')) = 'true'
        from public.site_settings as settings
        where settings.key = 'customer_accounts'
    ), false);
$$;


ALTER FUNCTION "public"."customer_accounts_ready"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_booking_web_push"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'net'
    AS $$
declare
    v_secret text;
    v_body jsonb;
begin
    -- Strictly best-effort: this function must never decide whether a booking write succeeds.
    if tg_op = 'UPDATE' then
        if new.status not in ('cancelled', 'cancelled_by_customer')
           or old.status in ('cancelled', 'cancelled_by_customer') then
            return new;
        end if;
    elsif tg_op <> 'INSERT' then
        return new;
    end if;

    begin
        select decrypted_secret
        into v_secret
        from vault.decrypted_secrets
        where name = 'lumi_web_push_webhook_secret'
        limit 1;

        if coalesce(v_secret, '') = '' then
            return new;
        end if;

        v_body := jsonb_build_object(
            'type', tg_op,
            'record', to_jsonb(new),
            'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
        );

        perform net.http_post(
            url := 'https://htbpzvmlegapaphsipax.supabase.co/functions/v1/send-web-push',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-lumi-web-push-secret', v_secret
            ),
            body := v_body,
            timeout_milliseconds := 1500
        );
    exception
        when others then
            raise warning 'Lumi Web Push enqueue failed: %', sqlerrm;
    end;

    return new;
end;
$$;


ALTER FUNCTION "public"."enqueue_booking_web_push"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enqueue_booking_web_push"() IS 'Best-effort async Web Push enqueue. Any push error is swallowed and cannot roll back booking writes.';



CREATE OR REPLACE FUNCTION "public"."enqueue_new_booking_email"("p_booking_id" "uuid") RETURNS TABLE("id" "uuid", "booking_id" "uuid", "kind" "text", "payload" "jsonb", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."enqueue_new_booking_email"("p_booking_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."customer_profiles" (
    "user_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "phone" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "nail_shape" "text",
    "nail_length" "text",
    "preferred_nail_style" "text",
    "nail_notes" "text",
    CONSTRAINT "customer_profiles_full_name_length" CHECK ((("char_length"("full_name") >= 2) AND ("char_length"("full_name") <= 120))),
    CONSTRAINT "customer_profiles_full_name_no_control_characters" CHECK (("full_name" !~ '[[:cntrl:]]'::"text")),
    CONSTRAINT "customer_profiles_nail_length_allowed" CHECK ((("nail_length" IS NULL) OR ("nail_length" = ANY (ARRAY['Rövid'::"text", 'Közepes'::"text", 'Hosszú'::"text"])))),
    CONSTRAINT "customer_profiles_nail_notes_length" CHECK ((("nail_notes" IS NULL) OR ("char_length"("nail_notes") <= 500))),
    CONSTRAINT "customer_profiles_nail_shape_allowed" CHECK ((("nail_shape" IS NULL) OR ("nail_shape" = ANY (ARRAY['Mandula'::"text", 'Kocka'::"text", 'Ovális'::"text", 'Balerina'::"text", 'Stiletto'::"text"])))),
    CONSTRAINT "customer_profiles_nail_style_allowed" CHECK ((("preferred_nail_style" IS NULL) OR ("preferred_nail_style" = ANY (ARRAY['Egyszerű / egyszínű köröm'::"text", 'Francia köröm'::"text", 'Festés / díszítés'::"text"])))),
    CONSTRAINT "customer_profiles_phone_hungarian" CHECK (("phone" ~ '^\+36 [0-9]{9}$'::"text"))
);

ALTER TABLE ONLY "public"."customer_profiles" FORCE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."customer_profiles" IS 'Verified customer profile data. Authentication secrets remain in Supabase Auth.';



CREATE OR REPLACE FUNCTION "public"."ensure_customer_account"("p_full_name" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text") RETURNS "public"."customer_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
    v_user_id uuid := auth.uid();
    v_email text;
    v_metadata jsonb;
    v_full_name text;
    v_phone text;
    v_profile public.customer_profiles;
begin
    if not public.customer_accounts_ready() then
        raise exception using errcode = '42501', message = 'A vendégfiók még nincs engedélyezve.';
    end if;

    if v_user_id is null then
        raise exception using errcode = '42501', message = 'Bejelentkezés szükséges.';
    end if;

    select lower(trim(users.email)), coalesce(users.raw_user_meta_data, '{}'::jsonb)
    into v_email, v_metadata
    from auth.users as users
    where users.id = v_user_id
      and users.email_confirmed_at is not null
      and coalesce(users.is_anonymous, false) = false
      and users.deleted_at is null
      and (users.banned_until is null or users.banned_until <= now());

    if not found or v_email is null or v_email = '' then
        raise exception using errcode = '42501', message = 'A fiók e-mail-címe még nincs hitelesítve.';
    end if;

    select profiles.*
    into v_profile
    from public.customer_profiles as profiles
    where profiles.user_id = v_user_id;

    if found then
        update public.bookings
        set customer_user_id = v_user_id
        where customer_user_id is null
          and lower(trim(customer_email)) = v_email;

        return v_profile;
    end if;

    v_full_name := private.lumi_customer_name(
        coalesce(nullif(trim(p_full_name), ''), nullif(trim(v_metadata ->> 'full_name'), ''))
    );
    v_phone := private.lumi_customer_phone(
        coalesce(nullif(trim(p_phone), ''), nullif(trim(v_metadata ->> 'phone'), ''))
    );

    insert into public.customer_profiles (user_id, full_name, phone)
    values (v_user_id, v_full_name, v_phone)
    on conflict (user_id) do nothing;

    update public.bookings
    set customer_user_id = v_user_id
    where customer_user_id is null
      and lower(trim(customer_email)) = v_email;

    select profiles.*
    into strict v_profile
    from public.customer_profiles as profiles
    where profiles.user_id = v_user_id;

    return v_profile;
end;
$$;


ALTER FUNCTION "public"."ensure_customer_account"("p_full_name" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finish_booking_email_job"("p_job_id" "uuid", "p_success" boolean, "p_error" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."finish_booking_email_job"("p_job_id" "uuid", "p_success" boolean, "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finish_booking_monthly_report"("p_report_month" "date", "p_success" boolean, "p_error" "text" DEFAULT NULL::"text", "p_report_data" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."finish_booking_monthly_report"("p_report_month" "date", "p_success" boolean, "p_error" "text", "p_report_data" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finish_booking_reminder"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    update public.bookings
    set
        reminder_locked_at = null,
        reminder_attempts = coalesce(reminder_attempts, 0) + 1,
        reminder_sent_at = case when p_success then now() else reminder_sent_at end,
        reminder_last_error = case when p_success then null else left(coalesce(p_error, 'Ismeretlen email hiba'), 2000) end
    where id = p_booking_id;

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
        'booking_reminder_email',
        'email',
        case when p_success then 'success' else 'error' end,
        case when p_success then 'Emlékeztető email elküldve' else 'Emlékeztető email hiba' end,
        case when p_success then 'A vendég megkapta a foglalás előtti emlékeztetőt.' else left(coalesce(p_error, 'Az emlékeztető email nem ment ki.'), 2000) end,
        jsonb_build_object('ok', p_success, 'error', p_error)
    );
end;
$$;


ALTER FUNCTION "public"."finish_booking_reminder"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finish_booking_review_request"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."finish_booking_review_request"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finish_expired_booking_retention"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."finish_expired_booking_retention"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_dates"("p_service_id" "uuid", "p_start_date" "date" DEFAULT CURRENT_DATE, "p_days" integer DEFAULT 90) RETURNS TABLE("work_date" "date", "label" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_available_dates"("p_service_id" "uuid", "p_start_date" "date", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_dates_for_style"("p_service_id" "uuid", "p_nail_style" "text" DEFAULT ''::"text", "p_start_date" "date" DEFAULT CURRENT_DATE, "p_days" integer DEFAULT 90) RETURNS TABLE("work_date" "date", "label" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
        from public.get_available_slots_for_style(
            p_service_id,
            days.work_date,
            p_nail_style
        )
        limit 1
    )
    order by days.work_date;
$$;


ALTER FUNCTION "public"."get_available_dates_for_style"("p_service_id" "uuid", "p_nail_style" "text", "p_start_date" "date", "p_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_slots"("p_service_id" "uuid", "p_date" "date") RETURNS TABLE("starts_at" timestamp with time zone, "label" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_available_slots"("p_service_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_slots_for_style"("p_service_id" "uuid", "p_date" "date", "p_nail_style" "text" DEFAULT ''::"text") RETURNS TABLE("starts_at" timestamp with time zone, "label" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."get_available_slots_for_style"("p_service_id" "uuid", "p_date" "date", "p_nail_style" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_booking_monthly_report_data"("p_report_month" "date") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."get_booking_monthly_report_data"("p_report_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_booking_reference_after_creation"("p_booking_id" "uuid", "p_customer_email" "text") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select b.public_reference
    from public.bookings b
    where b.id = p_booking_id
      and lower(trim(b.customer_email)) = lower(trim(coalesce(p_customer_email, '')))
    limit 1;
$$;


ALTER FUNCTION "public"."get_booking_reference_after_creation"("p_booking_id" "uuid", "p_customer_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_booking_status"("p_reference" "text") RETURNS TABLE("booking_reference" "text", "service_name" "text", "service_price_amount" integer, "final_price_amount" integer, "service_price_unit" "text", "service_price_text" "text", "nail_style" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "status" "text", "status_label" "text", "coupon_label" "text", "can_cancel" boolean, "cancellation_note_required" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select
        b.public_reference,
        coalesce(s.name, s.description, 'Szolgaltatas')::text,
        b.service_price_amount,
        b.final_price_amount,
        coalesce(nullif(trim(b.service_price_unit), ''), 'Ft')::text,
        nullif(trim(coalesce(s.price_text, '')), '')::text,
        nullif(trim(coalesce(b.nail_style, '')), '')::text,
        b.starts_at,
        b.ends_at,
        b.status,
        case b.status
            when 'pending' then 'Fuggoben'
            when 'confirmed' then 'Visszaigazolva'
            when 'done' then 'Teljesitve'
            when 'cancelled' then 'Lemondva'
            when 'cancelled_by_customer' then 'Altalad lemondva'
            else 'Ismeretlen'
        end::text,
        nullif(concat_ws(' - ', nullif(trim(coalesce(b.coupon_code, '')), ''), nullif(trim(coalesce(b.coupon_title, '')), '')), '')::text,
        (b.status in ('pending', 'confirmed') and b.starts_at > now()),
        (b.status in ('pending', 'confirmed') and b.starts_at > now() and b.starts_at <= now() + interval '24 hours')
    from public.bookings b
    left join public.services s on s.id = b.service_id
    where (
        upper(replace(b.public_reference, '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
        or upper(replace(coalesce(b.legacy_public_reference, ''), '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
    )
    limit 1;
$$;


ALTER FUNCTION "public"."get_booking_status"("p_reference" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_booking_status"("p_reference" "text") IS 'Legacy reference-only lookup retained for database history; direct anon/authenticated execution is disabled. Use manage-booking Edge Function.';



CREATE OR REPLACE FUNCTION "public"."get_booking_status_verified"("p_reference" "text", "p_contact" "text") RETURNS TABLE("booking_reference" "text", "service_name" "text", "service_price_amount" integer, "final_price_amount" integer, "service_price_unit" "text", "service_price_text" "text", "nail_style" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "status" "text", "status_label" "text", "coupon_label" "text", "can_cancel" boolean, "cancellation_note_required" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select
        b.public_reference,
        coalesce(s.name, s.description, 'Szolgaltatas')::text,
        b.service_price_amount,
        b.final_price_amount,
        coalesce(nullif(trim(b.service_price_unit), ''), 'Ft')::text,
        nullif(trim(coalesce(s.price_text, '')), '')::text,
        nullif(trim(coalesce(b.nail_style, '')), '')::text,
        b.starts_at,
        b.ends_at,
        b.status,
        case b.status
            when 'pending' then 'Fuggoben'
            when 'confirmed' then 'Visszaigazolva'
            when 'done' then 'Teljesitve'
            when 'cancelled' then 'Lemondva'
            when 'cancelled_by_customer' then 'Altalad lemondva'
            else 'Ismeretlen'
        end::text,
        nullif(concat_ws(' - ', nullif(trim(coalesce(b.coupon_code, '')), ''), nullif(trim(coalesce(b.coupon_title, '')), '')), '')::text,
        (b.status in ('pending', 'confirmed') and b.starts_at > now()),
        (b.status in ('pending', 'confirmed') and b.starts_at > now() and b.starts_at <= now() + interval '24 hours')
    from public.bookings b
    left join public.services s on s.id = b.service_id
    where (
        upper(replace(b.public_reference, '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
        or upper(replace(coalesce(b.legacy_public_reference, ''), '-', '')) =
            upper(regexp_replace(trim(coalesce(p_reference, '')), '[^a-zA-Z0-9]', '', 'g'))
    )
      and private.lumi_booking_contact_matches(b.customer_email, b.customer_phone, p_contact)
    limit 1;
$$;


ALTER FUNCTION "public"."get_booking_status_verified"("p_reference" "text", "p_contact" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_booking_status_verified"("p_reference" "text", "p_contact" "text") IS 'Service-role-only booking status lookup requiring LUMI reference plus matching email address or normalized phone number.';



CREATE OR REPLACE FUNCTION "public"."get_my_booking_history"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("booking_id" "uuid", "public_reference" "text", "service_id" "uuid", "service_name" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "status" "text", "nail_style" "text", "note" "text", "final_price_amount" integer, "service_price_unit" "text", "service_price_suffix" "text", "total_count" bigint)
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
    if not public.is_verified_customer() then
        raise exception using errcode = '42501', message = 'Hitelesített vendégfiók szükséges.';
    end if;

    return query
    select
        bookings.id,
        bookings.public_reference,
        bookings.service_id,
        services.name,
        bookings.starts_at,
        bookings.ends_at,
        bookings.status,
        nullif(trim(bookings.nail_style), ''),
        nullif(trim(bookings.note), ''),
        bookings.final_price_amount,
        bookings.service_price_unit,
        bookings.service_price_suffix,
        count(*) over ()
    from public.bookings as bookings
    left join public.services as services on services.id = bookings.service_id
    where bookings.customer_user_id = auth.uid()
    order by bookings.starts_at desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0);
end;
$$;


ALTER FUNCTION "public"."get_my_booking_history"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_booking_history"("p_limit" integer, "p_offset" integer) IS 'Curated booking history for the currently authenticated, email-verified customer.';



CREATE OR REPLACE FUNCTION "public"."get_web_push_server_config"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault'
    AS $$
    select jsonb_build_object(
        'vapid_public_key', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_web_push_vapid_public' limit 1),
        'vapid_private_key', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_web_push_vapid_private' limit 1),
        'vapid_subject', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_web_push_vapid_subject' limit 1),
        'webhook_secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_web_push_webhook_secret' limit 1)
    );
$$;


ALTER FUNCTION "public"."get_web_push_server_config"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_web_push_server_config"() IS 'Server-only Web Push configuration backed by Supabase Vault. EXECUTE is restricted to service_role.';



CREATE OR REPLACE FUNCTION "public"."is_lumi_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select exists (
        select 1
        from private.lumi_admins as admins
        where admins.user_id = auth.uid()
    );
$$;


ALTER FUNCTION "public"."is_lumi_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_verified_customer"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
    select public.customer_accounts_ready()
       and exists (
        select 1
        from auth.users as users
        where users.id = auth.uid()
          and users.email_confirmed_at is not null
          and coalesce(users.is_anonymous, false) = false
          and users.deleted_at is null
          and (users.banned_until is null or users.banned_until <= now())
    );
$$;


ALTER FUNCTION "public"."is_verified_customer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_arlista_ervenyesseg_frissitese"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
    insert into public.site_settings (key, value, updated_at)
    values (
        'arlista_ervenyesseg',
        jsonb_build_object('effective_since', now()),
        now()
    )
    on conflict (key) do update
    set value = excluded.value,
        updated_at = excluded.updated_at;

    return new;
end;
$$;


ALTER FUNCTION "public"."lumi_arlista_ervenyesseg_frissitese"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_booking_has_decoration"("p_note" "text") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
    select
        lower(coalesce(split_part(p_note, E'\n', 1), '')) like '%dísz%'
        or lower(coalesce(split_part(p_note, E'\n', 1), '')) like '%disz%'
        or lower(coalesce(split_part(p_note, E'\n', 1), '')) like '%fest%';
$$;


ALTER FUNCTION "public"."lumi_booking_has_decoration"("p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_booking_previous_day_noon"("p_starts_at" timestamp with time zone) RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
    select ((((p_starts_at at time zone 'Europe/Budapest')::date - 1) + time '12:00') at time zone 'Europe/Budapest');
$$;


ALTER FUNCTION "public"."lumi_booking_previous_day_noon"("p_starts_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_booking_style_extra_minutes"("p_style" "text") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
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


ALTER FUNCTION "public"."lumi_booking_style_extra_minutes"("p_style" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_booking_two_days_later_noon"("p_reference" timestamp with time zone DEFAULT "now"()) RETURNS timestamp with time zone
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
    select ((((coalesce(p_reference, now()) at time zone 'Europe/Budapest')::date + 2) + time '12:00') at time zone 'Europe/Budapest');
$$;


ALTER FUNCTION "public"."lumi_booking_two_days_later_noon"("p_reference" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_coupon_discount_amount"("p_price_amount" integer, "p_discount_type" "text", "p_discount_value" integer) RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    AS $$
    select case
        when coalesce(p_price_amount, 0) <= 0 then 0
        when p_discount_type = 'percent' then least(p_price_amount, greatest(0, round(p_price_amount * coalesce(p_discount_value, 0)::numeric / 100)::integer))
        when p_discount_type = 'fixed' then least(p_price_amount, greatest(0, coalesce(p_discount_value, 0)))
        else 0
    end;
$$;


ALTER FUNCTION "public"."lumi_coupon_discount_amount"("p_price_amount" integer, "p_discount_type" "text", "p_discount_value" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_customer_has_previous_booking"("p_customer_email" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    select exists (
        select 1
        from public.bookings b
        where nullif(trim(coalesce(p_customer_email, '')), '') is not null
            and lower(trim(b.customer_email)) = lower(trim(p_customer_email))
            and coalesce(b.status, '') <> 'cancelled'
    );
$$;


ALTER FUNCTION "public"."lumi_customer_has_previous_booking"("p_customer_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_enforce_booking_buffer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
    if new.status not in ('pending', 'confirmed', 'done') then
        return new;
    end if;

    -- Aktiv foglalasok kozotti statuszvaltas nem valtoztatja meg a naptarat.
    if tg_op = 'UPDATE' then
        if new.starts_at is not distinct from old.starts_at
            and new.ends_at is not distinct from old.ends_at
            and old.status in ('pending', 'confirmed', 'done') then
            return new;
        end if;
    end if;

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

    return new;
end;
$$;


ALTER FUNCTION "public"."lumi_enforce_booking_buffer"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_new_booking_reference"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
    v_alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    v_bytes bytea;
    v_reference text;
begin
    loop
        v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
        v_reference := 'LUMI-'
            || substr(v_alphabet, (get_byte(v_bytes, 0) % 32) + 1, 1)
            || substr(v_alphabet, (get_byte(v_bytes, 1) % 32) + 1, 1)
            || substr(v_alphabet, (get_byte(v_bytes, 2) % 32) + 1, 1)
            || substr(v_alphabet, (get_byte(v_bytes, 3) % 32) + 1, 1);

        exit when not exists (
            select 1
            from public.bookings b
            where b.public_reference = v_reference
        );
    end loop;

    return v_reference;
end;
$$;


ALTER FUNCTION "public"."lumi_new_booking_reference"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."lumi_service_coupon_category"("p_service_name" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
    select case
        when lower(coalesce(p_service_name, '')) like '%épít%' or lower(coalesce(p_service_name, '')) like '%epit%' then 'Építés'
        when lower(coalesce(p_service_name, '')) like '%tölt%' or lower(coalesce(p_service_name, '')) like '%tolt%' then 'Töltés'
        when lower(coalesce(p_service_name, '')) like '%gél lakk%' or lower(coalesce(p_service_name, '')) like '%géllakk%' or lower(coalesce(p_service_name, '')) like '%gel lakk%' then 'Gél lakk'
        when lower(coalesce(p_service_name, '')) like '%manik%' then 'Manikűr'
        when lower(coalesce(p_service_name, '')) like '%dísz%' or lower(coalesce(p_service_name, '')) like '%disz%' or lower(coalesce(p_service_name, '')) like '%nail art%' or lower(coalesce(p_service_name, '')) like '%kő%' or lower(coalesce(p_service_name, '')) like '%ko%' then 'Díszítés'
        when lower(coalesce(p_service_name, '')) like '%leszed%' then 'Leszedés'
        else null
    end;
$$;


ALTER FUNCTION "public"."lumi_service_coupon_category"("p_service_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_customer_preferences"("p_nail_shape" "text" DEFAULT NULL::"text", "p_nail_length" "text" DEFAULT NULL::"text", "p_preferred_nail_style" "text" DEFAULT NULL::"text", "p_nail_notes" "text" DEFAULT NULL::"text") RETURNS "public"."customer_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
    v_profile public.customer_profiles;
begin
    perform public.ensure_customer_account();

    update public.customer_profiles
    set nail_shape = private.lumi_customer_preference(
            p_nail_shape,
            array['Mandula', 'Kocka', 'Ovális', 'Balerina', 'Stiletto'],
            'körömforma'
        ),
        nail_length = private.lumi_customer_preference(
            p_nail_length,
            array['Rövid', 'Közepes', 'Hosszú'],
            'körömhossz'
        ),
        preferred_nail_style = private.lumi_customer_preference(
            p_preferred_nail_style,
            array['Egyszerű / egyszínű köröm', 'Francia köröm', 'Festés / díszítés'],
            'körömstílus'
        ),
        nail_notes = private.lumi_customer_notes(p_nail_notes),
        updated_at = now()
    where user_id = auth.uid()
    returning * into strict v_profile;

    return v_profile;
end;
$$;


ALTER FUNCTION "public"."save_customer_preferences"("p_nail_shape" "text", "p_nail_length" "text", "p_preferred_nail_style" "text", "p_nail_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_customer_preferences"("p_nail_shape" "text", "p_nail_length" "text", "p_preferred_nail_style" "text", "p_nail_notes" "text") IS 'Stores optional booking preferences only for the currently authenticated, verified customer.';



CREATE OR REPLACE FUNCTION "public"."save_customer_profile"("p_full_name" "text", "p_phone" "text") RETURNS "public"."customer_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
    v_profile public.customer_profiles;
begin
    perform public.ensure_customer_account(p_full_name, p_phone);

    update public.customer_profiles
    set full_name = private.lumi_customer_name(p_full_name),
        phone = private.lumi_customer_phone(p_phone),
        updated_at = now()
    where user_id = auth.uid()
    returning * into strict v_profile;

    return v_profile;
end;
$$;


ALTER FUNCTION "public"."save_customer_profile"("p_full_name" "text", "p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_booking_notification_schedule"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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


ALTER FUNCTION "public"."set_booking_notification_schedule"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."booking_management_rate_limits" (
    "client_hash" "text" NOT NULL,
    "window_started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "request_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "booking_management_rate_limits_request_count_check" CHECK (("request_count" >= 0))
);


ALTER TABLE "private"."booking_management_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."lumi_admins" (
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."lumi_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_booking_change_operations" (
    "operation_id" "uuid" NOT NULL,
    "changes" "jsonb" NOT NULL,
    "result" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    CONSTRAINT "admin_booking_change_operations_changes_check" CHECK (("jsonb_typeof"("changes") = 'array'::"text"))
);


ALTER TABLE "public"."admin_booking_change_operations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "weekday" integer NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "slot_step_minutes" integer DEFAULT 15 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "availability_rules_check" CHECK (("end_time" > "start_time")),
    CONSTRAINT "availability_rules_slot_step_minutes_check" CHECK (("slot_step_minutes" > 0)),
    CONSTRAINT "availability_rules_weekday_check" CHECK ((("weekday" >= 1) AND ("weekday" <= 7)))
);


ALTER TABLE "public"."availability_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."availability_windows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "slot_step_minutes" integer DEFAULT 30 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "availability_windows_check" CHECK (("end_time" > "start_time")),
    CONSTRAINT "availability_windows_slot_step_minutes_check" CHECK (("slot_step_minutes" > 0))
);


ALTER TABLE "public"."availability_windows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blocked_times" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "reason" "text" DEFAULT ''::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'blocked'::"text" NOT NULL,
    CONSTRAINT "blocked_times_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "blocked_times_status_check" CHECK (("status" = ANY (ARRAY['blocked'::"text", 'done'::"text", 'cancelled_by_customer'::"text"])))
);


ALTER TABLE "public"."blocked_times" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_email_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "dedupe_key" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locked_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "last_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "booking_email_jobs_kind_check" CHECK (("kind" = ANY (ARRAY['new_booking'::"text", 'admin_update'::"text"]))),
    CONSTRAINT "booking_email_jobs_payload_check" CHECK (("jsonb_typeof"("payload") = 'object'::"text")),
    CONSTRAINT "booking_email_jobs_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'retry'::"text", 'sent'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."booking_email_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "booking_id" "uuid",
    "event_type" "text" NOT NULL,
    "channel" "text" DEFAULT ''::"text",
    "status" "text" DEFAULT 'info'::"text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "message" "text" DEFAULT ''::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "booking_events_status_check" CHECK (("status" = ANY (ARRAY['info'::"text", 'success'::"text", 'warning'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."booking_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_monthly_report_jobs" (
    "report_month" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "locked_at" timestamp with time zone,
    "sent_at" timestamp with time zone,
    "last_error" "text",
    "report_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "booking_monthly_report_attempts_check" CHECK (("attempts" >= 0)),
    CONSTRAINT "booking_monthly_report_month_start_check" CHECK (("report_month" = ("date_trunc"('month'::"text", ("report_month")::timestamp with time zone))::"date")),
    CONSTRAINT "booking_monthly_report_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'retry'::"text", 'sent'::"text"])))
);


ALTER TABLE "public"."booking_monthly_report_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_request_keys" (
    "request_key" "uuid" NOT NULL,
    "request_payload" "jsonb" NOT NULL,
    "booking_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "inspiration_upload_started_at" timestamp with time zone,
    "inspiration_uploaded_at" timestamp with time zone
);


ALTER TABLE "public"."booking_request_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."booking_review_recipients" (
    "email" "text" NOT NULL,
    "first_booking_id" "uuid",
    "sent_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "booking_review_recipients_email_check" CHECK (("email" = "lower"(TRIM(BOTH FROM "email")))),
    CONSTRAINT "booking_review_recipients_email_check1" CHECK ((POSITION(('@'::"text") IN ("email")) > 1))
);


ALTER TABLE "public"."booking_review_recipients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "service_id" "uuid" NOT NULL,
    "customer_name" "text" NOT NULL,
    "customer_phone" "text" NOT NULL,
    "customer_email" "text" NOT NULL,
    "note" "text" DEFAULT ''::"text",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "inspiration_image_url" "text",
    "inspiration_image_path" "text",
    "inspiration_image_name" "text",
    "inspiration_image_type" "text",
    "inspiration_image_size" integer,
    "nail_style" "text" DEFAULT ''::"text",
    "nail_style_note" "text" DEFAULT ''::"text",
    "inspiration_images" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "reminder_scheduled_for" timestamp with time zone,
    "reminder_sent_at" timestamp with time zone,
    "reminder_locked_at" timestamp with time zone,
    "reminder_attempts" integer DEFAULT 0 NOT NULL,
    "reminder_last_error" "text",
    "review_request_scheduled_for" timestamp with time zone,
    "review_request_sent_at" timestamp with time zone,
    "review_request_locked_at" timestamp with time zone,
    "review_request_attempts" integer DEFAULT 0 NOT NULL,
    "review_request_last_error" "text",
    "service_price_amount" integer,
    "service_price_unit" "text",
    "service_price_suffix" "text",
    "coupon_id" "uuid",
    "coupon_code" "text",
    "coupon_title" "text",
    "coupon_discount_type" "text",
    "coupon_discount_value" integer,
    "coupon_discount_amount" integer,
    "final_price_amount" integer,
    "public_reference" "text" DEFAULT "public"."lumi_new_booking_reference"() NOT NULL,
    "legacy_public_reference" "text",
    "retention_locked_at" timestamp with time zone,
    "retention_attempts" integer DEFAULT 0 NOT NULL,
    "retention_next_attempt_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "retention_last_error" "text",
    "customer_user_id" "uuid",
    CONSTRAINT "bookings_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "bookings_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'done'::"text", 'cancelled'::"text", 'cancelled_by_customer'::"text"])))
);


ALTER TABLE "public"."bookings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."bookings"."customer_user_id" IS 'Server-assigned owner of a booking. Clients must never provide this value directly.';



CREATE TABLE IF NOT EXISTS "public"."coupons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "title" "text" DEFAULT ''::"text" NOT NULL,
    "description" "text" DEFAULT ''::"text" NOT NULL,
    "discount_type" "text" DEFAULT 'percent'::"text" NOT NULL,
    "discount_value" integer DEFAULT 0 NOT NULL,
    "discount_text" "text" DEFAULT ''::"text" NOT NULL,
    "service_id" "uuid",
    "valid_from" "date",
    "valid_until" "date",
    "active" boolean DEFAULT true NOT NULL,
    "show_on_home" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "service_category" "text",
    "customer_scope" "text" DEFAULT 'all'::"text" NOT NULL,
    CONSTRAINT "coupons_customer_scope_check" CHECK (("customer_scope" = ANY (ARRAY['all'::"text", 'new_customer'::"text"]))),
    CONSTRAINT "coupons_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percent'::"text", 'fixed'::"text", 'text'::"text"]))),
    CONSTRAINT "coupons_discount_value_check" CHECK (("discount_value" >= 0))
);


ALTER TABLE "public"."coupons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_builder_pages" (
    "slug" "text" NOT NULL,
    "draft_project_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "draft_html" "text" DEFAULT ''::"text" NOT NULL,
    "draft_css" "text" DEFAULT ''::"text" NOT NULL,
    "published_project_json" "jsonb",
    "published_html" "text",
    "published_css" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone,
    "updated_by" "uuid",
    "published_by" "uuid",
    CONSTRAINT "page_builder_pages_slug_check" CHECK (("slug" ~ '^[a-z0-9-]+$'::"text"))
);


ALTER TABLE "public"."page_builder_pages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."services" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text" DEFAULT ''::"text",
    "price_text" "text" DEFAULT ''::"text",
    "duration_minutes" integer DEFAULT 60 NOT NULL,
    "booking_enabled" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "price_amount" integer,
    "price_unit" "text" DEFAULT 'Ft'::"text" NOT NULL,
    "price_suffix" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "services_duration_minutes_check" CHECK (("duration_minutes" >= 0))
);


ALTER TABLE "public"."services" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."web_push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh" "text" NOT NULL,
    "auth_secret" "text" NOT NULL,
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "disabled_at" timestamp with time zone,
    CONSTRAINT "web_push_auth_not_empty" CHECK (("length"(TRIM(BOTH FROM "auth_secret")) >= 8)),
    CONSTRAINT "web_push_endpoint_https" CHECK (("endpoint" ~ '^https://'::"text")),
    CONSTRAINT "web_push_p256dh_not_empty" CHECK (("length"(TRIM(BOTH FROM "p256dh")) >= 20))
);


ALTER TABLE "public"."web_push_subscriptions" OWNER TO "postgres";


COMMENT ON TABLE "public"."web_push_subscriptions" IS 'Lumi Nails PWA Web Push subscriptions. No direct anon/authenticated access; backend only.';



ALTER TABLE ONLY "private"."booking_management_rate_limits"
    ADD CONSTRAINT "booking_management_rate_limits_pkey" PRIMARY KEY ("client_hash");



ALTER TABLE ONLY "private"."lumi_admins"
    ADD CONSTRAINT "lumi_admins_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."admin_booking_change_operations"
    ADD CONSTRAINT "admin_booking_change_operations_pkey" PRIMARY KEY ("operation_id");



ALTER TABLE ONLY "public"."availability_rules"
    ADD CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."availability_rules"
    ADD CONSTRAINT "availability_rules_weekday_start_time_end_time_key" UNIQUE ("weekday", "start_time", "end_time");



ALTER TABLE ONLY "public"."availability_windows"
    ADD CONSTRAINT "availability_windows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."availability_windows"
    ADD CONSTRAINT "availability_windows_work_date_start_time_end_time_key" UNIQUE ("work_date", "start_time", "end_time");



ALTER TABLE ONLY "public"."blocked_times"
    ADD CONSTRAINT "blocked_times_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_email_jobs"
    ADD CONSTRAINT "booking_email_jobs_dedupe_key_key" UNIQUE ("dedupe_key");



ALTER TABLE ONLY "public"."booking_email_jobs"
    ADD CONSTRAINT "booking_email_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_events"
    ADD CONSTRAINT "booking_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."booking_monthly_report_jobs"
    ADD CONSTRAINT "booking_monthly_report_jobs_pkey" PRIMARY KEY ("report_month");



ALTER TABLE ONLY "public"."booking_request_keys"
    ADD CONSTRAINT "booking_request_keys_pkey" PRIMARY KEY ("request_key");



ALTER TABLE ONLY "public"."booking_review_recipients"
    ADD CONSTRAINT "booking_review_recipients_pkey" PRIMARY KEY ("email");



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_no_overlap" EXCLUDE USING "gist" ("tstzrange"("starts_at", "ends_at", '[)'::"text") WITH &&) WHERE (("status" = ANY (ARRAY['pending'::"text", 'confirmed'::"text", 'done'::"text"])));



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."page_builder_pages"
    ADD CONSTRAINT "page_builder_pages_pkey" PRIMARY KEY ("slug");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."services"
    ADD CONSTRAINT "services_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_endpoint_key" UNIQUE ("endpoint");



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id");



CREATE INDEX "booking_email_jobs_due_idx" ON "public"."booking_email_jobs" USING "btree" ("next_attempt_at", "created_at") WHERE ("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'retry'::"text"]));



CREATE INDEX "booking_request_keys_booking_idx" ON "public"."booking_request_keys" USING "btree" ("booking_id");



CREATE INDEX "bookings_customer_user_starts_at_idx" ON "public"."bookings" USING "btree" ("customer_user_id", "starts_at" DESC) WHERE ("customer_user_id" IS NOT NULL);



CREATE UNIQUE INDEX "bookings_legacy_public_reference_key" ON "public"."bookings" USING "btree" ("legacy_public_reference") WHERE ("legacy_public_reference" IS NOT NULL);



CREATE UNIQUE INDEX "bookings_public_reference_key" ON "public"."bookings" USING "btree" ("public_reference");



CREATE INDEX "bookings_reminder_due_idx" ON "public"."bookings" USING "btree" ("reminder_scheduled_for") WHERE ("reminder_sent_at" IS NULL);



CREATE INDEX "bookings_retention_due_idx" ON "public"."bookings" USING "btree" ("ends_at", "retention_next_attempt_at") WHERE ("retention_locked_at" IS NULL);



CREATE INDEX "bookings_review_request_due_idx" ON "public"."bookings" USING "btree" ("review_request_scheduled_for") WHERE ("review_request_sent_at" IS NULL);



CREATE UNIQUE INDEX "bookings_review_request_email_once_idx" ON "public"."bookings" USING "btree" ("lower"("customer_email")) WHERE ("review_request_sent_at" IS NOT NULL);



CREATE INDEX "bookings_unlinked_customer_email_idx" ON "public"."bookings" USING "btree" ("lower"(TRIM(BOTH FROM "customer_email"))) WHERE ("customer_user_id" IS NULL);



CREATE INDEX "web_push_subscriptions_user_active_idx" ON "public"."web_push_subscriptions" USING "btree" ("user_id", "disabled_at");



CREATE OR REPLACE TRIGGER "bookings_enforce_buffer" BEFORE INSERT OR UPDATE OF "starts_at", "ends_at", "status" ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."lumi_enforce_booking_buffer"();



CREATE OR REPLACE TRIGGER "bookings_notification_schedule" BEFORE INSERT OR UPDATE OF "starts_at", "status", "customer_email", "reminder_sent_at", "review_request_sent_at" ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."set_booking_notification_schedule"();



CREATE OR REPLACE TRIGGER "bookings_web_push_after_change" AFTER INSERT OR UPDATE OF "status" ON "public"."bookings" FOR EACH ROW EXECUTE FUNCTION "public"."enqueue_booking_web_push"();



CREATE OR REPLACE TRIGGER "lumi_arlista_ervenyesseg_trigger" AFTER UPDATE OF "price_amount" ON "public"."services" FOR EACH ROW WHEN (("old"."price_amount" IS DISTINCT FROM "new"."price_amount")) EXECUTE FUNCTION "public"."lumi_arlista_ervenyesseg_frissitese"();



ALTER TABLE ONLY "private"."lumi_admins"
    ADD CONSTRAINT "lumi_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_email_jobs"
    ADD CONSTRAINT "booking_email_jobs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_events"
    ADD CONSTRAINT "booking_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."booking_request_keys"
    ADD CONSTRAINT "booking_request_keys_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."booking_review_recipients"
    ADD CONSTRAINT "booking_review_recipients_first_booking_id_fkey" FOREIGN KEY ("first_booking_id") REFERENCES "public"."bookings"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."bookings"
    ADD CONSTRAINT "bookings_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id");



ALTER TABLE ONLY "public"."coupons"
    ADD CONSTRAINT "coupons_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_profiles"
    ADD CONSTRAINT "customer_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_builder_pages"
    ADD CONSTRAINT "page_builder_pages_published_by_fkey" FOREIGN KEY ("published_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."page_builder_pages"
    ADD CONSTRAINT "page_builder_pages_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."web_push_subscriptions"
    ADD CONSTRAINT "web_push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "admin can manage availability" ON "public"."availability_rules" TO "authenticated" USING (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")) WITH CHECK (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin"));



CREATE POLICY "admin can manage availability windows" ON "public"."availability_windows" TO "authenticated" USING (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")) WITH CHECK (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin"));



CREATE POLICY "admin can manage blocked times" ON "public"."blocked_times" TO "authenticated" USING (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")) WITH CHECK (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin"));



CREATE POLICY "admin can manage booking events" ON "public"."booking_events" TO "authenticated" USING (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")) WITH CHECK (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin"));



CREATE POLICY "admin can manage booking review recipients" ON "public"."booking_review_recipients" TO "authenticated" USING (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")) WITH CHECK (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin"));



CREATE POLICY "admin can manage bookings" ON "public"."bookings" TO "authenticated" USING (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")) WITH CHECK (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin"));



CREATE POLICY "admin can manage coupons" ON "public"."coupons" TO "authenticated" USING (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")) WITH CHECK (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin"));



CREATE POLICY "admin can manage services" ON "public"."services" TO "authenticated" USING (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")) WITH CHECK (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin"));



CREATE POLICY "admin can manage site settings" ON "public"."site_settings" TO "authenticated" USING (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")) WITH CHECK (( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin"));



ALTER TABLE "public"."admin_booking_change_operations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."availability_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."availability_windows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blocked_times" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_email_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_monthly_report_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_request_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."booking_review_recipients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."coupons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer or admin can read customer profiles" ON "public"."customer_profiles" FOR SELECT TO "authenticated" USING (((("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ( SELECT "public"."is_verified_customer"() AS "is_verified_customer")) OR ( SELECT "public"."is_lumi_admin"() AS "is_lumi_admin")));



ALTER TABLE "public"."customer_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lumi admin can delete page builder pages" ON "public"."page_builder_pages" FOR DELETE TO "authenticated" USING ("public"."is_lumi_admin"());



CREATE POLICY "lumi admin can insert page builder pages" ON "public"."page_builder_pages" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_lumi_admin"());



CREATE POLICY "lumi admin can read all page builder pages" ON "public"."page_builder_pages" FOR SELECT TO "authenticated" USING ("public"."is_lumi_admin"());



CREATE POLICY "lumi admin can update page builder pages" ON "public"."page_builder_pages" FOR UPDATE TO "authenticated" USING ("public"."is_lumi_admin"()) WITH CHECK ("public"."is_lumi_admin"());



ALTER TABLE "public"."page_builder_pages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public can read active coupons" ON "public"."coupons" FOR SELECT USING ((("active" = true) AND (("valid_from" IS NULL) OR ("valid_from" <= CURRENT_DATE)) AND (("valid_until" IS NULL) OR ("valid_until" >= CURRENT_DATE))));



CREATE POLICY "public can read active services" ON "public"."services" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "public can read published page builder pages" ON "public"."page_builder_pages" FOR SELECT TO "authenticated", "anon" USING ((("published_at" IS NOT NULL) AND (COALESCE("published_html", ''::"text") <> ''::"text")));



CREATE POLICY "public can read site settings" ON "public"."site_settings" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "public"."services" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."web_push_subscriptions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";








GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "service_role";











































































































































































REVOKE ALL ON FUNCTION "private"."enqueue_previous_month_booking_report"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."lumi_booking_contact_matches"("p_booking_email" "text", "p_booking_phone" "text", "p_contact" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."lumi_booking_phone_key"("p_value" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."lumi_cancel_booking"("p_booking_id" "uuid", "p_note" "text", "p_channel" "text") FROM PUBLIC;



REVOKE ALL ON FUNCTION "private"."purge_expired_non_booking_data"() FROM PUBLIC;



REVOKE ALL ON FUNCTION "public"."admin_registered_customer_profiles"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_registered_customer_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_registered_customer_profiles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_admin_booking_changes"("p_operation_id" "uuid", "p_changes" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_admin_booking_changes"("p_operation_id" "uuid", "p_changes" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_admin_booking_changes"("p_operation_id" "uuid", "p_changes" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_admin_booking_changes_internal"("p_operation_id" "uuid", "p_changes" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_admin_booking_changes_internal"("p_operation_id" "uuid", "p_changes" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."attach_booking_inspiration"("p_booking_id" "uuid", "p_images" "jsonb", "p_nail_style" "text", "p_nail_style_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."attach_booking_inspiration"("p_booking_id" "uuid", "p_images" "jsonb", "p_nail_style" "text", "p_nail_style_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_booking_by_reference"("p_reference" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_booking_by_reference"("p_reference" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_booking_by_verified_contact"("p_reference" "text", "p_contact" "text", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_booking_by_verified_contact"("p_reference" "text", "p_contact" "text", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_my_booking"("p_booking_id" "uuid", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_my_booking"("p_booking_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_my_booking"("p_booking_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "postgres";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "anon";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_due_booking_email_jobs"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_due_booking_email_jobs"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_due_booking_monthly_reports"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_due_booking_monthly_reports"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_due_booking_reminders"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_due_booking_reminders"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_due_booking_review_requests"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_due_booking_review_requests"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."claim_expired_bookings_for_retention"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."claim_expired_bookings_for_retention"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."clear_booking_inspiration"("p_booking_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."clear_booking_inspiration"("p_booking_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_booking_inspiration"("p_booking_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."clear_booking_inspiration_internal"("p_booking_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."clear_booking_inspiration_internal"("p_booking_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_booking_management_rate_limit"("p_client_hash" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_booking_management_rate_limit"("p_client_hash" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_booking"("p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_coupon_id" "uuid", "p_coupon_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_booking"("p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_coupon_id" "uuid", "p_coupon_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_booking"("p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_coupon_id" "uuid", "p_coupon_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_booking_idempotent"("p_request_key" "uuid", "p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_coupon_id" "uuid", "p_coupon_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_booking_idempotent"("p_request_key" "uuid", "p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_coupon_id" "uuid", "p_coupon_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_booking_idempotent_for_user"("p_request_key" "uuid", "p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_customer_user_id" "uuid", "p_coupon_id" "uuid", "p_coupon_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_booking_idempotent_for_user"("p_request_key" "uuid", "p_service_id" "uuid", "p_customer_name" "text", "p_customer_phone" "text", "p_customer_email" "text", "p_note" "text", "p_starts_at" timestamp with time zone, "p_customer_user_id" "uuid", "p_coupon_id" "uuid", "p_coupon_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."customer_accounts_ready"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."customer_accounts_ready"() TO "anon";
GRANT ALL ON FUNCTION "public"."customer_accounts_ready"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."customer_accounts_ready"() TO "service_role";



GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "postgres";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "anon";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enqueue_booking_web_push"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_booking_web_push"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."enqueue_new_booking_email"("p_booking_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enqueue_new_booking_email"("p_booking_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."customer_profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."customer_profiles" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."ensure_customer_account"("p_full_name" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_customer_account"("p_full_name" "text", "p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_customer_account"("p_full_name" "text", "p_phone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finish_booking_email_job"("p_job_id" "uuid", "p_success" boolean, "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finish_booking_email_job"("p_job_id" "uuid", "p_success" boolean, "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finish_booking_monthly_report"("p_report_month" "date", "p_success" boolean, "p_error" "text", "p_report_data" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finish_booking_monthly_report"("p_report_month" "date", "p_success" boolean, "p_error" "text", "p_report_data" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finish_booking_reminder"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finish_booking_reminder"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finish_booking_review_request"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finish_booking_review_request"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finish_expired_booking_retention"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finish_expired_booking_retention"("p_booking_id" "uuid", "p_success" boolean, "p_error" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "postgres";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "anon";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "service_role";



GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_dates"("p_service_id" "uuid", "p_start_date" "date", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_dates"("p_service_id" "uuid", "p_start_date" "date", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_dates"("p_service_id" "uuid", "p_start_date" "date", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_dates_for_style"("p_service_id" "uuid", "p_nail_style" "text", "p_start_date" "date", "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_dates_for_style"("p_service_id" "uuid", "p_nail_style" "text", "p_start_date" "date", "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_dates_for_style"("p_service_id" "uuid", "p_nail_style" "text", "p_start_date" "date", "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_slots"("p_service_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_slots"("p_service_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_slots"("p_service_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_slots_for_style"("p_service_id" "uuid", "p_date" "date", "p_nail_style" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_slots_for_style"("p_service_id" "uuid", "p_date" "date", "p_nail_style" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_slots_for_style"("p_service_id" "uuid", "p_date" "date", "p_nail_style" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_booking_monthly_report_data"("p_report_month" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_booking_monthly_report_data"("p_report_month" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_booking_reference_after_creation"("p_booking_id" "uuid", "p_customer_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_booking_reference_after_creation"("p_booking_id" "uuid", "p_customer_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_booking_reference_after_creation"("p_booking_id" "uuid", "p_customer_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_booking_reference_after_creation"("p_booking_id" "uuid", "p_customer_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_booking_status"("p_reference" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_booking_status"("p_reference" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_booking_status_verified"("p_reference" "text", "p_contact" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_booking_status_verified"("p_reference" "text", "p_contact" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_booking_history"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_booking_history"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_booking_history"("p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_web_push_server_config"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_web_push_server_config"() TO "service_role";



GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "postgres";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "anon";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_lumi_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_lumi_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_lumi_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_verified_customer"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_verified_customer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_verified_customer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_arlista_ervenyesseg_frissitese"() TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_arlista_ervenyesseg_frissitese"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_arlista_ervenyesseg_frissitese"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_booking_has_decoration"("p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_booking_has_decoration"("p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_booking_has_decoration"("p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_booking_previous_day_noon"("p_starts_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_booking_previous_day_noon"("p_starts_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_booking_previous_day_noon"("p_starts_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_booking_style_extra_minutes"("p_style" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_booking_style_extra_minutes"("p_style" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_booking_style_extra_minutes"("p_style" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_booking_two_days_later_noon"("p_reference" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_booking_two_days_later_noon"("p_reference" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_booking_two_days_later_noon"("p_reference" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_coupon_discount_amount"("p_price_amount" integer, "p_discount_type" "text", "p_discount_value" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_coupon_discount_amount"("p_price_amount" integer, "p_discount_type" "text", "p_discount_value" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_coupon_discount_amount"("p_price_amount" integer, "p_discount_type" "text", "p_discount_value" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_customer_has_previous_booking"("p_customer_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_customer_has_previous_booking"("p_customer_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_customer_has_previous_booking"("p_customer_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_enforce_booking_buffer"() TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_enforce_booking_buffer"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_enforce_booking_buffer"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_new_booking_reference"() TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_new_booking_reference"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_new_booking_reference"() TO "service_role";



GRANT ALL ON FUNCTION "public"."lumi_service_coupon_category"("p_service_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."lumi_service_coupon_category"("p_service_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."lumi_service_coupon_category"("p_service_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_customer_preferences"("p_nail_shape" "text", "p_nail_length" "text", "p_preferred_nail_style" "text", "p_nail_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_customer_preferences"("p_nail_shape" "text", "p_nail_length" "text", "p_preferred_nail_style" "text", "p_nail_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_customer_preferences"("p_nail_shape" "text", "p_nail_length" "text", "p_preferred_nail_style" "text", "p_nail_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_customer_profile"("p_full_name" "text", "p_phone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_customer_profile"("p_full_name" "text", "p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_customer_profile"("p_full_name" "text", "p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_booking_notification_schedule"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_booking_notification_schedule"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_booking_notification_schedule"() TO "service_role";



GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "service_role";
























GRANT ALL ON TABLE "public"."admin_booking_change_operations" TO "service_role";



GRANT ALL ON TABLE "public"."availability_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_rules" TO "service_role";



GRANT ALL ON TABLE "public"."availability_windows" TO "authenticated";
GRANT ALL ON TABLE "public"."availability_windows" TO "service_role";



GRANT ALL ON TABLE "public"."blocked_times" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_times" TO "service_role";



GRANT ALL ON TABLE "public"."booking_email_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."booking_events" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_events" TO "service_role";



GRANT ALL ON TABLE "public"."booking_monthly_report_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."booking_request_keys" TO "service_role";



GRANT ALL ON TABLE "public"."booking_review_recipients" TO "authenticated";
GRANT ALL ON TABLE "public"."booking_review_recipients" TO "service_role";



GRANT ALL ON TABLE "public"."bookings" TO "authenticated";
GRANT ALL ON TABLE "public"."bookings" TO "service_role";



GRANT ALL ON TABLE "public"."coupons" TO "authenticated";
GRANT ALL ON TABLE "public"."coupons" TO "service_role";
GRANT SELECT ON TABLE "public"."coupons" TO "anon";



GRANT ALL ON TABLE "public"."page_builder_pages" TO "authenticated";
GRANT ALL ON TABLE "public"."page_builder_pages" TO "service_role";
GRANT SELECT ON TABLE "public"."page_builder_pages" TO "anon";



GRANT ALL ON TABLE "public"."services" TO "authenticated";
GRANT ALL ON TABLE "public"."services" TO "service_role";
GRANT SELECT ON TABLE "public"."services" TO "anon";



GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";
GRANT SELECT ON TABLE "public"."site_settings" TO "anon";



GRANT ALL ON TABLE "public"."web_push_subscriptions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
