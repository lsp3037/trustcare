export default function DashboardLoading() {
  return (
    <div className="w-full h-full p-8 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-8">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-32 bg-slate-100 rounded-lg"></div>
        </div>
        <div className="h-10 w-32 bg-slate-200 rounded-lg"></div>
      </div>
      
      {/* Metrics Grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm h-32">
            <div className="flex justify-between items-start mb-4">
              <div className="h-4 w-24 bg-slate-100 rounded"></div>
              <div className="h-8 w-8 bg-slate-100 rounded-lg"></div>
            </div>
            <div className="h-8 w-16 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Main Content skeleton */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 h-96">
        <div className="h-6 w-48 bg-slate-200 rounded mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-12 w-full bg-slate-50 rounded-lg border border-slate-100"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
