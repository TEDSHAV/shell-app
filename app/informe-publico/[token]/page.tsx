import { load_public_informe } from "@/features/planificacion/actions/informe-actions";
import { InformeWorkspace } from "@/features/planificacion/components/informe-workspace";

export const dynamic = "force-dynamic";

export default async function InformePublicoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const loaded = await load_public_informe(token);

  return (
    <div className="min-h-full bg-[#f4f5f7] px-6 pb-10 pt-8">
      {loaded.ok ? (
        <InformeWorkspace
          data={loaded.data}
          read_only
          snapshot_at={loaded.captured_at}
        />
      ) : (
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Informe</h1>
          <p className="mt-2 text-sm text-slate-500">{loaded.error}</p>
        </div>
      )}
    </div>
  );
}
