"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function OsiPreviewToolbar({
  osiLabel,
}: {
  osiLabel: string;
}) {
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";

  useEffect(() => {
    if (!autoPrint) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [autoPrint]);

  return (
    <div className="osi-preview-chrome mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 print:hidden">
      <Link href="/consulta-osi">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver a consulta
        </Button>
      </Link>
      <div className="text-sm text-gray-600">
        OSI <span className="font-semibold text-gray-900">{osiLabel}</span>
      </div>
      <Button type="button" size="sm" className="gap-2" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Imprimir
      </Button>
    </div>
  );
}
