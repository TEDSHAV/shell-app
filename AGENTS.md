# Project Preferences & Architecture

## Git commits

- NEVER add `Co-Authored-By:` trailers to commit messages.
- NEVER add "Generated with [Devin](https://devin.ai)" or any AI/tool attribution to commit messages.
- Keep commit messages to the message itself, matching the surrounding repo style.

## Database Migrations

All apps share the same Supabase project (ID `oboslhhemuvzvjnbqeih`), but
migrations are organized by ownership — each module repo owns migrations for
its own tables:

- **Shell-level migrations** live in this repo at `supabase/migrations/`:
  - authprisma app registrations (e.g., `register_srh_app`, `register_scalidad_app`)
  - email templates and notify schema/event types
  - cross-app indexes and anything genuinely shared across all apps
- **Capacitacion-specific migrations** live in
  `nextjs-capacitacion-module/supabase/migrations/` (e.g., proceso_steps,
  osi_notas, ficha_tecnica, feriados, survey_settings, anulacion,
  niveles_habilidad, visibilidad_cliente, requisiciones).
- **RH-specific migrations** live in `nextjs-rh-module/supabase/migrations/`
  (e.g., any new column/RLS/index on `rh_solicitudes` or other RH-owned tables).
- **Calidad-specific migrations** live in
  `nextjs-calidad-hub/supabase/migrations/` (e.g., `calidad_documentos`,
  `calidad_documento_versiones`).

Migration naming: `YYYYMMDDHHMMSS_descriptive_name.sql`. Migrations are applied
manually to the Supabase instance (no CI/CD applies them), so once a migration
has been applied to the database it stays where it is — do not move applied
migrations between repos.

### Already-applied exceptions (stay in this repo)

The following migrations were committed to this repo before the
module-owns-its-tables convention was adopted. They are already applied to the
database, so they stay here — but new migrations for these tables go in their
owner repo:

- `create_rh_solicitudes`, `alter_rh_solicitudes_email_to_checkbox`,
  `extend_rh_solicitudes_tipos` — owned by RH; new `rh_solicitudes` migrations
  go in `nextjs-rh-module/supabase/migrations/`.
- `requisiciones_revision_columns`, `requisiciones_selected_sesiones`,
  `add_requisiciones_indexes`, `clear_externa_coordinador_estatus` — owned by
  capacitacion; new `requisiciones` migrations go in
  `nextjs-capacitacion-module/supabase/migrations/`.
- `create_facilitador_evaluaciones`, `add_uso_portal_facilitador` — owned by
  capacitacion; new migrations for these tables go in
  `nextjs-capacitacion-module/supabase/migrations/`.
