-- Lumi Nails PWA Web Push előfizetések
-- FIGYELEM: ezt a fájlt a pwa-app-copy ágon készítettük elő.
-- Éles Supabase-re csak külön ellenőrzés után alkalmazd.

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

-- A böngésző soha nem éri el közvetlenül ezt a táblát.
-- Feliratkozás/törlés kizárólag hitelesített Edge Functionön keresztül történik.
revoke all on table public.web_push_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.web_push_subscriptions to service_role;

comment on table public.web_push_subscriptions is
    'Lumi Nails PWA Web Push előfizetések. Közvetlen kliens-hozzáférés tiltva; csak service-role Edge Function használhatja.';
