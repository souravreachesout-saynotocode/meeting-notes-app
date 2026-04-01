import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl">
      <Skeleton className="h-8 w-48 bg-white/5 mb-6" />
      <Skeleton className="h-64 w-full rounded-xl bg-white/5 mb-4" />
      <Skeleton className="h-32 w-full rounded-xl bg-white/5" />
    </div>
  );
}

export function CardLoading() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
      <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
      <Skeleton className="h-20 w-full rounded-xl bg-white/5" />
    </div>
  );
}
