import {
  getAllOSIsForRequisiciones,
  getCurrentUser,
  getAllOsiSessions,
} from "@/actions/requisiciones";
import { get_catalogo_pedido_item_action } from "@/actions/req-lineas";
import { list_request_departments } from "@/actions/requisiciones-access-context";
import {
  dept_key_for_app,
  dept_matches_key,
} from "@/lib/requisiciones-dept-context";
import { ReqAltaAsistente } from "@/features/requisiciones/components/alta/req-alta-asistente";
import type { ReqDeposito } from "@/features/requisiciones/lib/req-stock-types";

export const metadata = {
  title: "Nueva Requisición | PRISMA",
};

export default async function CreateRequisicionPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    item?: string;
    deposito?: string;
    abastecer?: string;
  }>;
}) {
  const { from, item, deposito, abastecer } = await searchParams;
  const item_id = Number(item || 0);
  const deposito_ok: ReqDeposito | null =
    deposito === "departamento" ||
    deposito === "capacitacion" ||
    deposito === "tecnico"
      ? deposito
      : null;
  const [osis, userData, osiSessions, allowedDepts, catalog_item] = await Promise.all([
    getAllOSIsForRequisiciones(),
    getCurrentUser(),
    getAllOsiSessions(),
    list_request_departments(),
    item_id > 0 ? get_catalogo_pedido_item_action(item_id) : Promise.resolve(null),
  ]);

  const fromKey = dept_key_for_app(from || "");
  const lockedDept = fromKey
    ? allowedDepts.find((row) => dept_matches_key(row.nombre, fromKey)) || null
    : null;
  const userDept =
    lockedDept?.nombre || userData?.departamentos?.nombre || "";
  const userGerencia =
    lockedDept?.gerencia || userData?.departamentos?.gerencia || "";

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nueva Requisición</h1>
        <p className="text-sm text-gray-600">
          Siga los pasos de arriba. El documento se crea recién en Revisar.
        </p>
      </div>
      <ReqAltaAsistente
        osis={osis || []}
        userData={userData}
        userDept={userDept}
        userGerencia={userGerencia}
        osiSessions={osiSessions || []}
        restock={
          catalog_item && deposito_ok
            ? { deposito: deposito_ok, item: catalog_item }
            : null
        }
        abastecer={abastecer === "1" || abastecer === "true"}
      />
    </div>
  );
}
