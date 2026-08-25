-- Lumi Nails Web Push backend
-- Ez a fájl kizárólag ADDITÍV push-objektumokat hoz létre.
-- A meglévő bookings oszlopokat, foglalási RPC-ket és email-folyamatot nem módosítja.
--
-- Előfeltétel: Supabase Vaultban létezzen ez a 4 secret név:
--   lumi_web_push_vapid_public
--   lumi_web_push_vapid_private
--   lumi_web_push_vapid_subject
--   lumi_web_push_webhook_secret
-- A secret értékeket SOHA ne írd ebbe a fájlba vagy GitHubba.

create table if not exists public.web_push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    endpoint text not null unique,
    p256dh text not null,
    auth_secret text not null,
    user_agent text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    disabled_at timestamptz,
    constraint web_push_endpoint_https check (endpoint ~ '^https://'),
    constraint web_push_p256dh_not_empty check (length(trim(p256dh)) >= 20),
    constraint web_push_auth_not_empty check (length(trim(auth_secret)) >= 8)
);

create index if not exists web_push_subscriptions_user_active_idx
    on public.web_push_subscriptions (user_id, disabled_at);

alter table public.web_push_subscriptions enable row level security;

-- Nincs anon/authenticated közvetlen hozzáférés. Az Edge Function service role-lal kezeli.
revoke all on table public.web_push_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.web_push_subscriptions to service_role;

create or replace function public.get_web_push_server_config()
returns jsonb
language sql
security definer
set search_path = public, vault
as $$
    select jsonb_build_object(
        'vapid_public_key', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_web_push_vapid_public' limit 1),
        'vapid_private_key', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_web_push_vapid_private' limit 1),
        'vapid_subject', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_web_push_vapid_subject' limit 1),
        'webhook_secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_web_push_webhook_secret' limit 1)
    );
$$;

revoke all on function public.get_web_push_server_config() from public, anon, authenticated;
grant execute on function public.get_web_push_server_config() to service_role;

-- Best-effort, aszinkron push enqueue. A net.http_post csak commit után küld HTTP-t.
-- Minden push-oldali hibát elnyelünk, ezért push hiba nem rollbackelhet foglalást.
create or replace function public.enqueue_booking_web_push()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
    v_secret text;
    v_body jsonb;
begin
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

revoke all on function public.enqueue_booking_web_push() from public, anon, authenticated;

drop trigger if exists bookings_web_push_after_change on public.bookings;
create trigger bookings_web_push_after_change
    after insert or update of status
    on public.bookings
    for each row
    execute function public.enqueue_booking_web_push();

comment on table public.web_push_subscriptions is
    'Lumi Nails PWA Web Push subscriptions. Backend-only access.';
comment on function public.enqueue_booking_web_push() is
    'Best-effort async Web Push enqueue; push failures cannot roll back booking writes.';
