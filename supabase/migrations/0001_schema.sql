-- Retro: esquema principal
-- Entidades: retrospectives, participants, comments, reactions

create extension if not exists "pgcrypto";

create table if not exists public.retrospectives (
  id uuid primary key default gen_random_uuid(),
  title text,
  team_name text,
  room_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  constraint room_code_format check (room_code ~ '^[A-Z0-9]{6}$'),
  constraint closed_at_requires_closed check (
    (status = 'closed' and closed_at is not null) or
    (status = 'active' and closed_at is null)
  )
);

create index if not exists retrospectives_room_code_idx on public.retrospectives (room_code);
create index if not exists retrospectives_created_by_idx on public.retrospectives (created_by);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  retrospective_id uuid not null references public.retrospectives (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 60),
  joined_at timestamptz not null default now(),
  unique (retrospective_id, user_id)
);

create index if not exists participants_retrospective_id_idx on public.participants (retrospective_id);
create index if not exists participants_user_id_idx on public.participants (user_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  retrospective_id uuid not null references public.retrospectives (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  column_type text not null check (column_type in ('good', 'okay', 'fix', 'action')),
  content text not null check (char_length(trim(content)) between 1 and 500),
  assignee text check (assignee is null or char_length(trim(assignee)) <= 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists comments_retrospective_id_idx on public.comments (retrospective_id, column_type);
create index if not exists comments_participant_id_idx on public.comments (participant_id);

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  -- Desnormalizado desde comments.retrospective_id: permite filtrar el canal de Realtime
  -- por sala sin necesitar joins (los filtros de postgres_changes son sobre columnas simples).
  retrospective_id uuid not null references public.retrospectives (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  reaction_type text not null default 'thumbs_up' check (reaction_type = 'thumbs_up'),
  created_at timestamptz not null default now(),
  unique (comment_id, participant_id, reaction_type)
);

create index if not exists reactions_comment_id_idx on public.reactions (comment_id);
create index if not exists reactions_participant_id_idx on public.reactions (participant_id);
create index if not exists reactions_retrospective_id_idx on public.reactions (retrospective_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists comments_set_updated_at on public.comments;
create trigger comments_set_updated_at
  before update on public.comments
  for each row
  execute function public.set_updated_at();
