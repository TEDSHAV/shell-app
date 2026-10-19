import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can_view_depositos } from "@/actions/req-stock";
import {
  dept_key_for_app,
  dept_matches_key,
} from "@/lib/requisiciones-dept-context";
import { inventario_href_for_app } from "@/lib/requisiciones-inventario-nav";

export const metadata = {
  title: "Inventario | PRISMA",
};

export default async function DepositosParaAppPage({
  params,
  searchParams,
}: {
  params: Promise<{ appId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  if (!(await can_view_depositos())) {
    redirect("/requisiciones");
  }

  const { appId: raw } = await params;
  const { from: from_raw } = await searchParams;
  const app_id = decodeURIComponent(raw).trim().toLowerCase();
  const from = (from_raw || app_id).trim().toLowerCase() || app_id;

  if (app_id === "administracion") {
    redirect(inventario_href_for_app("administracion"));
  }

  const dept_key = dept_key_for_app(app_id);
  if (!dept_key) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("departamentos" as never)
    .select("id,nombre");
  const rows = (data || []) as Array<{ id: number; nombre: string }>;
  const hit = rows.find((row) => dept_matches_key(row.nombre, dept_key));
  if (!hit) {
    redirect(`/requisiciones/depositos?from=${encodeURIComponent(from)}`);
  }

  redirect(
    `/requisiciones/depositos/departamento/${hit.id}?from=${encodeURIComponent(from)}`,
  );
}
