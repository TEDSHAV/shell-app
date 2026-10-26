"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Eraser, PenLine, Check } from "lucide-react";

interface SignaturePadProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
  helperText?: string;
  height?: number;
}

export function SignaturePad({
  value,
  onChange,
  label = "Firma de Entrada",
  helperText = "Firme con su dedo o cursor dentro del recuadro",
  height = 160,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasStrokes, setHasStrokes] = useState(Boolean(value));

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (rect.width === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.2;
  }, [height]);

  useEffect(() => {
    setupCanvas();
    const handleResize = () => {
      if (!hasStrokes) {
        setupCanvas();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setupCanvas, hasStrokes]);

  const getCoords = (
    e: React.PointerEvent<HTMLCanvasElement>,
  ): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCoords(e);
    lastPointRef.current = pt;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "#0f172a";
      ctx.fill();
    }
    setHasStrokes(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx || !lastPointRef.current) return;

    const pt = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPointRef.current = pt;
  };

  const finishStroke = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasStrokes(false);
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700">
          <PenLine className="h-3.5 w-3.5 text-teal-600" />
          {label} <span className="text-rose-500">*</span>
        </label>
        {hasStrokes && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-rose-600 transition-colors"
          >
            <Eraser className="h-3.5 w-3.5" />
            Limpiar firma
          </button>
        )}
      </div>

      <div
        className={`relative overflow-hidden rounded-xl border-2 bg-slate-50/70 transition-colors ${
          hasStrokes
            ? "border-teal-500/60 bg-white"
            : "border-dashed border-slate-300 hover:border-slate-400"
        }`}
      >
        <canvas
          ref={canvasRef}
          style={{ height: `${height}px`, touchAction: "none" }}
          className="w-full cursor-crosshair block"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
        />

        {!hasStrokes && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 px-4 text-center">
            <PenLine className="h-6 w-6 mb-1 opacity-50" />
            <span className="text-xs">{helperText}</span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-6 bottom-4 border-b border-slate-200" />
      </div>

      {hasStrokes && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-teal-700">
          <Check className="h-3 w-3" /> Firma capturada correctamente
        </p>
      )}
    </div>
  );
}
