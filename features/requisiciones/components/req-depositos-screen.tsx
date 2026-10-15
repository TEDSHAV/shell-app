"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumberInput } from "@/components/ui/number-input";
import {
  confirmar_consumo_osi_action,
  list_req_kardex_action,
  list_req_osis_reparto_action,
  list_req_stock_action,
  registrar_salida_stock_action,
} from "@/actions/req-stock";
import {
  DEPOSITO_LABEL,
  type ReqDeposito,
  type ReqKardexRow,
  type ReqOsiRepartoRow,
  type ReqStockRow,
} from "../lib/req-stock-types";

const TABS: ReqDeposito[] = ["departamento", "capacitacion", "tecnico"];
const SALIDAS = ["entregado", "gastado", "danado", "cambiado"] as const;

export function ReqDepositosScreen() {
  const [tab, setTab] = useState<ReqDeposito>("departamento");
  const [rows, setRows] = useState<ReqStockRow[]>([]);
  const [selected, setSelected] = useState<ReqStockRow | null>(null);
  const [kardex, setKardex] = useState<ReqKardexRow[]>([]);
  const [osis, setOsis] = useState<ReqOsiRepartoRow[]>([]);
  const [qty, setQty] = useState(1);
  const [tipo, setTipo] = useState<(typeof SALIDAS)[number]>("entregado");
  const [busy, setBusy] = useState(false);

  const reload = async (deposito: ReqDeposito) => {
    const data = await list_req_stock_action(deposito);
    setRows(data);
  };

  useEffect(() => {
    setSelected(null);
    void reload(tab);
  }, [tab]);

  useEffect(() => {
    if (!selected) {
      setKardex([]);
      setOsis([]);
      return;
    }
    void list_req_kardex_action(selected.id).then(setKardex);
    if (tab !== "departamento") {
      void list_req_osis_reparto_action(tab, selected.id_item_costo).then(
        setOsis,
      );
    } else {
      setOsis([]);
    }
  }, [selected, tab]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          {TABS.map((key) => (
            <Button
              key={key}
              type="button"
              variant={tab === key ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(key)}
            >
              {DEPOSITO_LABEL[key]}
            </Button>
          ))}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <th className="p-2">Ítem</th>
              {tab === "departamento" ? (
                <th className="p-2">Departamento</th>
              ) : null}
              <th className="p-2">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`cursor-pointer border-t ${
                  selected?.id === row.id ? "bg-blue-50" : ""
                }`}
                onClick={() => setSelected(row)}
              >
                <td className="p-2">{row.nombre_item}</td>
                {tab === "departamento" ? (
                  <td className="p-2">{row.departamento || "—"}</td>
                ) : null}
                <td className="p-2 font-medium">
                  {Number(row.cantidad).toFixed(2)} {row.unidad || ""}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="p-4 text-sm text-gray-500" colSpan={3}>
                  Este depósito no tiene saldo todavía.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 rounded border border-gray-200 p-3">
        {!selected ? (
          <p className="text-sm text-gray-500">
            Elija un ítem para ver el kardex y registrar salidas.
          </p>
        ) : (
          <>
            <p className="text-sm font-semibold">{selected.nombre_item}</p>
            <div className="flex items-end gap-2">
              <div>
                <p className="text-[11px] uppercase text-gray-500">Salida</p>
                <select
                  className="h-8 rounded border px-2 text-xs"
                  value={tipo}
                  onChange={(e) =>
                    setTipo(e.target.value as (typeof SALIDAS)[number])
                  }
                >
                  {SALIDAS.map((row) => (
                    <option key={row} value={row}>
                      {row}
                    </option>
                  ))}
                </select>
              </div>
              <NumberInput
                value={qty}
                min={0}
                allowDecimal
                className="h-8 w-24 text-xs"
                onValueChange={(n) => setQty(n)}
              />
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const res = await registrar_salida_stock_action({
                    id_stock: selected.id,
                    tipo,
                    cantidad: qty,
                  });
                  setBusy(false);
                  if (!res.ok) {
                    alert(res.error || "No se pudo registrar");
                    return;
                  }
                  await reload(tab);
                  const next = await list_req_stock_action(tab);
                  setSelected(next.find((r) => r.id === selected.id) || null);
                }}
              >
                Registrar
              </Button>
            </div>

            {tab !== "departamento" ? (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase text-gray-500">
                  Reparto a OSI (desde el último relleno)
                </p>
                {osis.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No hay OSI ejecutadas pendientes de confirmar.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {osis.map((osi) => (
                      <li
                        key={osi.id_osi}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span>{osi.nro_osi_secuencial}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px]"
                          disabled={busy}
                          onClick={async () => {
                            setBusy(true);
                            const res = await confirmar_consumo_osi_action({
                              id_stock: selected.id,
                              id_osi: osi.id_osi,
                              cantidad: qty || 1,
                            });
                            setBusy(false);
                            if (!res.ok) {
                              alert(res.error || "No se pudo confirmar");
                              return;
                            }
                            await reload(tab);
                            setOsis((prev) =>
                              prev.filter((row) => row.id_osi !== osi.id_osi),
                            );
                          }}
                        >
                          Confirmar {qty || 1}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            <div>
              <p className="mb-1 text-[11px] font-bold uppercase text-gray-500">
                Kardex
              </p>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-xs">
                {kardex.map((row) => (
                  <li key={row.id} className="flex justify-between gap-2">
                    <span>
                      {row.tipo} · {Number(row.cantidad).toFixed(2)}
                    </span>
                    <span className="text-gray-500">
                      {new Date(row.creado_en).toLocaleDateString("es-VE")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
