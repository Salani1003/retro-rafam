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
