import type { PlanOrigen, PlanObjetivoEstado } from "./types";
import { format_month_label } from "./plan-month";
import { is_informe_objetivo_cumplido } from "./informe-analisis-draft";

export type InformeAnalisisIncumplimiento = {
  objetivo_id: number;
  titulo: string;
  avance: number;
  razones: string;
};

export type InformeAnalisisForm = {
  version: 1;
  notas_cumplimiento: string;
  incumplimientos: InformeAnalisisIncumplimiento[];
  notas_extras: string;
  observaciones: string;
};

type DraftObjetivo = {
  id: number;
  titulo: string;
  estado: PlanObjetivoEstado;
  avance: number;
};

type DraftPlus = { origen: PlanOrigen };

const REQ = new Set<PlanOrigen>(["REQUERIMIENTO", "USUARIO"]);

export function empty_analisis_form(): InformeAnalisisForm {
  return {
    version: 1,
    notas_cumplimiento: "",
    incumplimientos: [],
    notas_extras: "",
    observaciones: "",
  };
}

/** Borrador con campos listos para editar (razones vacías). */
export function build_analisis_form_draft(
  mes: string,
  objetivos: DraftObjetivo[],
  plus: DraftPlus[],
): InformeAnalisisForm {
  const label = format_month_label(mes);
  const cumplidos = objetivos.filter(is_informe_objetivo_cumplido);
  const no_cumplidos = objetivos.filter((o) => !is_informe_objetivo_cumplido(o));

  let notas_cumplimiento = "";
  if (objetivos.length === 0) {
    notas_cumplimiento = `En ${label} no hubo objetivos planteados.`;
  } else if (cumplidos.length === 0) {
    notas_cumplimiento = `Se plantearon ${objetivos.length} objetivo(s); ninguno alcanzó cumplimiento pleno.`;
  } else {
    notas_cumplimiento = `Se cumplieron ${cumplidos.length} de ${objetivos.length}: ${cumplidos.map((o) => o.titulo).join("; ")}.`;
  }

  const extras_t = plus.filter((p) => p.origen === "TICKET").length;
  const extras_r = plus.filter((p) => REQ.has(p.origen)).length;
  let notas_extras = "";
  if (plus.length === 0) {
    notas_extras = "Sin extras fuera de objetivos.";
  } else {
    notas_extras = `Extras: ${plus.length} (tickets: ${extras_t}, requerimiento: ${extras_r}).`;
  }

  return {
    version: 1,
    notas_cumplimiento,
    incumplimientos: no_cumplidos.map((o) => ({
      objetivo_id: o.id,
      titulo: o.titulo,
      avance: o.avance,
      razones: "",
    })),
    notas_extras,
    observaciones: "",
  };
}

export function parse_analisis_texto(
  raw: string | null | undefined,
): InformeAnalisisForm | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<InformeAnalisisForm>;
      if (parsed && typeof parsed === "object") {
        return {
          version: 1,
          notas_cumplimiento: String(parsed.notas_cumplimiento ?? ""),
          incumplimientos: Array.isArray(parsed.incumplimientos)
            ? parsed.incumplimientos.map((item) => ({
                objetivo_id: Number(item.objetivo_id) || 0,
                titulo: String(item.titulo ?? ""),
                avance: Number(item.avance) || 0,
                razones: String(item.razones ?? ""),
              }))
            : [],
          notas_extras: String(parsed.notas_extras ?? ""),
          observaciones: String(parsed.observaciones ?? ""),
        };
      }
    } catch {
      /* plain text fallback */
    }
  }
  return {
    version: 1,
    notas_cumplimiento: "",
    incumplimientos: [],
    notas_extras: "",
    observaciones: trimmed,
  };
}

export function serialize_analisis_form(form: InformeAnalisisForm): string {
  return JSON.stringify({ ...form, version: 1 });
}

export function format_analisis_for_display(form: InformeAnalisisForm): string {
  const lines: string[] = [];
  if (form.notas_cumplimiento.trim()) {
    lines.push(`Cumplimiento: ${form.notas_cumplimiento.trim()}`);
  }
  if (form.incumplimientos.length > 0) {
    lines.push("Incumplimientos:");
    for (const item of form.incumplimientos) {
      const razon = item.razones.trim();
      lines.push(
        razon
          ? `• ${item.titulo} (${item.avance}%): ${razon}`
          : `• ${item.titulo} (${item.avance}%)`,
      );
    }
  }
  if (form.notas_extras.trim()) {
    lines.push(`Extras: ${form.notas_extras.trim()}`);
  }
  if (form.observaciones.trim()) {
    lines.push(`Observaciones: ${form.observaciones.trim()}`);
  }
  return lines.join("\n");
}

/** Fusiona borrador (objetivos actuales) con razones ya guardadas. */
export function merge_analisis_with_draft(
  saved: InformeAnalisisForm | null,
  draft: InformeAnalisisForm,
): InformeAnalisisForm {
  if (!saved) return draft;
  const razones = new Map(
    saved.incumplimientos.map((i) => [i.objetivo_id, i.razones]),
  );
  return {
    version: 1,
    notas_cumplimiento: saved.notas_cumplimiento || draft.notas_cumplimiento,
    incumplimientos: draft.incumplimientos.map((item) => ({
      ...item,
      razones: razones.get(item.objetivo_id) ?? item.razones,
    })),
    notas_extras: saved.notas_extras || draft.notas_extras,
    observaciones: saved.observaciones,
  };
}
