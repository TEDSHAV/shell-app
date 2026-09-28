-- Unificar canal TED + trigger de requisiciones:
-- mismo event_key, copy y dedupe estable que Shell (fan_out_by_config).
-- Dual fire (app + trigger) queda en no-op por unique de notify.inbox.

create or replace function notify.handle_requisicion_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_solicitante text := coalesce(nullif(btrim(new.solicitante), ''), 'Un usuario');
  v_dept text := coalesce(new.departamento, '');
  v_nro_osi text;
  v_label text;
  v_context jsonb;
begin
  if tg_op = 'INSERT' then
    if new.deleted_at is not null then
      return new;
    end if;

    if new.tipo_solicitud = 'Interno' then
      if new.coordinador_estatus = 'pendiente' then
        if nullif(btrim(v_dept), '') is not null then
          perform notify.fan_out_by_config(
            p_app_slug => 'administracion',
            p_event_key => 'requisicion_pending_coordinador',
            p_title => 'Requisición Pendiente de Aprobación (Coordinador)',
            p_body => format(
              '%s tiene una requisición interna que requiere su aprobación como Coordinador.',
              v_solicitante
            ),
            p_link_path => format('/requisiciones/view/%s', new.id),
            p_metadata => jsonb_build_object(
              'table', 'requisiciones',
              'requisicion_id', new.id,
              'source', 'db_trigger'
            ),
            p_dedupe_key => format('requisicion:%s:pending_coordinador', new.id),
            p_priority => 2::smallint,
            p_context => jsonb_build_object('departamento_nombre', btrim(v_dept))
          );
        end if;
      elsif new.lider_estatus = 'pendiente' then
        v_context := notify._requisicion_pending_lider_context(v_dept);
        if v_context <> '{}'::jsonb then
          perform notify.fan_out_by_config(
            p_app_slug => 'administracion',
            p_event_key => 'requisicion_pending_lider',
            p_title => 'Requisición Interna Pendiente de Aprobación',
            p_body => format(
              '%s tiene una requisición interna que requiere su aprobación como Líder.',
              v_solicitante
            ),
            p_link_path => format('/requisiciones/view/%s', new.id),
            p_metadata => jsonb_build_object(
              'table', 'requisiciones',
              'requisicion_id', new.id,
              'source', 'db_trigger'
            ),
            p_dedupe_key => format('requisicion:%s:pending_lider', new.id),
            p_priority => 2::smallint,
            p_context => v_context
          );
        end if;
      elsif new.lider_estatus is null then
        perform notify.fan_out_by_config(
          p_app_slug => 'administracion',
          p_event_key => 'requisicion_pending_admin',
          p_title => 'Requisición lista para Administración',
          p_body => format(
            '%s tiene una requisición interna lista para trámite de Administración.',
            v_solicitante
          ),
          p_link_path => format('/requisiciones/view/%s', new.id),
          p_metadata => jsonb_build_object(
            'table', 'requisiciones',
            'requisicion_id', new.id,
            'source', 'db_trigger'
          ),
          p_dedupe_key => format('requisicion:%s:pending_admin', new.id),
          p_priority => 2::smallint,
          p_context => '{}'::jsonb
        );
      end if;
    elsif new.tipo_solicitud = 'Externo' then
      if new.coordinador_estatus = 'pendiente' then
        if nullif(btrim(v_dept), '') is not null then
          perform notify.fan_out_by_config(
            p_app_slug => 'administracion',
            p_event_key => 'requisicion_pending_coordinador',
            p_title => 'Requisición Pendiente de Aprobación (Coordinador)',
            p_body => format(
              '%s tiene una requisición interna que requiere su aprobación como Coordinador.',
              v_solicitante
            ),
            p_link_path => format('/requisiciones/view/%s', new.id),
            p_metadata => jsonb_build_object(
              'table', 'requisiciones',
              'requisicion_id', new.id,
              'source', 'db_trigger'
            ),
            p_dedupe_key => format('requisicion:%s:pending_coordinador', new.id),
            p_priority => 2::smallint,
            p_context => jsonb_build_object('departamento_nombre', btrim(v_dept))
          );
        end if;
      else
        v_nro_osi := notify._requisicion_osi_label(new.id_osi);
        v_label := case
          when v_nro_osi <> '' then format('de la OSI N° %s', v_nro_osi)
          else 'externa'
        end;
        perform notify.fan_out_by_config(
          p_app_slug => 'administracion',
          p_event_key => 'requisicion_pending_admin',
          p_title => 'Requisición lista para Administración',
          p_body => format(
            '%s tiene una requisición %s lista para trámite de Administración.',
            v_solicitante,
            v_label
          ),
          p_link_path => format('/requisiciones/view/%s', new.id),
          p_metadata => jsonb_build_object(
            'table', 'requisiciones',
            'requisicion_id', new.id,
            'source', 'db_trigger'
          ),
          p_dedupe_key => format('requisicion:%s:pending_admin', new.id),
          p_priority => 2::smallint,
          p_context => '{}'::jsonb
        );
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.deleted_at is not null then
      return new;
    end if;

    if new.tipo_solicitud = 'Interno'
       and old.lider_estatus is distinct from 'pendiente'
       and new.lider_estatus = 'pendiente'
    then
      v_context := notify._requisicion_pending_lider_context(v_dept);
      if v_context <> '{}'::jsonb then
        perform notify.fan_out_by_config(
          p_app_slug => 'administracion',
          p_event_key => 'requisicion_pending_lider',
          p_title => 'Requisición Interna Pendiente de Aprobación',
          p_body => format(
            '%s tiene una requisición interna que requiere su aprobación como Líder.',
            v_solicitante
          ),
          p_link_path => format('/requisiciones/view/%s', new.id),
          p_metadata => jsonb_build_object(
            'table', 'requisiciones',
            'requisicion_id', new.id,
            'source', 'db_trigger_approval'
          ),
          p_dedupe_key => format('requisicion:%s:pending_lider', new.id),
          p_priority => 2::smallint,
          p_context => v_context
        );
      end if;
    end if;

    if new.tipo_solicitud = 'Interno'
       and old.lider_estatus is distinct from 'aprobada'
       and new.lider_estatus = 'aprobada'
    then
      perform notify.fan_out_by_config(
        p_app_slug => 'administracion',
        p_event_key => 'requisicion_pending_admin',
        p_title => 'Requisición lista para Administración',
        p_body => format(
          '%s tiene una requisición interna lista para trámite de Administración.',
          v_solicitante
        ),
        p_link_path => format('/requisiciones/view/%s', new.id),
        p_metadata => jsonb_build_object(
          'table', 'requisiciones',
          'requisicion_id', new.id,
          'source', 'db_trigger_approval'
        ),
        p_dedupe_key => format('requisicion:%s:pending_admin', new.id),
        p_priority => 2::smallint,
        p_context => '{}'::jsonb
      );
    end if;

    if new.tipo_solicitud = 'Externo'
       and old.coordinador_estatus is distinct from 'aprobada'
       and new.coordinador_estatus = 'aprobada'
    then
      v_nro_osi := notify._requisicion_osi_label(new.id_osi);
      v_label := case
        when v_nro_osi <> '' then format('de la OSI N° %s', v_nro_osi)
        else 'externa'
      end;
      perform notify.fan_out_by_config(
        p_app_slug => 'administracion',
        p_event_key => 'requisicion_pending_admin',
        p_title => 'Requisición lista para Administración',
        p_body => format(
          '%s tiene una requisición %s lista para trámite de Administración.',
          v_solicitante,
          v_label
        ),
        p_link_path => format('/requisiciones/view/%s', new.id),
        p_metadata => jsonb_build_object(
          'table', 'requisiciones',
          'requisicion_id', new.id,
          'source', 'db_trigger_approval'
        ),
        p_dedupe_key => format('requisicion:%s:pending_admin', new.id),
        p_priority => 2::smallint,
        p_context => '{}'::jsonb
      );
    end if;

    return new;
  end if;

  return new;
end;
$$;
