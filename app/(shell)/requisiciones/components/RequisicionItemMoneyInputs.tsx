"use client";

import { NumberInput } from "@/components/ui/number-input";

const defaultFieldClass =
  "w-20 px-1 py-0.5 text-xs text-center border border-gray-300 rounded font-bold focus:outline-none focus:ring-1 focus:ring-blue-400";

export function RequisicionUnitPriceInput({
  value,
  onChange,
  inputClassName,
}: {
  value: number;
  onChange: (n: number) => void;
  inputClassName?: string;
}) {
  return (
    <td className="p-2 text-center border-r border-gray-300">
      <div className="flex items-center justify-center gap-0.5">
        <span className="text-[10px] text-gray-500">$</span>
        <NumberInput
          value={value || 0}
          onValueChange={onChange}
          allowDecimal
          min={0}
          step={0.01}
          className={inputClassName || defaultFieldClass}
          aria-label="Precio unitario"
          title="Precio por unidad"
        />
      </div>
    </td>
  );
}

export function RequisicionTotalPriceInput({
  value,
  onChange,
  inputClassName,
}: {
  value: number;
  onChange: (n: number) => void;
  inputClassName?: string;
}) {
  return (
    <td className="p-2 text-center border-r border-gray-300 bg-amber-50/60">
      <div className="flex items-center justify-center gap-0.5">
        <span className="text-[10px] text-gray-500">$</span>
        <NumberInput
          value={value || 0}
          onValueChange={onChange}
          allowDecimal
          min={0}
          step={0.01}
          className={inputClassName || defaultFieldClass}
          aria-label="Total del renglón"
          title="Total = cantidad × precio unitario"
        />
      </div>
    </td>
  );
}

export function RequisicionItemMoneyInputs({
  costo_unitario,
  total,
  onChange,
  inputClassName,
}: {
  costo_unitario: number;
  total: number;
  onChange: (field: "costo_unitario" | "total", value: number) => void;
  inputClassName?: string;
}) {
  return (
    <>
      <RequisicionUnitPriceInput
        value={costo_unitario}
        onChange={(n) => onChange("costo_unitario", n)}
        inputClassName={inputClassName}
      />
      <RequisicionTotalPriceInput
        value={total}
        onChange={(n) => onChange("total", n)}
        inputClassName={inputClassName}
      />
    </>
  );
}

export function RequisicionPriceHeaders() {
  return (
    <>
      <th className="p-2 border-r border-gray-300 w-28">
        P. UNIT.
        <div className="font-normal text-[9px] text-gray-500 normal-case leading-tight">
          por unidad
        </div>
      </th>
      <th className="p-2 border-r border-gray-300 w-28">
        TOTAL
        <div className="font-normal text-[9px] text-gray-500 normal-case leading-tight">
          cant. × unit.
        </div>
      </th>
    </>
  );
}
