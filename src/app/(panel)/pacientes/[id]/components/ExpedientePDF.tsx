"use client";

import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer";

Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Medium.ttf", fontWeight: 500 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});
Font.register({
  family: "JetBrains Mono",
  fonts: [
    { src: "/fonts/JetBrainsMono-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/JetBrainsMono-Bold.ttf", fontWeight: 700 },
  ],
});

const ACCENT = "#0891b2";
const ACCENT_BG = "#E6F5F7";
const INK = "#1E293B";
const MUTED = "#64748B";
const FAINT = "#94A3B8";
const LINE = "#E2E8F0";
const RED = "#DC2626";
const RED_BG = "#FEE2E2";
const AMBER = "#B45309";
const AMBER_BG = "#FEF3C7";
const GREEN = "#059669";
const GREEN_BG = "#D1FAE5";
const VIOLET = "#7C3AED";
const VIOLET_BG = "#EDE9FE";

const styles = StyleSheet.create({
  // Portada
  cover: { fontFamily: "Inter", padding: 48, flexDirection: "column", height: "100%" },
  coverLogo: { width: 64, height: 64, marginBottom: 18 },
  coverClinica: { fontSize: 15, fontWeight: 700, color: ACCENT, marginBottom: 2 },
  coverKicker: { fontSize: 9, color: MUTED, marginBottom: 40 },
  coverTitle: { fontSize: 26, fontWeight: 700, color: INK, marginBottom: 4 },
  coverSub: { fontSize: 11, color: MUTED, marginBottom: 28 },
  coverCard: { borderWidth: 1, borderColor: LINE, borderRadius: 8, padding: 18, marginTop: 8 },
  coverCardLabel: { fontSize: 8, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  coverCardValue: { fontSize: 12, fontWeight: 700, color: INK, fontFamily: "JetBrains Mono" },
  coverGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 18 },
  coverGridItem: { width: "50%", marginBottom: 12 },
  coverGridLabel: { fontSize: 8, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  coverGridValue: { fontSize: 10.5, color: INK, fontWeight: 500 },
  coverFooter: { marginTop: "auto", borderTopWidth: 1, borderTopColor: LINE, paddingTop: 12 },
  coverFooterText: { fontSize: 8, color: FAINT },

  // Página de contenido
  page: { fontFamily: "Inter", fontSize: 9, color: INK, paddingTop: 50, paddingBottom: 42, paddingHorizontal: 32 },
  accentBarTop: { position: "absolute", top: 0, left: 0, right: 0, height: 4, backgroundColor: ACCENT },
  accentBarBottom: { position: "absolute", bottom: 0, left: 0, right: 0, height: 4, backgroundColor: ACCENT },
  headerFixed: {
    position: "absolute", top: 4, left: 0, right: 0, height: 34,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 32, borderBottomWidth: 1, borderBottomColor: LINE,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerLogo: { width: 16, height: 16 },
  headerClinica: { fontSize: 8.5, fontWeight: 700, color: ACCENT },
  headerRight: { fontSize: 7.5, color: FAINT },
  footerFixed: {
    position: "absolute", bottom: 4, left: 0, right: 0, height: 28,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 32, borderTopWidth: 1, borderTopColor: LINE,
  },
  footerText: { fontSize: 7, color: FAINT },

  sectionTitle: { fontSize: 11, fontWeight: 700, color: INK, marginBottom: 8, marginTop: 4 },
  sectionKicker: { fontSize: 8, fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },

  card: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 10, marginBottom: 8 },
  row: { flexDirection: "row" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap" },

  infoItem: { width: "33%", marginBottom: 8, paddingRight: 6 },
  infoLabel: { fontSize: 7, fontWeight: 700, color: FAINT, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 1 },
  infoValue: { fontSize: 9.5, color: INK, fontWeight: 500 },

  tag: { fontSize: 8, fontWeight: 700, borderRadius: 999, paddingVertical: 2.5, paddingHorizontal: 7, marginRight: 4, marginBottom: 4 },
  tagRed: { backgroundColor: RED_BG, color: RED },
  tagAmber: { backgroundColor: AMBER_BG, color: AMBER },
  tagViolet: { backgroundColor: VIOLET_BG, color: VIOLET },
  tagAccent: { backgroundColor: ACCENT_BG, color: ACCENT },

  consultaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  consultaMotivo: { fontSize: 13, fontWeight: 700, color: INK },
  consultaMeta: { fontSize: 8.5, color: MUTED, marginTop: 2 },
  consultaFecha: { fontSize: 9, fontWeight: 700, color: ACCENT, fontFamily: "JetBrains Mono" },

  table: { borderWidth: 1, borderColor: LINE, borderRadius: 4, marginBottom: 8 },
  tHeadRow: { flexDirection: "row", backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: LINE },
  tRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  tRowLast: { flexDirection: "row" },
  th: { fontSize: 7.5, fontWeight: 700, color: FAINT, textTransform: "uppercase", padding: 5 },
  td: { fontSize: 8.5, color: INK, padding: 5 },
  tdMuted: { fontSize: 7.5, color: MUTED, padding: 5 },
  code: { fontFamily: "JetBrains Mono", fontSize: 8, fontWeight: 700, color: ACCENT },

  badge: { fontSize: 7, fontWeight: 700, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 5, alignSelf: "flex-start" },

  toothRow: { flexDirection: "row", marginBottom: 3 },
  toothChip: {
    width: 18, height: 18, borderRadius: 3, borderWidth: 1, borderColor: LINE,
    alignItems: "center", justifyContent: "center", marginRight: 2, backgroundColor: "#F8FAFC",
  },
  toothChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  toothChipText: { fontSize: 6.5, color: FAINT, fontFamily: "JetBrains Mono" },
  toothChipTextActive: { color: "#FFFFFF", fontWeight: 700 },

  signatureBlock: { marginTop: 10, flexDirection: "row", alignItems: "flex-end", gap: 10 },
  signatureImg: { width: 90, height: 32, objectFit: "contain" },
  signatureLine: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 3, width: 140 },
  signatureName: { fontSize: 8.5, fontWeight: 700, color: INK },
  signatureRole: { fontSize: 7.5, color: MUTED },

  emptyText: { fontSize: 9, color: FAINT },
});

const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const money = (n: number, m = "PEN") => `${m === "PEN" ? "S/" : m} ${Number(n || 0).toFixed(2)}`;

function fmtFecha(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return iso; }
}
function fmtFechaLarga(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" }); }
  catch { return iso; }
}
function fmtGenerado() {
  return new Date().toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

function PageChrome({ clinicaNombre, pacienteNombre, codigoHistoria }: { clinicaNombre?: string | null; pacienteNombre: string; codigoHistoria?: string | null }) {
  return (
    <>
      <View style={styles.accentBarTop} fixed />
      <View style={styles.accentBarBottom} fixed />
      <View style={styles.headerFixed} fixed>
        <View style={styles.headerLeft}>
          <Image src="/Logo_Cian.png" style={styles.headerLogo} />
          <Text style={styles.headerClinica}>{clinicaNombre || "MaraDental"}</Text>
        </View>
        <Text style={styles.headerRight} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
      <View style={styles.footerFixed} fixed>
        <Text style={styles.footerText}>Documento confidencial — MaraDental</Text>
        <Text style={styles.footerText}>{pacienteNombre}{codigoHistoria ? ` · HC ${codigoHistoria}` : ""}</Text>
      </View>
    </>
  );
}

function ToothChart({ findings }: { findings: any[] }) {
  const byTooth = new Map((findings || []).map((f: any) => [f.toothNumber, f]));
  const renderRow = (teeth: number[]) => (
    <View style={styles.toothRow}>
      {teeth.map((n) => {
        const f = byTooth.get(n);
        return (
          <View key={n} style={f ? { ...styles.toothChip, ...styles.toothChipActive } : styles.toothChip}>
            <Text style={f ? { ...styles.toothChipText, ...styles.toothChipTextActive } : styles.toothChipText}>{n}</Text>
          </View>
        );
      })}
    </View>
  );
  return (
    <View>
      {renderRow(UPPER_TEETH)}
      {renderRow(LOWER_TEETH)}
    </View>
  );
}

function OdontogramaSection({ detalle }: { detalle: any[] }) {
  if (!detalle || detalle.length === 0) return null;
  const allFindings = detalle.flatMap((o: any) => o.findings || []);
  return (
    <View style={styles.card} wrap={false}>
      <Text style={styles.sectionKicker}>Odontograma de la visita</Text>
      <ToothChart findings={allFindings} />
      <View style={{ marginTop: 6 }}>
        {allFindings.map((f: any, i: number) => {
          const cond = f.isAll ? f.allConvention : (f.surfaceConditions || []).map((s: any) => `${s.surface}: ${s.convention}`).join(", ");
          return (
            <Text key={i} style={{ fontSize: 8, color: MUTED, marginTop: 2 }}>
              <Text style={{ fontWeight: 700, color: INK }}>Pieza {f.toothNumber}</Text> — {cond}
              {f.observaciones ? ` · ${f.observaciones}` : ""}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const PLAN_LABEL: Record<string, string> = {
  "No iniciado": "No iniciado", "En proceso": "En proceso", "Terminado": "Terminado",
};
const PLAN_STYLE: Record<string, object> = {
  "No iniciado": { backgroundColor: "#F1F5F9", color: MUTED },
  "En proceso": { backgroundColor: AMBER_BG, color: AMBER },
  "Terminado": { backgroundColor: GREEN_BG, color: GREEN },
};

function ConsultaSection({ consulta: c, isFirst }: { consulta: any; isFirst: boolean }) {
  return (
    <View break={!isFirst}>
      <View style={styles.consultaHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.consultaMotivo}>{c.motivo || "Consulta"}</Text>
          <Text style={styles.consultaMeta}>
            {c.doctor}{c.doctorEspecialidad ? ` · ${c.doctorEspecialidad}` : ""}
          </Text>
        </View>
        <Text style={styles.consultaFecha}>{fmtFechaLarga(c.fecha)}</Text>
      </View>

      {c.observaciones ? (
        <View style={styles.card} wrap={false}>
          <Text style={styles.sectionKicker}>Anamnesis / Observaciones</Text>
          <Text style={{ fontSize: 8.5, color: INK, lineHeight: 1.4 }}>{c.observaciones}</Text>
        </View>
      ) : null}

      {c.examen && c.examen.length > 0 && (
        <View style={styles.card} wrap={false}>
          <Text style={styles.sectionKicker}>Examen físico</Text>
          <View style={styles.wrapRow}>
            {c.examen.map((e: any, i: number) => (
              <Text key={i} style={{ ...styles.tag, ...styles.tagAccent }}>{e.clave}: {e.valor}</Text>
            ))}
          </View>
        </View>
      )}

      {(!c.diagnosticos || c.diagnosticos.length === 0) ? (
        <Text style={styles.emptyText}>Sin diagnóstico registrado en esta consulta.</Text>
      ) : c.diagnosticos.map((d: any) => (
        <View key={d.id}>
          {/* Diagnóstico CIE-10 */}
          <View style={styles.table} wrap={false}>
            <View style={styles.tHeadRow}>
              <Text style={{ ...styles.th, width: "18%" }}>CIE-10</Text>
              <Text style={{ ...styles.th, width: "62%" }}>Diagnóstico</Text>
              <Text style={{ ...styles.th, width: "20%" }}>Tipo</Text>
            </View>
            <View style={styles.tRowLast}>
              <Text style={{ ...styles.code, width: "18%", padding: 5 }}>{d.cie10?.codigo ?? "—"}</Text>
              <Text style={{ ...styles.td, width: "62%" }}>{d.texto}</Text>
              <Text style={{ ...styles.td, width: "20%" }}>{d.es_definitivo ? "Definitivo" : "Presuntivo"}</Text>
            </View>
          </View>

          {/* Tratamientos */}
          {d.tratamientos?.length > 0 && (
            <View style={styles.table} wrap={false}>
              <View style={styles.tHeadRow}>
                <Text style={{ ...styles.th, width: "50%" }}>Tratamiento</Text>
                <Text style={{ ...styles.th, width: "30%" }}>Notas</Text>
                <Text style={{ ...styles.th, width: "20%" }}>Costo</Text>
              </View>
              {d.tratamientos.map((t: any, i: number) => (
                <View key={t.id} style={i === d.tratamientos.length - 1 ? styles.tRowLast : styles.tRow}>
                  <Text style={{ ...styles.td, width: "50%" }}>{t.nombre}</Text>
                  <Text style={{ ...styles.tdMuted, width: "30%" }}>{t.notas || "—"}</Text>
                  <Text style={{ ...styles.td, width: "20%" }}>{t.precio > 0 ? money(t.precio, t.moneda) : "—"}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Plan de trabajo — con estados de avance */}
          {d.plan?.length > 0 && (
            <View style={styles.table} wrap={false}>
              <View style={styles.tHeadRow}>
                <Text style={{ ...styles.th, width: "35%" }}>Fase</Text>
                <Text style={{ ...styles.th, width: "40%" }}>Descripción</Text>
                <Text style={{ ...styles.th, width: "25%" }}>Estado</Text>
              </View>
              {d.plan.map((p: any, i: number) => (
                <View key={p.id} style={i === d.plan.length - 1 ? styles.tRowLast : styles.tRow}>
                  <Text style={{ ...styles.td, width: "35%" }}>{p.etapa}</Text>
                  <Text style={{ ...styles.tdMuted, width: "40%" }}>{p.descripcion || "—"}</Text>
                  <View style={{ width: "25%", padding: 5 }}>
                    <Text style={{ ...styles.badge, ...(PLAN_STYLE[p.estado] || PLAN_STYLE["No iniciado"]) }}>
                      {PLAN_LABEL[p.estado] || p.estado}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Recetas detalladas */}
          {d.recetas?.length > 0 && d.recetas.map((r: any) => (
            r.medicamentos?.length > 0 && (
              <View key={r.id} style={styles.table} wrap={false}>
                <View style={styles.tHeadRow}>
                  <Text style={{ ...styles.th, width: "28%" }}>Medicamento</Text>
                  <Text style={{ ...styles.th, width: "18%" }}>Dosis</Text>
                  <Text style={{ ...styles.th, width: "24%" }}>Frecuencia</Text>
                  <Text style={{ ...styles.th, width: "30%" }}>Indicaciones</Text>
                </View>
                {r.medicamentos.map((m: any, i: number) => (
                  <View key={i} style={i === r.medicamentos.length - 1 ? styles.tRowLast : styles.tRow}>
                    <Text style={{ ...styles.td, width: "28%", fontWeight: 700 }}>{m.nombre}</Text>
                    <Text style={{ ...styles.td, width: "18%" }}>{m.dosis || "—"}</Text>
                    <Text style={{ ...styles.td, width: "24%" }}>{m.frecuencia || "—"}</Text>
                    <Text style={{ ...styles.tdMuted, width: "30%" }}>{m.indicaciones || "—"}</Text>
                  </View>
                ))}
              </View>
            )
          ))}
        </View>
      ))}

      {/* Odontograma visual de la visita */}
      <OdontogramaSection detalle={c.odontogramaDetalle} />

      {/* Presupuestos de la visita */}
      {c.presupuestos?.length > 0 && c.presupuestos.map((p: any) => (
        <View key={p.id} style={styles.table} wrap={false}>
          <View style={styles.tHeadRow}>
            <Text style={{ ...styles.th, width: "50%" }}>Ítem</Text>
            <Text style={{ ...styles.th, width: "15%" }}>Cant.</Text>
            <Text style={{ ...styles.th, width: "35%" }}>Subtotal</Text>
          </View>
          {p.items.map((it: any, i: number) => (
            <View key={i} style={styles.tRow}>
              <Text style={{ ...styles.td, width: "50%" }}>{it.nombre}</Text>
              <Text style={{ ...styles.td, width: "15%" }}>{it.cantidad}</Text>
              <Text style={{ ...styles.td, width: "35%" }}>{money(it.subtotal)}</Text>
            </View>
          ))}
          <View style={styles.tRowLast}>
            <Text style={{ ...styles.td, width: "65%", fontWeight: 700 }}>Total neto / Pagado / Saldo</Text>
            <Text style={{ ...styles.td, width: "35%", fontWeight: 700, color: ACCENT }}>
              {money(p.neto)} / {money(p.pagado)} / {money(p.saldo)}
            </Text>
          </View>
        </View>
      ))}

      {/* Archivos clínicos */}
      {c.archivos?.length > 0 && (
        <View style={styles.card} wrap={false}>
          <Text style={styles.sectionKicker}>Archivos clínicos ({c.archivos.length})</Text>
          {c.archivos.map((a: any) => (
            <Text key={a.id} style={{ fontSize: 8.5, color: INK, marginTop: 2 }}>
              • {a.nombre_archivo} <Text style={{ color: MUTED }}>({a.categoria} · {fmtFecha(a.fecha_subida)})</Text>
            </Text>
          ))}
        </View>
      )}

      {/* Firma digital del doctor */}
      <View style={styles.signatureBlock} wrap={false}>
        {c.doctorFirmaUrl ? (
          <Image src={c.doctorFirmaUrl} style={styles.signatureImg} />
        ) : null}
        <View style={styles.signatureLine}>
          <Text style={styles.signatureName}>{c.doctor}</Text>
          {c.doctorEspecialidad ? <Text style={styles.signatureRole}>{c.doctorEspecialidad}</Text> : null}
        </View>
      </View>
    </View>
  );
}

export function ExpedientePDF({ data }: { data: any }) {
  const p = data.paciente;
  const nombreCompleto = [p.nombre, p.apellido].filter(Boolean).join(" ") || "Paciente";
  const clinica = data.sede;
  const hc = data.historiaClinica;
  const ant = p.antecedentes_estructurados || { cronicas: [], medicacion_habitual: [], quirurgicos: [] };
  const alergias: string[] = Array.isArray(p.alergias) ? p.alergias : [];

  return (
    <Document title={`Expediente — ${nombreCompleto}`} author={clinica?.nombre_clinica || "MaraDental"}>
      {/* Portada */}
      <Page size="A4" style={styles.cover}>
        <View style={styles.accentBarTop} fixed />
        <View style={styles.accentBarBottom} fixed />
        <Image src="/Cian_MaraDental.png" style={styles.coverLogo} />
        {clinica?.nombre_clinica && <Text style={styles.coverClinica}>{clinica.nombre_clinica}</Text>}
        <Text style={styles.coverKicker}>Expediente Clínico Odontológico</Text>

        <Text style={styles.coverTitle}>{nombreCompleto}</Text>
        <Text style={styles.coverSub}>DNI {p.dni || "—"}</Text>

        {hc && (
          <View style={styles.coverCard}>
            <Text style={styles.coverCardLabel}>Código de Historia Clínica</Text>
            <Text style={styles.coverCardValue}>{hc.codigo_historia}</Text>
          </View>
        )}

        <View style={styles.coverGrid}>
          <View style={styles.coverGridItem}>
            <Text style={styles.coverGridLabel}>Fecha de nacimiento</Text>
            <Text style={styles.coverGridValue}>{fmtFecha(p.fecha_nacimiento)}</Text>
          </View>
          <View style={styles.coverGridItem}>
            <Text style={styles.coverGridLabel}>Sexo</Text>
            <Text style={styles.coverGridValue}>{p.sexo || "—"}</Text>
          </View>
          <View style={styles.coverGridItem}>
            <Text style={styles.coverGridLabel}>Grupo sanguíneo</Text>
            <Text style={styles.coverGridValue}>{p.grupo_sanguineo || "—"}</Text>
          </View>
          <View style={styles.coverGridItem}>
            <Text style={styles.coverGridLabel}>Teléfono</Text>
            <Text style={styles.coverGridValue}>{p.telefono || "—"}</Text>
          </View>
          <View style={styles.coverGridItem}>
            <Text style={styles.coverGridLabel}>Email</Text>
            <Text style={styles.coverGridValue}>{p.email || "—"}</Text>
          </View>
          <View style={styles.coverGridItem}>
            <Text style={styles.coverGridLabel}>Dirección</Text>
            <Text style={styles.coverGridValue}>{p.direccion || p.domicilio || "—"}</Text>
          </View>
        </View>

        <View style={styles.coverFooter}>
          <Text style={styles.coverFooterText}>Generado el {fmtGenerado()}</Text>
          <Text style={styles.coverFooterText}>Documento confidencial — uso exclusivo del paciente y su equipo tratante</Text>
        </View>
      </Page>

      {/* Contenido */}
      <Page size="A4" style={styles.page} wrap>
        <PageChrome clinicaNombre={clinica?.nombre_clinica} pacienteNombre={nombreCompleto} codigoHistoria={hc?.codigo_historia} />

        {/* Resumen clínico */}
        <Text style={styles.sectionTitle}>Resumen Clínico</Text>
        <View style={styles.card} wrap={false}>
          <View style={styles.wrapRow}>
            <InfoItem label="Ocupación" value={p.ocupacion} />
            <InfoItem label="Estado civil" value={p.estado_civil} />
            <InfoItem label="Grado de instrucción" value={p.grado_instruccion} />
            <InfoItem label="Lugar de nacimiento" value={p.lugar_nacimiento} />
            <InfoItem label="Procedencia" value={p.lugar_procedencia} />
            <InfoItem label="Religión" value={p.religion} />
          </View>

          <Text style={{ ...styles.infoLabel, marginTop: 4 }}>Alergias</Text>
          {alergias.length > 0 ? (
            <View style={{ ...styles.wrapRow, marginTop: 3 }}>
              {alergias.map((a) => <Text key={a} style={{ ...styles.tag, ...styles.tagRed }}>{a}</Text>)}
            </View>
          ) : (
            <Text style={styles.emptyText}>Ninguna registrada</Text>
          )}

          {ant.cronicas?.length > 0 && (
            <>
              <Text style={{ ...styles.infoLabel, marginTop: 6 }}>Enfermedades crónicas</Text>
              <View style={{ ...styles.wrapRow, marginTop: 3 }}>
                {ant.cronicas.map((a: string) => <Text key={a} style={{ ...styles.tag, ...styles.tagAmber }}>{a}</Text>)}
              </View>
            </>
          )}
          {ant.medicacion_habitual?.length > 0 && (
            <>
              <Text style={{ ...styles.infoLabel, marginTop: 6 }}>Medicación habitual</Text>
              <View style={{ ...styles.wrapRow, marginTop: 3 }}>
                {ant.medicacion_habitual.map((a: string) => <Text key={a} style={{ ...styles.tag, ...styles.tagViolet }}>{a}</Text>)}
              </View>
            </>
          )}
          {ant.quirurgicos?.length > 0 && (
            <>
              <Text style={{ ...styles.infoLabel, marginTop: 6 }}>Antecedentes quirúrgicos</Text>
              <View style={{ ...styles.wrapRow, marginTop: 3 }}>
                {ant.quirurgicos.map((a: string) => <Text key={a} style={{ ...styles.tag, ...styles.tagAccent }}>{a}</Text>)}
              </View>
            </>
          )}
          {p.enfermedad_actual && (
            <>
              <Text style={{ ...styles.infoLabel, marginTop: 6 }}>Enfermedad actual / restricciones</Text>
              <Text style={{ fontSize: 9, color: INK, marginTop: 2 }}>{p.enfermedad_actual}</Text>
            </>
          )}
        </View>

        {/* Timeline de consultas */}
        <Text style={styles.sectionTitle}>Historial de Consultas ({data.consultas.length})</Text>
        {data.consultas.length === 0 ? (
          <Text style={styles.emptyText}>Sin consultas registradas en el rango seleccionado.</Text>
        ) : (
          data.consultas.map((c: any, i: number) => (
            <ConsultaSection key={c.id} consulta={c} isFirst={i === 0} />
          ))
        )}
      </Page>
    </Document>
  );
}
