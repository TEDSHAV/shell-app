import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can_view_depositos } from "@/actions/req-stock";
import { ReqDepositosDetailScreen } from "@/features/requisiciones/components/depositos/req-depositos-detail-screen";

export const metadata = {
  title: "Inventario departamental | PRISMA",
};

export default async function DepositosDepartamentoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  if (!(await can_view_depositos())) {
    redirect("/requisiciones");
  }
  const { id: raw } = await params;
  const { from } = await searchParams;
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("departamentos" as never)
    .select("id,nombre")
    .eq("id", id)
    .maybeSingle();
  const dept = data as { id: number; nombre: string } | null;
  if (!dept) notFound();

  return (
    <div className="relative min-h-full overflow-hidden bg-white p-4 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-16 h-80 w-80 rounded-full bg-orange-200/35 blur-3xl"
      />
      <div className="relative">
        <ReqDepositosDetailScreen
          mode="departamento"
          id_departamento={dept.id}
          titulo={dept.nombre}
          from_app={from}
        />
      </div>
    </div>
  );
}
