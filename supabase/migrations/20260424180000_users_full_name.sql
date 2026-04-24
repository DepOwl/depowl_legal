-- Replace first_name + last_name with a single full_name on public.users.

alter table public.users add column if not exists full_name text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'first_name'
  ) then
    execute $u$
      update public.users u
      set full_name = nullif(
        btrim(
          concat_ws(
            ' ',
            nullif(btrim(coalesce(u.first_name, '')), ''),
            nullif(btrim(coalesce(u.last_name, '')), '')
          )
        ),
        ''
      )
      where u.full_name is null
         or btrim(coalesce(u.full_name, '')) = '';
    $u$;
  end if;
end $$;

alter table public.users drop column if exists first_name;
alter table public.users drop column if exists last_name;
