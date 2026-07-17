-- Lumi Nails automatikus foglalási értesítések Cron példa
-- Ezt NE futtasd vakon: előbb cseréld ki a PROJECT_REF / PUBLISHABLE_KEY / TITKOS_ERTEK részeket.
-- Alternatíva: Supabase Dashboard > Integrations > Cron felületen is létrehozható ugyanilyen HTTP job.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault with schema vault;

-- Csak első beállításkor futtasd. Ha már léteznek ilyen nevű Vault secret-ek, inkább Dashboardon frissítsd őket.
select vault.create_secret('https://PROJECT_REF.supabase.co', 'lumi_project_url');
select vault.create_secret('PUBLISHABLE_KEY_IDE', 'lumi_publishable_key');
select vault.create_secret('UGYANAZ_A_TITKOS_ERTEK_MINT_A_BOOKING_NOTIFICATIONS_SECRET', 'lumi_booking_notifications_secret');

-- 10 percenként ránéz az esedékes emailekre. Az email tényleges ideje a bookings táblában lévő scheduled_for mező,
-- ezért az emlékeztetők és értékeléskérések Budapest szerinti 12:00 körül mennek ki.
select cron.schedule(
  'lumi-booking-notifications',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_project_url') || '/functions/v1/process-booking-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_publishable_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_publishable_key'),
      'x-lumi-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lumi_booking_notifications_secret')
    ),
    body := jsonb_build_object('source', 'pg_cron', 'time', now()),
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);