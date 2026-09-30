-- ===== supabase/migrations/0001_schema.sql =====
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

-- ===== supabase/migrations/0002_functions.sql =====
-- Funciones RPC: pertenencia a sala, generación de código y operaciones seguras.

create or replace function public.is_participant(p_retrospective_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.participants p
    where p.retrospective_id = p_retrospective_id
      and p.user_id = auth.uid()
  );
$$;

create or replace function public.generate_room_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- sin 0/O/1/I para evitar ambigüedad
  new_code text;
  attempt int := 0;
begin
  loop
    new_code := '';
    for i in 1..6 loop
      new_code := new_code || substr(alphabet, floor(random() * length(alphabet) + 1)::int, 1);
    end loop;

    exit when not exists (select 1 from public.retrospectives where room_code = new_code);

    attempt := attempt + 1;
    if attempt > 20 then
      raise exception 'No se pudo generar un código de sala único';
    end if;
  end loop;

  return new_code;
end;
$$;

-- Crea una retrospectiva y registra a su creador como primer participante.
create or replace function public.create_retrospective(
  p_display_name text,
  p_title text default null,
  p_team_name text default null
)
returns public.retrospectives
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retro public.retrospectives;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para crear una retrospectiva';
  end if;

  if trim(coalesce(p_display_name, '')) = '' then
    raise exception 'El nombre del participante es obligatorio';
  end if;

  v_code := public.generate_room_code();

  insert into public.retrospectives (title, team_name, room_code, created_by)
  values (nullif(trim(p_title), ''), nullif(trim(p_team_name), ''), v_code, auth.uid())
  returning * into v_retro;

  insert into public.participants (retrospective_id, user_id, display_name)
  values (v_retro.id, auth.uid(), trim(p_display_name));

  return v_retro;
end;
$$;

-- Une (o reconecta) a un participante a una sala existente mediante su código.
create or replace function public.join_retrospective(
  p_room_code text,
  p_display_name text
)
returns public.retrospectives
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retro public.retrospectives;
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para unirse a una retrospectiva';
  end if;

  if trim(coalesce(p_display_name, '')) = '' then
    raise exception 'El nombre del participante es obligatorio';
  end if;

  select * into v_retro
  from public.retrospectives
  where room_code = upper(trim(p_room_code));

  if v_retro.id is null then
    raise exception 'SALA_NO_ENCONTRADA';
  end if;

  insert into public.participants (retrospective_id, user_id, display_name)
  values (v_retro.id, auth.uid(), trim(p_display_name))
  on conflict (retrospective_id, user_id)
  do update set display_name = excluded.display_name;

  return v_retro;
end;
$$;

-- Cierra una retrospectiva. Solo puede ejecutarlo el creador de la sala.
create or replace function public.close_retrospective(p_retrospective_id uuid)
returns public.retrospectives
language plpgsql
security definer
set search_path = public
as $$
declare
  v_retro public.retrospectives;
begin
  select * into v_retro from public.retrospectives where id = p_retrospective_id;

  if v_retro.id is null then
    raise exception 'SALA_NO_ENCONTRADA';
  end if;

  if v_retro.created_by <> auth.uid() then
    raise exception 'Solo quien creó la retrospectiva puede finalizarla';
  end if;

  update public.retrospectives
  set status = 'closed', closed_at = now()
  where id = p_retrospective_id
  returning * into v_retro;

  return v_retro;
end;
$$;

-- Alterna (agrega/retira) el pulgar arriba de un comentario para el participante actual.
create or replace function public.toggle_reaction(p_comment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
  v_retrospective_id uuid;
  v_status text;
  v_column_type text;
  v_existing uuid;
begin
  select c.retrospective_id, c.column_type
  into v_retrospective_id, v_column_type
  from public.comments c
  where c.id = p_comment_id;

  if v_retrospective_id is null then
    raise exception 'COMENTARIO_NO_ENCONTRADO';
  end if;

  if v_column_type = 'action' then
    raise exception 'La columna de acciones no admite reacciones';
  end if;

  select status into v_status from public.retrospectives where id = v_retrospective_id;
  if v_status <> 'active' then
    raise exception 'RETROSPECTIVA_CERRADA';
  end if;

  select id into v_participant_id
  from public.participants
  where retrospective_id = v_retrospective_id and user_id = auth.uid();

  if v_participant_id is null then
    raise exception 'NO_ES_PARTICIPANTE';
  end if;

  select id into v_existing
  from public.reactions
  where comment_id = p_comment_id and participant_id = v_participant_id;

  if v_existing is not null then
    delete from public.reactions where id = v_existing;
    return false;
  else
    insert into public.reactions (comment_id, retrospective_id, participant_id)
    values (p_comment_id, v_retrospective_id, v_participant_id);
    return true;
  end if;
end;
$$;

grant execute on function public.is_participant(uuid) to authenticated;
grant execute on function public.generate_room_code() to authenticated;
grant execute on function public.create_retrospective(text, text, text) to authenticated;
grant execute on function public.join_retrospective(text, text) to authenticated;
grant execute on function public.close_retrospective(uuid) to authenticated;
grant execute on function public.toggle_reaction(uuid) to authenticated;

-- ===== supabase/migrations/0003_rls.sql =====
-- Row Level Security: los participantes solo pueden operar sobre salas a las que se unieron.
-- Las operaciones sensibles (crear sala, unirse, cerrar, reaccionar) pasan por funciones
-- SECURITY DEFINER (ver 0002_functions.sql); el resto se controla con estas políticas.

alter table public.retrospectives enable row level security;
alter table public.participants enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;

-- retrospectives: cualquier usuario autenticado (incluye sesiones anónimas) puede leer una
-- sala por su código para poder unirse; la escritura solo ocurre vía RPC.
create policy "retrospectives_select_authenticated"
  on public.retrospectives for select
  to authenticated
  using (true);

-- participants: solo quienes ya pertenecen a la sala pueden ver la lista de participantes.
create policy "participants_select_members"
  on public.participants for select
  to authenticated
  using (public.is_participant(retrospective_id));

-- comments: lectura y escritura restringidas a miembros de la sala; solo el autor edita/borra
-- sus propios comentarios, y solo mientras la retrospectiva está activa.
create policy "comments_select_members"
  on public.comments for select
  to authenticated
  using (public.is_participant(retrospective_id));

create policy "comments_insert_own"
  on public.comments for insert
  to authenticated
  with check (
    public.is_participant(retrospective_id)
    and exists (
      select 1 from public.participants p
      where p.id = participant_id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.retrospectives r
      where r.id = retrospective_id and r.status = 'active'
    )
  );

create policy "comments_update_own"
  on public.comments for update
  to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.id = participant_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.participants p
      where p.id = participant_id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.retrospectives r
      where r.id = retrospective_id and r.status = 'active'
    )
  );

create policy "comments_delete_own"
  on public.comments for delete
  to authenticated
  using (
    exists (
      select 1 from public.participants p
      where p.id = participant_id and p.user_id = auth.uid()
    )
    and exists (
      select 1 from public.retrospectives r
      where r.id = retrospective_id and r.status = 'active'
    )
  );

-- reactions: lectura para miembros de la sala; la escritura ocurre exclusivamente a través
-- de la función toggle_reaction (SECURITY DEFINER), por lo que no se otorgan políticas de
-- insert/update/delete aquí.
create policy "reactions_select_members"
  on public.reactions for select
  to authenticated
  using (public.is_participant(retrospective_id));

-- Grants: RLS ya restringe filas; estos grants habilitan las operaciones permitidas por rol.
grant select on public.retrospectives to authenticated;
grant select on public.participants to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
grant select on public.reactions to authenticated;

-- ===== supabase/migrations/0004_realtime.sql =====
-- Habilita Supabase Realtime (Postgres Changes) para las tablas colaborativas.

alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.retrospectives;
alter publication supabase_realtime add table public.participants;

-- replica identity full para poder recibir los valores anteriores en updates/deletes
alter table public.comments replica identity full;
alter table public.reactions replica identity full;
alter table public.retrospectives replica identity full;
alter table public.participants replica identity full;


-- ===== supabase/migrations/0005_delete_retrospective.sql =====
-- Elimina una retrospectiva y todo su contenido (participantes, comentarios y reacciones se
-- borran en cascada por las foreign keys). Irreversible.
-- Cualquier usuario autenticado puede eliminar: la app es de uso interno del equipo y la
-- confirmación vive en el frontend.

create or replace function public.delete_retrospective(p_retrospective_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Se requiere una sesión para eliminar una retrospectiva';
  end if;

  delete from public.retrospectives where id = p_retrospective_id;

  if not found then
    raise exception 'SALA_NO_ENCONTRADA';
  end if;
end;
$$;

grant execute on function public.delete_retrospective(uuid) to authenticated;
