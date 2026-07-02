"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Copy,
  Check,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Users,
  Pencil,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { DirectoryUser, Department, UserUpdatePayload } from "@/types/directory";
import { updateUserDetails } from "@/actions/directory";

interface DirectoryClientProps {
  users: DirectoryUser[];
  departments: Department[];
  canManage: boolean;
}

export function DirectoryClient({ users, departments, canManage }: DirectoryClientProps) {
  const [search, setSearch] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<UserUpdatePayload | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userList, setUserList] = useState(users);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return userList;
    return userList.filter((u) =>
      [u.nombre_apellido, u.email_corporativo, u.telefono, u.cargo, u.departamento_nombre]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [userList, search]);

  const copyToClipboard = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // noop
    }
  };

  const startEdit = (user: DirectoryUser) => {
    setEditingId(user.id);
    setEditForm({
      nombre_apellido: user.nombre_apellido,
      email_corporativo: user.email_corporativo,
      telefono: user.telefono,
      cargo: user.cargo,
      departamento: user.departamento,
    });
    setError(null);
    setSuccess(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!editForm || editingId === null) return;
    setSaving(true);
    setError(null);

    const result = await updateUserDetails(editingId, editForm);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setUserList((prev) =>
      prev.map((u) => {
        if (u.id !== editingId) return u;
        const dept = departments.find((d) => d.id === editForm.departamento);
        return {
          ...u,
          nombre_apellido: editForm.nombre_apellido,
          email_corporativo: editForm.email_corporativo,
          telefono: editForm.telefono,
          cargo: editForm.cargo,
          departamento: editForm.departamento,
          departamento_nombre: dept?.nombre ?? null,
        };
      }),
    );

    setSuccess("Usuario actualizado correctamente");
    setSaving(false);
    setEditingId(null);
    setEditForm(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  return (
    <div className="p-6 w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-semibold text-foreground">Directorio</h1>
          {canManage && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-200">
              Modo edición
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Consulta los datos de contacto de los miembros del equipo.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nombre, email, teléfono, cargo o departamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
        />
      </div>

      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/50">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Nombre</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Departamento</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Cargo</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Email</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Teléfono / Ext.</th>
                {canManage && <th className="text-right font-medium text-muted-foreground px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="text-center text-muted-foreground py-12">
                    No se encontraron usuarios.
                  </td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const isEditing = editingId === user.id;
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-border last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      {isEditing && editForm ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.nombre_apellido}
                              onChange={(e) =>
                                setEditForm({ ...editForm, nombre_apellido: e.target.value })
                              }
                              className="w-full px-2 py-1.5 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editForm.departamento ?? ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  departamento: e.target.value ? Number(e.target.value) : null,
                                })
                              }
                              className="w-full px-2 py-1.5 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 bg-white"
                            >
                              <option value="">Sin departamento</option>
                              {departments.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.nombre}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.cargo ?? ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, cargo: e.target.value || null })
                              }
                              placeholder="—"
                              className="w-full px-2 py-1.5 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="email"
                              value={editForm.email_corporativo ?? ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  email_corporativo: e.target.value || null,
                                })
                              }
                              placeholder="—"
                              className="w-full px-2 py-1.5 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editForm.telefono ?? ""}
                              onChange={(e) =>
                                setEditForm({ ...editForm, telefono: e.target.value || null })
                              }
                              placeholder="—"
                              className="w-full px-2 py-1.5 rounded border border-border text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                              >
                                {saving ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Save className="h-3.5 w-3.5" />
                                )}
                                Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                disabled={saving}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3">
                            <span className="font-medium text-foreground">{user.nombre_apellido}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Building2 className="h-3.5 w-3.5 shrink-0" />
                              {user.departamento_nombre || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Briefcase className="h-3.5 w-3.5 shrink-0" />
                              {user.cargo || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {user.email_corporativo ? (
                              <button
                                onClick={() => copyToClipboard(user.email_corporativo!, `email-${user.id}`)}
                                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
                              >
                                <Mail className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[200px]">{user.email_corporativo}</span>
                                {copiedField === `email-${user.id}` ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {user.telefono ? (
                              <button
                                onClick={() => copyToClipboard(user.telefono!, `phone-${user.id}`)}
                                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group"
                              >
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span>{user.telefono}</span>
                                {copiedField === `phone-${user.id}` ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                              </button>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          {canManage && (
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => startEdit(user)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Editar
                              </button>
                            </td>
                          )}
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "usuario" : "usuarios"}
      </p>
    </div>
  );
}
