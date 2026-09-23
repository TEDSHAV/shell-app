import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { canAccessTedApp, isTedMember } from "@/actions/ted";

export default async function TedPlanificacionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ted, can_app] = await Promise.all([isTedMember(), canAccessTedApp()]);
  const back_href = ted
    ? "/ted"
    : can_app
      ? "/ted/planificacion/objetivos"
      : "/dashboard";
  const back_label = ted
    ? "Volver a TED"
    : can_app
      ? "Volver a objetivos"
      : "Volver al inicio";
  return (
    <div className="flex min-h-full w-full flex-col bg-[#f4f5f7]">
      <div className="px-6 pt-5">
        <Link
          href={back_href}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {back_label}
        </Link>
      </div>
      {children}
    </div>
  );
}
