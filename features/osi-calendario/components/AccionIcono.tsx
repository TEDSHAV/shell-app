import { CalendarClock, CheckCircle2, CircleSlash, XCircle } from "lucide-react";

import type { AccionSesion } from "../lib/types";

export default function AccionIcono({ accion, className = "h-5 w-5" }: { accion: AccionSesion; className?: string }) {
  if (accion === "ejecutar") return <CheckCircle2 className={className} />;
  if (accion === "no_se_dio") return <CircleSlash className={className} />;
  if (accion === "reagendar") return <CalendarClock className={className} />;
  return <XCircle className={className} />;
}
