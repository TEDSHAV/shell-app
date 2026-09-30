"use client";

import { ListChecks, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { GrowingTextarea } from "./growing-textarea";
import {
  parse_descripcion,
  serialize_descripcion,
  type DescBlock,
} from "../lib/tarea-descripcion";
import {
  format_check_completed_at,
  type TareaCheckItem,
} from "../lib/tarea-checklist";

const DESC_MAX = 320;
const CHECK_BOX_CLASS =
  "size-[18px] shrink-0 overflow-visible border-slate-400 shadow-none focus-visible:ring-0 data-[state=checked]:border-violet-600 data-[state=checked]:bg-violet-600 data-[state=checked]:text-white";

function CheckRow({
  done,
  texto,
  stamp,
  on_done,
  on_texto,
  on_remove,
}: {
  done: boolean;
  texto: string;
  stamp: string | null;
  on_done: (done: boolean) => void;
  on_texto: (texto: string) => void;
  on_remove: () => void;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 py-0.5">
      <span className="mt-1.5 grid size-5 shrink-0 place-items-center">
        <Checkbox
          checked={done}
          className={CHECK_BOX_CLASS}
          onCheckedChange={(value) => on_done(value === true)}
        />
      </span>
      <div className="min-w-0 flex-1">
        <GrowingTextarea
          bordered={false}
          rows={1}
          minHeight={36}
          maxHeight={DESC_MAX}
          className="px-1 text-slate-800 placeholder:text-slate-400"
          placeholder="Ítem de la lista"
          value={texto}
          onChange={on_texto}
        />
        {stamp ? (
          <p className="px-1 text-[11px] text-slate-400">{stamp}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Quitar checkbox"
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
        onClick={on_remove}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function TareaDescripcionField({
  id,
  value,
  sync,
  onChange,
  on_sync,
  check_times,
}: {
  id?: string;
  value: string;
  sync: boolean;
  onChange: (value: string) => void;
  on_sync: (value: boolean) => void;
  check_times?: TareaCheckItem[];
}) {
  const blocks = parse_descripcion(value);
  const check_count = blocks.filter((block) => block.kind === "check").length;

  function write(next: DescBlock[]) {
    onChange(serialize_descripcion(next));
  }

  function add_check() {
    const last = blocks[blocks.length - 1];
    const next = [...blocks];
    if (last?.kind === "text" && !last.text.trim() && next.length === 1) {
      write([{ kind: "check", done: false, texto: "" }]);
      return;
    }
    next.push({ kind: "check", done: false, texto: "" });
    write(next);
  }

  function remove_check(index: number) {
    const next = blocks.filter((_, i) => i !== index);
    write(next.length > 0 ? next : [{ kind: "text", text: "" }]);
  }

  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
      <div className="max-h-[20rem] min-w-0 space-y-2 overflow-y-auto px-3 py-2.5">
        {blocks.map((block, index) => {
          if (block.kind === "text") {
            return (
              <GrowingTextarea
                key={`t-${index}`}
                id={index === 0 ? id : undefined}
                bordered={false}
                maxHeight={DESC_MAX}
                placeholder="Contexto, alcance o pedido original"
                value={block.text}
                onChange={(text) => {
                  const next = [...blocks];
                  next[index] = { kind: "text", text };
                  write(next);
                }}
              />
            );
          }
          const check_index = blocks
            .slice(0, index)
            .filter((item) => item.kind === "check").length;
          const stamp = format_check_completed_at(
            block.done
              ? (check_times?.[check_index]?.completed_at ?? null)
              : null,
          );
          return (
            <CheckRow
              key={`c-${index}`}
              done={block.done}
              texto={block.texto}
              stamp={stamp}
              on_done={(done) => {
                const next = [...blocks];
                next[index] = { ...block, done };
                write(next);
              }}
              on_texto={(texto) => {
                const next = [...blocks];
                next[index] = { ...block, texto };
                write(next);
              }}
              on_remove={() => remove_check(index)}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 bg-white/70 px-3 py-2">
        <button
          type="button"
          onClick={add_check}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900"
        >
          <Plus className="h-3.5 w-3.5" />
          Checkbox
        </button>
        {check_count > 0 ? (
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <span className="grid size-5 shrink-0 place-items-center">
              <Checkbox
                checked={sync}
                className={CHECK_BOX_CLASS}
                onCheckedChange={(value) => on_sync(value === true)}
              />
            </span>
            <ListChecks className="h-3.5 w-3.5 text-slate-400" />
            Sincronizar avance con los checks
          </label>
        ) : null}
      </div>
    </div>
  );
}
