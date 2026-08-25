import { NextRequest, NextResponse } from "next/server";
import {
  notifyAdminsOfNewRequisicion,
  notifyCreatorOfProcesada,
  notifyCreatorOfRechazada,
  notifyCreatorOfPartialVerificacion,
  notifyAdminOfAcuseRecibo,
  notifyCreatorOfCoordinadorRechazada,
  notifyCreatorOfLiderRechazada,
  notifyCreatorOfApproverChanges,
  notifyLiderOfPendingInterna,
  notifyCoordinadorOfPendingExterna,
} from "@/actions/requisicion-notifications";

// Map of supported notification events to their handler functions.
// Each handler is invoked with the spread of the `args` array from the
// request body, mirroring the function signatures in requisicion-notifications.ts.
const NOTIFY_HANDLERS: Record<
  string,
  (...args: any[]) => Promise<void>
> = {
  notifyAdminsOfNewRequisicion,
  notifyLiderOfPendingInterna,
  notifyCoordinadorOfPendingExterna,
  notifyCreatorOfProcesada,
  notifyCreatorOfRechazada,
  notifyCreatorOfCoordinadorRechazada,
  notifyCreatorOfLiderRechazada,
  notifyCreatorOfPartialVerificacion,
  notifyAdminOfAcuseRecibo,
  notifyCreatorOfApproverChanges,
};

// Internal endpoint used by the capacitacion app to trigger requisicion
// notifications without duplicating the notification fan-out logic.
// Authenticated via a shared secret (REQUISICIONES_NOTIFY_SECRET) sent in the
// x-internal-secret header. Notifications are best-effort: errors are logged
// but never break the caller's data action (callers wrap this in try/catch).
export async function POST(req: NextRequest) {
  const expectedSecret = process.env.REQUISICIONES_NOTIFY_SECRET;
  if (!expectedSecret) {
    console.error(
      "[/api/requisiciones/notify] REQUISICIONES_NOTIFY_SECRET is not set",
    );
    return NextResponse.json(
      { ok: false, error: "server-not-configured" },
      { status: 500 },
    );
  }

  const providedSecret = req.headers.get("x-internal-secret");
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, {
      status: 401,
    });
  }

  let body: { event?: string; args?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, {
      status: 400,
    });
  }

  const { event, args } = body;
  if (!event || typeof event !== "string") {
    return NextResponse.json({ ok: false, error: "missing-event" }, {
      status: 400,
    });
  }

  const handler = NOTIFY_HANDLERS[event];
  if (!handler) {
    return NextResponse.json(
      { ok: false, error: `unknown-event:${event}` },
      { status: 400 },
    );
  }

  try {
    await handler(...(Array.isArray(args) ? args : []));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(
      `[/api/requisiciones/notify] handler "${event}" threw:`,
      err,
    );
    return NextResponse.json(
      { ok: false, error: "handler-error" },
      { status: 500 },
    );
  }
}
