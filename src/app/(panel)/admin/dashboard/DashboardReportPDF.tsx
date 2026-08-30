import { Document, Page, View, Text, Image, Svg, Path, StyleSheet, Font } from "@react-pdf/renderer";

// Mismas fuentes que ya usa ExpedientePDF.tsx — mismo patrón de registro.
Font.register({
  family: "Inter",
  fonts: [
    { src: "/fonts/Inter-Regular.ttf", fontWeight: 400 },
    { src: "/fonts/Inter-Medium.ttf", fontWeight: 500 },
    { src: "/fonts/Inter-Bold.ttf", fontWeight: 700 },
  ],
});

// Paleta real del sistema (ver src/app/globals.css @theme) — cian de marca,
// no el azul genérico de la plantilla de referencia.
const CYAN = "#0A8EA0";
const CYAN_DARK = "#0D7377";
const CYAN_LIGHT = "#6BBEBC";
const CYAN_LIGHT_BG = "#E0F2F1";
const INK = "#212E3D";
const MUTED = "#5D6D7E";
const FAINT = "#95A5A6";
const LINE = "#EDF0F4";
const CARD_BG = "#F7F8FA";
const PAGE_W = 595.28; // A4 vertical, pt
const CARD_H = 370; // alto fijo de cada tarjeta de gráfico — mismo tamaño siempre, haya 1 o 2 por página

export interface ReportChartStat {
  label: string;
  value: string;
}

export interface ReportChart {
  key: string;
  title: string;
  image: string; // dataURL PNG (html2canvas)
  stats?: ReportChartStat[];
}

export interface ReportSede {
  nombre_clinica?: string | null;
  telefono?: string | null;
  email_contacto?: string | null;
  direccion?: string | null;
}

export interface ReportFiltros {
  periodo: string;
  granularidad: string;
  moneda: string;
  medioPago: string;
  kpisIncluidos: string[];
}

const styles = StyleSheet.create({
  // ── Portada ──────────────────────────────────────────────────────────────
  cover: { fontFamily: "Inter", height: "100%", position: "relative" },

  coverBrandRow: { position: "absolute", top: 34, right: 44 },
  coverLogo: { width: 120, height: 60, objectFit: "contain" },

  coverBody: { position: "absolute", top: 175, left: 48, right: 48 },
  coverEyebrow: { fontSize: 9, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 },
  coverTitleRow: { borderBottomWidth: 1, borderBottomColor: LINE, paddingBottom: 14, marginBottom: 20 },
  coverTitle: { fontSize: 22, fontWeight: 700, color: INK },
  coverDate: { fontSize: 10, color: MUTED, marginTop: 4 },

  paramsGrid: { flexDirection: "row", gap: 24, marginBottom: 20 },
  paramsCol: { flex: 1 },
  paramsHeading: { fontSize: 8, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: LINE, paddingBottom: 4 },
  paramLine: { fontSize: 9, color: INK, marginBottom: 4 },
  paramLabel: { fontWeight: 700, color: MUTED },

  kpiHeading: { fontSize: 8, fontWeight: 700, color: CYAN, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  kpiWrap: { flexDirection: "row", flexWrap: "wrap" },
  kpiTag: { fontSize: 8, fontWeight: 700, color: CYAN_DARK, backgroundColor: CYAN_LIGHT_BG, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8, marginRight: 5, marginBottom: 5 },

  // ── Franja de pie — recta, igual en TODAS las páginas (portada incluida):
  // correo + ubicación + paginación, todo centrado como un solo grupo.
  footerBand: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 34, backgroundColor: CYAN,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 22,
  },
  contactItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactText: { fontSize: 8, color: "#FFFFFF", fontWeight: 500 },
  footerPage: { fontSize: 8, color: "#FFFFFF", fontWeight: 700 },

  // ── Franja de encabezado — recta, solo a partir de la página 2: logo en un
  // extremo, sede en el otro, título centrado.
  headerBand: { position: "absolute", top: 0, left: 0, right: 0, height: 32, backgroundColor: CYAN },
  headerBandCenter: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  headerBandTitle: { fontSize: 8.5, fontWeight: 700, color: "#FFFFFF", letterSpacing: 1 },
  headerBandRow: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24,
  },
  headerBandLogo: { width: 42, height: 21, objectFit: "contain" },
  headerBandSede: { fontSize: 8, fontWeight: 700, color: "#FFFFFF" },

  // ── Páginas de contenido ─────────────────────────────────────────────────
  page: { fontFamily: "Inter", paddingTop: 40, paddingBottom: 42, paddingHorizontal: 40, position: "relative" },

  chartsRow: { flexDirection: "column", gap: 14 },
  kpiCard: { height: CARD_H, flexDirection: "column", backgroundColor: CARD_BG, borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: CYAN },
  chartTitle: { fontSize: 10.5, fontWeight: 700, color: INK, marginBottom: 10 },
  chartImageWrap: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 10, borderWidth: 1, borderColor: LINE, padding: 6 },
  chartImage: { width: "100%", height: "100%", objectFit: "contain" },

  statsRow: { flexDirection: "row", gap: 6, marginTop: 10 },
  statBox: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 8, borderWidth: 1, borderColor: LINE, paddingVertical: 8, paddingHorizontal: 4, alignItems: "center" },
  statValue: { fontSize: 9.5, fontWeight: 700, color: CYAN_DARK, textAlign: "center" },
  statLabel: { fontSize: 6, color: MUTED, textTransform: "uppercase", letterSpacing: 0.3, marginTop: 3, textAlign: "center" },
});

/** Ola de ancho completo (todo el ancho de la hoja) — la forma extraída de
 * la plantilla de referencia, recoloreada con el cian de marca. Dos capas:
 * una clara detrás (asoma un poco arriba a la izquierda) y una sólida
 * delante. Solo se usa en el header de la portada; el resto del membrete
 * (encabezado desde la página 2 y el pie en todas) es una franja recta. */
function Wave({ height = 90 }: { height?: number }) {
  const lightPath = "M0,0 L595,0 L595,45 C500,55 450,30 380,40 C300,52 260,25 180,45 C120,60 60,80 0,95 Z";
  const mainPath = "M0,0 L595,0 L595,35 C500,45 450,20 380,30 C300,42 260,15 180,35 C120,50 60,70 0,85 Z";
  return (
    <Svg style={{ position: "absolute", left: 0, right: 0, top: 0 }} width={PAGE_W} height={height} viewBox="0 0 595 90">
      <Path d={lightPath} fill={CYAN_LIGHT} opacity={0.5} />
      <Path d={mainPath} fill={CYAN} />
    </Svg>
  );
}

function AtIcon() {
  return (
    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 8.5, color: "#FFFFFF", fontWeight: 700 }}>@</Text>
    </View>
  );
}

function PinIcon() {
  return (
    <Svg width={12} height={14} viewBox="0 0 24 28">
      <Path d="M12 0C6.5 0 2 4.5 2 10c0 7.5 10 17.5 10 17.5S22 17.5 22 10c0-5.5-4.5-10-10-10z" fill="#FFFFFF" />
      <Path d="M12 6a4 4 0 100 8 4 4 0 000-8z" fill={CYAN} />
    </Svg>
  );
}

function ContactItem({ icon, value }: { icon: "at" | "pin"; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.contactItem}>
      {icon === "at" ? <AtIcon /> : <PinIcon />}
      <Text style={styles.contactText}>{value}</Text>
    </View>
  );
}

/** Pie recto — igual en portada y en páginas de contenido: correo,
 * ubicación y número de página, todo centrado como un solo grupo. */
function FooterBand({ sede, fixed = false }: { sede?: ReportSede | null; fixed?: boolean }) {
  return (
    <View style={styles.footerBand} fixed={fixed}>
      <ContactItem icon="at" value={sede?.email_contacto} />
      <ContactItem icon="pin" value={sede?.direccion} />
      <Text style={styles.footerPage} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

/** A partir de la página 2 el membrete superior es una franja recta: logo
 * blanco en un extremo, sede en el otro, título centrado — reemplaza la ola
 * que llevaba antes. */
function HeaderBand({ sede }: { sede?: ReportSede | null }) {
  return (
    <View style={styles.headerBand} fixed>
      <View style={styles.headerBandCenter}>
        <Text style={styles.headerBandTitle}>REPORTE DE GESTIÓN DIRECTIVA</Text>
      </View>
      <View style={styles.headerBandRow}>
        <Image src="/Logo_Blanco.png" style={styles.headerBandLogo} />
        <Text style={styles.headerBandSede}>{sede?.nombre_clinica || "MaraDental"}</Text>
      </View>
    </View>
  );
}

export function DashboardReportPDF({ sede, filtros, charts }: { sede?: ReportSede | null; filtros: ReportFiltros; charts: ReportChart[] }) {
  const fechaGenerado = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });

  // Dos gráficos por página, apilados uno sobre otro — cada tarjeta tiene un
  // alto fijo (CARD_H), así se ven del mismo tamaño incluso en la última
  // página si queda un gráfico suelto (cantidad impar).
  const pares: ReportChart[][] = [];
  for (let i = 0; i < charts.length; i += 2) pares.push(charts.slice(i, i + 2));

  return (
    <Document title={`Reporte de Gestión Directiva — ${sede?.nombre_clinica || "MaraDental"}`} author="MaraDental">
      {/* Portada */}
      <Page size="A4" style={styles.cover}>
        <Wave height={100} />

        <View style={styles.coverBrandRow}>
          <Image src="/Cian_MaraDental.png" style={styles.coverLogo} />
        </View>

        <View style={styles.coverBody}>
          <Text style={styles.coverEyebrow}>Reporte de Gestión Directiva</Text>
          <View style={styles.coverTitleRow}>
            <Text style={styles.coverTitle}>{sede?.nombre_clinica || "Todas las sedes"}</Text>
            <Text style={styles.coverDate}>{fechaGenerado}</Text>
          </View>

          <View style={styles.paramsGrid}>
            <View style={styles.paramsCol}>
              <Text style={styles.paramsHeading}>Parámetros de Tiempo y Granularidad</Text>
              <Text style={styles.paramLine}><Text style={styles.paramLabel}>Período de análisis: </Text>{filtros.periodo}</Text>
              <Text style={styles.paramLine}><Text style={styles.paramLabel}>Agrupar por: </Text>{filtros.granularidad}</Text>
            </View>
            <View style={styles.paramsCol}>
              <Text style={styles.paramsHeading}>Filtros Financieros Activos</Text>
              <Text style={styles.paramLine}><Text style={styles.paramLabel}>Moneda: </Text>{filtros.moneda}</Text>
              <Text style={styles.paramLine}><Text style={styles.paramLabel}>Medio de pago: </Text>{filtros.medioPago}</Text>
            </View>
          </View>

          <Text style={styles.kpiHeading}>KPIs y gráficos incluidos en este informe</Text>
          <View style={styles.kpiWrap}>
            {filtros.kpisIncluidos.map((k) => (
              <Text key={k} style={styles.kpiTag}>✓ {k}</Text>
            ))}
          </View>
        </View>

        <FooterBand sede={sede} />
      </Page>

      {/* Dos gráficos por página, apilados */}
      {pares.map((par, idx) => (
        <Page key={idx} size="A4" style={styles.page}>
          <HeaderBand sede={sede} />
          <FooterBand sede={sede} fixed />
          <View style={styles.chartsRow}>
            {par.map((chart) => (
              <View key={chart.key} style={styles.kpiCard}>
                <Text style={styles.chartTitle}>{chart.title}</Text>
                <View style={styles.chartImageWrap}>
                  <Image src={chart.image} style={styles.chartImage} />
                </View>
                {chart.stats && chart.stats.length > 0 && (
                  <View style={styles.statsRow}>
                    {chart.stats.map((s, i) => (
                      <View key={i} style={styles.statBox}>
                        <Text style={styles.statValue}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  );
}
