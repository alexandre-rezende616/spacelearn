-- tabela de perfis (aluno/professor)
-- ja executei no SQL do Supabase mas vou deixar salvo aqui por precaução

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'aluno' check (role in ('aluno', 'professor')),
  nome text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- usuario logado pode ler seu proprio perfil
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

-- usuario logado pode inserir seu proprio perfil
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- usuario logado pode atualizar seu proprio perfil
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- indice auxiliar para filtros por role (opcional)
create index if not exists profiles_role_idx on public.profiles(role);
