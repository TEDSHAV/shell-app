"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccesosModal } from "./accesos-modal";
import { slugify_kebab } from "../lib/slugs";
import { upsert_acceso_app } from "../actions/catalog-actions";
import type { AccesoApp } from "../lib/types";

export function AppFormDialog({
  open,
  app,
  onClose,
  onSaved,
}: {
  open: boolean;
  app: AccesoApp | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, set_nombre] = useState(app?.nombre ?? "");
  const [slug, set_slug] = useState(app?.slug ?? "");
  const [descripcion, set_descripcion] = useState(app?.descripcion ?? "");
  const [slug_touched, set_slug_touched] = useState(Boolean(app));
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);

  useEffect(() => {
    if (!open) return;
    set_nombre(app?.nombre ?? "");
    set_slug(app?.slug ?? "");
    set_descripcion(app?.descripcion ?? "");
    set_slug_touched(Boolean(app));
    set_error(null);
  }, [open, app]);

  async function save() {
    set_saving(true);
    set_error(null);
    const result = await upsert_acceso_app({
      id: app?.id,
      nombre,
      slug,
      descripcion: descripcion || null,
    });
    set_saving(false);
    if (!result.ok) {
      set_error(result.error);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <AccesosModal
      open={open}
      title={app ? "Editar aplicación" : "Nueva aplicación"}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-xs text-amber-800 bg-amber-50 rounded-md px-3 py-2">
        Esto registra la app en authprisma (roles y login). No crea el menú del
        Shell: hace falta una entrada en config/apps.ts.
      </p>
      {error ? (
        <p className="mb-3 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="space-y-3">
        <div>
          <Label htmlFor="app-nombre">Nombre</Label>
          <Input
            id="app-nombre"
            value={nombre}
            onChange={(e) => {
              set_nombre(e.target.value);
              if (!slug_touched) set_slug(slugify_kebab(e.target.value));
            }}
          />
        </div>
        <div>
          <Label htmlFor="app-slug">Slug</Label>
          <Input
            id="app-slug"
            value={slug}
            disabled={Boolean(app)}
            onChange={(e) => {
              set_slug_touched(true);
              set_slug(slugify_kebab(e.target.value));
            }}
          />
        </div>
        <div>
          <Label htmlFor="app-desc">Descripción</Label>
          <Input
            id="app-desc"
            value={descripcion}
            onChange={(e) => set_descripcion(e.target.value)}
          />
        </div>
      </div>
    </AccesosModal>
  );
}
