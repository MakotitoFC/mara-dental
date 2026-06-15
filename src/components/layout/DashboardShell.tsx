import { AuthProvider } from "./AuthProvider";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto [overflow-x:clip] pb-16 md:pb-0">
          {children}
        </main>
        <MobileNav />
      </div>
    </AuthProvider>
  );
}
