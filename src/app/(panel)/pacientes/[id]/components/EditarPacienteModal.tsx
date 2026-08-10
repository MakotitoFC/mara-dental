"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { updatePacienteAction } from "../actions";

const GRUPOS_SANGUINEOS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const SEXOS = ["Masculino", "Femenino"];
const ESTADOS_CIVILES = ["Soltero/a", "Casado/a", "Conviviente", "Viudo/a", "Divorciado/a"];
const SEXO_OPTIONS = SEXOS.map((s) => ({ value: s, label: s }));
const GRUPO_OPTIONS = GRUPOS_SANGUINEOS.map((g) => ({ value: g, label: g }));
const ESTADO_CIVIL_OPTIONS = ESTADOS_CIVILES.map((s) => ({ value: s, label: s }));

const inputCls = "w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-900/40 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[12px] font-semibold text-slate-700">{label}</label>
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
        <button type="button" onClick={onAdd} disabled={!input.trim()}
          className="px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 text-[12px] font-semibold transition-colors">
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

export function EditarPacienteModal({ paciente: p, onClose, onSaved }: {
  paciente: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [nombre, setNombre] = useState(p.nombre ?? "");
  const [apellido, setApellido] = useState(p.apellido ?? "");
  const [dni, setDni] = useState(p.dni ?? "");
  const [fechaNac, setFechaNac] = useState(p.fecha_nacimiento ?? "");
  const [sexo, setSexo] = useState(p.sexo ?? "");
  const [telefono, setTelefono] = useState(p.telefono ?? "");
  const [email, setEmail] = useState(p.email ?? "");
  const [direccion, setDireccion] = useState(p.direccion ?? "");
  const [ocupacion, setOcupacion] = useState(p.ocupacion ?? "");
  const [estadoCivil, setEstadoCivil] = useState(p.estado_civil ?? "");
  const [grupoSanguineo, setGrupo] = useState(p.grupo_sanguineo ?? "");
  const [enfermedadActual, setEnfermedadActual] = useState(p.enfermedad_actual ?? "");

  const antIni = p.antecedentes_estructurados || { cronicas: [], medicacion_habitual: [], quirurgicos: [] };
  const [alergiasInput, setAlergiasInput] = useState("");
  const [alergias, setAlergias] = useState<string[]>(Array.isArray(p.alergias) ? p.alergias : []);
  const [cronicasInput, setCronicasInput] = useState("");
  const [cronicas, setCronicas] = useState<string[]>(antIni.cronicas || []);
  const [medInput, setMedInput] = useState("");
  const [medicacion, setMedicacion] = useState<string[]>(antIni.medicacion_habitual || []);
  const [quirInput, setQuirInput] = useState("");
  const [quirurgicos, setQuirurgicos] = useState<string[]>(antIni.quirurgicos || []);

  const hoy = new Date().toISOString().split("T")[0];
  const canSave = Boolean(nombre.trim() && apellido.trim() && dni.trim() && fechaNac && telefono.trim());

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
    const res = await updatePacienteAction(String(p.id), {
      nombre, apellido, dni,
      fecha_nacimiento: fechaNac,
      telefono,
      email: email || undefined,
      sexo: sexo || undefined,
      direccion: direccion || undefined,
      ocupacion: ocupacion || undefined,
      estado_civil: estadoCivil || undefined,
      grupo_sanguineo: grupoSanguineo || undefined,
      enfermedad_actual: enfermedadActual || undefined,
      alergias,
      antecedentes: { cronicas, medicacion_habitual: medicacion, quirurgicos },
    });
    setSaving(false);
    if ("error" in res) { setError(res.error ?? "Ocurrió un error"); return; }
    onSaved();
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Editar paciente"
      maxWidthDesktop="640px"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!canSave || saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors"
          >
            <Icon name="check" size={15} /> {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Datos personales</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nombre *">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Apellido *">
                <input value={apellido} onChange={(e) => setApellido(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="DNI *">
              <input value={dni} onChange={(e) => setDni(e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha de nacimiento *">
                <DatePicker value={fechaNac} max={hoy} onChange={setFechaNac} />
              </Field>
              <Field label="Sexo">
                <Select value={sexo} onChange={setSexo} options={SEXO_OPTIONS} placeholder="— Seleccionar —" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Teléfono *">
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Email">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Dirección">
              <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ocupación">
                <input value={ocupacion} onChange={(e) => setOcupacion(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Estado civil">
                <Select value={estadoCivil} onChange={setEstadoCivil} options={ESTADO_CIVIL_OPTIONS} placeholder="— Seleccionar —" />
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Datos médicos</p>
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
              label="Enfermedades crónicas" placeholder="Ej: Hipertensión" chips={cronicas} input={cronicasInput}
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
            <ChipField
              label="Antecedentes quirúrgicos" placeholder="Ej: Apendicectomía" chips={quirurgicos} input={quirInput}
              chipClass="bg-violet-50 text-violet-700 border border-violet-100"
              onInputChange={setQuirInput}
              onAdd={() => addChip(quirInput, quirurgicos, setQuirurgicos, setQuirInput)}
              onRemove={(v) => removeChip(v, quirurgicos, setQuirurgicos)}
            />
            <Field label="Enfermedad actual / restricciones">
              <textarea value={enfermedadActual} onChange={(e) => setEnfermedadActual(e.target.value)} rows={2}
                className={`${inputCls} resize-none`} />
            </Field>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-[12px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2">
              <Icon name="warning" size={15} className="shrink-0" /> {error}
            </div>
          )}
      </div>
    </ResponsiveSheet>
  );
}
