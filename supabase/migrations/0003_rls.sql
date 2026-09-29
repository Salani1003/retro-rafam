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
