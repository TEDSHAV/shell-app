import { VerificarCedulaClient } from "./VerificarCedulaClient";

export const metadata = {
  title: "Verificar Cédula | PRISMA",
  description: "Consulta y verificación de identidad oficial por cédula (CNE / SENIAT)",
};

export default function VerificarCedulaPage() {
  return <VerificarCedulaClient />;
}
