-- 20260910100000_add_requisiciones_indexes.sql
-- Evidence-based indexes for the requisiciones list queries.
--
-- pg_stat_statements (post-restart, post v_osi_lista migration) showed:
--   53 calls, 680ms avg, 3.59s max on the main requisiciones query
--   50 calls, 471ms avg, 2.13s max on the created_by variant
--
-- Root cause: the requisiciones table had NO indexes beyond the PK.
-- Every list query (getAllRequisiciones) filters by created_by or
-- deleted_at IS NULL and orders by id DESC, forcing full scans.
-- The requisiciones_osis LATERAL join also lacked an FK index.
--
-- These are partial indexes (WHERE deleted_at IS NULL) so they stay
-- compact and only cover the live rows the app actually queries.

-- 1) Non-admin "own requisiciones" path: filters by created_by, orders
--    by id DESC, filters soft-deleted rows.
create index if not exists requisiciones_created_by_id_desc_live_idx
  on public.requisiciones (created_by, id desc)
  where deleted_at is null;

-- 2) Admin path: filters soft-deleted rows, orders by id DESC.
--    Also covers the approval-queue queries that filter by
--    tipo_solicitud + lider_estatus / coordinador_estatus + deleted_at.
create index if not exists requisiciones_id_desc_live_idx
  on public.requisiciones (id desc)
  where deleted_at is null;

-- 3) Approval queue: lider pending internas filtered by departamento.
create index if not exists requisiciones_tipo_lider_dept_live_idx
  on public.requisiciones (tipo_solicitud, lider_estatus, departamento)
  where deleted_at is null;

-- 4) Approval queue: coordinador pending externas filtered by departamento.
create index if not exists requisiciones_tipo_coord_dept_live_idx
  on public.requisiciones (tipo_solicitud, coordinador_estatus, departamento)
  where deleted_at is null;

-- 5) Approval history: lider_por + tipo_solicitud + lider_estatus.
create index if not exists requisiciones_lider_por_tipo_estatus_idx
  on public.requisiciones (lider_por, tipo_solicitud, lider_estatus)
  where deleted_at is null;

-- 6) Approval history: coordinador_por + tipo_solicitud + coordinador_estatus.
create index if not exists requisiciones_coord_por_tipo_estatus_idx
  on public.requisiciones (coordinador_por, tipo_solicitud, coordinador_estatus)
  where deleted_at is null;

-- 7) requisiciones_osis FK index — the LATERAL join from requisiciones
--    to requisiciones_osis(id_requisicion) was unindexed, forcing a
--    full scan per requisicion row.
create index if not exists requisiciones_osis_id_requisicion_idx
  on public.requisiciones_osis (id_requisicion);
