"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Send,
  Trash2,
  MessageSquare,
  Loader2,
  AtSign,
  Search,
  Bell,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { DisenoServicioNota } from "@/types/diseno-servicio";
import {
  getDisenoNotas,
  addDisenoNota,
  deleteDisenoNota,
  getUsuariosParaMenciones,
} from "@/actions/diseno-servicio";

interface DisenoNotasModalProps {
  solicitudId: number;
  solicitudNombre: string;
  isOpen: boolean;
  onClose: () => void;
  onNoteCountChange?: (newCount: number) => void;
}

interface MentionUser {
  id: number;
  id_auth: string | null;
  nombre_apellido: string;
  departamento_nombre: string | null;
}

// Global in-memory cache for user directory across modal opens
let cachedUsuarios: MentionUser[] | null = null;

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "hace unos segundos";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays < 7) return `hace ${diffDays} d`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} sem`;

  return date.toLocaleDateString("es-VE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getDeptStyles(dept?: string | null): {
  badge: string;
  avatarBg: string;
  avatarText: string;
} {
  if (!dept) {
    return {
      badge: "bg-slate-100 text-slate-700 border-slate-300",
      avatarBg: "bg-slate-100",
      avatarText: "text-slate-700",
    };
  }
  const clean = dept.toLowerCase().trim();
  if (clean.includes("negocios")) {
    return {
      badge: "bg-emerald-50 text-emerald-800 border-emerald-300",
      avatarBg: "bg-emerald-100",
      avatarText: "text-emerald-800",
    };
  }
  if (clean.includes("capacitacion")) {
    return {
      badge: "bg-purple-50 text-purple-800 border-purple-300",
      avatarBg: "bg-purple-100",
      avatarText: "text-purple-800",
    };
  }
  if (clean.includes("servicios")) {
    return {
      badge: "bg-orange-50 text-orange-800 border-orange-300",
      avatarBg: "bg-orange-100",
      avatarText: "text-orange-800",
    };
  }
  if (clean.includes("ted")) {
    return {
      badge: "bg-indigo-50 text-indigo-800 border-indigo-300",
      avatarBg: "bg-indigo-100",
      avatarText: "text-indigo-800",
    };
  }
  return {
    badge: "bg-slate-100 text-slate-700 border-slate-300",
    avatarBg: "bg-slate-100",
    avatarText: "text-slate-700",
  };
}

function renderNotaBody(text: string) {
  const parts = text.split(
    /(@[A-Za-zÁÉÍÓÚáéíóúñÑ0-9_.\-]+(?:\s+[A-Za-zÁÉÍÓÚáéíóúñÑ0-9_.\-]+)?)/g,
  );
  return parts.map((part, idx) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={idx}
          className="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 text-xs shadow-2xs"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function DisenoNotasModal({
  solicitudId,
  solicitudNombre,
  isOpen,
  onClose,
  onNoteCountChange,
}: DisenoNotasModalProps) {
  const [notas, setNotas] = useState<DisenoServicioNota[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNota, setNewNota] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User Mentions
  const [usuarios, setUsuarios] = useState<MentionUser[]>(cachedUsuarios || []);
  const [taggedUsers, setTaggedUsers] = useState<MentionUser[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionSearchInputRef = useRef<HTMLInputElement>(null);

  // Stabilize onNoteCountChange to prevent infinite render loops
  const onNoteCountChangeRef = useRef(onNoteCountChange);
  useEffect(() => {
    onNoteCountChangeRef.current = onNoteCountChange;
  });

  // Prevent background page from scrolling while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // Load notes fast on open (never block on user directory)
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setLoading(true);

    getDisenoNotas(solicitudId)
      .then((notasData) => {
        if (isMounted) {
          setNotas(notasData);
          onNoteCountChangeRef.current?.(notasData.length);
        }
      })
      .catch(() => {
        if (isMounted) setError("Error al cargar la bitácora de notas");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // Background prefetch user directory for mentions if not already cached
    if (!cachedUsuarios) {
      getUsuariosParaMenciones()
        .then((u) => {
          cachedUsuarios = u;
          if (isMounted) setUsuarios(u);
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, solicitudId]);

  // Handle ESC key (hierarchical: closes mention menu first, then modal)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showMentionMenu) {
          setShowMentionMenu(false);
          setMentionSearch("");
          textareaRef.current?.focus();
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showMentionMenu, onClose]);

  // Focus search input when mention menu opens
  useEffect(() => {
    if (showMentionMenu) {
      setTimeout(() => {
        mentionSearchInputRef.current?.focus();
      }, 50);
    }
  }, [showMentionMenu]);

  if (!isOpen) return null;

  const openMentionMenu = async () => {
    setShowMentionMenu(true);
    if (!cachedUsuarios) {
      try {
        const u = await getUsuariosParaMenciones();
        cachedUsuarios = u;
        setUsuarios(u);
      } catch {
        // ignore
      }
    } else {
      setUsuarios(cachedUsuarios);
    }
  };

  const handleSelectMention = (user: MentionUser) => {
    if (!taggedUsers.some((u) => u.id === user.id)) {
      setTaggedUsers([...taggedUsers, user]);
    }
    const mentionTag = `@${user.nombre_apellido} `;
    setNewNota((prev) => {
      if (prev.endsWith(" ") || prev === "") {
        return prev + mentionTag;
      }
      return prev + " " + mentionTag;
    });
    setShowMentionMenu(false);
    setMentionSearch("");
    textareaRef.current?.focus();
  };

  const handleRemoveTaggedUser = (userId: number) => {
    setTaggedUsers(taggedUsers.filter((u) => u.id !== userId));
  };

  const handleAdd = async () => {
    if (!newNota.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const mentionedIds = taggedUsers.map((u) => u.id);
      const res = await addDisenoNota(solicitudId, newNota, mentionedIds);
      if (res.success && res.data) {
        const updated = [res.data, ...notas];
        setNotas(updated);
        setNewNota("");
        setTaggedUsers([]);
        setShowMentionMenu(false);
        onNoteCountChangeRef.current?.(updated.length);
      }
    } catch (err: any) {
      setError(err?.message || "Error al agregar la nota");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (notaId: number) => {
    if (!confirm("¿Deseas eliminar esta nota?")) return;
    setDeletingId(notaId);
    try {
      await deleteDisenoNota(notaId, solicitudId);
      const updated = notas.filter((n) => n.id !== notaId);
      setNotas(updated);
      onNoteCountChangeRef.current?.(updated.length);
    } catch {
      alert("Error al eliminar la nota");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsuarios = usuarios.filter((u) => {
    const q = mentionSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.nombre_apellido.toLowerCase().includes(q) ||
      (u.departamento_nombre && u.departamento_nombre.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overscroll-contain animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col h-[85vh] max-h-[740px] overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-150 relative overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shadow-xs">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">
                  Bitácora y Notas del Servicio
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {notas.length} {notas.length === 1 ? "nota" : "notas"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 max-w-lg">
                <span className="font-semibold text-gray-700">{solicitudNombre}</span>
                <span className="ml-1 text-gray-400 font-mono">#{solicitudId}</span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cerrar (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Notes Timeline List */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-slate-50/40 overscroll-contain">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
              <span className="text-xs font-medium text-gray-500">
                Cargando notas...
              </span>
            </div>
          ) : notas.length === 0 ? (
            <div className="text-center py-16 px-4 max-w-md mx-auto">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Sparkles className="h-7 w-7" />
              </div>
              <h4 className="text-sm font-bold text-gray-800 mb-1">
                Aún no hay notas en este servicio
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Utiliza este espacio para registrar requerimientos, notas de diseño o
                acuerdos entre Negocios y las áreas técnicas. Puedes etiquetar compañeros
                con <span className="font-semibold text-indigo-600">@</span> para
                notificarlos.
              </p>
            </div>
          ) : (
            notas.map((n) => {
              const deptStyles = getDeptStyles(n.autor_departamento);
              return (
                <div
                  key={n.id}
                  className="bg-white rounded-xl border border-gray-200/90 p-4 shadow-2xs hover:border-gray-300 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${deptStyles.avatarBg} ${deptStyles.avatarText}`}
                      >
                        {getInitials(n.autor_nombre)}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-gray-900">
                          {n.autor_nombre || "Usuario"}
                        </span>
                        {n.autor_departamento && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0 border font-medium ${deptStyles.badge}`}
                          >
                            {n.autor_departamento}
                          </Badge>
                        )}
                        <span className="text-[11px] text-gray-400">
                          {formatRelativeDate(n.created_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(n.id)}
                      disabled={deletingId === n.id}
                      className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-60 group-hover:opacity-100 transition-opacity"
                      title="Eliminar nota"
                    >
                      {deletingId === n.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed pl-9">
                    {renderNotaBody(n.nota)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Composer Area */}
        <div className="p-4 sm:p-5 border-t border-gray-200 bg-white space-y-2.5 relative">
          {error && (
            <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Mention Backdrop (clicking outside mention modal closes only the mention modal) */}
          {showMentionMenu && (
            <div
              className="fixed inset-0 z-30"
              onClick={() => {
                setShowMentionMenu(false);
                setMentionSearch("");
              }}
            />
          )}

          {/* Mention Popover Dropdown */}
          {showMentionMenu && (
            <div
              className="absolute bottom-full left-4 right-4 sm:left-5 sm:right-5 mb-2 bg-white rounded-xl shadow-2xl border border-indigo-200/90 p-3 z-40 max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                  <AtSign className="h-4 w-4 text-indigo-600" />
                  Mencionar y notificar a un compañero
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowMentionMenu(false);
                    setMentionSearch("");
                  }}
                  className="h-6 w-6 text-gray-400 hover:text-gray-700 rounded-md"
                  title="Cerrar (Esc)"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-gray-200 mb-2">
                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <Input
                  ref={mentionSearchInputRef}
                  value={mentionSearch}
                  onChange={(e) => setMentionSearch(e.target.value)}
                  placeholder="Escribe el nombre o departamento..."
                  className="h-6 text-xs border-0 focus-visible:ring-0 p-0 bg-transparent placeholder:text-gray-400"
                />
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-gray-50 max-h-48 pr-1">
                {filteredUsuarios.length === 0 ? (
                  <p className="text-xs text-gray-400 p-4 text-center">
                    No se encontraron usuarios activos con ese criterio
                  </p>
                ) : (
                  filteredUsuarios.map((u) => {
                    const deptStyles = getDeptStyles(u.departamento_nombre);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectMention(u)}
                        className="w-full text-left p-2 hover:bg-indigo-50/80 rounded-lg flex items-center justify-between transition-colors text-xs group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${deptStyles.avatarBg} ${deptStyles.avatarText}`}
                          >
                            {getInitials(u.nombre_apellido)}
                          </div>
                          <span className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {u.nombre_apellido}
                          </span>
                        </div>
                        {u.departamento_nombre && (
                          <span className="text-[10px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            {u.departamento_nombre}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Tagged recipients banner */}
          {taggedUsers.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap bg-indigo-50/70 border border-indigo-100 p-2 rounded-lg">
              <span className="text-[11px] text-indigo-900 font-semibold flex items-center gap-1 mr-1">
                <Bell className="h-3 w-3 text-indigo-600" />
                Se notificará a:
              </span>
              {taggedUsers.map((u) => (
                <span
                  key={u.id}
                  className="inline-flex items-center gap-1 text-[11px] bg-white text-indigo-700 border border-indigo-200 rounded-full px-2.5 py-0.5 font-medium shadow-2xs"
                >
                  <AtSign className="h-2.5 w-2.5 text-indigo-500" />
                  {u.nombre_apellido}
                  <button
                    type="button"
                    onClick={() => handleRemoveTaggedUser(u.id)}
                    className="hover:text-red-600 ml-0.5 text-gray-400 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Integrated Textarea Container */}
          <div className="border border-gray-200 rounded-xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 overflow-hidden shadow-2xs transition-all bg-white">
            <Textarea
              ref={textareaRef}
              value={newNota}
              onChange={(e) => {
                setNewNota(e.target.value);
                if (e.target.value.endsWith("@")) {
                  openMentionMenu();
                }
              }}
              placeholder="Escribe una observación, acuerdo o requerimiento... (escribe @ para etiquetar)"
              rows={3}
              className="text-xs resize-none w-full border-0 focus-visible:ring-0 p-3 placeholder:text-gray-400 leading-relaxed"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />

            <div className="flex items-center justify-between px-3 py-2 bg-slate-50/80 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (showMentionMenu) {
                      setShowMentionMenu(false);
                    } else {
                      openMentionMenu();
                    }
                  }}
                  className="h-7 text-xs px-2.5 gap-1.5 bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-300 font-medium rounded-lg shadow-2xs transition-all"
                >
                  <AtSign className="h-3.5 w-3.5 text-indigo-600" />
                  Etiquetar usuario
                </Button>
                <span className="text-[11px] text-gray-400 hidden sm:inline">
                  Presiona <kbd className="font-mono bg-white border border-gray-200 px-1 py-0.2 rounded text-[10px]">Ctrl</kbd> + <kbd className="font-mono bg-white border border-gray-200 px-1 py-0.2 rounded text-[10px]">Enter</kbd> para publicar
                </span>
              </div>

              <Button
                onClick={handleAdd}
                disabled={submitting || !newNota.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 h-7.5 text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Publicando...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Publicar nota
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
