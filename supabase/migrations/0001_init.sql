-- Staybase — initieel Postgres-schema voor Supabase
-- Uitvoeren: Supabase dashboard → SQL Editor → plakken en runnen.
-- Dit is de 1-op-1 vertaling van het lokale SQLite-schema (backend/src/db.ts).
-- Auth verhuist naar Supabase Auth (auth.users); de eigen users/auth_sessions-
-- tabellen komen dus bewust NIET mee.

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

create table if not exists bookings (
  id text primary key,
  property_id text not null references properties(id),
  guest text not null,
  avatar text not null,
  channel text not null check (channel in ('airbnb', 'booking', 'vrbo')),
  start_date date not null,
  end_date date not null,
  guests int not null,
  payout int not null,
  note text
);

create table if not exists conversations (
  id text primary key,
  property_id text not null references properties(id),
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

create table if not exists messages (
  id bigint generated always as identity primary key,
  conversation_id text not null references conversations(id),
  sender text not null check (sender in ('guest', 'host')),
  body text not null,
  time_label text not null,
  auto boolean not null default false
);

create table if not exists price_suggestions (
  id text primary key,
  property_id text not null references properties(id),
  start_date date not null,
  end_date date not null,
  range_label text not null,
  dow_label text not null,
  price_from int not null,
  price_to int not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected'))
);

create table if not exists cleanings (
  id text primary key,
  property_id text not null references properties(id),
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

create table if not exists revenue_months (
  month text primary key,
  airbnb int not null,
  booking int not null,
  vrbo int not null
);

create table if not exists property_revenue_h1 (
  property_id text primary key references properties(id),
  amount int not null
);

create table if not exists settings (
  key text primary key,
  value text not null
);

create table if not exists onboarding_events (
  id bigint generated always as identity primary key,
  session_id text not null,
  step int not null,
  step_title text not null,
  duration_ms int not null,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Row Level Security aan (de backend praat straks via de service-role key;
-- policies per eigenaar volgen zodra Supabase Auth actief is).
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
