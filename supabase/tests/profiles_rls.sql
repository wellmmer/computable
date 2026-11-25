-- Row rules of public.profiles, its size limits, delete_my_account() and keep_alive() (spec R5b, sections 3, 5 and 7).
-- Run it against a local Supabase: `supabase start`, then `supabase test db`. It needs Docker.
-- Person A and person B each have a login and a row. Every change rolls back at the end.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-4000-a000-00000000000a', 'person-a@example.test'),
  ('00000000-0000-4000-a000-00000000000b', 'person-b@example.test');

insert into public.profiles (user_id, progress) values
  ('00000000-0000-4000-a000-00000000000a', '{"who": "A"}'),
  ('00000000-0000-4000-a000-00000000000b', '{"who": "B"}');

-- From here on, the queries run as person A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-4000-a000-00000000000a", "role": "authenticated"}', true);

select results_eq(
  'select user_id from public.profiles',
  $$ values ('00000000-0000-4000-a000-00000000000a'::uuid) $$,
  'Person A sees only her own row'
);

select is_empty(
  $$ update public.profiles set progress = '{"who": "changed by A"}' where user_id = '00000000-0000-4000-a000-00000000000b' returning user_id $$,
  'Person A cannot change the row of person B'
);

select throws_ok(
  $$ insert into public.profiles (user_id) values ('00000000-0000-4000-a000-00000000000b') $$,
  '42501',
  null,
  'Person A cannot add a row for person B'
);

select is_empty(
  $$ delete from public.profiles returning user_id $$,
  'Person A cannot delete rows directly, not even her own'
);

select lives_ok(
  $$ update public.profiles set progress = '{"who": "A again"}' where user_id = '00000000-0000-4000-a000-00000000000a' $$,
  'Person A can change her own row'
);

-- The WITH CHECK part of the update rule: a changed row must still belong to the person.
select throws_ok(
  $$ update public.profiles set user_id = gen_random_uuid() where user_id = '00000000-0000-4000-a000-00000000000a' $$,
  '42501',
  'new row violates row-level security policy for table "profiles"',
  'Person A cannot give her own row to another user ID'
);

-- A machine of more than 256 KB of JSON text breaks the size limit (check_violation).
select throws_ok(
  $$ update public.profiles set machine = jsonb_build_object('name', repeat('x', 262144)) where user_id = '00000000-0000-4000-a000-00000000000a' $$,
  '23514',
  null,
  'Person A cannot save a machine of more than 256 KB'
);

select lives_ok('select public.delete_my_account()', 'Person A deletes her account');

-- Back to the owner, to look at every row.
reset role;

select is(
  (select count(*)::int from auth.users where id = '00000000-0000-4000-a000-00000000000a'),
  0,
  'The login of person A is gone'
);

select is(
  (select count(*)::int from public.profiles where user_id = '00000000-0000-4000-a000-00000000000a'),
  0,
  'The row of person A is gone with her login'
);

select is(
  (select count(*)::int from auth.users where id = '00000000-0000-4000-a000-00000000000b'),
  1,
  'The login of person B stays'
);

select is(
  (select progress from public.profiles where user_id = '00000000-0000-4000-a000-00000000000b'),
  '{"who": "B"}'::jsonb,
  'The row of person B did not change'
);

-- A signed-in role with no user ID in its claims: auth.uid() is null, so the function stops.
-- The number of logins before the call shows afterwards that nothing was deleted.
create temp table logins_before on commit drop as select count(*)::int as n from auth.users;
set local role authenticated;
select set_config('request.jwt.claims', '{}', true);
select throws_ok(
  'select public.delete_my_account()',
  '42501',
  'Only a signed-in person can delete their account.',
  'delete_my_account() stops when there is no user ID'
);

reset role;
select is(
  (select count(*)::int from auth.users),
  (select n from logins_before),
  'Without a user ID, delete_my_account() deleted no login'
);

-- Someone who is not signed in cannot call the function. The claims of person A are gone first.
select set_config('request.jwt.claims', '{"role": "anon"}', true);
set local role anon;
select throws_ok('select public.delete_my_account()', '42501', null, 'A visitor who is not signed in cannot delete any account');

-- The daily keep-alive calls keep_alive() with the public key, as a visitor who is not signed in.
select is(public.keep_alive(), 1, 'A visitor who is not signed in can call keep_alive()');

select * from finish();
rollback;
