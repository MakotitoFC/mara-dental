import { Icon } from "@/components/ui/Icon";
import { calcEdad } from "@/lib/date-utils";
import { resolveTipoCita, tipoCitaVars, TIPO_CITA_LABEL } from "@/lib/colors";
import { StatTile, Card, Row, TagGroup, TagGroupPlain } from "../../../components/PatientInfoPrimitives";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Tab principal ────────────────────────────────────────────────────────────
// Layout en bloques de 2-3 columnas en desktop (1 columna en móvil), organizado
// por prioridad para un vistazo rápido del médico: resumen+contacto arriba,
// antecedentes médicos en 3 bloques al centro, actividad/notas recientes abajo.

export function InfoTab({
  paciente: p,
  historial,
  onNavigateTab,
}: {
  paciente: any;
  historial?: any[];
  onNavigateTab?: (tab: string) => void;
}) {
  const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(" ") || "—";
  const edad = p.fecha_nacimiento ? calcEdad(p.fecha_nacimiento) : null;
  const nacimiento = fmtDMY(p.fecha_nacimiento);
  const ant = p.antecedentes_estructurados || { cronicas: [], medicacion_habitual: [], quirurgicos: [] };
  const alergias: string[] = Array.isArray(p.alergias) ? p.alergias : [];

  const tieneContacto = has(p.telefono) || has(p.email) || has(p.direccion) || has(p.domicilio);
  const recientes = (historial ?? []).slice(0, 3);

  const extra: [string, string, string][] = [
    has(p.ocupacion) && ["work", "Ocupación", p.ocupacion],
    has(p.estado_civil) && ["heart", "Estado civil", p.estado_civil],
    has(p.grado_instruccion) && ["school", "Grado de instrucción", p.grado_instruccion],
    has(p.lugar_nacimiento) && ["location_on", "Lugar de nacimiento", p.lugar_nacimiento],
    has(p.lugar_procedencia) && ["pin_drop", "Procedencia", p.lugar_procedencia],
    has(p.religion) && ["church", "Religión", p.religion],
    has(p.raza) && ["person", "Raza", p.raza],
  ].filter(Boolean) as [string, string, string][];

  return (
    // Dos columnas independientes (no grid de filas iguales): cada una apila sus
    // tarjetas por su propio contenido, así una tarjeta corta no se estira para
    // igualar a una alta y no quedan espacios vacíos dentro de las tarjetas.
    // Columna izquierda = bloques grandes (resumen, notas). Columna derecha =
    // bloques medianos de tamaño similar entre sí (contacto, antecedentes...).
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <div className="flex flex-col gap-4 w-full lg:flex-1">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
          <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 mb-3">Resumen del paciente</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatTile icon="cake" label="Nacimiento" value={nacimiento ? nacimiento.split("/").slice(0, 2).join("/") : "—"} sub={edad !== null ? `${edad} años` : undefined} />
            <StatTile icon="person" label="Sexo" value={p.sexo || "—"} />
            <StatTile icon="bloodtype" label="Grupo sanguíneo" value={p.grupo_sanguineo || "—"} />
            <StatTile icon="badge" label="DNI" value={p.dni || "—"} />
          </div>
        </div>

        {extra.length > 0 && (
          <Card title="Datos Adicionales">
            {extra.map(([icon, label, value]) => (
              <Row key={label} icon={icon} label={label} value={value} />
            ))}
          </Card>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-bold text-slate-900 dark:text-slate-100">Notas clínicas recientes</h3>
            {recientes.length > 0 && (
              <button
                onClick={() => onNavigateTab?.("timeline")}
                className="text-[11.5px] font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300"
              >
                Ver todo →
              </button>
            )}
          </div>
          {recientes.length === 0 ? (
            <p className="text-[12.5px] text-slate-400 dark:text-slate-500 py-2">
              Aún no hay notas clínicas registradas. Se agregan al iniciar una consulta desde el Calendario.
            </p>
          ) : (
            <div className="flex flex-col">
              {recientes.map((h: any, i: number) => {
                const tipo = resolveTipoCita(h.motivo || "");
                const v = tipoCitaVars(tipo);
                return (
                  <div key={h.id ?? i} className="flex items-start gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
                    <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: v.solid }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] font-semibold text-slate-800 dark:text-slate-100 truncate">{h.motivo || TIPO_CITA_LABEL[tipo]}</p>
                        <span className="text-[10.5px] text-slate-400 dark:text-slate-500 shrink-0">{fmtDMY(h.fecha) ?? h.fecha}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-1">{h.doctor}</p>
                      {has(h.observaciones) && (
                        <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">{h.observaciones}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full lg:flex-1 lg:min-w-0 lg:max-w-md">
        <Card title="Contacto">
          {has(p.telefono) && <Row icon="phone" label="Teléfono" value={p.telefono} />}
          {has(p.email) && <Row icon="email" label="Email" value={p.email} />}
          {has(p.direccion) && <Row icon="location_on" label="Dirección" value={p.direccion} />}
          {has(p.domicilio) && <Row icon="location_on" label="Domicilio" value={p.domicilio} />}
          {!tieneContacto && (
            <p className="text-[12.5px] text-slate-400 dark:text-slate-500 py-2">Sin datos de contacto registrados.</p>
          )}
        </Card>

        <div className={`rounded-2xl border p-4 sm:p-5 ${alergias.length > 0 ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Icon name="warning_amber" size={16} className={alergias.length > 0 ? "text-rose-500 dark:text-rose-400" : "text-slate-300 dark:text-slate-600"} />
            <h3 className={`text-[13px] font-bold ${alergias.length > 0 ? "text-rose-800 dark:text-rose-300" : "text-slate-900 dark:text-slate-100"}`}>Alergias</h3>
          </div>
          {alergias.length === 0 ? (
            <p className="text-[12.5px] text-slate-400 dark:text-slate-500">Ninguna registrada</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {alergias.map((a) => (
                <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
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
          {has(p.enfermedad_actual) && (
            <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                Enfermedad actual / restricciones
              </p>
              <p className="text-[12.5px] text-slate-700 dark:text-slate-300 leading-relaxed">{p.enfermedad_actual}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
