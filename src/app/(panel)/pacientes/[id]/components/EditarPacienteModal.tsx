"use client";

import { useState, useMemo } from "react";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { useToast } from "@/components/ui/Toast";
import { updatePacienteAction } from "../actions";

const GRUPOS_SANGUINEOS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];
const SEXOS = ["Masculino", "Femenino"];
const ESTADOS_CIVILES = ["Soltero/a", "Casado/a", "Conviviente", "Viudo/a", "Divorciado/a"];
const GRADOS_INSTRUCCION = [
  "No especifica",
  "Primaria",
  "Secundaria",
  "Técnico",
  "Superior",
];
const RAZAS_PREDEFINIDAS = [
  "No especifica",
  "Mestizo",
  "Caucásico",
  "Afrodescendiente",
  "Indígena / Nativo",
  "Asiático",
];

const SEXO_OPTIONS = SEXOS.map((s) => ({ value: s, label: s }));
const GRUPO_OPTIONS = GRUPOS_SANGUINEOS.map((g) => ({ value: g, label: g }));
const ESTADO_CIVIL_OPTIONS = ESTADOS_CIVILES.map((s) => ({ value: s, label: s }));
const GRADO_INSTRUCCION_OPTIONS = GRADOS_INSTRUCCION.map((g) => ({ value: g, label: g }));
const RAZA_OPTIONS = [
  ...RAZAS_PREDEFINIDAS.map((r) => ({ value: r, label: r })),
  { value: "Otro", label: "Otro" },
];

export interface ContactoItem {
  id?: string;
  nombre: string;
  apellido: string;
  dni?: string;
  telefono: string;
  tipo_contacto: "emergencia" | "apoderado";
  email?: string;
}

const inputCls = "w-full border border-slate-200 bg-white text-slate-800 rounded-xl px-3 py-2 text-[16px] sm:text-[13px] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-colors";

function LimitedTextInput({
  value,
  onChange,
  maxLength = 30,
  placeholder,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const isNearLimit = value.length >= maxLength - 3 && value.length < maxLength;
  const isAtLimit = value.length >= maxLength;

  return (
    <div className="flex flex-col">
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputCls} ${isAtLimit ? "border-amber-400 focus:border-amber-500 focus:ring-amber-100" : ""} ${className || ""}`}
      />
      <div className="flex items-center justify-between mt-1 px-1">
        {isAtLimit ? (
          <span className="text-[11px] text-amber-600 font-medium">Límite alcanzado (máx. {maxLength} caracteres)</span>
        ) : isNearLimit ? (
          <span className="text-[11px] text-amber-500 font-medium">Quedan {maxLength - value.length} caracteres</span>
        ) : (
          <span />
        )}
        <span className={`text-[10px] font-mono ml-auto ${isAtLimit ? "text-amber-600 font-bold" : "text-slate-400"}`}>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  );
}

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
  onSaved: (updatedData: any) => void;
}) {
  const toast = useToast();
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
  const [domicilio, setDomicilio] = useState(p.domicilio ?? "");
  const [lugarNacimiento, setLugarNacimiento] = useState(p.lugar_nacimiento ?? "");
  const [lugarProcedencia, setLugarProcedencia] = useState(p.lugar_procedencia ?? "");
  const [ocupacion, setOcupacion] = useState(p.ocupacion ?? "");
  const [estadoCivil, setEstadoCivil] = useState(p.estado_civil ?? "");

  const [contactos, setContactos] = useState<ContactoItem[]>(
    Array.isArray(p.contactos)
      ? p.contactos.map((c: any) => ({
          id: c.id,
          nombre: c.nombre ?? "",
          apellido: c.apellido ?? "",
          dni: c.dni ?? "",
          telefono: c.telefono ?? "",
          tipo_contacto: c.tipo_contacto === "apoderado" ? "apoderado" : "emergencia",
          email: c.email ?? "",
        }))
      : []
  );

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isPatientEmailInvalid = Boolean(email.trim() && !emailRegex.test(email.trim()));

  const hasInvalidContactEmail = contactos.some(
    (c) => Boolean(c.email && c.email.trim() && !emailRegex.test(c.email.trim()))
  );
  const hasIncompleteContact = contactos.some(
    (c) => !c.nombre.trim() || !c.apellido.trim() || !c.telefono.trim()
  );

  function handleAddContacto() {
    setContactos((prev) => [
      ...prev,
      {
        nombre: "",
        apellido: "",
        dni: "",
        telefono: "",
        tipo_contacto: "emergencia",
        email: "",
      },
    ]);
  }

  function updateContacto(index: number, field: keyof ContactoItem, value: any) {
    setContactos((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function removeContacto(index: number) {
    setContactos((prev) => prev.filter((_, i) => i !== index));
  }

  const [gradoInstruccion, setGradoInstruccion] = useState(p.grado_instruccion ?? "");
  const gradoOptions = useMemo(() => {
    if (gradoInstruccion && !GRADOS_INSTRUCCION.includes(gradoInstruccion)) {
      return [{ value: gradoInstruccion, label: gradoInstruccion }, ...GRADO_INSTRUCCION_OPTIONS];
    }
    return GRADO_INSTRUCCION_OPTIONS;
  }, [gradoInstruccion]);

  const initialRaza = (p.raza ?? "").trim();
  const isPredefinedRaza = RAZAS_PREDEFINIDAS.includes(initialRaza);
  const [razaSelect, setRazaSelect] = useState(
    initialRaza ? (isPredefinedRaza ? initialRaza : "Otro") : ""
  );
  const [razaOtro, setRazaOtro] = useState(
    initialRaza && !isPredefinedRaza ? initialRaza : ""
  );

  const [religion, setReligion] = useState(p.religion ?? "");
  const [grupoSanguineo, setGrupo] = useState(p.grupo_sanguineo ?? "");
  const [enfermedadInput, setEnfermedadInput] = useState("");
  const [enfermedadActual, setEnfermedadActual] = useState<string[]>(Array.isArray(p.enfermedad_actual) ? p.enfermedad_actual : []);
  const [restriccionInput, setRestriccionInput] = useState("");
  const [restriccionesClinicas, setRestriccionesClinicas] = useState<string[]>(Array.isArray(p.restricciones_clinicas) ? p.restricciones_clinicas : []);

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

  const isExceeded =
    ocupacion.length > 30 ||
    lugarNacimiento.length > 30 ||
    lugarProcedencia.length > 30 ||
    religion.length > 30 ||
    (razaSelect === "Otro" && razaOtro.length > 30) ||
    gradoInstruccion.length > 15;

  const canSave = Boolean(
    nombre.trim() &&
    apellido.trim() &&
    dni.trim() &&
    fechaNac &&
    telefono.trim() &&
    !isExceeded &&
    !isPatientEmailInvalid &&
    !hasInvalidContactEmail &&
    !hasIncompleteContact
  );

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

    const finalRaza = (razaSelect === "Otro" ? razaOtro.trim() : razaSelect.trim()) || undefined;

    const validationErrors: string[] = [];
    if (ocupacion.length > 30) validationErrors.push("El campo ocupación no puede superar los 30 caracteres.");
    if (lugarNacimiento.length > 30) validationErrors.push("El lugar de nacimiento no puede superar los 30 caracteres.");
    if (lugarProcedencia.length > 30) validationErrors.push("El lugar donde reside actualmente no puede superar los 30 caracteres.");
    if (religion.length > 30) validationErrors.push("El campo religión no puede superar los 30 caracteres.");
    if (finalRaza && finalRaza.length > 30) validationErrors.push("El campo raza no puede superar los 30 caracteres.");
    if (gradoInstruccion.length > 15) validationErrors.push("El grado de instrucción no puede superar los 15 caracteres.");

    if (isPatientEmailInvalid) {
      validationErrors.push("El correo electrónico del paciente no tiene un formato válido.");
    }
    if (hasInvalidContactEmail) {
      validationErrors.push("Uno o más contactos tienen un correo electrónico con formato inválido.");
    }
    if (hasIncompleteContact) {
      validationErrors.push("Todos los contactos deben incluir nombre, apellido y teléfono.");
    }

    if (validationErrors.length > 0) {
      setSaving(false);
      setError(validationErrors[0]);
      toast.error(validationErrors[0], { title: "Error de validación" });
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.trim(),
      fecha_nacimiento: fechaNac,
      telefono: telefono.trim(),
      email: email.trim() || undefined,
      sexo: sexo || undefined,
      lugar_nacimiento: lugarNacimiento.trim() || undefined,
      raza: finalRaza,
      direccion: direccion.trim() || undefined,
      domicilio: domicilio.trim() || undefined,
      lugar_procedencia: lugarProcedencia.trim() || undefined,
      ocupacion: ocupacion.trim() || undefined,
      religion: religion.trim() || undefined,
      grupo_sanguineo: grupoSanguineo || undefined,
      estado_civil: estadoCivil || undefined,
      grado_instruccion: gradoInstruccion.trim() || undefined,
      enfermedad_actual: enfermedadActual,
      restricciones_clinicas: restriccionesClinicas,
      alergias,
      antecedentes: { cronicas, medicacion_habitual: medicacion, quirurgicos },
      contactos: contactos.map((c) => ({
        id: c.id,
        nombre: c.nombre.trim(),
        apellido: c.apellido.trim(),
        dni: c.dni?.trim() || undefined,
        telefono: c.telefono.trim(),
        tipo_contacto: c.tipo_contacto,
        email: c.email?.trim() || undefined,
      })),
    };

    const res = await updatePacienteAction(String(p.id), payload);
    setSaving(false);

    if ("error" in res && res.error) {
      setError(res.error);
      toast.error(res.error, { title: "Error al actualizar" });
      return;
    }

    toast.success("Información del paciente actualizada correctamente.", { title: "¡Guardado!" });
    
    // Objeto estructurado para actualizar reactivamente la vista local
    const updatedPatientData = {
      ...p,
      ...payload,
      contactos: payload.contactos,
      antecedentes_estructurados: payload.antecedentes,
      antecedentes: cronicas,
    };

    onSaved(updatedPatientData);
    onClose();
  }

  return (
    <ResponsiveSheet
      onClose={onClose}
      title="Editar paciente"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3">
 <button onClick={onClose} className="px-4 py-2 text-[13px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!canSave || saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[13px] font-semibold transition-colors cursor-pointer"
          >
            <Icon name="check" size={15} /> {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Datos personales y contacto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre *">
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Apellido *">
                <input value={apellido} onChange={(e) => setApellido(e.target.value)} className={inputCls} />
              </Field>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="DNI *">
                <input value={dni} onChange={(e) => setDni(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Fecha de nacimiento *">
                <DatePicker value={fechaNac} max={hoy} onChange={setFechaNac} />
              </Field>
              <Field label="Sexo">
                <Select value={sexo} onChange={setSexo} options={SEXO_OPTIONS} placeholder="— Seleccionar —" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Teléfono *">
                <input value={telefono} onChange={(e) => setTelefono(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${inputCls} ${isPatientEmailInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                  placeholder="ejemplo@correo.com"
                />
                {isPatientEmailInvalid && (
                  <span className="text-[11px] text-red-500 font-medium">Formato de correo inválido (ej: usuario@dominio.com)</span>
                )}
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Dirección">
                <input value={direccion} onChange={(e) => setDireccion(e.target.value)} className={inputCls} placeholder="Ej. Av. Principal 123" />
              </Field>
              <Field label="Referencia">
                <input value={domicilio} onChange={(e) => setDomicilio(e.target.value)} className={inputCls} placeholder="Ej. Dpto / Frente al parque" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Lugar de nacimiento">
                <LimitedTextInput value={lugarNacimiento} onChange={setLugarNacimiento} maxLength={30} placeholder="Ciudad / Provincia" />
              </Field>
              <Field label="Lugar donde reside actualmente">
                <LimitedTextInput value={lugarProcedencia} onChange={setLugarProcedencia} maxLength={30} placeholder="Lugar donde reside actualmente" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Ocupación">
                <LimitedTextInput value={ocupacion} onChange={setOcupacion} maxLength={30} placeholder="Ocupación actual" />
              </Field>
              <Field label="Estado civil">
                <Select value={estadoCivil} onChange={setEstadoCivil} options={ESTADO_CIVIL_OPTIONS} placeholder="— Seleccionar —" />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Grado de instrucción">
                <Select value={gradoInstruccion} onChange={setGradoInstruccion} options={gradoOptions} placeholder="— Seleccionar —" />
              </Field>
              <Field label="Raza">
                <Select value={razaSelect} onChange={setRazaSelect} options={RAZA_OPTIONS} placeholder="— Seleccionar —" />
                {razaSelect === "Otro" && (
                  <div className="mt-1.5">
                    <LimitedTextInput
                      value={razaOtro}
                      onChange={setRazaOtro}
                      maxLength={30}
                      placeholder="Especificar raza / etnia"
                    />
                  </div>
                )}
              </Field>
              <Field label="Religión">
                <LimitedTextInput value={religion} onChange={setReligion} maxLength={30} placeholder="Religión" />
              </Field>
            </div>
          </div>

          {/* Sección Contactos de emergencia y apoderados */}
          <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Contactos de emergencia y apoderados</p>
                <p className="text-[11.5px] text-slate-500">Personas de contacto o apoderados vinculados al paciente</p>
              </div>
              <button
                type="button"
                onClick={handleAddContacto}
                className="flex items-center gap-1 px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 rounded-xl text-[12px] font-semibold transition-colors cursor-pointer"
              >
                <Icon name="add" size={14} /> Añadir contacto
              </button>
            </div>

            {contactos.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                <p className="text-[12px] text-slate-400">Sin contactos adicionales registrados.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {contactos.map((c, idx) => {
                  const isContactEmailInvalid = Boolean(c.email && c.email.trim() && !emailRegex.test(c.email.trim()));
                  return (
                    <div key={c.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col gap-3 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Icon name={c.tipo_contacto === "apoderado" ? "supervisor_account" : "emergency"} size={16} className={c.tipo_contacto === "apoderado" ? "text-cyan-600" : "text-amber-600"} />
                          Contacto #{idx + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[11px] font-medium">
                            <button
                              type="button"
                              onClick={() => updateContacto(idx, "tipo_contacto", "emergencia")}
                              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${c.tipo_contacto === "emergencia" ? "bg-amber-100 text-amber-800 font-bold" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              Emergencia
                            </button>
                            <button
                              type="button"
                              onClick={() => updateContacto(idx, "tipo_contacto", "apoderado")}
                              className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${c.tipo_contacto === "apoderado" ? "bg-cyan-100 text-cyan-800 font-bold" : "text-slate-500 hover:text-slate-700"}`}
                            >
                              Apoderado
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeContacto(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Eliminar contacto"
                          >
                            <Icon name="delete" size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <Field label="Nombre *">
                          <input
                            value={c.nombre}
                            onChange={(e) => updateContacto(idx, "nombre", e.target.value)}
                            placeholder="Nombre del contacto"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Apellido *">
                          <input
                            value={c.apellido}
                            onChange={(e) => updateContacto(idx, "apellido", e.target.value)}
                            placeholder="Apellido del contacto"
                            className={inputCls}
                          />
                        </Field>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <Field label="Teléfono *">
                          <input
                            value={c.telefono}
                            onChange={(e) => updateContacto(idx, "telefono", e.target.value)}
                            placeholder="Teléfono o celular"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="DNI">
                          <input
                            value={c.dni || ""}
                            onChange={(e) => updateContacto(idx, "dni", e.target.value)}
                            placeholder="DNI / Documento"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            type="email"
                            value={c.email || ""}
                            onChange={(e) => updateContacto(idx, "email", e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className={`${inputCls} ${isContactEmailInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`}
                          />
                          {isContactEmailInvalid && (
                            <span className="text-[10px] text-red-500 font-medium">Correo inválido</span>
                          )}
                        </Field>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

 <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Datos médicos y antecedentes</p>
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
 chipClass="bg-red-50 text-red-700 border border-red-100"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ChipField
                label="Enfermedad actual" placeholder="Ej: Dolor dental" chips={enfermedadActual} input={enfermedadInput}
 chipClass="bg-blue-50 text-blue-700 border border-blue-100"
                onInputChange={setEnfermedadInput}
                onAdd={() => addChip(enfermedadInput, enfermedadActual, setEnfermedadActual, setEnfermedadInput)}
                onRemove={(v) => removeChip(v, enfermedadActual, setEnfermedadActual)}
              />
              <ChipField
                label="Restricciones clínicas" placeholder="Ej: No usar anestesia X" chips={restriccionesClinicas} input={restriccionInput}
 chipClass="bg-red-50 text-red-700 border border-red-100"
                onInputChange={setRestriccionInput}
                onAdd={() => addChip(restriccionInput, restriccionesClinicas, setRestriccionesClinicas, setRestriccionInput)}
                onRemove={(v) => removeChip(v, restriccionesClinicas, setRestriccionesClinicas)}
              />
            </div>
          </div>

          {error && (
 <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              <Icon name="warning" size={15} className="shrink-0" /> {error}
            </div>
          )}
      </div>
    </ResponsiveSheet>
  );
}
