-- ETNI-274: contributor_profiles table
-- Stores public profile data for verified contributors linked to Supabase auth users.

create table if not exists contributor_profiles (
  id              uuid        primary key references auth.users(id) on delete cascade,
  display_name    text        not null,
  created_at      timestamptz not null default now(),
  age_confirmed_at timestamptz,
  public          bool        not null default false
);

alter table contributor_profiles enable row level security;

-- Each user can read and update their own profile row only.
create policy "contributor_profiles_own_rw"
  on contributor_profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);
