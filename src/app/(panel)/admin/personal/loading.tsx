import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LoadingPersonal() {
  return (
    <>
      <Header title="Personal" />
      <div className="flex flex-col flex-1 min-h-0 bg-slate-50 dark:bg-slate-950">
        <header className="flex flex-col gap-4 px-4 sm:px-6 pt-4 sm:pt-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 pb-4 sm:pb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="hidden sm:block w-10 h-10 rounded-xl shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="hidden sm:block h-3 w-64" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
