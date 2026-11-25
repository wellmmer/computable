-- Optional accounts (spec R5b, section 3). One row per person.
-- The row holds the current machine and the quiz scores. R5b2 starts to fill it.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  machine jsonb,
  progress jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row rules: a person reads, adds and changes only their own row.
alter table public.profiles enable row level security;

-- People who are not signed in get no access at all.
revoke all on table public.profiles from anon;

create policy "A person reads only their own row"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "A person adds only their own row"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "A person changes only their own row"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- There is no delete rule. A row goes only with its login, through delete_my_account().

-- Deletes the login of the person who calls it. The row goes with it, by the foreign key.
-- It runs as its owner, because only the owner may delete from auth.users.
-- The empty search_path makes every name in it explicit.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Only a signed-in person can delete their account.' using errcode = '42501';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
