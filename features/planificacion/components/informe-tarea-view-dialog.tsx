"use client";

import { Button } from "@/components/ui/button";
import { OrigenBadge } from "./origen-badge";
import { PlanModal } from "./plan-modal";
import { TareaViewPanel } from "./tarea-view-panel";
import type { PlanApp, PlanModulo, PlanTarea } from "../lib/types";

function stub_app(nombre: string | undefined): PlanApp | undefined {
  if (!nombre?.trim()) return undefined;
  return {
    id: 0,
    slug: "",
    nombre: nombre.trim(),
    subtitulo: null,
    origen: "custom",
    section: "custom",
    done_count: 0,
    left_count: 0,
    progress: 0,
    salud: "Planificado",
    modulo_count: 0,
    modulos: [],
    hitos: [],
  };
}

function stub_modulo(nombre: string | undefined): PlanModulo | undefined {
  if (!nombre?.trim()) return undefined;
  return {
    id: 0,
    app_id: 0,
    app_ids: [],
    nombre: nombre.trim(),
    subtitulo: null,
    trimestre_entrega: "T1",
    anio: new Date().getFullYear(),
    fecha_objetivo: null,
    salud_override: null,
    done_count: 0,
    left_count: 0,
    progress: 0,
    salud: "Planificado",
    participantes: [],
    tareas: [],
  };
}

export function InformeTareaViewDialog({
  open,
  tarea,
  app_nombre,
  modulo_nombre,
  onClose,
}: {
  open: boolean;
  tarea: PlanTarea | null;
  app_nombre?: string | null;
  modulo_nombre?: string | null;
  onClose: () => void;
}) {
  if (!open || !tarea) return null;

  const app = stub_app(app_nombre ?? undefined);
  const modulo = stub_modulo(modulo_nombre ?? undefined);

  return (
    <PlanModal
      open={open}
      variant="sheet"
      title={tarea.titulo}
      subtitle={`${app?.nombre ?? "App"} · ${modulo?.nombre ?? "Módulo"}`}
      badges={<OrigenBadge origen={tarea.origen} />}
      onClose={onClose}
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <TareaViewPanel
        tarea={tarea}
        app={app}
        modulo={modulo}
        can_write={false}
      />
    </PlanModal>
  );
}
