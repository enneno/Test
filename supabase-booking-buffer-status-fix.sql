-- Lumi Nails: a 30 perces szunet ellenorzese csak naptari valtozasnal fusson.
-- Supabase Dashboard > SQL Editor feluleten futtasd.
-- Biztonsagosan ujrafuttathato, meglevo foglalast nem modosit.

create or replace function public.lumi_enforce_booking_buffer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

drop trigger if exists bookings_enforce_buffer on public.bookings;
create trigger bookings_enforce_buffer
before insert or update of starts_at, ends_at, status on public.bookings
for each row execute function public.lumi_enforce_booking_buffer();
