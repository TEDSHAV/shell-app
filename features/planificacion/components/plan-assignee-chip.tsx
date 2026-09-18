import type { PlanParticipante } from "../lib/types";
import { given_name } from "../lib/people";
import { AVATAR_COLORS } from "../lib/display";
import { cn } from "@/lib/utils";

export function PlanAssigneeChip({
  person,
}: {
  person: PlanParticipante | null;
}) {
  if (!person) {
    return (
      <span className="block truncate text-xs text-slate-400">Sin asignar</span>
    );
  }
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-2.5 text-slate-700"
      title={person.nombre}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white",
          AVATAR_COLORS[person.usuario_id % AVATAR_COLORS.length],
        )}
      >
        {person.initials}
      </span>
      <span className="truncate text-[11px] font-semibold leading-none">
        {given_name(person.nombre)}
      </span>
    </span>
  );
}

export function PlanAssigneeStack({
  people,
  max = 2,
}: {
  people: PlanParticipante[];
  max?: number;
}) {
  if (people.length === 0) {
    return <PlanAssigneeChip person={null} />;
  }
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      {shown.map((person) => (
        <PlanAssigneeChip key={person.usuario_id} person={person} />
      ))}
      {extra > 0 ? (
        <span
          className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
          title={people
            .slice(max)
            .map((person) => person.nombre)
            .join(", ")}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

export function PlanPeopleBadges({
  people,
  max = 3,
  align = "end",
}: {
  people: PlanParticipante[];
  max?: number;
  align?: "start" | "end";
}) {
  if (people.length === 0) {
    return <span className="text-xs text-slate-400">Sin equipo</span>;
  }
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div
      className={cn(
        "flex max-w-[14rem] flex-wrap items-center gap-1",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      {shown.map((person) => (
        <PlanAssigneeChip key={person.usuario_id} person={person} />
      ))}
      {extra > 0 ? (
        <span
          className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
          title={people
            .slice(max)
            .map((person) => person.nombre)
            .join(", ")}
        >
          +{extra}
        </span>
      ) : null}
    </div>
  );
}
