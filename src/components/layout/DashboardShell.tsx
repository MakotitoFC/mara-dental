"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "./AuthProvider";
import type { AuthUser } from "@/types/auth";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { FabButton } from "./FabButton";
import { fadeIn } from "@/lib/animations";

export function DashboardShell({ children, initialUser }: { children: React.ReactNode; initialUser: AuthUser | null }) {
  const pathname = usePathname();

  return (
    <AuthProvider initialUser={initialUser}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden pb-16 md:pb-0 no-scrollbar">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex-1 flex flex-col min-w-0 min-h-0"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        <BottomNav />
        <FabButton />
      </div>
    </AuthProvider>
  );
}
