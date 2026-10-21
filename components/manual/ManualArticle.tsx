"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type ManualSection = {
  id: string;
  title: string;
  body?: ReactNode;
  /** Desplegables dentro de esta tarjeta. */
  subsections?: ManualSection[];
};

function collect_ids(sections: ManualSection[]): string[] {
  const ids: string[] = [];
  for (const section of sections) {
    ids.push(section.id);
    if (section.subsections) {
      ids.push(...collect_ids(section.subsections));
    }
  }
  return ids;
}

function parent_of(
  sections: ManualSection[],
  target: string,
): string | null {
  for (const section of sections) {
    if (section.id === target) return null;
    if (section.subsections?.some((sub) => sub.id === target)) {
      return section.id;
    }
    if (section.subsections) {
      const nested = parent_of(section.subsections, target);
      if (nested) return section.id;
    }
  }
  return null;
}

function NestedSections({
  subsections,
  open_id,
  on_toggle,
}: {
  subsections: ManualSection[];
  open_id: string | null;
  on_toggle: (id: string) => void;
}) {
  return (
    <div className="mt-4 space-y-3">
      {subsections.map((sub) => {
        const open = open_id === sub.id;
        return (
          <div
            key={sub.id}
            id={sub.id}
            className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80"
          >
            <button
              type="button"
              onClick={() => on_toggle(sub.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-slate-900">
                  {sub.title}
                </span>
                {!open && sub.subsections?.length ? (
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Incluye:{" "}
                    {sub.subsections.map((row) => row.title).join(" · ")}
                  </span>
                ) : null}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            {open ? (
              <div className="space-y-3 border-t border-slate-200 px-4 pb-4 pt-3 text-base leading-relaxed text-slate-600">
                {sub.body}
                {sub.subsections?.length ? (
                  <NestedSections
                    subsections={sub.subsections}
                    open_id={open_id}
                    on_toggle={on_toggle}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function ManualArticle({
  kicker,
  title,
  lead,
  chips,
  sections,
}: {
  kicker: string;
  title: string;
  lead: string;
  chips: { id: string; label: string }[];
  sections: ManualSection[];
}) {
  const [open_id, set_open_id] = useState<string | null>(
    sections[0]?.id ?? null,
  );
  const [open_sub_id, set_open_sub_id] = useState<string | null>(null);
  const all_ids = collect_ids(sections).join("|");

  useEffect(() => {
    const apply_hash = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash || !all_ids.split("|").includes(hash)) return;
      const parent = parent_of(sections, hash);
      if (parent) {
        set_open_id(parent);
        set_open_sub_id(hash);
      } else {
        set_open_id(hash);
        const section = sections.find((s) => s.id === hash);
        set_open_sub_id(section?.subsections?.[0]?.id ?? null);
      }
    };
    apply_hash();
    window.addEventListener("hashchange", apply_hash);
    return () => window.removeEventListener("hashchange", apply_hash);
  }, [all_ids, sections]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 pb-16 pt-4">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          {kicker}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          {lead}
        </p>
        <nav className="mt-5 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <a
              key={chip.id}
              href={`#${chip.id}`}
              className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-sky-800 hover:border-sky-400"
            >
              {chip.label}
            </a>
          ))}
        </nav>
      </header>

      {sections.map((section) => {
        const open = open_id === section.id;
        return (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => set_open_id(open ? null : section.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-xl font-bold text-slate-900">
                  {section.title}
                </span>
                {!open && section.subsections?.length ? (
                  <span className="mt-1.5 block text-sm font-normal text-slate-500">
                    Incluye:{" "}
                    {section.subsections.map((row) => row.title).join(" · ")}
                  </span>
                ) : null}
              </span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>
            {open ? (
              <div className="space-y-3 border-t border-slate-100 px-5 pb-6 pt-4 text-base leading-relaxed text-slate-600">
                {section.body}
                {section.subsections?.length ? (
                  <NestedSections
                    subsections={section.subsections}
                    open_id={open_sub_id}
                    on_toggle={(id) =>
                      set_open_sub_id((prev) => (prev === id ? null : id))
                    }
                  />
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
