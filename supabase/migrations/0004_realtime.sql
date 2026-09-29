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
