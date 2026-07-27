export default function NuevoServicioWizardLoading() {
  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center gap-4 max-w-5xl mx-auto">
        <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
        <div>
          <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="mt-1 h-4 w-48 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div className="h-9 w-9 bg-gray-200 rounded-full animate-pulse" />
                <div className="mt-1 h-2 w-12 bg-gray-100 rounded animate-pulse" />
              </div>
              {i < 5 && <div className="flex-1 h-0.5 mx-1 bg-gray-100" />}
            </div>
          ))}
        </div>
        <div className="border border-gray-200 rounded-lg p-6 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-10 w-full bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
