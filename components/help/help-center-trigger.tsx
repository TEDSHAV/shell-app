"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BookOpen, CircleHelp, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  HELP_TOPIC_ACCENTS,
  MANUAL_HUB_HREF,
  resolveFullManualHref,
  resolveHelpContext,
  type HelpTopic,
} from "@/lib/help/manual-registry";
import { cn } from "@/lib/utils";

function HelpTopicCard({ topic }: { topic: HelpTopic }) {
  const Icon = topic.icon;
  const accent = HELP_TOPIC_ACCENTS[topic.accent ?? "sky"];

  return (
    <Link
      href={topic.href}
      className={cn(
        "group flex gap-3 rounded-xl border bg-card p-3.5 shadow-sm transition-all",
        accent.border,
        accent.bg,
        "hover:shadow-md",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          accent.icon,
        )}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold leading-snug text-foreground">
            {topic.title}
          </span>
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </span>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {topic.summary}
        </p>
      </span>
    </Link>
  );
}

export function HelpCenterTrigger() {
  const pathname = usePathname();
  const context = resolveHelpContext(pathname);
  const full_manual_href = resolveFullManualHref(pathname);
  const hasContext = context != null && context.topics.length > 0;
  const ScopeIcon = context?.scopeIcon ?? Sparkles;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          aria-label="Centro de ayuda"
        >
          <CircleHelp className="size-4" aria-hidden />
          <span className="hidden sm:inline">Manual</span>
          {hasContext ? (
            <span
              className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-white"
              aria-hidden
            />
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l-0 p-0 sm:max-w-md"
      >
        <div className="relative overflow-hidden border-b bg-gradient-to-br from-primary/15 via-background to-violet-500/10 px-6 pb-5 pt-6">
          <div
            className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full bg-primary/10 blur-2xl"
            aria-hidden
          />
          <SheetHeader className="relative space-y-3 text-left">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm">
                <BookOpen className="size-5" aria-hidden />
              </span>
              <div>
                <SheetTitle className="text-lg">Centro de ayuda</SheetTitle>
                <SheetDescription className="sr-only">
                  Ayuda contextual para la pantalla actual
                </SheetDescription>
              </div>
            </div>
            {hasContext ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1 text-xs font-medium text-foreground shadow-sm">
                <ScopeIcon className="size-3.5 text-primary" aria-hidden />
                {context.scopeLabel}
              </span>
            ) : null}
          </SheetHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
          {hasContext ? (
            <ul className="space-y-2.5">
              {context.topics.map((topic) => (
                <li key={topic.id}>
                  <HelpTopicCard topic={topic} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              No hay temas de ayuda para esta pantalla todavía.
            </p>
          )}

          <div className="mt-auto space-y-2 border-t pt-4">
            <p className="text-center text-[11px] text-muted-foreground">
              ¿Necesitas más detalle? Abre el manual completo.
            </p>
            <Button className="w-full gap-2 shadow-sm" asChild>
              <Link href={full_manual_href}>
                <BookOpen className="size-4" aria-hidden />
                Manual completo
              </Link>
            </Button>
            {full_manual_href !== MANUAL_HUB_HREF ? (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                asChild
              >
                <Link href={MANUAL_HUB_HREF}>Ir al Manual</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
