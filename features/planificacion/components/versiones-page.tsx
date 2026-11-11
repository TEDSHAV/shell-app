import { load_versiones_tree } from "../actions/version-actions";
import { VersionesTree } from "./versiones-tree";

export async function VersionesPage() {
  const loaded = await load_versiones_tree();
  return (
    <div className="px-6 pb-6 pt-2">
      {loaded.ok ? (
        <VersionesTree
          apps={loaded.apps}
          generated_at={loaded.generated_at}
          planned_error={loaded.planned_error}
        />
      ) : (
        <p className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm text-red-600">
          {loaded.error}
        </p>
      )}
    </div>
  );
}
