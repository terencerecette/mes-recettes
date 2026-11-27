-- ============================================================================
-- Configuration complète de Supabase pour "Mes recettes"
-- ============================================================================
-- Mode d'emploi :
-- 1. Ouvrez votre projet dans le tableau de bord Supabase.
-- 2. Allez dans "SQL Editor" -> "New query".
-- 3. Collez l'intégralité de ce fichier puis cliquez sur "Run".
-- Ce script est idempotent (vous pouvez le relancer sans risque).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table des recettes personnelles synchronisées
-- ----------------------------------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key,
  notebook_code text not null,
  title text not null,
  category text not null check (category in ('Entrées', 'Plats', 'Desserts')),
  servings integer not null default 4 check (servings >= 1),
  photo_url text,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recipes is 'Recettes personnelles du carnet Mes recettes';
comment on column public.recipes.notebook_code is 'Code carnet partagé entre le PC et l''iPhone';

create index if not exists idx_recipes_notebook_updated
  on public.recipes (notebook_code, updated_at desc);

-- ----------------------------------------------------------------------------
-- 2. Table de la liste de courses synchronisée
-- ----------------------------------------------------------------------------
create table if not exists public.shopping_items (
  id uuid primary key,
  notebook_code text not null,
  name text not null,
  normalized_name text not null,
  quantity double precision,
  unit text not null default '',
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shopping_items is 'Articles de la liste de courses Mes recettes';

create index if not exists idx_shopping_items_notebook_created
  on public.shopping_items (notebook_code, created_at asc);

-- ----------------------------------------------------------------------------
-- 3. Sécurité RLS (Row Level Security) basée sur le Code carnet
-- ----------------------------------------------------------------------------
-- Chaque appareil utilise la clé publique Anon + le même Code carnet secret
-- (au moins 3 caractères) pour lire et écrire uniquement son propre carnet.
alter table public.recipes enable row level security;
alter table public.shopping_items enable row level security;

drop policy if exists "recipes_notebook_select" on public.recipes;
create policy "recipes_notebook_select"
  on public.recipes
  for select
  to anon, authenticated
  using (notebook_code is not null and length(trim(notebook_code)) >= 3);

drop policy if exists "recipes_notebook_insert" on public.recipes;
create policy "recipes_notebook_insert"
  on public.recipes
  for insert
  to anon, authenticated
  with check (notebook_code is not null and length(trim(notebook_code)) >= 3);

drop policy if exists "recipes_notebook_update" on public.recipes;
create policy "recipes_notebook_update"
  on public.recipes
  for update
  to anon, authenticated
  using (notebook_code is not null and length(trim(notebook_code)) >= 3)
  with check (notebook_code is not null and length(trim(notebook_code)) >= 3);

drop policy if exists "recipes_notebook_delete" on public.recipes;
create policy "recipes_notebook_delete"
  on public.recipes
  for delete
  to anon, authenticated
  using (notebook_code is not null and length(trim(notebook_code)) >= 3);

drop policy if exists "shopping_items_notebook_select" on public.shopping_items;
create policy "shopping_items_notebook_select"
  on public.shopping_items
  for select
  to anon, authenticated
  using (notebook_code is not null and length(trim(notebook_code)) >= 3);

drop policy if exists "shopping_items_notebook_insert" on public.shopping_items;
create policy "shopping_items_notebook_insert"
  on public.shopping_items
  for insert
  to anon, authenticated
  with check (notebook_code is not null and length(trim(notebook_code)) >= 3);

drop policy if exists "shopping_items_notebook_update" on public.shopping_items;
create policy "shopping_items_notebook_update"
  on public.shopping_items
  for update
  to anon, authenticated
  using (notebook_code is not null and length(trim(notebook_code)) >= 3)
  with check (notebook_code is not null and length(trim(notebook_code)) >= 3);

drop policy if exists "shopping_items_notebook_delete" on public.shopping_items;
create policy "shopping_items_notebook_delete"
  on public.shopping_items
  for delete
  to anon, authenticated
  using (notebook_code is not null and length(trim(notebook_code)) >= 3);

-- ----------------------------------------------------------------------------
-- 4. Bucket public de stockage pour les photos compressées des recettes
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-photos',
  'recipe-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "recipe_photos_select" on storage.objects;
create policy "recipe_photos_select"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'recipe-photos');

drop policy if exists "recipe_photos_insert" on storage.objects;
create policy "recipe_photos_insert"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'recipe-photos');

drop policy if exists "recipe_photos_update" on storage.objects;
create policy "recipe_photos_update"
  on storage.objects
  for update
  to anon, authenticated
  using (bucket_id = 'recipe-photos')
  with check (bucket_id = 'recipe-photos');

drop policy if exists "recipe_photos_delete" on storage.objects;
create policy "recipe_photos_delete"
  on storage.objects
  for delete
  to anon, authenticated
  using (bucket_id = 'recipe-photos');

-- ----------------------------------------------------------------------------
-- 5. Synchronisation temps réel (Supabase Realtime)
-- ----------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.recipes;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.shopping_items;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
