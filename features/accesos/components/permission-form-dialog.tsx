"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccesosModal } from "./accesos-modal";
import { PERMISSION_ACTION_OPTIONS } from "../schemas";
import { build_permission_slug } from "../lib/slugs";
import { create_acceso_permission } from "../actions/catalog-actions";

export function PermissionFormDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [modulo, set_modulo] = useState("finance");
  const [recurso, set_recurso] = useState("");
  const [accion, set_accion] = useState("access");
  const [descripcion, set_descripcion] = useState("");
  const [error, set_error] = useState<string | null>(null);
  const [saving, set_saving] = useState(false);

  useEffect(() => {
    if (!open) return;
    set_modulo("finance");
    set_recurso("");
    set_accion("access");
    set_descripcion("");
    set_error(null);
  }, [open]);

  const preview = useMemo(
    () => build_permission_slug(modulo, recurso, accion),
    [modulo, recurso, accion],
  );

  async function save() {
    set_saving(true);
    set_error(null);
    const result = await create_acceso_permission({
      modulo,
      recurso,
      accion,
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
      title="Nuevo permiso"
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={saving || !recurso.trim()}
            onClick={() => void save()}
          >
            {saving ? "Guardando…" : "Crear permiso"}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-xs text-slate-500">
        Convención: modulo:recurso:accion (dos puntos). El permiso es global;
        cobra efecto al colgarlo de un rol.
      </p>
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
      <div className="space-y-3">
        <div>
          <Label htmlFor="perm-mod">Módulo</Label>
          <Input
            id="perm-mod"
            value={modulo}
            onChange={(e) => set_modulo(e.target.value)}
            placeholder="finance"
          />
        </div>
        <div>
          <Label htmlFor="perm-rec">Recurso</Label>
          <Input
            id="perm-rec"
            value={recurso}
            onChange={(e) => set_recurso(e.target.value)}
            placeholder="ecc"
          />
        </div>
        <div>
          <Label>Acción</Label>
          <Select value={accion} onValueChange={set_accion}>
            <SelectTrigger>
              <SelectValue placeholder="Acción" />
            </SelectTrigger>
            <SelectContent>
              {PERMISSION_ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="perm-desc">Descripción</Label>
          <Input
            id="perm-desc"
            value={descripcion}
            onChange={(e) => set_descripcion(e.target.value)}
          />
        </div>
        <p className="rounded-md bg-slate-100 px-3 py-2 font-mono text-xs">
          {preview || "—"}
        </p>
      </div>
    </AccesosModal>
  );
}
