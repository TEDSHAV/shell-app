"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  GraduationCap,
  Package,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  confirmar_consumo_osis_prorrateo_action,
  count_osis_reparto_action,
  delete_req_stock_minimo_action,
  get_depositos_ui_access_action,
  list_ingresos_pendientes_action,
  list_req_kardex_action,
  list_req_osis_reparto_action,
  list_req_stock_all_action,
  list_req_stock_minimo_action,
  procesar_ingreso_action,
  registrar_salida_stock_action,
  registrar_stock_inicial_action,
  restock_en_curso_action,
  upsert_req_stock_minimo_action,
} from "@/actions/req-stock";
import { stock_nivel } from "../lib/req-stock-status";
import {
  DEPOSITO_TAB_HELP,
  DEPOSITO_TAB_LABEL,
  DEPOSITO_TABS,
  type ReqDeposito,
  type ReqDepositoTab,
  type ReqIngresoPendiente,
  type ReqKardexRow,
  type ReqOsiRepartoRow,
  type ReqStockMinimoRow,
  type ReqStockRow,
} from "../lib/req-stock-types";
import { build_dept_cards } from "../lib/req-stock-group";
import { ReqDepositosInspector } from "./req-depositos-inspector";
import { ReqDepositosItemList } from "./req-depositos-item-list";
import { ReqDepositosKpis, type DepositoKpiKey } from "./req-depositos-kpis";
import { ReqDepositosHistorial } from "./req-depositos-historial";
import { ReqDepositosMinimos } from "./req-depositos-minimos";
import { ReqDepositosDeptCards } from "./depositos/req-depositos-dept-cards";

const TAB_ICON: Record<ReqDepositoTab, typeof Package> = {
  todos: Package,
  departamento: Building2,
  capacitacion: GraduationCap,
  tecnico: Wrench,
};

export function ReqDepositosScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<ReqDepositoTab>("todos");
  const [allRows, setAllRows] = useState<ReqStockRow[]>([]);
  const [allRules, setAllRules] = useState<ReqStockMinimoRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<ReqStockRow | null>(null);
  const [kardex, setKardex] = useState<ReqKardexRow[]>([]);
  const [kardexLimit, setKardexLimit] = useState(80);
  const [osis, setOsis] = useState<ReqOsiRepartoRow[]>([]);
  const [osisCap, setOsisCap] = useState(0);
  const [osisSt, setOsisSt] = useState(0);
  const [ingresos, setIngresos] = useState<ReqIngresoPendiente[]>([]);
  const [restockOpen, setRestockOpen] = useState(false);
  const [kpi, setKpi] = useState<DepositoKpiKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [canProcess, setCanProcess] = useState(false);
  const [canConsume, setCanConsume] = useState(false);
  const [canRequest, setCanRequest] = useState(false);
  const [canEditMinimos, setCanEditMinimos] = useState(false);

  const active_deposito: ReqDeposito =
    selected?.deposito || (tab === "todos" ? "departamento" : tab);

  const rows = useMemo(
    () =>
      tab === "todos"
        ? allRows
        : allRows.filter((row) => row.deposito === tab),
    [allRows, tab],
  );
  const rules = useMemo(
    () =>
      tab === "todos"
        ? allRules
        : allRules.filter((row) => row.deposito === tab),
    [allRules, tab],
  );
  const dept_cards = useMemo(() => build_dept_cards(allRows), [allRows]);
  const osisCount =
    tab === "departamento"
      ? 0
      : tab === "capacitacion"
        ? osisCap
        : tab === "tecnico"
          ? osisSt
          : osisCap + osisSt;

  const reload = async () => {
    const [data, mins, cap, st, access] = await Promise.all([
      list_req_stock_all_action(),
      list_req_stock_minimo_action(),
      count_osis_reparto_action("capacitacion"),
      count_osis_reparto_action("tecnico"),
      get_depositos_ui_access_action(),
    ]);
    setAllRows(data);
    setAllRules(mins);
    setOsisCap(cap);
    setOsisSt(st);
    setCanProcess(access.can_process);
    setCanConsume(access.can_consume);
    setCanRequest(access.can_request);
    setCanEditMinimos(access.can_edit_minimos);
    setSelected((prev) => data.find((row) => row.id === prev?.id) || null);
    setLoaded(true);
  };

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    setSelected(null);
    setKpi(null);
  }, [tab]);

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

  return (
    <div className="space-y-5">
      <ReqDepositosKpis
        total={total}
        bajo={bajo}
        osis={osisCount}
        active={kpi}
        showOsis={tab !== "departamento"}
        onSelect={(key) => {
          setKpi(key);
          if (key === "osis") {
            const first =
              rows.find((row) => row.deposito !== "departamento") || rows[0];
            if (first) setSelected(first);
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {DEPOSITO_TABS.map((key) => {
            const Icon = TAB_ICON[key];
            const active = tab === key;
            return (
              <Button
                key={key}
                type="button"
                variant={active ? "default" : "ghost"}
                size="sm"
                className={
                  active
                    ? "rounded-xl gap-1.5 bg-amber-600 hover:bg-amber-700"
                    : "rounded-xl gap-1.5 text-slate-700"
                }
                onClick={() => setTab(key)}
              >
                <Icon className="h-4 w-4" />
                {DEPOSITO_TAB_LABEL[key]}
              </Button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canProcess || canEditMinimos ? (
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/requisiciones/depositos/importar">Cargar Excel</Link>
            </Button>
          ) : null}
          {canEditMinimos ? (
            <ReqDepositosMinimos
              deposito={tab === "todos" ? undefined : tab}
              depositos_seleccionables={
                tab === "todos"
                  ? ["departamento", "capacitacion", "tecnico"]
                  : undefined
              }
              rows={tab === "todos" ? allRows : rows}
              rules={rules}
              onSave={async (params) => {
                await run(() => upsert_req_stock_minimo_action(params));
              }}
              onDelete={async (id) => {
                await run(() => delete_req_stock_minimo_action(id));
              }}
            />
          ) : null}
          <ReqDepositosHistorial />
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-amber-950">
          {DEPOSITO_TAB_LABEL[tab]}
        </p>
        <p className="mt-0.5 text-sm text-amber-900/80">
          {DEPOSITO_TAB_HELP[tab]}
        </p>
      </div>

      {tab === "departamento" ? (
        <div className="space-y-4">
          <ReqDepositosDeptCards cards={loaded ? dept_cards : []} />
        </div>
      ) : null}

      {tab === "capacitacion" || tab === "tecnico" ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={`/requisiciones/depositos/ejecutante/${tab}`}>
              Abrir vista {DEPOSITO_TAB_LABEL[tab]}
            </Link>
          </Button>
        </div>
      ) : null}

      {tab !== "departamento" ? (
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
              grouped={tab === "todos"}
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
                deposito={active_deposito}
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
                  router.push(`/requisiciones/create?${qs.toString()}`);
                }}
                onMoreKardex={() => setKardexLimit(400)}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
