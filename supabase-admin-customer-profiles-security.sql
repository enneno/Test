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

-- Profiles are derived from bookings, so there is no second PII store to drift or leak.
create view public.admin_customer_profiles
with (security_invoker = true, security_barrier = true)
as
with normalized as (
    select
        case
            when nullif(trim(customer_email), '') is not null
                then 'email:' || lower(trim(customer_email))
            when nullif(trim(customer_phone), '') is not null
                then 'phone:' || regexp_replace(customer_phone, '[^0-9+]', '', 'g')
            else 'booking:' || id::text
        end as customer_key,
        nullif(trim(customer_name), '') as customer_name,
        nullif(lower(trim(customer_email)), '') as customer_email,
        nullif(trim(customer_phone), '') as customer_phone,
        starts_at,
        status
    from public.bookings
)
select
    customer_key,
    (array_agg(customer_name order by starts_at desc) filter (where customer_name is not null))[1] as customer_name,
    (array_agg(customer_email order by starts_at desc) filter (where customer_email is not null))[1] as customer_email,
    (array_agg(customer_phone order by starts_at desc) filter (where customer_phone is not null))[1] as customer_phone,
    count(*)::integer as booking_count,
    count(*) filter (where status = 'done')::integer as completed_count,
    count(*) filter (where status in ('cancelled', 'cancelled_by_customer'))::integer as cancelled_count,
    min(starts_at) filter (
        where starts_at >= now() and status in ('pending', 'confirmed')
    ) as next_booking_at,
    max(starts_at) as last_booking_at
from normalized
group by customer_key;

create view public.admin_customer_bookings
with (security_invoker = true, security_barrier = true)
as
select
    case
        when nullif(trim(bookings.customer_email), '') is not null
            then 'email:' || lower(trim(bookings.customer_email))
        when nullif(trim(bookings.customer_phone), '') is not null
            then 'phone:' || regexp_replace(bookings.customer_phone, '[^0-9+]', '', 'g')
        else 'booking:' || bookings.id::text
    end as customer_key,
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
from public.bookings
left join public.services on services.id = bookings.service_id;

revoke all on table public.admin_customer_profiles from public, anon;
revoke all on table public.admin_customer_bookings from public, anon;
grant select on table public.admin_customer_profiles, public.admin_customer_bookings to authenticated, service_role;

comment on view public.admin_customer_profiles is
'Admin-only customer summary derived from booking data. RLS is enforced through security_invoker.';
comment on view public.admin_customer_bookings is
'Admin-only customer booking history. RLS is enforced through security_invoker.';

commit;
