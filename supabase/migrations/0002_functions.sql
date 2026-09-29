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
