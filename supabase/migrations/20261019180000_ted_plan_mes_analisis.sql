-- Análisis editable del informe de objetivos (por mes).

alter table public.ted_plan_mes
  add column if not exists analisis_texto text;

comment on column public.ted_plan_mes.analisis_texto is
  'Párrafo de análisis/observaciones del informe de objetivos del mes.';

notify pgrst, 'reload schema';
