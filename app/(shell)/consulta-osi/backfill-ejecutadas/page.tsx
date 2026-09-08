import { notFound, redirect } from "next/navigation";
import BackfillEjecutadasClient from "./BackfillEjecutadasClient";
import { canChangeOSIStatus } from "@/actions/osi";

export const metadata = {
  title: "Backfill OSIs Ejecutadas | PRISMA",
};

export default async function BackfillEjecutadasPage() {
  // Dev-only tool — 404 in production so the route isn't reachable even if
  // the bundle ships it.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const canChange = await canChangeOSIStatus();

  if (!canChange) {
    redirect("/dashboard");
  }

  return <BackfillEjecutadasClient />;
}
