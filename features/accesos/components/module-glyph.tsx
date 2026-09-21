"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  Building2,
  Calculator,
  GitBranch,
  GraduationCap,
  Handshake,
  KeyRound,
  Megaphone,
  Settings,
  Shield,
  UserCircle,
  Users,
} from "lucide-react";
import { permission_module } from "../lib/slugs";

const MODULE_ICONS: Record<string, LucideIcon> = {
  finance: Calculator,
  sales: Handshake,
  mkt: Megaphone,
  reportes: BarChart2,
  directorio: Building2,
  pipeline: GitBranch,
  clientes: Users,
  admin: Settings,
  scapacitacion: GraduationCap,
  scalidad: Shield,
  srh: UserCircle,
};

export function ModuleGlyph({
  module,
  className = "h-4 w-4",
}: {
  module: string;
  className?: string;
}) {
  const Icon = MODULE_ICONS[permission_module(module)] ?? KeyRound;
  return <Icon className={className} aria-hidden />;
}
