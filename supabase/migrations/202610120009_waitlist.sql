-- Waitlist entries do not create accounts or send sign-in emails.
create table public.waitlist_signups (
  email text primary key check (
    email = lower(trim(email))
    and length(email) <= 254
    and email ~ '^[^[:space:]@]+@illinois[.]edu$'
  ),
  created_at timestamptz not null default now()
);

alter table public.waitlist_signups enable row level security;
revoke all on public.waitlist_signups from public, anon, authenticated;
grant select, insert on public.waitlist_signups to service_role;
