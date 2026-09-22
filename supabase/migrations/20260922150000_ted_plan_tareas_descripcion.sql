-- Description on plan tasks so ticket body survives promotion.

alter table public.ted_plan_tareas
  add column if not exists descripcion text;

update public.ted_plan_tareas t
set descripcion = tk.descripcion
from public.ted_plan_tickets tk
where t.ticket_id = tk.id
  and coalesce(nullif(btrim(t.descripcion), ''), '') = ''
  and coalesce(nullif(btrim(tk.descripcion), ''), '') <> '';
