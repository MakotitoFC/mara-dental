import { DashboardShell } from "@/components/layout/DashboardShell";
import { Topbar } from "@/components/layout/Topbar";
import { Icon } from "@/components/ui/Icon";

const STATS = [
  { label: "Citas hoy",    value: "12", icon: "calendar_month", color: "text-cyan-600",   bg: "bg-cyan-50"   },
  { label: "Confirmadas",  value: "8",  icon: "check_circle",   color: "text-green-600",  bg: "bg-green-50"  },
  { label: "Pendientes",   value: "3",  icon: "schedule",       color: "text-yellow-600", bg: "bg-yellow-50" },
  { label: "Emergencias",  value: "1",  icon: "priority_high",  color: "text-red-600",    bg: "bg-red-50"    },
];

export default function DashboardPage() {
  return (
    <DashboardShell>
      <Topbar title="Inicio" />
      <div className="p-6 flex flex-col gap-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                <Icon name={stat.icon} size={20} className={stat.color} />
              </div>
              <div>
                <p className="text-[22px] font-bold text-slate-900 leading-none">{stat.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-[13px] font-semibold text-slate-900 mb-1">Próximas citas</p>
          <p className="text-[12px] text-slate-400">
            Vista completa disponible en <span className="font-mono text-cyan-600">/agenda</span>
          </p>
        </div>
      </div>
    </DashboardShell>
  );
}
