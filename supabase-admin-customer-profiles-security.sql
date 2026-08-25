begin;

-- Admin identities are server-owned. User-editable JWT metadata must never grant access.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.lumi_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

revoke all on table private.lumi_admins from public, anon, authenticated;

insert into private.lumi_admins (user_id)
select id
from auth.users
where lower(email) = 'llevisimon@gmail.com'
on conflict (user_id) do nothing;

do $$
begin
    if not exists (select 1 from private.lumi_admins) then
        raise exception 'Luminails admin user was not found; migration aborted.';
    end if;
end;
$$;

create or replace function public.is_lumi_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from private.lumi_admins as admins
        where admins.user_id = auth.uid()
    );
$$;

revoke all on function public.is_lumi_admin() from public, anon;
grant execute on function public.is_lumi_admin() to authenticated, service_role;

-- Replace permissive authenticated policies with an explicit admin predicate.
drop policy if exists "admin can manage availability" on public.availability_rules;
create policy "admin can manage availability"
on public.availability_rules for all to authenticated
using ((select public.is_lumi_admin()))
with check ((select public.is_lumi_admin()));

drop policy if exists "admin can manage availability windows" on public.availability_windows;
create policy "admin can manage availability windows"
on public.availability_windows for all to authenticated
using ((select public.is_lumi_admin()))
with check ((select public.is_lumi_admin()));

drop policy if exists "admin can manage blocked times" on public.blocked_times;
create policy "admin can manage blocked times"
on public.blocked_times for all to authenticated
using ((select public.is_lumi_admin()))
with check ((select public.is_lumi_admin()));

drop policy if exists "admin can manage booking events" on public.booking_events;
drop policy if exists "admin can read booking events" on public.booking_events;
create policy "admin can manage booking events"
on public.booking_events for all to authenticated
using ((select public.is_lumi_admin()))
with check ((select public.is_lumi_admin()));

drop policy if exists "admin can delete booking review recipients" on public.booking_review_recipients;
drop policy if exists "admin can read booking review recipients" on public.booking_review_recipients;
create policy "admin can manage booking review recipients"
on public.booking_review_recipients for all to authenticated
using ((select public.is_lumi_admin()))
with check ((select public.is_lumi_admin()));

drop policy if exists "admin can manage bookings" on public.bookings;
create policy "admin can manage bookings"
on public.bookings for all to authenticated
using ((select public.is_lumi_admin()))
with check ((select public.is_lumi_admin()));

drop policy if exists "admin can manage coupons" on public.coupons;
create policy "admin can manage coupons"
on public.coupons for all to authenticated
using ((select public.is_lumi_admin()))
with check ((select public.is_lumi_admin()));

drop policy if exists "admin can manage services" on public.services;
create policy "admin can manage services"
on public.services for all to authenticated
using ((select public.is_lumi_admin()))
with check ((select public.is_lumi_admin()));

drop policy if exists "admin can manage site settings" on public.site_settings;
create policy "admin can manage site settings"
on public.site_settings for all to authenticated
using ((select public.is_lumi_admin()))
with check ((select public.is_lumi_admin()));

-- Public pages only require read access to these four content sources.
revoke all on table public.availability_rules from anon;
revoke all on table public.availability_windows from anon;
revoke all on table public.blocked_times from anon;
revoke all on table public.booking_events from anon;
revoke all on table public.booking_review_recipients from anon;
revoke all on table public.bookings from anon;
revoke all on table public.coupons from anon;
revoke all on table public.services from anon;
revoke all on table public.site_settings from anon;
revoke all on table public.page_builder_pages from anon;
grant select on table public.coupons, public.services, public.site_settings, public.page_builder_pages to anon;

-- Remove legacy storage rules that trusted every authenticated account.
drop policy if exists "admin can delete private booking inspirations" on storage.objects;
drop policy if exists "admin can view private booking inspirations" on storage.objects;
drop policy if exists "admin can delete site media" on storage.objects;
drop policy if exists "admin can update site media" on storage.objects;
drop policy if exists "admin can upload site media" on storage.objects;

drop policy if exists "lumi admin can view private booking inspirations" on storage.objects;
create policy "lumi admin can view private booking inspirations"
on storage.objects for select to authenticated
using (bucket_id = 'booking-inspirations' and (select public.is_lumi_admin()));

drop policy if exists "lumi admin can delete private booking inspirations" on storage.objects;
create policy "lumi admin can delete private booking inspirations"
on storage.objects for delete to authenticated
using (bucket_id = 'booking-inspirations' and (select public.is_lumi_admin()));

-- Preserve the existing transaction logic behind an authorization-checking wrapper.
alter function public.apply_admin_booking_changes(uuid, jsonb)
rename to apply_admin_booking_changes_internal;
revoke all on function public.apply_admin_booking_changes_internal(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.apply_admin_booking_changes_internal(uuid, jsonb) to service_role;

create function public.apply_admin_booking_changes(p_operation_id uuid, p_changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not public.is_lumi_admin() then
        raise exception 'Admin jogosultság szükséges.' using errcode = '42501';
    end if;
    return public.apply_admin_booking_changes_internal(p_operation_id, p_changes);
end;
$$;

revoke all on function public.apply_admin_booking_changes(uuid, jsonb) from public, anon;
grant execute on function public.apply_admin_booking_changes(uuid, jsonb) to authenticated, service_role;

alter function public.clear_booking_inspiration(uuid)
rename to clear_booking_inspiration_internal;
revoke all on function public.clear_booking_inspiration_internal(uuid) from public, anon, authenticated;
grant execute on function public.clear_booking_inspiration_internal(uuid) to service_role;

create function public.clear_booking_inspiration(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not public.is_lumi_admin() then
        raise exception 'Admin jogosultság szükséges.' using errcode = '42501';
    end if;
    perform public.clear_booking_inspiration_internal(p_booking_id);
end;
$$;

revoke all on function public.clear_booking_inspiration(uuid) from public, anon;
grant execute on function public.clear_booking_inspiration(uuid) to authenticated, service_role;

-- Queue workers are service-role operations, not browser RPCs.
revoke all on function public.claim_due_booking_email_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_due_booking_email_jobs(integer) to service_role;
revoke all on function public.finish_booking_email_job(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.finish_booking_email_job(uuid, boolean, text) to service_role;
revoke all on function public.claim_due_booking_reminders(integer) from public, anon, authenticated;
grant execute on function public.claim_due_booking_reminders(integer) to service_role;
revoke all on function public.finish_booking_reminder(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.finish_booking_reminder(uuid, boolean, text) to service_role;
revoke all on function public.claim_due_booking_review_requests(integer) from public, anon, authenticated;
grant execute on function public.claim_due_booking_review_requests(integer) to service_role;
revoke all on function public.finish_booking_review_request(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.finish_booking_review_request(uuid, boolean, text) to service_role;
revoke all on function public.enqueue_new_booking_email(uuid) from public, anon, authenticated;
grant execute on function public.enqueue_new_booking_email(uuid) to service_role;

-- Registered accounts are sourced from auth.users, but auth data is never exposed as a public view.
drop view if exists public.admin_customer_bookings;
drop view if exists public.admin_customer_profiles;

drop function if exists public.admin_registered_customer_profiles();
create function public.admin_registered_customer_profiles()
returns table (
    user_id uuid,
    customer_name text,
    customer_email text,
    customer_phone text,
    registered_at timestamptz,
    email_confirmed_at timestamptz,
    booking_count integer,
    completed_count integer,
    cancelled_count integer,
    next_booking_at timestamptz,
    last_booking_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
        )::text as customer_phone,
        users.created_at as registered_at,
        users.email_confirmed_at,
        statistics.booking_count,
        statistics.completed_count,
        statistics.cancelled_count,
        statistics.next_booking_at,
        statistics.last_booking_at
    from auth.users as users
    left join public.customer_profiles as profiles
        on profiles.user_id = users.id
    left join lateral (
        select
            count(*)::integer as booking_count,
            count(*) filter (where bookings.status = 'done')::integer as completed_count,
            count(*) filter (
                where bookings.status in ('cancelled', 'cancelled_by_customer')
            )::integer as cancelled_count,
            min(bookings.starts_at) filter (
                where bookings.starts_at >= now()
                  and bookings.status in ('pending', 'confirmed')
            ) as next_booking_at,
            max(bookings.starts_at) as last_booking_at
        from public.bookings as bookings
        where bookings.customer_user_id = users.id
           or (
                bookings.customer_user_id is null
                and nullif(trim(bookings.customer_email), '') is not null
                and lower(trim(bookings.customer_email)) = lower(trim(users.email))
           )
    ) as statistics on true
    where coalesce(users.is_anonymous, false) = false
      and users.deleted_at is null
      and nullif(trim(users.email), '') is not null
    order by users.created_at desc;
end;
$$;

revoke all on function public.admin_registered_customer_profiles() from public, anon;
grant execute on function public.admin_registered_customer_profiles() to authenticated, service_role;

drop function if exists public.admin_registered_customer_bookings(uuid);
create function public.admin_registered_customer_bookings(p_user_id uuid)
returns table (
    id uuid,
    public_reference text,
    customer_name text,
    customer_email text,
    customer_phone text,
    starts_at timestamptz,
    ends_at timestamptz,
    status text,
    created_at timestamptz,
    note text,
    nail_style text,
    nail_style_note text,
    service_name text,
    price_text text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
    account_email text;
begin
    if not public.is_lumi_admin() then
        raise exception 'Admin jogosultság szükséges.' using errcode = '42501';
    end if;

    select lower(trim(users.email))
    into account_email
    from auth.users as users
    where users.id = p_user_id
      and coalesce(users.is_anonymous, false) = false
      and users.deleted_at is null;

    if account_email is null then
        return;
    end if;

    return query
    select
        bookings.id,
        bookings.public_reference,
        bookings.customer_name,
        bookings.customer_email,
        bookings.customer_phone,
        bookings.starts_at,
        bookings.ends_at,
        bookings.status,
        bookings.created_at,
        bookings.note,
        bookings.nail_style,
        bookings.nail_style_note,
        services.name as service_name,
        services.price_text
    from public.bookings as bookings
    left join public.services as services
        on services.id = bookings.service_id
    where bookings.customer_user_id = p_user_id
       or (
            bookings.customer_user_id is null
            and nullif(trim(bookings.customer_email), '') is not null
            and lower(trim(bookings.customer_email)) = account_email
       )
    order by bookings.starts_at desc
    limit 50;
end;
$$;

revoke all on function public.admin_registered_customer_bookings(uuid) from public, anon;
grant execute on function public.admin_registered_customer_bookings(uuid) to authenticated, service_role;

comment on function public.admin_registered_customer_profiles() is
'Admin-only list of real, non-anonymous Supabase Auth registrations with minimal contact and booking data.';
comment on function public.admin_registered_customer_bookings(uuid) is
'Admin-only booking history for one registered Supabase Auth user.';

commit;
