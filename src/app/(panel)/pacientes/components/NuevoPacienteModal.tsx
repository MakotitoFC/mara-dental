"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Paciente } from "@/types/paciente";

function uid() { return "p" + Math.random().toString(36).slice(2, 9); }

interface Props {
  onClose: () => void;
  onGuardar: (p: Paciente) => void;
}

const GRUPOS = ["A+","A−","B+","B−","AB+","AB−","O+","O−"];

export function NuevoPacienteModal({ onClose, onGuardar }: Props) {
  const [nombre,     setNombre]     = useState("");
  const [apellido,   setApellido]   = useState("");
  const [dni,        setDni]        = useState("");
  const [fechaNac,   setFechaNac]   = useState("");
  const [telefono,   setTelefono]   = useState("");
  const [email,      setEmail]      = useState("");
  const [grupo,      setGrupo]      = useState("");

  // Alergias (chips)
  const [alergiasInput, setAlergiasInput] = useState("");
  const [alergias,      setAlergias]      = useState<string[]>([]);

  // Antecedentes (chips)
  const [antInput,  setAntInput]  = useState("");
  const [antecedentes, setAntecedentes] = useState<string[]>([]);

  function addChip(val: string, list: string[], setter: (l: string[]) => void, inputSetter: (s: string) => void) {
    const v = val.trim();
    if (v && !list.includes(v)) setter([...list, v]);
    inputSetter("");
  }
  function removeChip(val: string, list: string[], setter: (l: string[]) => void) {
    setter(list.filter((x) => x !== val));
  }

  const canSave = nombre.trim() && apellido.trim() && dni.trim() && telefono.trim() && fechaNac;

  function handleGuardar() {
    if (!canSave) return;
    const nuevo: Paciente = {
      id:               uid(),
      nombre:           `${nombre.trim()} ${apellido.trim()}`,
      dni:              dni.trim(),
      fecha_nacimiento: fechaNac,
      telefono:         telefono.trim(),
      email:            email.trim() || undefined,
      grupo_sanguineo:  grupo || undefined,
      alergias,
      antecedentes:     antecedentes,
      activo:           true,
    };
    onGuardar(nuevo);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 md:pb-4"
      style={{ background: "rgba(15,23,42,0.5)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full shadow-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: 600, maxHeight: "min(92vh, calc(100dvh - 96px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center">
              <Icon name="person_add" size={18} className="text-cyan-600" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-slate-900">Registrar nuevo paciente</p>
              <p className="text-[11px] text-slate-400">Completa los datos para crear la ficha</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50">
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5">
          <div className="flex flex-col gap-4">

            {/* Nombre + DNI */}
            <Section label="Datos personales">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nombre(s) *">
                  <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="María"
                    className="input"
                  />
                </Field>
                <Field label="Apellidos *">
                  <input
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    placeholder="González López"
                    className="input"
                  />
                </Field>
                <Field label="DNI / Cédula *">
                  <input
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    placeholder="12345678"
                    className="input"
                  />
                </Field>
                <Field label="Fecha de nacimiento *">
                  <input
                    type="date"
                    value={fechaNac}
                    onChange={(e) => setFechaNac(e.target.value)}
                    className="input"
                  />
                </Field>
                <Field label="Grupo sanguíneo">
                  <select
                    value={grupo}
                    onChange={(e) => setGrupo(e.target.value)}
                    className="input"
                  >
                    <option value="">— No especificado —</option>
                    {GRUPOS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
              </div>
            </Section>

            {/* Contacto */}
            <Section label="Contacto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Teléfono *">
                  <input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+51 987 000 000"
                    className="input"
                  />
                </Field>
                <Field label="Correo electrónico">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="paciente@email.com"
                    className="input"
                  />
                </Field>
              </div>
            </Section>

            {/* Alergias */}
            <Section label="Alergias conocidas">
              <ChipInput
                value={alergiasInput}
                chips={alergias}
                placeholder="Penicilina, Ibuprofeno…  ↵ Enter para agregar"
                color="#f97316"
                onChange={setAlergiasInput}
                onAdd={() => addChip(alergiasInput, alergias, setAlergias, setAlergiasInput)}
                onRemove={(v) => removeChip(v, alergias, setAlergias)}
              />
            </Section>

            {/* Antecedentes */}
            <Section label="Antecedentes médicos">
              <ChipInput
                value={antInput}
                chips={antecedentes}
                placeholder="Hipertensión, Diabetes…  ↵ Enter para agregar"
                color="#7c3aed"
                onChange={setAntInput}
                onAdd={() => addChip(antInput, antecedentes, setAntecedentes, setAntInput)}
                onRemove={(v) => removeChip(v, antecedentes, setAntecedentes)}
              />
            </Section>

            {/* Contacto de emergencia */}
            <Section label="Contacto de emergencia">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nombre del contacto">
                  <input placeholder="Ej: Juan González" className="input" />
                </Field>
                <Field label="Teléfono del contacto">
                  <input placeholder="+51 987 000 000" className="input" />
                </Field>
              </div>
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!canSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[12px] font-semibold transition-colors"
          >
            <Icon name="save" size={15} />
            Registrar paciente
          </button>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 0 3px rgba(6,182,212,0.12);
        }
      `}</style>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">{label}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function ChipInput({
  value, chips, placeholder, color,
  onChange, onAdd, onRemove,
}: {
  value: string;
  chips: string[];
  placeholder: string;
  color: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
          className="input flex-1"
        />
        <button
          onClick={onAdd}
          disabled={!value.trim()}
          className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-white disabled:opacity-40"
          style={{ background: color }}
        >
          <Icon name="add" size={14} />
        </button>
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: color + "18", color }}
            >
              {chip}
              <button onClick={() => onRemove(chip)} className="hover:opacity-70 ml-0.5">
                <Icon name="close" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
