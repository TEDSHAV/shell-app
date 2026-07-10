"use client";

import { useState } from "react";

import type { OSIListItem } from "@/types/osi";

import OSICommentsSheet, { OSICommentsFab } from "./OSICommentsSheet";

type OsiPreviewCommentsHostProps = {
  osi_id: number;
  osi_label: string;
  servicio?: string | null;
};

export function OsiPreviewCommentsHost({
  osi_id,
  osi_label,
  servicio = null,
}: OsiPreviewCommentsHostProps) {
  const [open, set_open] = useState(false);

  const osi: OSIListItem = {
    id_osi: osi_id,
    nro_osi: osi_label,
    nombre_empresa: null,
    servicio,
    tipo_servicio: null,
    ciudad_ejecucion: null,
    ejecutivo_negocios: null,
    fecha_inicio_real: null,
    fecha_fin_real: null,
    participantes: null,
    id_estatus: null,
    status_name: "OSI",
    status_color: "#008069",
  };

  return (
    <>
      <OSICommentsFab onClick={() => set_open(true)} />
      <OSICommentsSheet
        osi={osi}
        open={open}
        onClose={() => set_open(false)}
      />
    </>
  );
}
