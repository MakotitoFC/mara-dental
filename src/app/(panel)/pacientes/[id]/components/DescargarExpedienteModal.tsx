"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Icon } from "@/components/ui/Icon";
import { DatePicker } from "@/components/ui/DatePicker";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { getExpedienteCompletoAction } from "../actions";
import { ExpedientePDF } from "./ExpedientePDF";

type Secciones = {
  resumenClinico: boolean;
  tratamientos: boolean;
  recetas: boolean;
  presupuestos: boolean;
  archivos: boolean;
  odontogramas: boolean;
};

const SECCION_OPTIONS: { key: keyof Secciones; label: string; icon: string }[] = [
  { key: "resumenClinico", label: "Resumen clínico (alergias, antecedentes)", icon: "medical_information" },
  { key: "tratamientos", label: "Tratamientos y plan de trabajo", icon: "medical_services" },
  { key: "recetas", label: "Recetas médicas", icon: "medication" },
  { key: "presupuestos", label: "Presupuestos y pagos", icon: "payments" },
  { key: "archivos", label: "Archivos clínicos", icon: "photo_library" },
  { key: "odontogramas", label: "Odontogramas por visita", icon: "tooth" },
];

function slugify(s: string) {
  return (s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();
}

function Checkbox({ checked, onChange, icon, label }: { checked: boolean; onChange: () => void; icon: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
    >
      <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
        checked ? "bg-cyan-600 border-cyan-600" : "border-slate-300"
      }`}>
        {checked && <Icon name="check" size={13} className="text-white" />}
      </span>
      <Icon name={icon} size={16} className="text-slate-400 shrink-0" />
      <span className="text-[12.5px] text-slate-700 font-medium">{label}</span>
    </button>
  );
}

export function DescargarExpedienteModal({ paciente, onClose }: {
  paciente: { id: number | string; nombre?: string; apellido?: string; dni?: string; codigoHistoria?: string | null };
  onClose: () => void;
}) {
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [secciones, setSecciones] = useState<Secciones>({
    resumenClinico: true, tratamientos: true, recetas: true, presupuestos: true, archivos: true, odontogramas: true,
  });
  const [generando, setGenerando] = useState<"print" | "pdf" | null>(null);
  const [error, setError] = useState("");

  function toggle(key: keyof Secciones) {
    setSecciones((s) => ({ ...s, [key]: !s[key] }));
  }

  function aplicarSecciones(data: any) {
    if (secciones.resumenClinico && secciones.tratamientos && secciones.recetas && secciones.presupuestos && secciones.archivos && secciones.odontogramas) {
      return data;
    }
    return {
      ...data,
      paciente: secciones.resumenClinico ? data.paciente : { ...data.paciente, alergias: [], antecedentes_estructurados: null, enfermedad_actual: null },
      consultas: data.consultas.map((c: any) => ({
        ...c,
        diagnosticos: (c.diagnosticos || []).map((d: any) => ({
          ...d,
          tratamientos: secciones.tratamientos ? d.tratamientos : [],
          plan: secciones.tratamientos ? d.plan : [],
          recetas: secciones.recetas ? d.recetas : [],
        })),
        presupuestos: secciones.presupuestos ? c.presupuestos : [],
        archivos: secciones.archivos ? c.archivos : [],
        odontogramaDetalle: secciones.odontogramas ? c.odontogramaDetalle : [],
      })),
    };
  }

  async function generar(mode: "print" | "pdf") {
    setGenerando(mode);
    setError("");
    try {
      const data = await getExpedienteCompletoAction(String(paciente.id), {
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      });
      if (!data) { setError("No se pudo cargar el expediente del paciente."); return; }

      const filtrado = aplicarSecciones(data);
      const blob = await pdf(<ExpedientePDF data={filtrado} />).toBlob();
      const url = URL.createObjectURL(blob);

      if (mode === "print") {
        const win = window.open(url, "_blank");
        win?.addEventListener("load", () => win.print());
      } else {
        const codigo = data.historiaClinica?.codigo_historia || slugify(`${paciente.nombre ?? ""}${paciente.apellido ?? ""}`);
        const apellido = slugify(paciente.apellido || data.paciente?.apellido || "PACIENTE");
        const fecha = new Date().toISOString().split("T")[0];
        const filename = `HC-${codigo}-${apellido}-${fecha}.pdf`;
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      onClose();
    } catch (err) {
      console.error("Error generando expediente:", err);
      setError("Ocurrió un error generando el PDF. Intenta de nuevo.");
    } finally {
      setGenerando(null);
    }
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Descargar expediente"
      maxWidthDesktop="480px"
      footer={
        <div className="flex flex-col gap-2">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-[12px] text-red-600">
              <Icon name="warning" size={14} className="shrink-0" /> {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => generar("print")}
              disabled={generando !== null}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 rounded-xl text-[13px] font-semibold transition-colors"
            >
              <Icon name="print" size={15} />
              {generando === "print" ? "Preparando…" : "Imprimir"}
            </button>
            <button
              onClick={() => generar("pdf")}
              disabled={generando !== null}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-xl text-[13px] font-semibold transition-colors"
            >
              <Icon name="download" size={15} />
              {generando === "pdf" ? "Generando…" : "Descargar PDF"}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Rango de fechas (opcional)</p>
          <div className="grid grid-cols-2 gap-2">
            <DatePicker value={fechaDesde} onChange={setFechaDesde} placeholder="Desde" max={fechaHasta || undefined} />
            <DatePicker value={fechaHasta} onChange={setFechaHasta} placeholder="Hasta" min={fechaDesde || undefined} />
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">Deja en blanco para incluir todo el historial.</p>
        </div>

        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Secciones a incluir</p>
          <div className="flex flex-col gap-1.5">
            {SECCION_OPTIONS.map((opt) => (
              <Checkbox key={opt.key} icon={opt.icon} label={opt.label} checked={secciones[opt.key]} onChange={() => toggle(opt.key)} />
            ))}
          </div>
          <p className="text-[10.5px] text-slate-400 mt-1.5">
            Datos personales, diagnósticos e historial de consultas siempre se incluyen.
          </p>
        </div>
      </div>
    </ResponsiveSheet>
  );
}
