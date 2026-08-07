"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { updateFirmaDigitalAction, type PerfilProfesional, type HorarioRango } from "../actions";

const DIAS = [
  { num: 1, label: "Lunes" },
  { num: 2, label: "Martes" },
  { num: 3, label: "Miércoles" },
  { num: 4, label: "Jueves" },
  { num: 5, label: "Viernes" },
  { num: 6, label: "Sábado" },
  { num: 7, label: "Domingo" },
];

export function ConfiguracionView({ perfil, horarios }: {
  perfil: PerfilProfesional | null;
  horarios: Record<number, HorarioRango[]>;
}) {
  const router = useRouter();
  const [uploadingFirma, setUploadingFirma] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFirmaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFirma(true);
    const fd = new FormData();
    fd.append("firma", file);

    const res = await updateFirmaDigitalAction(fd);
    setUploadingFirma(false);

    if (res?.error) {
      alert("Error al subir la firma: " + res.error);
      return;
    }

    router.refresh();
  }

  const nombreCompleto = perfil ? `Dr. ${perfil.nombre} ${perfil.apellido}` : "—";

  return (
    <div className="p-4 sm:p-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <Icon name="person" size={18} />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Información Personal</h2>
            </div>
            <div className="flex flex-col gap-3.5">
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Nombre completo</p>
                <p className="text-[14px] font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{nombreCompleto}</p>
              </div>
              {perfil?.especialidad && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Especialidad</p>
                  <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil.especialidad}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Email profesional</p>
                <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.email ?? "—"}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Teléfono</p>
                  <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil?.telefono ?? "—"}</p>
                </div>
                {perfil?.num_colegiatura && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">N.° Colegiatura</p>
                    <p className="text-[13.5px] text-slate-700 dark:text-slate-300 mt-0.5">{perfil.num_colegiatura}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
                <Icon name="draw" size={18} />
              </div>
              <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Firma Digital</h2>
            </div>

            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 h-28 flex items-center justify-center overflow-hidden mb-3">
              {perfil?.firma_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={perfil.firma_url} alt="Firma digital" className="max-h-full max-w-full object-contain" />
              ) : (
                <p className="text-[12px] text-slate-400 dark:text-slate-500">Sin firma registrada</p>
              )}
            </div>

            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
              Esta firma se usará en las recetas electrónicas y documentos clínicos emitidos bajo tu perfil profesional.
            </p>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFirmaChange} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploadingFirma}
              className="w-full flex items-center justify-center gap-1.5 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-[13px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Icon name="upload" size={15} />
              {uploadingFirma ? "Subiendo…" : "Actualizar Firma"}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <Icon name="calendar_month" size={18} />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-slate-800 dark:text-slate-100">Horario Profesional</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Horario asignado desde la base de datos</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            {DIAS.map((dia) => {
              const ranges = horarios[dia.num] ?? [];
              return (
                <div key={dia.num} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{dia.label}</span>
                    <span className={`text-sm font-medium ${ranges.length > 0 ? "text-slate-600 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"}`}>
                      {ranges.length > 0 ? "Disponible" : "Cerrado"}
                    </span>
                  </div>

                  {ranges.length > 0 ? (
                    <div className="mt-3 grid gap-2">
                      {ranges.map((r, idx) => (
                        <div key={idx} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-300">
                          {r.hora_inicio} – {r.hora_fin}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-500">No hay horario definido para este día.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
