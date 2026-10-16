"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  restock_en_curso_action,
  upsert_req_stock_minimo_action,
} from "@/actions/req-stock";
import { stock_nivel } from "../lib/req-stock-status";
import {
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
import { ReqDepositosInspector } from "./req-depositos-inspector";
import { ReqDepositosItemList } from "./req-depositos-item-list";
import { ReqDepositosKpis, type DepositoKpiKey } from "./req-depositos-kpis";
import { ReqDepositosHistorial } from "./req-depositos-historial";
import { ReqDepositosMinimos } from "./req-depositos-minimos";

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
    () => (tab === "todos" ? [] : allRules.filter((row) => row.deposito === tab)),
    [allRules, tab],
  );
  const osisCount =
    tab === "departamento" ? 0 : tab === "capacitacion" ? osisCap : tab === "tecnico" ? osisSt : osisCap + osisSt;

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
      const next = await list_req_kardex_action(selected.id, kardexLimit);
      setKardex(next);
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
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          {DEPOSITO_TABS.map((key) => (
            <Button
              key={key}
              type="button"
              variant={tab === key ? "default" : "ghost"}
              size="sm"
              className="rounded-full"
              onClick={() => setTab(key)}
            >
              {DEPOSITO_TAB_LABEL[key]}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEditMinimos && tab !== "todos" ? (
            <ReqDepositosMinimos
              deposito={tab}
              rows={rows}
              rules={rules}
              onSave={async (params) => {
                await run(() =>
                  upsert_req_stock_minimo_action({ deposito: tab, ...params }),
                );
              }}
              onDelete={async (id) => {
                await run(() => delete_req_stock_minimo_action(id));
              }}
            />
          ) : null}
          <ReqDepositosHistorial />
        </div>
      </div>
      <div
        className={
          selected ? "grid gap-4 lg:grid-cols-2" : "grid grid-cols-1"
        }
      >
        <ReqDepositosItemList
          rows={loaded ? visible : []}
          selectedId={selected?.id ?? null}
          showDepartamento={tab === "departamento"}
          expanded={!selected}
          grouped={tab === "todos"}
          loading={!loaded}
          onSelect={(row) => {
            if (selected?.id === row.id) {
              setSelected(null);
              return;
            }
            setKardexLimit(80);
            setSelected(row);
          }}
        />
        {selected ? (
          <ReqDepositosInspector
            deposito={active_deposito}
            row={selected}
            kardex={kardex}
            osis={osis}
            ingresos={ingresos}
            kardex_limit={kardexLimit}
            busy={busy}
            can_process={canProcess}
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
            onRestock={() => {
              if (!selected) return;
              const qs = new URLSearchParams({
                item: String(selected.id_item_costo),
                deposito: selected.deposito,
              });
              router.push(`/requisiciones/create?${qs.toString()}`);
            }}
            onMoreKardex={() => setKardexLimit(400)}
          />
        ) : null}
      </div>
    </div>
  );
}
