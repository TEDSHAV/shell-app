"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import logo from "@/app/logo.png";
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  ShieldCheck,
  Smartphone,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Infinity as InfinityIcon,
} from "lucide-react";

interface QRPosterModalProps {
  open: boolean;
  onClose: () => void;
  sedeNombre?: string;
  lanIp?: string | null;
}

export function QRPosterModal({
  open,
  onClose,
  sedeNombre = "Sede Principal — SHA de Venezuela, C.A.",
  lanIp,
}: QRPosterModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [publicUrl, setPublicUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    let origin = window.location.origin;
    if (
      lanIp &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1")
    ) {
      const port = window.location.port ? `:${window.location.port}` : "";
      origin = `${window.location.protocol}//${lanIp}${port}`;
    }
    const url = `${origin}/registro-visitante`;
    setPublicUrl(url);

    QRCode.toDataURL(url, {
      width: 640,
      margin: 2,
      color: {
        dark: "#0c3f69",
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    })
      .then((dataUrl) => setQrDataUrl(dataUrl))
      .catch((err) => console.error("Error generating QR code:", err));
  }, [open, lanIp]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  // The QR only encodes the public form URL — it never expires. The only risk
  // is printing a dev/local address (LAN IP or localhost) which can change.
  const isLocalUrl =
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      publicUrl,
    );

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = "QR-Recepcion-Visitantes-SHA.png";
    a.click();
  };

  const handlePrintPoster = () => {
    if (!qrDataUrl) return;
    const printWin = window.open("", "_blank", "width=850,height=1050");
    if (!printWin) return;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>QR de Recepción - Registro de Visitantes SHA de Venezuela</title>
  <style>
    @page { size: portrait; margin: 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .poster {
      width: 100%;
      max-width: 680px;
      border: 3px solid #0c3f69;
      border-radius: 24px;
      overflow: hidden;
      text-align: center;
    }
    .header {
      background: linear-gradient(135deg, #0c3f69 0%, #0f4b7c 60%, #0d9488 100%);
      color: #ffffff;
      padding: 32px 28px;
    }
    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.18);
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 12px;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .header p {
      font-size: 15px;
      opacity: 0.92;
    }
    .content {
      padding: 36px 32px 28px;
    }
    .qr-box {
      display: inline-block;
      padding: 20px;
      border: 2px dashed #0d9488;
      border-radius: 24px;
      background: #f8fafc;
      margin-bottom: 28px;
    }
    .qr-box img {
      width: 300px;
      height: 300px;
      display: block;
    }
    .steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      text-align: left;
      margin-bottom: 28px;
    }
    .step {
      background: #f1f5f9;
      border-radius: 14px;
      padding: 16px;
    }
    .step-num {
      display: inline-flex;
      width: 26px;
      height: 26px;
      border-radius: 999px;
      background: #0c3f69;
      color: white;
      font-size: 13px;
      font-weight: 700;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .step h3 {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
      color: #0c3f69;
    }
    .step p {
      font-size: 12px;
      color: #475569;
      line-height: 1.4;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding: 16px 24px;
      background: #f8fafc;
      font-size: 12px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .url {
      font-family: monospace;
      font-weight: 600;
      color: #0c3f69;
    }
  </style>
</head>
<body>
  <div class="poster">
    <div class="header">
      <div class="badge">SHA DE VENEZUELA, C.A. • CONTROL DE ACCESO</div>
      <h1>REGISTRO DE VISITANTES</h1>
      <p>Escanee el código QR con la cámara de su teléfono para anunciar su llegada</p>
    </div>
    <div class="content">
      <div class="qr-box">
        <img src="${qrDataUrl}" alt="QR de Recepción" />
      </div>
      <div class="steps">
        <div class="step">
          <div class="step-num">1</div>
          <h3>Escanee el QR</h3>
          <p>Abra la cámara de su teléfono y apunte al código QR.</p>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <h3>Complete sus datos</h3>
          <p>Ingrese su nombre y cédula (teléfono y empresa opcionales).</p>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <h3>Acepte y Registre</h3>
          <p>Acepte las normas de visita y quedará registrado en recepción.</p>
        </div>
      </div>
    </div>
    <div class="footer">
      <span>${sedeNombre}</span>
      <span class="url">${publicUrl}</span>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[calc(100vh-2rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Gradient Header */}
        <div className="relative bg-gradient-to-r from-[#0c3f69] via-[#0f4b7c] to-teal-700 px-6 py-4 text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src={logo}
              alt="SHA de Venezuela"
              height={32}
              className="h-8 w-auto object-contain rounded-lg bg-white px-2.5 py-1 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-teal-200">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Control de Acceso • {sedeNombre}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
                QR de Recepción de Visitantes
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors shrink-0"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body: Side-by-Side Layout so it fits comfortably without vertical scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Left Column: QR Code Card */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-teal-500/50 bg-slate-50/80 p-4 text-center">
              <div className="rounded-xl bg-white p-2.5 shadow-xs border border-slate-200/80">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="QR de Recepción de Visitantes"
                    className="h-44 w-44 sm:h-48 sm:w-48 object-contain mx-auto"
                  />
                ) : (
                  <div className="h-44 w-44 sm:h-48 sm:w-48 flex items-center justify-center text-xs text-slate-400">
                    Generando QR...
                  </div>
                )}
              </div>
              <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0c3f69]">
                <QrCode className="h-3.5 w-3.5 text-teal-600" />
                Escaneo directo con cámara
              </span>
            </div>

            {/* Right Column: Instructions & Direct Link */}
            <div className="sm:col-span-7 space-y-3.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Instrucciones de ingreso para el visitante
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Al imprimir el formato, incluirá este código QR junto con los 3 pasos de registro:
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0c3f69] text-white text-xs font-bold">
                    1
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-[#0c3f69]" />
                      Escanee el QR de Recepción
                    </p>
                    <p className="text-[11px] text-slate-500">
                      El visitante apunta la cámara de su teléfono al código en recepción.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0c3f69] text-white text-xs font-bold">
                    2
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <FileCheck2 className="h-3.5 w-3.5 text-teal-700" />
                      Complete sus datos
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Ingresa su Nombre y Cédula (teléfono, empresa y motivo son opcionales).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white text-xs font-bold">
                    3
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" />
                      Acepte las normas y registre
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Lee y acepta el descargo de normas y aparece de inmediato en la lista.
                    </p>
                  </div>
                </div>
              </div>

              {/* URL Preview Bar */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-medium text-slate-600 truncate">
                  {publicUrl}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Copiar enlace"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copiar
                      </>
                    )}
                  </button>
                  <a
                    href="/registro-visitante"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Abrir formulario en nueva pestaña"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Abrir
                  </a>
                </div>
              </div>

              {isLocalUrl ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <p className="text-[11px] leading-snug text-amber-800">
                    Este QR apunta a una <strong>dirección local de desarrollo</strong> y
                    dejará de funcionar si cambia la IP o el equipo se apaga. Para una
                    impresión permanente, genere el cartel desde la URL pública de
                    producción.
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 py-2">
                  <InfinityIcon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600" />
                  <p className="text-[11px] leading-snug text-emerald-800">
                    El QR es <strong>permanente</strong>: contiene solo el enlace del
                    formulario. Puede imprimirlo una sola vez y reutilizarlo
                    indefinidamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-3.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3.5 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar QR (PNG)
            </button>
            <button
              type="button"
              onClick={handlePrintPoster}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0c3f69] px-4 py-2 text-xs font-semibold text-white hover:bg-[#092f50] transition-colors shadow-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir QR de Recepción
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
