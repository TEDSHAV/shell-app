"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type ManualSection = {
  id: string;
  title: string;
  body: ReactNode;
};

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
  const section_ids = sections.map((s) => s.id).join("|");

  useEffect(() => {
    const apply_hash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && section_ids.split("|").includes(hash)) {
        set_open_id(hash);
      }
    };
    apply_hash();
    window.addEventListener("hashchange", apply_hash);
    return () => window.removeEventListener("hashchange", apply_hash);
  }, [section_ids]);

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
              <span className="text-xl font-bold text-slate-900">
                {section.title}
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
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
