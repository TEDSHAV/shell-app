"use client";

import Link from "next/link";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export function OsiPreviewToolbar({
  osiLabel,
}: {
  osiLabel: string;
}) {
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";
  const [printing, setPrinting] = useState(false);

  const waitForImagesAndPrint = useCallback(() => {
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
    const allLoaded = imgs.every((img) => img.complete && img.naturalWidth > 0);
    if (allLoaded) {
      window.print();
      setPrinting(false);
      return;
    }
    const timeout = window.setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 2000);
    const onLoad = () => {
      if (imgs.every((img) => img.complete && img.naturalWidth > 0)) {
        window.clearTimeout(timeout);
        imgs.forEach((img) => img.removeEventListener("load", onLoad));
        window.print();
        setPrinting(false);
      }
    };
    imgs.forEach((img) => {
      if (!img.complete || img.naturalWidth === 0) {
        img.addEventListener("load", onLoad);
      }
    });
  }, []);

  useEffect(() => {
    if (!autoPrint) return;
    setPrinting(true);
    const timer = window.setTimeout(() => waitForImagesAndPrint(), 300);
    return () => window.clearTimeout(timer);
  }, [autoPrint, waitForImagesAndPrint]);

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
      <Button
        type="button"
        size="sm"
        className="gap-2"
        disabled={printing}
        onClick={() => {
          setPrinting(true);
          window.setTimeout(() => waitForImagesAndPrint(), 300);
        }}
      >
        {printing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Printer className="h-4 w-4" />
        )}
        Imprimir
      </Button>
    </div>
  );
}
