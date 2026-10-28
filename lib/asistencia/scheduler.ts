import { checkAndRunScheduledAsistenciaReport } from "./report-service";

const SCHEDULER_GLOBAL_KEY = "__PRISMA_ASISTENCIA_SCHEDULER_STARTED__";

export function startAsistenciaScheduler(): void {
  // Prevent local dev servers (npm run dev) from firing scheduled emails to real recipients
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_LOCAL_ASISTENCIA_SCHEDULER !== "true"
  ) {
    return;
  }

  const g = globalThis as unknown as Record<string, boolean | undefined>;
  if (g[SCHEDULER_GLOBAL_KEY]) {
    return;
  }
  g[SCHEDULER_GLOBAL_KEY] = true;

  // Check every 60 seconds
  const interval = setInterval(() => {
    void checkAndRunScheduledAsistenciaReport();
  }, 60_000);

  if (typeof interval.unref === "function") {
    interval.unref();
  }
}
