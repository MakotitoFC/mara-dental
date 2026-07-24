"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { createPacienteAction } from "../actions";

const GRUPOS_SANGUINEOS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const SEXOS = ["Masculino", "Femenino", "Otro"];
const SEXO_OPTIONS = SEXOS.map((s) => ({ value: s, label: s }));
const GRUPO_OPTIONS = GRUPOS_SANGUINEOS.map((g) => ({ value: g, label: g }));

const STEPS = [
  { n: 1, label: "Datos personales" },
  { n: 2, label: "Datos médicos" },
  { n: 3, label: "Historia clínica" },
];

const inputCls = "w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function ChipField({
  label, placeholder, chips, input, chipClass, onInputChange, onAdd, onRemove,
}: {
  label: string; placeholder: string; chips: string[]; input: string; chipClass: string;
  onInputChange: (v: string) => void; onAdd: () => void; onRemove: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
          className={`flex-1 ${inputCls}`}
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!input.trim()}
          className="px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 text-[12px] font-semibold transition-colors"
        >
          Añadir
        </button>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {chips.map((c) => (
            <span key={c} className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${chipClass}`}>
              {c}
              <button type="button" onClick={() => onRemove(c)} className="hover:opacity-70">
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}

export function NuevoPacienteModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Paso 1 — Datos personales
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [fechaNac, setFechaNac] = useState("");
  const [sexo, setSexo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");

  // Paso 2 — Datos médicos
  const [grupoSanguineo, setGrupo] = useState("");
  const [ocupacion, setOcupacion] = useState("");
  const [alergiasInput, setAlergiasInput] = useState("");
  const [alergias, setAlergias] = useState<string[]>([]);
  const [cronicasInput, setCronicasInput] = useState("");
  const [cronicas, setCronicas] = useState<string[]>([]);
  const [medInput, setMedInput] = useState("");
  const [medicacion, setMedicacion] = useState<string[]>([]);

  // Paso 3 — resultado real tras guardar (nada se muestra aquí que no venga de la BD)
  const [resultado, setResultado] = useState<{
    id: string;
    historia: { codigo_historia: string; estado: string; fecha_creacion: string };
  } | null>(null);

  const hoy = new Date().toISOString().split("T")[0];
  const canStep1 = Boolean(nombre.trim() && apellido.trim() && dni.trim() && fechaNac && telefono.trim());

  function addChip(val: string, list: string[], setter: (l: string[]) => void, inputSetter: (s: string) => void) {
    const v = val.trim();
    if (v && !list.includes(v)) setter([...list, v]);
    inputSetter("");
  }
  function removeChip(val: string, list: string[], setter: (l: string[]) => void) {
    setter(list.filter((x) => x !== val));
  }

  async function handleGuardar() {
    setSaving(true);
    setError("");
    const res = await createPacienteAction({
      nombre, apellido, dni,
      fecha_nacimiento: fechaNac,
      telefono,
      email: email || undefined,
      sexo: sexo || undefined,
      grupo_sanguineo: grupoSanguineo || undefined,
      ocupacion: ocupacion || undefined,
      alergias,
      antecedentes: { cronicas, medicacion_habitual: medicacion, quirurgicos: [] },
    });
    setSaving(false);
    if ("error" in res) { setError(res.error ?? "Ocurrió un error"); return; }
    setResultado({ id: res.id, historia: res.historia });
    setStep(3);
  }

  const fmtFecha = (iso: string) => {
    try { return new Date(iso).toLocaleDateString("es-PE"); } catch { return iso; }
  };

  return (
    <ResponsiveSheet
      onClose={onClose}
      maxWidthDesktop="560px"
      header={
        <div>
          <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-3">Nuevo paciente</p>
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex items-center flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 border-2 transition-colors ${
                  step > s.n ? "bg-cyan-600 border-cyan-600 text-white" : step === s.n ? "border-cyan-600 text-cyan-600" : "border-slate-200 text-slate-300"
                }`}>
                  {step > s.n ? <Icon name="check" size={13} /> : s.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1.5 transition-colors ${step > s.n ? "bg-cyan-600" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-[11.5px] text-slate-400 mt-2">Paso {step}: {STEPS[step - 1].label}</p>
        </div>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          {step === 1 && (
            <>
              <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canStep1}
                className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors"
              >
                Continuar <Icon name="chevron_right" size={15} />
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="px-4 py-2 text-[13px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                Atrás
              </button>
              <button
                onClick={handleGuardar}
                disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-xl text-[13px] font-semibold transition-colors"
              >
                {saving ? "Guardando…" : "Continuar"} <Icon name="chevron_right" size={15} />
              </button>
            </>
          )}
          {step === 3 && (
            <button
              onClick={() => resultado && onCreated(resultado.id)}
              className="w-full flex items-center justify-center gap-1.5 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-[13px] font-semibold transition-colors"
            >
              <Icon name="check" size={16} /> Guardar y continuar
            </button>
          )}
        </div>
      }
    >
      {step === 1 && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre *">
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ana" className={inputCls} />
                </Field>
                <Field label="Apellido *">
                  <input value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="García" className={inputCls} />
                </Field>
              </div>
              <Field label="DNI *">
                <input value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha de nacimiento *">
                  <DatePicker value={fechaNac} max={hoy} onChange={setFechaNac} />
                </Field>
                <Field label="Sexo">
                  <Select value={sexo} onChange={setSexo} options={SEXO_OPTIONS} placeholder="— Seleccionar —" />
                </Field>
              </div>
              <Field label="Teléfono *">
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+51 987 654 321" className={inputCls} />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@ejemplo.com" className={inputCls} />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-3">
              <Field label="Grupo sanguíneo">
                <Select value={grupoSanguineo} onChange={setGrupo} options={GRUPO_OPTIONS} placeholder="— No especificado —" />
              </Field>
              <ChipField
                label="Alergias" placeholder="Ej: Penicilina" chips={alergias} input={alergiasInput}
                chipClass="bg-orange-50 text-orange-700 border border-orange-100"
                onInputChange={setAlergiasInput}
                onAdd={() => addChip(alergiasInput, alergias, setAlergias, setAlergiasInput)}
                onRemove={(v) => removeChip(v, alergias, setAlergias)}
              />
              <ChipField
                label="Antecedentes médicos" placeholder="Ej: Hipertensión" chips={cronicas} input={cronicasInput}
                chipClass="bg-rose-50 text-rose-700 border border-rose-100"
                onInputChange={setCronicasInput}
                onAdd={() => addChip(cronicasInput, cronicas, setCronicas, setCronicasInput)}
                onRemove={(v) => removeChip(v, cronicas, setCronicas)}
              />
              <ChipField
                label="Medicamentos actuales" placeholder="Ej: Enalapril 5mg" chips={medicacion} input={medInput}
                chipClass="bg-cyan-50 text-cyan-700 border border-cyan-100"
                onInputChange={setMedInput}
                onAdd={() => addChip(medInput, medicacion, setMedicacion, setMedInput)}
                onRemove={(v) => removeChip(v, medicacion, setMedicacion)}
              />
              <Field label="Ocupación">
                <input value={ocupacion} onChange={(e) => setOcupacion(e.target.value)} placeholder="Ej: Ingeniero" className={inputCls} />
              </Field>
            </div>
          )}

          {step === 3 && resultado && (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <Icon name="check_circle" size={28} className="text-emerald-500" />
              </div>
              <p className="text-[15px] font-bold text-slate-900 dark:text-slate-100">Historia clínica lista</p>
              <p className="text-[12.5px] text-slate-500 dark:text-slate-400 max-w-xs">
                Se creó automáticamente la historia clínica con código único y estado activo.
              </p>
              <div className="w-full bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">Código historia</span>
                  <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{resultado.historia.codigo_historia}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">Estado</span>
                  <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{resultado.historia.estado}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">Fecha creación</span>
                  <span className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{fmtFecha(resultado.historia.fecha_creacion)}</span>
                </div>
              </div>
            </div>
          )}

      {error && (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <Icon name="warning" size={15} className="shrink-0" /> {error}
        </div>
      )}
    </ResponsiveSheet>
  );
}
