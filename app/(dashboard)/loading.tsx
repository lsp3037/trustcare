import { Card, Skeleton } from '@/components/ui';

export default function DashboardLoading() {
  return (
    <div className="w-full h-full space-y-8" aria-busy="true" aria-label="Carregando">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Grade de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <div className="flex justify-between items-start mb-4">
              <Skeleton className="h-9 w-9 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 w-16" />
          </Card>
        ))}
      </div>

      {/* Conteúdo principal */}
      <Card>
        <Skeleton className="h-6 w-48 mb-6" />
        <div className="space-y-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </Card>
    </div>
  );
}
