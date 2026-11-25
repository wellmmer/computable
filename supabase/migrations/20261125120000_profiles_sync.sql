-- Optional accounts, part 2 (spec R5b, section 5): sync.
-- When the machine in the row last changed in a browser. The machine dialog shows it.
alter table public.profiles add column machine_changed_at timestamptz;

-- When "Reset my progress" last ran while signed in, on any device. Every device drops the quiz
-- results that ended before it, so the reset lasts.
alter table public.profiles add column progress_reset_at timestamptz;

-- Without a limit, a person could write JSON of any size into their own row.
-- The machine may hold 256 KB of JSON text, and the quiz scores 64 KB.
alter table public.profiles
  add constraint profiles_machine_size check (machine is null or octet_length(machine::text) <= 262144),
  add constraint profiles_progress_size check (octet_length(progress::text) <= 65536);

-- The daily keep-alive calls this, so a free project does not pause after a week without use.
-- It reads no table, so it needs no row rules.
create function public.keep_alive() returns integer
  language sql stable set search_path = '' as $$ select 1 $$;
revoke execute on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
