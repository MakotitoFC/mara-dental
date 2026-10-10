"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";

const STORAGE_KEY = "maradental:guia-odontograma-oculta";

const ESCENARIOS: { key: string; label: string; icon: string; intro: string; pasos: string[] }[] = [
  {
    key: "superficie",
    label: "Una superficie",
    icon: "dentistry",
    intro: "Ej. una caries en la cara oclusal de una muela.",
    pasos: [
      "Toca el diente en el odontograma; queda marcado en \"Dientes seleccionados\".",
      "En \"Superficie\" toca la cara afectada (vestibular, mesial, distal, palatino/lingual u oclusal/incisal).",
      "En \"Condición\" elige qué presenta esa cara (caries, obturado, etc.).",
      "Presiona \"Agregar registro\" para guardarlo.",
    ],
  },
  {
    key: "varias",
    label: "Varias superficies",
    icon: "notes",
    intro: "Ej. el mismo diente con caries en una cara y obturado en otra.",
    pasos: [
      "Selecciona el diente en el odontograma.",
      "Toca la primera superficie y asígnale su condición.",
      "Toca la siguiente superficie y asígnale la suya: cada cara puede tener una condición distinta.",
      "Revisa \"Superficies asignadas\" y presiona \"Agregar registro\".",
    ],
  },
  {
    key: "completo",
    label: "Diente completo",
    icon: "tooth",
    intro: "Ej. diente ausente, extraído o con endodoncia.",
    pasos: [
      "Selecciona el diente en el odontograma.",
      "Presiona \"Diente completo\" (no hace falta elegir superficies).",
      "Elige la condición que aplica a toda la pieza (ausente, con endodoncia, etc.).",
      "Presiona \"Agregar registro\".",
    ],
  },
  {
    key: "multiples",
    label: "Varios dientes",
    icon: "groups",
    intro: "Ej. varias piezas con el mismo hallazgo en una misma visita.",
    pasos: [
      "Toca todos los dientes que quieras registrar: quedan en \"Dientes seleccionados\".",
      "Toca cada diente de esa lista para editarlo; cada uno tiene su propio borrador.",
      "Define superficies o \"Diente completo\" y la condición de cada uno (el punto de color indica que ya está listo).",
      "Presiona \"Guardar N registros\" para guardarlos todos juntos.",
    ],
  },
  {
    key: "observacion",
    label: "Con observación",
    icon: "edit_note",
    intro: "Para dejar un detalle clínico general del registro.",
    pasos: [
      "Completa primero la superficie (o \"Diente completo\") y su condición.",
      "Escribe el detalle en \"Observaciones generales\": es una sola para todos los dientes que guardes en ese registro.",
      "Presiona \"Agregar registro\". Ojo: una observación sola, sin condición asignada, no se guarda.",
    ],
  },
];

export function GuiaRegistroOdontograma() {
  const [oculta, setOculta] = useState(false);
  const [listo, setListo] = useState(false);
  const [escenario, setEscenario] = useState(ESCENARIOS[0].key);

  useEffect(() => {
    try { setOculta(localStorage.getItem(STORAGE_KEY) === "1"); } catch { /* sin storage */ }
    setListo(true);
  }, []);

  const cambiar = (valor: boolean) => {
    setOculta(valor);
    try { if (valor) localStorage.setItem(STORAGE_KEY, "1"); else localStorage.removeItem(STORAGE_KEY); } catch { /* sin storage */ }
  };

  if (!listo) return null;

  if (oculta) {
    return (
      <button
        type="button"
        onClick={() => cambiar(false)}
        className="self-start flex items-center gap-1.5 text-[12px] font-semibold text-cyan-700 hover:text-cyan-800 bg-transparent border-0 p-0"
      >
        <Icon name="info" size={14} />
        Mostrar guía de registro
      </button>
    );
  }

  const actual = ESCENARIOS.find(e => e.key === escenario) ?? ESCENARIOS[0];

  return (
    <div className="rounded-xl border border-cyan-200 p-3.5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0">
            <Icon name="tips_and_updates" size={13} />
          </span>
          <p className="text-[12.5px] font-bold text-cyan-800">¿Cómo registrar? Elige tu caso</p>
        </div>
        <button
          type="button"
          onClick={() => cambiar(true)}
          className="shrink-0 text-[11.5px] font-semibold text-slate-500 hover:text-slate-700 underline underline-offset-2 bg-transparent border-0 p-0"
        >
          No volver a mostrar
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ESCENARIOS.map(e => (
          <button
            key={e.key}
            type="button"
            onClick={() => setEscenario(e.key)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${
              e.key === escenario ? "bg-cyan-600 border-cyan-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon name={e.icon} size={13} />
            {e.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11.5px] text-slate-500">{actual.intro}</p>
        <ol className="flex flex-col gap-2 m-0 p-0 list-none">
          {actual.pasos.map((p, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-white border border-cyan-300 text-cyan-700 text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-px">
                {i + 1}
              </span>
              <span className="text-[12.5px] text-slate-700 leading-snug">{p}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
