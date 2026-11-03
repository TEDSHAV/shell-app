import os from "os";
import { Metadata } from "next";
import { VisitantesClient } from "@/features/visitantes/components/VisitantesClient";

export const metadata: Metadata = {
  title: "Control de Visitantes | PRISMA",
  description:
    "Lista de visitantes, código QR de recepción, asignación de responsables y registro de salida.",
};

function getServerLanIp(): string | null {
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === "IPv4" && !net.internal) {
          return net.address;
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export default function VisitantesPage() {
  const lanIp = getServerLanIp();

  return (
    <div className="w-full">
      <VisitantesClient initialLanIp={lanIp} />
    </div>
  );
}
