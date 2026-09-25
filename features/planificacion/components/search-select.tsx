"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { fold_label } from "../lib/excel-plan";

export type SearchSelectOption = {
  value: string;
  label: string;
  group?: string;
};

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = "Buscar…",
  searchPlaceholder = "Buscar…",
  disabled = false,
}: {
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
}) {
  const [open, set_open] = useState(false);
  const [query, set_query] = useState("");
  const root_ref = useRef<HTMLDivElement>(null);
  const input_ref = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);
  const needle = fold_label(query);
  const filtered = useMemo(
    () =>
      options.filter((option) =>
        fold_label(option.label).includes(needle),
      ),
    [options, needle],
  );
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, SearchSelectOption[]>();
    for (const option of filtered) {
      const group = option.group ?? "";
      const list = map.get(group);
      if (list) list.push(option);
      else {
        map.set(group, [option]);
        order.push(group);
      }
    }
    return order.map((group) => ({ group, items: map.get(group) ?? [] }));
  }, [filtered]);

  useEffect(() => {
    function on_doc(event: MouseEvent) {
      if (!root_ref.current?.contains(event.target as Node)) {
        set_open(false);
      }
    }
    document.addEventListener("mousedown", on_doc);
    return () => document.removeEventListener("mousedown", on_doc);
  }, []);

  useEffect(() => {
    if (open) {
      set_query("");
      input_ref.current?.focus();
    }
  }, [open]);

  return (
    <div className="relative min-w-[12rem]" ref={root_ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && set_open((prev) => !prev)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-2 text-left text-xs hover:border-gray-300 disabled:cursor-not-allowed disabled:bg-gray-50"
      >
        <span className={selected ? "truncate text-gray-800" : "text-gray-400"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 w-full min-w-[16rem] overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="relative border-b border-gray-100 p-2">
            <Search className="absolute left-4 top-4 h-3.5 w-3.5 text-gray-400" />
            <input
              ref={input_ref}
              type="text"
              value={query}
              onChange={(event) => set_query(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md border border-gray-200 pl-8 pr-2 text-xs focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-gray-400">
                Sin coincidencias
              </p>
            ) : (
              groups.map((block) => (
                <div key={block.group || "all"}>
                  {block.group ? (
                    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {block.group}
                    </p>
                  ) : null}
                  {block.items.map((option) => {
                    const active = option.value === value;
                    return (
                      <button
                        key={`${option.group ?? ""}-${option.value}`}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-gray-50"
                        onClick={() => {
                          onChange(option.value);
                          set_open(false);
                        }}
                      >
                        <Check
                          className={`h-3 w-3 shrink-0 ${
                            active ? "text-blue-600" : "text-transparent"
                          }`}
                        />
                        <span className="truncate text-gray-800">
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
