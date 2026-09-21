"use client";

import type { LucideIcon } from "lucide-react";
import {
  Award,
  Briefcase,
  Calculator,
  ClipboardList,
  GitBranch,
  GraduationCap,
  Handshake,
  Landmark,
  Layers,
  Megaphone,
  Package,
  PenLine,
  Settings,
  Shield,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react";

const APP_ICONS: Record<string, LucideIcon> = {
  sgestion: Briefcase,
  sadministracion: Landmark,
  st: Wrench,
  scalidad: Shield,
  scapacitacion: GraduationCap,
  srh: Users,
  inventario: Package,
  shell: Layers,
};

const ROLE_ICONS: Record<string, LucideIcon> = {
  lider: Award,
  coordinador: GitBranch,
  admin: Settings,
  superadmin: Shield,
  analista: ClipboardList,
  gestor_clientes: Handshake,
  gestor_financiero: Calculator,
  gestor_marketing: Megaphone,
  gestor: PenLine,
};

export function AppGlyph({
  slug,
  className = "h-5 w-5",
}: {
  slug: string;
  className?: string;
}) {
  const Icon = APP_ICONS[slug] ?? Layers;
  return <Icon className={className} aria-hidden />;
}

export function RoleGlyph({
  slug,
  className = "h-4 w-4",
}: {
  slug: string;
  className?: string;
}) {
  const Icon = ROLE_ICONS[slug] ?? UserCircle;
  return <Icon className={className} aria-hidden />;
}
