"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { createPacienteAction } from "../../actions";

const GRUPOS_SANGUINEOS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const SEXOS             = ["Masculino", "Femenino", "Otro"];
const ESTADOS_CIVILES   = ["Soltero/a", "Casado/a", "Conviviente", "Viudo/a", "Divorciado/a"];
const GRADOS_INST       = ["Ninguna", "Primaria", "Secundaria", "Técnica", "Superior"];

export function NuevoPacienteForm() {
  const router = useRouter();

  // Datos generales
  const [nombre,           setNombre]           = useState("");
  const [apellido,         setApellido]         = useState("");
  const [dni,              setDni]              = useState("");
  const [fechaNac,         setFechaNac]         = useState("");
  const [sexo,             setSexo]             = useState("");
  const [estadoCivil,      setEstadoCivil]      = useState("");
  const [religion,         setReligion]         = useState("");

  // Contacto
  const [telefono,         setTelefono]         = useState("");
  const [email,            setEmail]            = useState("");
  const [direccion,        setDireccion]        = useState("");
  const [domicilio,        setDomicilio]        = useState("");
  const [lugarProc,        setLugarProc]        = useState("");
  const [lugarNac,         setLugarNac]         = useState("");
  const [raza,             setRaza]             = useState("");

  // Clínico
  const [grupoSanguineo,   setGrupo]            = useState("");
  const [ocupacion,        setOcupacion]        = useState("");
  const [gradoInst,        setGradoInst]        = useState("");
  const [enfermedadActual, setEnfermedad]       = useState("");

  // Chips
  const [alergiasInput,    setAlergiasInput]    = useState("");
  const [alergias,         setAlergias]         = useState<string[]>([]);
  // Antecedentes patológicos enriquecidos
  const [cronicasInput,    setCronicasInput]    = useState("");
  const [cronicas,         setCronicas]         = useState<string[]>([]);
  const [medInput,         setMedInput]         = useState("");
  const [medicacion,       setMedicacion]       = useState<string[]>([]);
  const [quirInput,        setQuirInput]        = useState("");
  const [quirurgicos,      setQuirurgicos]      = useState<string[]>([]);

  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hoy = new Date().toISOString().split("T")[0];
  const canSave = nombre.trim() && apellido.trim() && dni.trim() && telefono.trim() && fechaNac && !loading;

  function addChip(val: string, list: string[], setter: (l: string[]) => void, inputSetter: (s: string) => void) {
    const v = val.trim();
    if (v && !list.includes(v)) setter([...list, v]);
    inputSetter("");
  }
  function removeChip(val: string, list: string[], setter: (l: string[]) => void) {
    setter(list.filter((x) => x !== val));
  }

  async function handleGuardar() {
    if (!canSave) return;
    setLoading(true);
    setErrorMsg(null);

    const res = await createPacienteAction({
      nombre, apellido, dni,
      fecha_nacimiento:  fechaNac,
      telefono,
      email:             email             || undefined,
      sexo:              sexo              || undefined,
      lugar_nacimiento:  lugarNac          || undefined,
      raza:              raza              || undefined,
      direccion:         direccion         || undefined,
      domicilio:         domicilio         || undefined,
      lugar_procedencia: lugarProc         || undefined,
      ocupacion:         ocupacion         || undefined,
      religion:          religion          || undefined,
      grupo_sanguineo:   grupoSanguineo    || undefined,
      estado_civil:      estadoCivil       || undefined,
      grado_instruccion: gradoInst         || undefined,
      enfermedad_actual: enfermedadActual  || undefined,
      alergias,
      antecedentes: { cronicas, medicacion_habitual: medicacion, quirurgicos },
    });

    setLoading(false);

    if (res?.error) { setErrorMsg(res.error); return; }

    if (res?.id) router.push(`/pacientes/${res.id}`);
    else         router.push("/pacientes");
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* Sub-breadcrumb */}
      <div className="flex items-center px-5 sm:px-6 md:px-8 py-3 border-b border-slate-200 bg-white">
        <button onClick={() => router.push("/pacientes")} className="text-[13px] text-slate-400 hover:text-slate-700 font-medium transition-colors">
          Pacientes
        </button>
        <Icon name="chevron_right" size={16} className="text-slate-300 mx-1 shrink-0" />
        <span className="text-[13px] font-semibold text-slate-800">Nuevo paciente</span>
      </div>

      {/* Formulario */}
      <div className="p-5 sm:p-6 md:p-8 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Columna 1: Información general ── */}
          <FormCard title="Información general" icon="person">
            <FormField label="Nombre(s) *">
              <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="María" className="inp" />
            </FormField>
            <FormField label="Apellidos *">
              <input value={apellido} onChange={e => setApellido(e.target.value)} placeholder="González López" className="inp" />
            </FormField>
            <FormField label="DNI / Cédula *">
              <input value={dni} onChange={e => setDni(e.target.value)} placeholder="12345678" className="inp" />
            </FormField>
            <FormField label="Fecha de nacimiento *">
              <input type="date" value={fechaNac} max={hoy} onChange={e => setFechaNac(e.target.value)} className="inp" />
            </FormField>
            <FormField label="Sexo">
              <select value={sexo} onChange={e => setSexo(e.target.value)} className="inp">
                <option value="">— Seleccionar —</option>
                {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Estado civil">
              <select value={estadoCivil} onChange={e => setEstadoCivil(e.target.value)} className="inp">
                <option value="">— Seleccionar —</option>
                {ESTADOS_CIVILES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Religión">
              <input value={religion} onChange={e => setReligion(e.target.value)} placeholder="Católica, Evangélica…" className="inp" />
            </FormField>
          </FormCard>

          {/* ── Columna 2: Contacto ── */}
          <FormCard title="Contacto y domicilio" icon="home">
            <FormField label="Teléfono *">
              <input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+51 987 000 000" className="inp" />
            </FormField>
            <FormField label="Correo electrónico">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="paciente@email.com" className="inp" />
            </FormField>
            <FormField label="Dirección">
              <input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Av. Principal 123" className="inp" />
            </FormField>
            <FormField label="Domicilio">
              <input value={domicilio} onChange={e => setDomicilio(e.target.value)} placeholder="Urb. Los Pinos Mz. A Lt. 5" className="inp" />
            </FormField>
            <FormField label="Lugar de procedencia">
              <input value={lugarProc} onChange={e => setLugarProc(e.target.value)} placeholder="Lima, Cusco…" className="inp" />
            </FormField>
            <FormField label="Lugar de nacimiento">
              <input value={lugarNac} onChange={e => setLugarNac(e.target.value)} placeholder="Arequipa…" className="inp" />
            </FormField>
            <FormField label="Raza / Etnia">
              <input value={raza} onChange={e => setRaza(e.target.value)} placeholder="Mestizo/a…" className="inp" />
            </FormField>
          </FormCard>

          {/* ── Columna 3: Clínico ── */}
          <FormCard title="Información clínica" icon="medical_services">
            <FormField label="Grupo sanguíneo">
              <select value={grupoSanguineo} onChange={e => setGrupo(e.target.value)} className="inp">
                <option value="">— No especificado —</option>
                {GRUPOS_SANGUINEOS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>
            <FormField label="Ocupación">
              <input value={ocupacion} onChange={e => setOcupacion(e.target.value)} placeholder="Docente, Ingeniero…" className="inp" />
            </FormField>
            <FormField label="Grado de instrucción">
              <select value={gradoInst} onChange={e => setGradoInst(e.target.value)} className="inp">
                <option value="">— Seleccionar —</option>
                {GRADOS_INST.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </FormField>

            <FormField label="Alergias">
              <ChipInput
                value={alergiasInput}
                chips={alergias}
                placeholder="Penicilina… ↵ Enter"
                chipClass="bg-orange-50 text-orange-700 border border-orange-100"
                onChange={setAlergiasInput}
                onAdd={() => addChip(alergiasInput, alergias, setAlergias, setAlergiasInput)}
                onRemove={v => removeChip(v, alergias, setAlergias)}
              />
            </FormField>

            <FormField label="Enfermedades crónicas">
              <ChipInput
                value={cronicasInput}
                chips={cronicas}
                placeholder="Hipertensión, Diabetes… ↵ Enter"
                chipClass="bg-rose-50 text-rose-700 border border-rose-100"
                onChange={setCronicasInput}
                onAdd={() => addChip(cronicasInput, cronicas, setCronicas, setCronicasInput)}
                onRemove={v => removeChip(v, cronicas, setCronicas)}
              />
            </FormField>

            <FormField label="Medicación habitual">
              <ChipInput
                value={medInput}
                chips={medicacion}
                placeholder="Enalapril 10 mg… ↵ Enter"
                chipClass="bg-cyan-50 text-cyan-700 border border-cyan-100"
                onChange={setMedInput}
                onAdd={() => addChip(medInput, medicacion, setMedicacion, setMedInput)}
                onRemove={v => removeChip(v, medicacion, setMedicacion)}
              />
            </FormField>

            <FormField label="Antecedentes quirúrgicos">
              <ChipInput
                value={quirInput}
                chips={quirurgicos}
                placeholder="Apendicectomía 2010… ↵ Enter"
                chipClass="bg-violet-50 text-violet-700 border border-violet-100"
                onChange={setQuirInput}
                onAdd={() => addChip(quirInput, quirurgicos, setQuirurgicos, setQuirInput)}
                onRemove={v => removeChip(v, quirurgicos, setQuirurgicos)}
              />
            </FormField>

            <FormField label="Enfermedad actual">
              <textarea
                value={enfermedadActual}
                onChange={e => setEnfermedad(e.target.value)}
                placeholder="Describa la enfermedad o motivo de consulta actual…"
                rows={3}
                className="inp resize-none"
              />
            </FormField>
          </FormCard>
        </div>

        {/* Acciones — dentro del contenido */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex-1">
            {errorMsg && (
              <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                <Icon name="warning" size={15} className="shrink-0" />
                {errorMsg}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => router.push("/pacientes")}
              className="px-4 py-2 text-[13px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={!canSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors"
            >
              <Icon name="person_add" size={16} />
              {loading ? "Registrando…" : "Registrar paciente"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .inp {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          outline: none;
          background: white;
          color: #1e293b;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .inp:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6,182,212,0.12);
        }
        .inp::placeholder { color: #94a3b8; }
      `}</style>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FormCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
          <Icon name={icon} size={15} className="text-cyan-600" />
        </div>
        <p className="text-[13px] font-semibold text-slate-800">{title}</p>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function ChipInput({ value, chips, placeholder, chipClass, onChange, onAdd, onRemove }: {
  value: string; chips: string[]; placeholder: string; chipClass: string;
  onChange: (v: string) => void; onAdd: () => void; onRemove: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
          className="inp flex-1"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!value.trim()}
          className="px-3 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 transition-colors"
        >
          <Icon name="add" size={16} />
        </button>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map(chip => (
            <span key={chip} className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${chipClass}`}>
              {chip}
              <button type="button" onClick={() => onRemove(chip)} className="hover:opacity-70 ml-0.5">
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
