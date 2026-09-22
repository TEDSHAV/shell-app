"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DATE_FIELD_OPTIONS,
  date_field_label,
  type DateField,
  type SortDir,
} from "@/lib/list-time-period";

export function SortControl({
  field,
  dir,
  on_field,
  on_dir,
  fields = DATE_FIELD_OPTIONS.map((item) => item.value),
}: {
  field: DateField;
  dir: SortDir;
  on_field: (next: DateField) => void;
  on_dir: (next: SortDir) => void;
  fields?: DateField[];
}) {
  const DirIcon = dir === "desc" ? ArrowDown : ArrowUp;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 shadow-sm transition-all duration-300 ease-out hover:bg-slate-50"
        >
          <ArrowUpDown className="h-3.5 w-3.5 text-violet-600" />
          {date_field_label(field)}
          <DirIcon className="h-3 w-3 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {fields.map((item) => (
          <DropdownMenuItem
            key={item}
            onClick={() => on_field(item)}
            className={cn(field === item && "font-semibold text-violet-800")}
          >
            {date_field_label(item)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => on_dir("desc")}>
          Recientes primero
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => on_dir("asc")}>
          Antiguos primero
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
