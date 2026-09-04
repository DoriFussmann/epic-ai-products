-- Epic AI Products — v1 schema + Row-Level Security
-- Postgres 15 / Supabase. Run once (e.g. supabase migration or SQL editor).
-- Design notes:
--   * al_uuid (AudienceLab UUID) is the identity key: dedup, persistence, HI-match.
--   * A person is owned by exactly ONE client, ever -> global unique index on leads.al_uuid.
--   * Each client has one Instantly campaign. The Instantly API key is env-only.
--   * The nightly pipeline runs as service_role (bypasses RLS) and does all writes.
--   * Client portal is READ-ONLY through RLS; a client can only ever see its own rows.

create extension if not exists pgcrypto;

-- ---------- enums ----------
create type list_type    as enum ('FS','CC','HI');
create type channel      as enum ('email','linkedin');
create type alert_scope  as enum ('admin','client');
create type severity     as enum ('info','warning','error');
create type user_role    as enum ('superadmin','admin','client');

-- ---------- identity / access ----------
-- One row per auth user. Set `role` in the Table Editor after adding a user in Authentication.
-- superadmin and admin both get the operator console; client is portal-only (via client_members).
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'client',
  is_admin   boolean not null default false, -- kept in sync with role (admin | superadmin)
  created_at timestamptz not null default now()
);

create table clients (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,                 -- company name
  is_live                boolean not null default false,
  website                text,
  site_pixel             text,
  instantly_campaign_id  text,
  created_at             timestamptz not null default now()
);

-- maps an auth user to the client(s) they can see
create table client_members (
  user_id   uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  primary key (user_id, client_id)
);

-- ---------- leads (the owned, growing audience file — LEAN subset only) ----------
-- Deliberately does NOT store ethnicity/religion/credit/income/skiptrace from the export.
create table leads (
  id             uuid primary key default gen_random_uuid(),
  al_uuid        text not null,                 -- AudienceLab UUID (identity key)
  owning_client_id uuid not null references clients(id) on delete cascade,
  first_name     text,
  last_name      text,
  email          text,                          -- canonical send email
  company_name   text,
  job_title      text,
  personal_city  text,
  personal_state char(2),
  linkedin_url   text,
  source_lists   list_type[] not null default '{}',  -- any of FS/CC/HI
  date_assigned  date not null default current_date,
  created_at     timestamptz not null default now()
);
-- Owned once, ever: this single index is the whole dedup engine.
create unique index leads_al_uuid_key on leads (al_uuid);
create index leads_owner_idx on leads (owning_client_id);

-- ---------- nightly metric snapshots (stored, not real-time) ----------
create table metric_snapshots (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  channel       channel not null,
  snapshot_date date not null,
  sent int not null default 0,
  delivered int not null default 0,
  opens int not null default 0,
  clicks int not null default 0,
  replies int not null default 0,
  bounces int not null default 0,
  unique (client_id, channel, snapshot_date)
);

-- ---------- in-portal alerts ----------
create table alerts (
  id         uuid primary key default gen_random_uuid(),
  scope      alert_scope not null,
  client_id  uuid references clients(id) on delete cascade, -- null for admin-global
  type       text not null,
  severity   severity not null default 'warning',
  message    text not null,
  created_at timestamptz not null default now(),
  read_at    timestamptz
);

-- ---------- pipeline run log (observability + idempotency guard) ----------
create table pipeline_runs (
  id            uuid primary key default gen_random_uuid(),
  run_date      date not null unique,            -- one run per night; guards re-runs
  status        text not null default 'started', -- started | completed | skipped | failed
  fs_count int, cc_count int, hi_count int,
  assigned_count int, unassigned_count int,
  error text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);

-- =====================================================================
-- Row-Level Security
-- =====================================================================
create or replace function public.sync_profile_role()
returns trigger language plpgsql set search_path = public as $$
begin
  new.is_admin := new.role in ('admin', 'superadmin');
  return new;
end;
$$;

create trigger profiles_sync_role
  before insert or update of role on profiles
  for each row execute procedure public.sync_profile_role();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested text := lower(coalesce(new.raw_user_meta_data->>'role', ''));
  r public.user_role;
begin
  r := case requested
    when 'superadmin' then 'superadmin'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'client'::public.user_role
  end;
  insert into public.profiles (id, role) values (new.id, r)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, role)
select
  id,
  case lower(coalesce(raw_user_meta_data->>'role', ''))
    when 'superadmin' then 'superadmin'::public.user_role
    when 'admin' then 'admin'::public.user_role
    else 'client'::public.user_role
  end
from auth.users
on conflict (id) do nothing;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(
    (select p.role in ('admin', 'superadmin') from profiles p where p.id = auth.uid()),
    false
  )
$$;

create or replace function public.current_client_ids() returns setof uuid
  language sql stable security definer set search_path = public as $$
  select client_id from client_members where user_id = auth.uid()
$$;

alter table profiles           enable row level security;
alter table clients            enable row level security;
alter table client_members     enable row level security;
alter table leads              enable row level security;
alter table metric_snapshots   enable row level security;
alter table alerts             enable row level security;
alter table pipeline_runs      enable row level security;

-- profiles: you see yourself; admin sees all
create policy p_profiles_self on profiles for select
  using (id = auth.uid() or public.is_admin());

-- clients: member sees their client; admin sees all
create policy p_clients_read on clients for select
  using (public.is_admin() or id in (select public.current_client_ids()));

create policy p_members_read on client_members for select
  using (public.is_admin() or user_id = auth.uid());

create policy p_leads_read on leads for select
  using (public.is_admin() or owning_client_id in (select public.current_client_ids()));
create policy p_metrics_read on metric_snapshots for select
  using (public.is_admin() or client_id in (select public.current_client_ids()));

-- alerts: client sees its own client-scoped alerts; admin sees everything
create policy p_alerts_read on alerts for select
  using (
    public.is_admin()
    or (scope = 'client' and client_id in (select public.current_client_ids()))
  );

-- pipeline_runs: admin only
create policy p_runs_admin on pipeline_runs for select using (public.is_admin());

-- NOTE: no INSERT/UPDATE/DELETE policies for clients on purpose.
-- All writes happen server-side via the service_role key, which bypasses RLS.
-- The portal is strictly read-only; that is the isolation guarantee.
