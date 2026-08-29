"use client";

import { Icon } from "@/components/ui/Icon";
import { calcEdad } from "@/lib/date-utils";
import { StatTile, Card, Row, TagGroup, TagGroupPlain } from "../../../components/PatientInfoPrimitives";

function has(v: unknown): v is string {
  return v !== null && v !== undefined && v !== "";
}

function fmtDMY(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-PE");
  } catch {
    return iso;
  }
}

export function InfoTab({
  paciente: p,
  historial,
  datosCasos,
  onNavigateTab,
}: {
  paciente: any;
  historial?: any[];
  datosCasos?: any;
  onNavigateTab?: (tab: string) => void;
}) {
  const edad = p.fecha_nacimiento ? calcEdad(p.fecha_nacimiento) : null;
  const nacimiento = fmtDMY(p.fecha_nacimiento);
  const ant = p.antecedentes_estructurados || { cronicas: [], medicacion_habitual: [], quirurgicos: [] };
  const alergias: string[] = Array.isArray(p.alergias) ? p.alergias : [];
  const recientes = (datosCasos?.casos ?? []).slice(0, 3);

  const datosDemograficos: [string, string, string | undefined][] = [
    ["work", "Ocupación", p.ocupacion],
    ["favorite", "Estado civil", p.estado_civil],
    ["school", "Grado de instrucción", p.grado_instruccion],
    ["location_on", "Lugar de nacimiento", p.lugar_nacimiento],
    ["pin_drop", "Procedencia", p.lugar_procedencia],
    ["church", "Religión", p.religion],
    ["person", "Raza", p.raza],
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start pb-6">
      {/* Columna Izquierda: Resumen, Datos Personales y Notas */}
      <div className="flex flex-col gap-4 w-full lg:flex-1">
 <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
 <h3 className="text-[13px] font-bold text-slate-900 mb-3">Resumen del paciente</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatTile icon="cake" label="Nacimiento" value={nacimiento || "—"} sub={edad !== null ? `${edad} años` : undefined} />
            <StatTile icon="person" label="Sexo" value={p.sexo || "—"} />
            <StatTile icon="bloodtype" label="Grupo sanguíneo" value={p.grupo_sanguineo || "—"} />
            <StatTile icon="badge" label="DNI" value={p.dni || "—"} />
          </div>
        </div>

        <Card title="Información Personal y Demográfica">
          {datosDemograficos.map(([icon, label, value]) => (
            <Row key={label} icon={icon} label={label} value={has(value) ? value : "—"} />
          ))}
        </Card>

 <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
 <h3 className="text-[13px] font-bold text-slate-900">Notas clínicas recientes</h3>
            {recientes.length > 0 && (
              <button
                onClick={() => onNavigateTab?.("timeline")}
 className="text-[11.5px] font-semibold text-cyan-600 hover:text-cyan-700 cursor-pointer"
              >
                Ver todo →
              </button>
            )}
          </div>
          {recientes.length === 0 ? (
 <p className="text-[12.5px] text-slate-400 py-2">
              Aún no hay notas clínicas registradas. Se agregan al iniciar una consulta.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {recientes.map((c: any) => {
                const date = fmtDMY(c.created_at) || c.created_at;
                return (
 <div key={c.id} className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
 <p className="text-[13px] font-semibold text-slate-800 truncate">
                          {c.titulo}
                        </p>
 <span className="text-[10.5px] text-slate-400 shrink-0">{date}</span>
                      </div>
                      <div className="flex items-center justify-between">
 <p className="text-[11.5px] text-slate-500">{c.consultas?.length || 0} consulta{(c.consultas?.length || 0) !== 1 &&"s"}</p>
 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.estado === "abierto" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                          {c.estado === "abierto" ? "En curso" : "Finalizado"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Columna Derecha: Contacto, Alergias, Medicación y Antecedentes */}
      <div className="flex flex-col gap-4 w-full lg:flex-1 lg:min-w-0 lg:max-w-md">
        <Card title="Contacto">
          <Row icon="phone" label="Teléfono" value={has(p.telefono) ? p.telefono : "—"} />
          <Row icon="email" label="Email" value={has(p.email) ? p.email : "—"} />
          <Row icon="location_on" label="Dirección" value={has(p.direccion) ? p.direccion : "—"} />
          <Row icon="home" label="Domicilio" value={has(p.domicilio) ? p.domicilio : "—"} />
        </Card>

 <div className="rounded-2xl border border-slate-200 p-4 sm:p-5 bg-white">
          <div className="flex items-center gap-2 mb-2">
 <Icon name="warning_amber" size={16} className="text-slate-300" />
 <h3 className="text-[13px] font-bold text-slate-900">Alergias</h3>
          </div>
          {alergias.length === 0 ? (
 <p className="text-[12.5px] text-slate-400">Ninguna registrada</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {alergias.map((a) => (
                <span key={a} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full text-red-600 border border-red-200">
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>

        <Card title="Medicación habitual">
          <TagGroupPlain items={ant.medicacion_habitual} color="violet" />
        </Card>

        <Card title="Antecedentes clínicos">
          <TagGroup label="Enfermedades crónicas" items={ant.cronicas} color="cyan" />
          <TagGroup label="Antecedentes quirúrgicos" items={ant.quirurgicos} color="amber" />
          <TagGroup label="Enfermedad actual" items={Array.isArray(p.enfermedad_actual) ? p.enfermedad_actual : []} color="blue" />
          <TagGroup label="Restricciones clínicas" items={Array.isArray(p.restricciones_clinicas) ? p.restricciones_clinicas : []} color="rose" />
        </Card>
      </div>
    </div>
  );
}
