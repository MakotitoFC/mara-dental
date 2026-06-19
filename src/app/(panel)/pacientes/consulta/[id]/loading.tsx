import { Topbar } from "@/components/layout/Topbar";

export default function LoadingConsulta() {
  return (
    <>
      <Topbar breadcrumbs={[{ label: "Pacientes", href: "/pacientes" }, { label: "Consulta" }]} />
      <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-slate-50/40">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 rounded-full border-4 border-t-cyan-500 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-semibold text-slate-700">Cargando consulta</p>
          <p className="text-[13px] text-slate-400 mt-1">Preparando la información clínica…</p>
        </div>
      </div>
    </>
  );
}
