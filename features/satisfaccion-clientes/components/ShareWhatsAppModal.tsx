"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  Phone,
  User,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { getPlantillaSatisfaccion } from "@/actions/satisfaccion-clientes";
import { formatWhatsAppPhone, normalizePhoneNumber } from "../lib/plantilla-defaults";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  encuesta: {
    token: string;
    nombre_empresa: string;
    servicio: string;
    nro_osi?: string | null;
    cliente_contacto_nombre?: string | null;
    cliente_contacto_telefono?: string | null;
  } | null;
}

export function ShareWhatsAppModal({ isOpen, onClose, encuesta }: Props) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!encuesta || !isOpen) return;

    const formattedPhone = formatWhatsAppPhone(encuesta.cliente_contacto_telefono || "");
    setPhone(formattedPhone);

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const surveyUrl = `${baseUrl}/satisfaccion/${encuesta.token}`;

    const greeting = encuesta.cliente_contacto_nombre?.trim()
      ? `Estimado(a) ${encuesta.cliente_contacto_nombre.trim()}`
      : `Estimado cliente de ${encuesta.nombre_empresa}`;

    const osiRef = encuesta.nro_osi && encuesta.nro_osi !== "S/N" ? ` (OSI: ${encuesta.nro_osi})` : "";

    // Load template or use default
    getPlantillaSatisfaccion()
      .then((plantilla) => {
        if (plantilla?.mensaje_whatsapp_plantilla) {
          const formatted = plantilla.mensaje_whatsapp_plantilla
            .replace(/\{contacto\}/g, encuesta.cliente_contacto_nombre?.trim() || encuesta.nombre_empresa)
            .replace(/\{empresa\}/g, encuesta.nombre_empresa)
            .replace(/\{servicio\}/g, `${encuesta.servicio}${osiRef}`)
            .replace(/\{enlace\}/g, surveyUrl);
          setMessage(formatted);
        } else {
          setMessage(
            `${greeting},\n\nEn *SHA de Venezuela* valoramos profundamente su opinión sobre nuestro servicio de *${encuesta.servicio}*${osiRef}.\n\nLe agradeceríamos tomarse 2 minutos para responder nuestra breve encuesta de satisfacción:\n${surveyUrl}\n\n¡Muchas gracias por su preferencia y confianza!`,
          );
        }
      })
      .catch(() => {
        setMessage(
          `${greeting},\n\nEn *SHA de Venezuela* valoramos profundamente su opinión sobre nuestro servicio de *${encuesta.servicio}*${osiRef}.\n\nLe agradeceríamos tomarse 2 minutos para responder nuestra breve encuesta de satisfacción:\n${surveyUrl}\n\n¡Muchas gracias por su preferencia y confianza!`,
        );
      });
  }, [encuesta, isOpen]);

  if (!isOpen || !encuesta) return null;

  const cleanPhone = formatWhatsAppPhone(phone);

  const handleSend = () => {
    let url = "";
    if (cleanPhone) {
      url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-200 bg-emerald-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-none">
                Compartir por WhatsApp
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Revise o ajuste el número y el mensaje antes de abrir la aplicación
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* Destination Phone */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-600" />
                Número de WhatsApp del Cliente
              </span>
              {cleanPhone && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  +{cleanPhone}
                </span>
              )}
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))}
              onBlur={() => setPhone(normalizePhoneNumber(phone))}
              placeholder="Ej. 04141234567 o 584141234567"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
            />
            <p className="text-[11px] text-slate-500">
              Formato internacional con código de país (para Venezuela se antepone <strong>58</strong> sin el cero inicial).
            </p>
          </div>

          {/* Editable Message Area */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 flex items-center justify-between">
              <span>Mensaje a Enviar</span>
              <span className="text-[11px] font-normal text-slate-400">
                Puede editar el saludo o añadir notas
              </span>
            </label>
            <textarea
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs leading-relaxed text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs resize-none"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-slate-600 space-y-1 text-[11px]">
            <div className="flex items-center gap-1 text-slate-800 font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Empresa: {encuesta.nombre_empresa}
            </div>
            <div>Servicio: {encuesta.servicio}</div>
            {encuesta.nro_osi && encuesta.nro_osi !== "S/N" && (
              <div>OSI: {encuesta.nro_osi}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-6 py-4">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-xs ${
              copied
                ? "bg-emerald-600 text-white border-emerald-600"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copiar Mensaje
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSend}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Abrir WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
