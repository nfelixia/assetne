function Bone({ w = 'w-full', h = 'h-3', rounded = 'rounded-md' }: { w?: string; h?: string; rounded?: string }) {
  return (
    <div
      className={`${w} ${h} ${rounded} animate-pulse`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
    />
  )
}

/* ── Dashboard ── */
export function DashboardSkeleton() {
  return (
    <div className="animate-[fadeIn_0.2s_ease]">
      {/* Greeting */}
      <div className="mb-6">
        <Bone w="w-48" h="h-7" />
        <div className="mt-2"><Bone w="w-32" h="h-3.5" /></div>
      </div>

      {/* Stats row */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Bone w="w-8" h="h-8" rounded="rounded-lg" />
            <div className="mt-3"><Bone w="w-12" h="h-6" /></div>
            <div className="mt-1.5"><Bone w="w-20" h="h-3" /></div>
          </div>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <Bone w="w-32" h="h-3.5" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Bone w="w-8" h="h-8" rounded="rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Bone w="w-3/4" h="h-3" />
                    <Bone w="w-1/2" h="h-2.5" />
                  </div>
                  <Bone w="w-16" h="h-5" rounded="rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Equipments list ── */
export function EquipmentsSkeleton() {
  return (
    <div className="animate-[fadeIn_0.2s_ease]">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <Bone w="w-40" h="h-7" />
          <div className="mt-2"><Bone w="w-28" h="h-3.5" /></div>
        </div>
        <div className="flex gap-2">
          <Bone w="w-20" h="h-9" rounded="rounded-lg" />
          <Bone w="w-36" h="h-9" rounded="rounded-lg" />
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2">
        <Bone w="flex-1 min-w-[180px]" h="h-9" rounded="rounded-lg" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} w="w-20" h="h-9" rounded="rounded-lg" />
        ))}
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Header row */}
        <div
          className="px-4 py-2.5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <Bone w="w-full" h="h-3" />
        </div>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
          >
            <Bone w="w-8" h="h-8" rounded="rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Bone w="w-1/3" h="h-3.5" />
              <Bone w="w-1/5" h="h-2.5" />
            </div>
            <Bone w="w-20" h="h-5" rounded="rounded-full" />
            <Bone w="w-24" h="h-3" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Equipment detail ── */
export function EquipmentDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-[fadeIn_0.2s_ease]">
      {/* Back */}
      <Bone w="w-28" h="h-3.5" />

      {/* Header card */}
      <div
        className="mt-5 mb-4 rounded-xl p-5"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-start gap-4">
          <Bone w="w-14" h="h-14" rounded="rounded-xl" />
          <div className="flex-1 space-y-2">
            <Bone w="w-48" h="h-6" />
            <div className="flex gap-2">
              <Bone w="w-20" h="h-5" rounded="rounded-full" />
              <Bone w="w-24" h="h-5" rounded="rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Bone w="w-28" h="h-8" rounded="rounded-lg" />
            <Bone w="w-20" h="h-8" rounded="rounded-lg" />
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div
        className="mb-4 overflow-hidden rounded-xl"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
          >
            <Bone w="w-24" h="h-3" />
            <Bone w="w-32" h="h-3" />
          </div>
        ))}
      </div>

      {/* History table */}
      <div
        className="overflow-hidden rounded-xl"
        style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Bone w="w-32" h="h-3.5" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid px-4 py-3"
            style={{
              gridTemplateColumns: '110px 1fr 1fr 80px',
              gap: '12px',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}
          >
            <Bone w="w-full" h="h-3" />
            <Bone w="w-3/4" h="h-3" />
            <Bone w="w-2/3" h="h-3" />
            <Bone w="w-full" h="h-5" rounded="rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Production ── */
export function ProductionSkeleton() {
  return (
    <div className="animate-[fadeIn_0.2s_ease]">
      <div className="mb-5 flex items-start justify-between">
        <div className="space-y-2">
          <Bone w="w-48" h="h-7" />
          <Bone w="w-32" h="h-3.5" />
        </div>
        <Bone w="w-28" h="h-9" rounded="rounded-lg" />
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg p-2.5" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Bone w="w-16" h="h-3" />
            <div className="mt-1.5"><Bone w="w-10" h="h-6" /></div>
          </div>
        ))}
      </div>
      <div className="mb-4 flex gap-2">
        <Bone w="flex-1 min-w-[180px]" h="h-9" rounded="rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Bone key={i} w="w-24" h="h-9" rounded="rounded-lg" />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl" style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Bone w="w-full" h="h-3" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: i < 5 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <Bone w="w-12" h="h-12" rounded="rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Bone w="w-2/5" h="h-3.5" />
              <Bone w="w-1/4" h="h-2.5" />
            </div>
            <Bone w="w-16" h="h-3" />
            <Bone w="w-16" h="h-5" rounded="rounded-full" />
            <Bone w="w-20" h="h-6" rounded="rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Reports ── */
export function ReportsSkeleton() {
  return (
    <div className="animate-[fadeIn_0.2s_ease]">
      {/* Header */}
      <div className="mb-6">
        <Bone w="w-36" h="h-7" />
        <div className="mt-2"><Bone w="w-56" h="h-3.5" /></div>
      </div>

      {/* Date filters */}
      <div className="mb-5 flex gap-3">
        <Bone w="w-40" h="h-9" rounded="rounded-lg" />
        <Bone w="w-40" h="h-9" rounded="rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <Bone w="w-12" h="h-8" />
            <div className="mt-2"><Bone w="w-20" h="h-3" /></div>
          </div>
        ))}
      </div>

      {/* Two sections */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="mb-4 overflow-hidden rounded-xl"
          style={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Bone w="w-40" h="h-3.5" />
          </div>
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Bone w="w-5" h="h-3" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Bone w="w-2/5" h="h-3" />
                    <Bone w="w-8" h="h-3" />
                  </div>
                  <Bone w="w-full" h="h-1.5" rounded="rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
