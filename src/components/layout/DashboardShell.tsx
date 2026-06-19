import { AuthProvider, AuthUser } from "./AuthProvider";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function DashboardShell({ children,initialUser }: { children: React.ReactNode,initialUser:AuthUser | null }) {
  return (
    <AuthProvider initialUser={initialUser}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          {children}
        </main>
        <MobileNav />
      </div>
    </AuthProvider>
  );
}
