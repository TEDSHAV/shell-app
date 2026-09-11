-- Clear coordinador approval gate on existing externas.
-- The approval workflow was inverted (externas were routed through coordinador
-- approval when they should have gone straight to Administración). This
-- migration clears the coordinador_estatus (and related fields) on ALL externas
-- that were caught in the broken coordinador gate — both the ones still pending
-- and the ones that were already "approved" while we were working on the fix —
-- so they appear in Administración's queue immediately, matching the corrected
-- workflow.
--
-- Internas are left untouched:
--   - Internas with coordinador_estatus = 'pendiente' still need coordinador approval.
--   - Internas with lider_estatus = 'pendiente' still need lider approval.
--   - Internas with both null were placed by the lider (no gate needed).
--
-- Rejected externas keep their motivo_rechazo_coordinador for audit history but
-- have coordinador_estatus cleared so they are no longer treated as "rejected
-- by coordinador" (which no longer applies to externas under the new workflow).

UPDATE requisiciones
SET coordinador_estatus = NULL,
    coordinador_por = NULL,
    coordinador_at = NULL
WHERE tipo_solicitud = 'Externo'
  AND coordinador_estatus IN ('pendiente', 'aprobada');

-- Clear the "Editada por el Aprobador" flag on the requisicion linked to
-- OSI N° 3517. This was set during the workflow-fix work and should not
-- permanently lock the record from the creator's edits.
UPDATE requisiciones
SET aprobador_edito = false,
    aprobador_edito_por = NULL,
    aprobador_edito_at = NULL
WHERE id_osi IN (
  SELECT id_osi FROM v_osi_formato_completo WHERE nro_osi = '3517'
);
