-- ============================================================================
-- Staybase — volledig Postgres-schema voor Supabase (stand: 18 aug 2026)
-- Uitvoeren: Supabase dashboard → SQL Editor → dit hele script plakken en runnen.
--
-- Dit script is IDEMPOTENT: het maakt tabellen aan als ze nog niet bestaan en
-- voegt ontbrekende kolommen toe aan bestaande tabellen. Je kan het dus veilig
-- draaien of je 0001_init.sql nu wel of niet eerder hebt uitgevoerd.
--
-- Bevat alles wat de app vandaag gebruikt:
--   • profiles: rol (admin/owner) + formule (basic/premium/super) per gebruiker,
--     gekoppeld aan Supabase Auth (auth.users) en automatisch aangemaakt bij signup
--   • Guesty-kolommen (guesty_id, coördinaten, check-in/uit-tijden, boekingsmoment)
--   • berichten met tijdstempels (voor de reactietijd-insights)
-- ============================================================================

-- ---------- Gebruikersprofielen (rol + formule) ----------
-- Supabase Auth beheert e-mail/wachtwoord in auth.users; het profiel draagt
-- de app-specifieke velden. role bepaalt admin-toegang, plan bepaalt welke
-- schermen een eigenaar ziet (basic < premium < super).
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  role text not null default 'owner' check (role in ('admin', 'owner')),
  plan text not null default 'basic' check (plan in ('basic', 'premium', 'super')),
  created_at timestamptz not null default now()
);

-- Profiel automatisch aanmaken zodra iemand registreert via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- Panden ----------
create table if not exists properties (
  id text primary key,
  name text not null,
  location text not null,
  type text not null,
  bedrooms int not null,
  bathrooms int not null,
  max_guests int not null,
  area_m2 int not null,
  rating numeric,
  status text not null check (status in ('live', 'onboarding')),
  status_label text not null,
  art text not null,
  art_bg text not null,
  channels jsonb not null default '[]',
  cleaning_price int not null,
  base_price_week int not null default 245,
  base_price_weekend int not null default 285,
  created_at timestamptz not null default now()
);
alter table properties add column if not exists photo text;             -- coverfoto (URL)
alter table properties add column if not exists description text;
alter table properties add column if not exists guesty_id text unique;  -- upsert-sleutel voor de Guesty-sync
alter table properties add column if not exists lat double precision;   -- kaartweergave
alter table properties add column if not exists lng double precision;
-- Multi-tenancy (volgende stap): welk profiel bezit dit pand.
alter table properties add column if not exists owner_id uuid references profiles (id);

-- ---------- Boekingen ----------
create table if not exists bookings (
  id text primary key,
  property_id text not null references properties (id),
  guest text not null,
  avatar text not null,
  channel text not null check (channel in ('airbnb', 'booking', 'vrbo')),
  start_date date not null,
  end_date date not null,
  guests int not null,
  payout int not null,
  note text
);
alter table bookings add column if not exists guesty_id text unique;
alter table bookings add column if not exists checkin_time text;   -- "17:00" (lokale tijd)
alter table bookings add column if not exists checkout_time text;  -- "10:00"
alter table bookings add column if not exists booked_at timestamptz; -- boekingsmoment (boekingsvenster-insight)

-- ---------- Gesprekken & berichten (Guesty-inbox) ----------
create table if not exists conversations (
  id text primary key,
  property_id text not null references properties (id),
  guest text not null,
  avatar text not null,
  channel text not null,
  status text not null check (status in ('draft', 'guard', 'done')),
  snippet text not null,
  time_label text not null,
  draft text,
  draft_note text,
  guard_reason text,
  sort int not null default 0
);
alter table conversations add column if not exists guesty_id text unique;

create table if not exists messages (
  id bigint generated always as identity primary key,
  conversation_id text not null references conversations (id),
  sender text not null check (sender in ('guest', 'host')),
  body text not null,
  time_label text not null,
  auto boolean not null default false
);
alter table messages add column if not exists guesty_id text unique;
alter table messages add column if not exists created_at timestamptz; -- reactietijd-insights

-- ---------- Prijsvoorstellen ----------
create table if not exists price_suggestions (
  id text primary key,
  property_id text not null references properties (id),
  start_date date not null,
  end_date date not null,
  range_label text not null,
  dow_label text not null,
  price_from int not null,
  price_to int not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected'))
);

-- ---------- Schoonmaak ----------
create table if not exists cleanings (
  id text primary key,
  property_id text not null references properties (id),
  date date not null,
  time_label text,
  team text not null,
  source text not null check (source in ('own', 'marketplace')),
  price int not null,
  status text not null check (status in ('confirmed', 'pending_owner', 'awaiting_team', 'done')),
  status_note text,
  photos int,
  ai_check text
);

-- ---------- Omzet-historiek & instellingen ----------
create table if not exists revenue_months (
  month text primary key,
  airbnb int not null,
  booking int not null,
  vrbo int not null
);

create table if not exists property_revenue_h1 (
  property_id text primary key references properties (id),
  amount int not null
);

create table if not exists settings (
  key text primary key,
  value text not null
);

-- ---------- Onboarding-analytics ----------
create table if not exists onboarding_events (
  id bigint generated always as identity primary key,
  session_id text not null,
  step int not null,
  step_title text not null,
  duration_ms int not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table onboarding_events add column if not exists user_id uuid references profiles (id);

-- ---------- Handige indexen ----------
create index if not exists idx_bookings_property_dates on bookings (property_id, start_date, end_date);
create index if not exists idx_messages_conversation on messages (conversation_id, created_at);
create index if not exists idx_conversations_status on conversations (status);

-- ---------- Row Level Security ----------
-- De backend praat via de service-role key (die alle RLS omzeilt); zodra de
-- frontend rechtstreeks met Supabase praat, komen hier policies per eigenaar.
alter table profiles enable row level security;
alter table properties enable row level security;
alter table bookings enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table price_suggestions enable row level security;
alter table cleanings enable row level security;
alter table revenue_months enable row level security;
alter table property_revenue_h1 enable row level security;
alter table settings enable row level security;
alter table onboarding_events enable row level security;

-- Iedereen mag zijn eigen profiel lezen; alleen admins mogen formules wijzigen.
drop policy if exists "eigen profiel lezen" on profiles;
create policy "eigen profiel lezen" on profiles
  for select using (auth.uid() = id);

drop policy if exists "admins beheren profielen" on profiles;
create policy "admins beheren profielen" on profiles
  for all using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------- Naslag ----------
-- Een bestaande gebruiker admin maken (vul het e-mailadres in):
--   update profiles set role = 'admin', plan = 'super'
--   where id = (select id from auth.users where email = 'julie@staybase.be');
--
-- Een formule omzetten:
--   update profiles set plan = 'premium'
--   where id = (select id from auth.users where email = 'iemand@voorbeeld.be');
