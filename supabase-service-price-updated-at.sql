-- Lumi Nails árlista érvényességi időpont
-- Futtasd a Supabase Dashboard > SQL Editor felületén.
-- Biztonságosan újrafuttatható, meglévő adatot nem töröl.
-- Az időpont kizárólag az Ár összege (price_amount) tényleges változásakor frissül.

begin;

insert into public.site_settings (key, value, updated_at)
values (
    'arlista_ervenyesseg',
    jsonb_build_object('effective_since', now()),
    now()
)
on conflict (key) do nothing;

create or replace function public.lumi_arlista_ervenyesseg_frissitese()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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

drop trigger if exists lumi_arlista_ervenyesseg_trigger on public.services;
create trigger lumi_arlista_ervenyesseg_trigger
    after update of price_amount on public.services
    for each row
    when (old.price_amount is distinct from new.price_amount)
    execute function public.lumi_arlista_ervenyesseg_frissitese();

commit;
