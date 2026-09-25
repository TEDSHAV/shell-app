export default function Loading() {
  return (
    <div className="relative min-h-screen overflow-x-auto bg-slate-50">
      {/* Top toolbar skeleton */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/95 px-6 py-2.5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-32 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 animate-pulse rounded-md bg-gray-100" />
          <div className="h-8 w-20 animate-pulse rounded-md bg-gray-100" />
          <div className="h-8 w-8 animate-pulse rounded-md bg-gray-200" />
        </div>
      </div>

      {/* Document Sheet Skeleton */}
      <div className="flex justify-center px-4 py-8">
        <div className="w-full max-w-4xl rounded-lg border border-gray-200 bg-white p-8 shadow-md">
          {/* Header row: logo + title */}
          <div className="mb-8 flex items-center justify-between border-b border-gray-100 pb-6">
            <div className="h-12 w-32 animate-pulse rounded bg-gray-200" />
            <div className="flex flex-col items-end gap-2">
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
            </div>
          </div>

          {/* Section rows */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-8 w-full animate-pulse rounded bg-gray-50 border border-gray-100" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                <div className="h-8 w-full animate-pulse rounded bg-gray-50 border border-gray-100" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-16 w-full animate-pulse rounded bg-gray-50 border border-gray-100" />
            </div>

            {/* Table skeleton */}
            <div className="overflow-hidden rounded-md border border-gray-200">
              <div className="h-9 bg-gray-100" />
              <div className="divide-y divide-gray-100">
                <div className="h-10 animate-pulse bg-white" />
                <div className="h-10 animate-pulse bg-gray-50/50" />
                <div className="h-10 animate-pulse bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
