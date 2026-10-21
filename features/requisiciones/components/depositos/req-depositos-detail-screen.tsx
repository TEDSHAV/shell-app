"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Building2,
  Warehouse,
  Wrench,
} from "lucide-react";
import {
  confirmar_consumo_osis_prorrateo_action,
  get_depositos_ui_access_action,
  list_ingresos_pendientes_action,
  list_req_kardex_action,
  list_req_osis_reparto_action,
  list_req_stock_all_action,
  procesar_ingreso_action,
  registrar_salida_stock_action,
  registrar_stock_inicial_action,
  restock_en_curso_action,
} from "@/actions/req-stock";
import { stock_nivel } from "../../lib/req-stock-status";
import {
  DEPOSITO_LABEL,
  type ReqDeposito,
  type ReqIngresoPendiente,
  type ReqKardexRow,
  type ReqOsiRepartoRow,
  type ReqStockRow,
} from "../../lib/req-stock-types";
import {
  filter_stock_by_departamento,
  filter_stock_by_deposito,
} from "../../lib/req-stock-group";
import { ReqDepositosInspector } from "../req-depositos-inspector";
import { ReqDepositosItemList } from "../req-depositos-item-list";
import { ReqDepositosKpis, type DepositoKpiKey } from "../req-depositos-kpis";

export function ReqDepositosDetailScreen({
  mode,
  id_departamento,
  deposito_ejecutante,
  titulo,
  from_app,
}: {
  mode: "departamento" | "ejecutante";
  id_departamento?: number;
  deposito_ejecutante?: "capacitacion" | "tecnico";
  titulo: string;
  from_app?: string | null;
}) {
  const router = useRouter();
  const [allRows, setAllRows] = useState<ReqStockRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<ReqStockRow | null>(null);
  const [kardex, setKardex] = useState<ReqKardexRow[]>([]);
  const [kardexLimit, setKardexLimit] = useState(80);
  const [osis, setOsis] = useState<ReqOsiRepartoRow[]>([]);
  const [ingresos, setIngresos] = useState<ReqIngresoPendiente[]>([]);
  const [restockOpen, setRestockOpen] = useState(false);
  const [kpi, setKpi] = useState<DepositoKpiKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [canProcess, setCanProcess] = useState(false);
  const [canConsume, setCanConsume] = useState(false);
  const [canRequest, setCanRequest] = useState(false);

  const deposito: ReqDeposito =
    mode === "departamento"
      ? "departamento"
      : (deposito_ejecutante ?? "capacitacion");

  const rows = useMemo(() => {
    if (mode === "departamento" && id_departamento) {
      return filter_stock_by_departamento(allRows, id_departamento);
    }
    return filter_stock_by_deposito(allRows, deposito);
  }, [allRows, mode, id_departamento, deposito]);

  const reload = async () => {
    const [data, access] = await Promise.all([
      list_req_stock_all_action(),
      get_depositos_ui_access_action(),
    ]);
    setAllRows(data);
    setCanProcess(access.can_process);
    setCanConsume(access.can_consume);
    setCanRequest(access.can_request);
    setSelected((prev) => data.find((row) => row.id === prev?.id) || null);
    setLoaded(true);
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    if (!selected) {
      setKardex([]);
      setOsis([]);
      setIngresos([]);
      setRestockOpen(false);
      return;
    }
    void list_req_kardex_action(selected.id, kardexLimit).then(setKardex);
    void restock_en_curso_action({ id_item_costo: selected.id_item_costo }).then(
      setRestockOpen,
    );
    if (canProcess) {
      void list_ingresos_pendientes_action({
        id_item_costo: selected.id_item_costo,
      }).then(setIngresos);
    }
    if (selected.deposito !== "departamento") {
      void list_req_osis_reparto_action(
        selected.deposito,
        selected.id_item_costo,
      ).then(setOsis);
    } else {
      setOsis([]);
    }
  }, [selected, kardexLimit, canProcess]);

  const total = rows.filter((row) => Number(row.cantidad) > 0).length;
  const bajo = rows.filter((row) => {
    const nivel = stock_nivel(Number(row.cantidad), row.minimo ?? 1);
    return nivel === "bajo" || nivel === "agotado";
  }).length;

  const visible = useMemo(() => {
    if (kpi === "bajo") {
      return rows.filter((row) => {
        const nivel = stock_nivel(Number(row.cantidad), row.minimo ?? 1);
        return nivel === "bajo" || nivel === "agotado";
      });
    }
    if (kpi === "total") {
      return rows.filter((row) => Number(row.cantidad) > 0);
    }
    return rows;
  }, [rows, kpi]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      window.alert(res.error || "No se pudo completar.");
      return;
    }
    await reload();
    if (selected) {
      setKardex(await list_req_kardex_action(selected.id, kardexLimit));
    }
  };

  const Icon =
    mode === "departamento"
      ? Building2
      : deposito === "capacitacion"
        ? GraduationCap
        : Wrench;

  const from = (from_app || "").trim().toLowerCase();

  return (
    <div className="min-h-full space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <Warehouse className="h-3.5 w-3.5" />
              {DEPOSITO_LABEL[deposito]}
            </p>
            <h1 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
              {titulo}
            </h1>
          </div>
        </div>
      </div>

      <ReqDepositosKpis
        total={total}
        bajo={bajo}
        osis={0}
        active={kpi}
        showOsis={false}
        onSelect={setKpi}
      />

      <div
        className={
          selected
            ? "grid gap-4 lg:grid-cols-2 lg:h-[calc(100dvh-13rem)] lg:min-h-[28rem] lg:items-stretch"
            : "grid grid-cols-1"
        }
      >
        <div
          className={
            selected ? "flex min-h-0 h-full flex-col" : undefined
          }
        >
          <ReqDepositosItemList
            rows={loaded ? visible : []}
            selectedId={selected?.id ?? null}
            showDepartamento={false}
            expanded={!selected}
            grouped={false}
            loading={!loaded}
            paginate
            onSelect={(row) => {
              if (selected?.id === row.id) {
                setSelected(null);
                return;
              }
              setKardexLimit(80);
              setSelected(row);
            }}
          />
        </div>
        {selected ? (
          <div className="min-h-0 overflow-y-auto overscroll-contain lg:sticky lg:top-0">
            <ReqDepositosInspector
              deposito={deposito}
              row={selected}
              kardex={kardex}
              osis={osis}
              ingresos={ingresos}
              kardex_limit={kardexLimit}
              busy={busy}
              can_process={canProcess}
              can_consume={canConsume}
              can_request={canRequest}
              restock_open={restockOpen}
              onInterno={(cantidad) =>
                selected
                  ? run(() =>
                      registrar_salida_stock_action({
                        id_stock: selected.id,
                        tipo: "gastado",
                        cantidad,
                      }),
                    )
                  : Promise.resolve()
              }
              onSalida={(cantidad, ids_osi) =>
                selected
                  ? run(() =>
                      confirmar_consumo_osis_prorrateo_action({
                        id_stock: selected.id,
                        ids_osi,
                        cantidad,
                      }),
                    )
                  : Promise.resolve()
              }
              onDanado={(cantidad) =>
                selected
                  ? run(() =>
                      registrar_salida_stock_action({
                        id_stock: selected.id,
                        tipo: "danado",
                        cantidad,
                        notas: "Dañado / roto",
                      }),
                    )
                  : Promise.resolve()
              }
              onIngreso={(ingreso) =>
                run(() =>
                  procesar_ingreso_action({
                    id_requisicion: ingreso.id_requisicion,
                    id_linea: ingreso.id_linea,
                  }),
                )
              }
              onStockInicial={(cantidad) =>
                selected
                  ? run(() =>
                      registrar_stock_inicial_action({
                        id_stock: selected.id,
                        cantidad,
                      }),
                    )
                  : Promise.resolve()
              }
              onRestock={() => {
                if (!selected) return;
                const qs = new URLSearchParams({
                  item: String(selected.id_item_costo),
                  deposito: selected.deposito,
                  abastecer: "1",
                });
                if (from) qs.set("from", from);
                router.push(`/requisiciones/create?${qs.toString()}`);
              }}
              onMoreKardex={() => setKardexLimit(400)}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
