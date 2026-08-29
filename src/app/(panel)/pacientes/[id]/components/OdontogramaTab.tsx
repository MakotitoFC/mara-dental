"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Odontogram, type ToothDetail } from "react-odontogram";
import "react-odontogram/style.css";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { calcEdad } from "@/lib/date-utils";
import { OdontogramaSkeleton } from "@/components/ui/ConsultaSkeletons";
import { getOdontogramasAction, addFindingAction, updateFindingAction, deleteFindingAction, getCondicionesOdontogramaAction } from "../odontograma.actions";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmModal";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { ResponsiveSheet } from "@/components/ui/ResponsiveSheet";
import { DatePicker } from "@/components/ui/DatePicker";
import { FilterCategoryPicker, type FilterCategoryMeta } from "@/components/ui/FilterCategoryPicker";
import { TagDropdown } from "@/components/ui/TagDropdown";

// ─── Types ────────────────────────────────────────────────────────────────────

type Convention = string;
type Surface = "oclusal" | "vestibular" | "mesial" | "distal" | "palatino";
type Dentition = "adulto" | "infantil";

interface SurfaceCondition { surface: Surface; convention: Convention; }

interface SessionFinding {
  id: string;
  db_ids: number[]; // Added to map back to DB
  toothNumber: number;
  isAll: boolean; allConvention?: Convention;
  surfaceConditions: SurfaceCondition[];
  observaciones: string;
}

interface ExamSession {
  id: string; fecha: string; tipo: string;
  dentista: string;
  findings: SessionFinding[];
}

interface TimelineEntry { session: ExamSession; finding: SessionFinding; }

type SurfaceConventions = Partial<Record<Surface, Convention>>;

interface ToothDraft {
  isAll: boolean;
  allConvention: Convention | null;
  surfaceConventions: SurfaceConventions;
  observaciones: string;
}

const emptyDraft = (): ToothDraft => ({ isAll: false, allConvention: null, surfaceConventions: {}, observaciones: "" });

// ─── Constants ────────────────────────────────────────────────────────────────



// Orden de prioridad visual cuando un diente tiene más de una condición: se
// pinta con la más urgente clínicamente.


const SURFACES: { key: Surface; label: string }[] = [
  { key: "vestibular", label: "Vestibular" },
  { key: "palatino", label: "Palatino/Lingual" },
  { key: "mesial", label: "Mesial" },
  { key: "distal", label: "Distal" },
  { key: "oclusal", label: "Oclusal/Incisal" },
];

const SURFACE_INITIAL: Record<Surface, string> = {
  vestibular: "V", palatino: "P", mesial: "M", distal: "D", oclusal: "O",
};

const TOOTH_NAMES: Record<number, string> = {
  18: "3er Molar Sup. Der.", 17: "2do Molar Sup. Der.", 16: "1er Molar Sup. Der.",
  15: "2do Premolar Sup. Der.", 14: "1er Premolar Sup. Der.", 13: "Canino Sup. Der.",
  12: "Inc. Lateral Sup. Der.", 11: "Inc. Central Sup. Der.",
  21: "Inc. Central Sup. Izq.", 22: "Inc. Lateral Sup. Izq.", 23: "Canino Sup. Izq.",
  24: "1er Premolar Sup. Izq.", 25: "2do Premolar Sup. Izq.", 26: "1er Molar Sup. Izq.",
  27: "2do Molar Sup. Izq.", 28: "3er Molar Sup. Izq.",
  31: "Inc. Central Inf. Izq.", 32: "Inc. Lateral Inf. Izq.", 33: "Canino Inf. Izq.",
  34: "1er Premolar Inf. Izq.", 35: "2do Premolar Inf. Izq.", 36: "1er Molar Inf. Izq.",
  37: "2do Molar Inf. Izq.", 38: "3er Molar Inf. Izq.",
  41: "Inc. Central Inf. Der.", 42: "Inc. Lateral Inf. Der.", 43: "Canino Inf. Der.",
  44: "1er Premolar Inf. Der.", 45: "2do Premolar Inf. Der.", 46: "1er Molar Inf. Der.",
  47: "2do Molar Inf. Der.", 48: "3er Molar Inf. Der.",
  55: "2do Molar Pri. Sup. Der.", 54: "1er Molar Pri. Sup. Der.", 53: "Canino Pri. Sup. Der.",
  52: "Inc. Lat. Pri. Sup. Der.", 51: "Inc. Cen. Pri. Sup. Der.",
  61: "Inc. Cen. Pri. Sup. Izq.", 62: "Inc. Lat. Pri. Sup. Izq.", 63: "Canino Pri. Sup. Izq.",
  64: "1er Molar Pri. Sup. Izq.", 65: "2do Molar Pri. Sup. Izq.",
  71: "Inc. Cen. Pri. Inf. Izq.", 72: "Inc. Lat. Pri. Inf. Izq.", 73: "Canino Pri. Inf. Izq.",
  74: "1er Molar Pri. Inf. Izq.", 75: "2do Molar Pri. Inf. Izq.",
  81: "Inc. Cen. Pri. Inf. Der.", 82: "Inc. Lat. Pri. Inf. Der.", 83: "Canino Pri. Inf. Der.",
  84: "1er Molar Pri. Inf. Der.", 85: "2do Molar Pri. Inf. Der.",
};

// ─── Helpers de notación FDI adulto ↔ infantil ─────────────────────────────────
// FDI: cuadrantes 1-4 = dentición permanente, 5-8 = dentición decidua (misma
// posición + 40, ej. permanente 11 ↔ decidua 51). react-odontogram sólo conoce
// la numeración permanente (11-48) y su prop `maxTeeth` recorta a N piezas por
// cuadrante — la usamos como "vista infantil" (5 piezas) y traducimos los ids
// a la notación decidua real en nuestra capa de datos/tooltip.

const isAdultCode = (n: number) => n < 50;

// react-odontogram (layout="circle") dibuja el cuadrante 3 (31-38) en la
// posición de pantalla INFERIOR-IZQUIERDA y el cuadrante 4 (41-48) en
// INFERIOR-DERECHA — al revés de la convención odontológica estándar, donde
// el lado derecho del paciente se dibuja SIEMPRE a la izquierda de la imagen
// (arriba y abajo por igual — así el cuadrante 1 ya sale correcto sobre el
// cuadrante 4, no sobre el 3). Se corrige acá, en el límite entre nuestros
// datos reales (FDI) y el id interno de la librería, sin tocar el paquete:
// swapQuadrant34 intercambia solo 3↔4. Aplica igual a dentición infantil,
// que reutiliza los mismos cuadrantes (51-85 = 11-45 + 40).
function swapQuadrant34(permanent: number): number {
  const quadrant = Math.floor(permanent / 10);
  const unit = permanent % 10;
  if (quadrant === 3) return 40 + unit;
  if (quadrant === 4) return 30 + unit;
  return permanent;
}

function toLibraryId(toothNumber: number, dentition: Dentition): string {
  const permanent = dentition === "infantil" ? toothNumber - 40 : toothNumber;
  return `teeth-${swapQuadrant34(permanent)}`;
}

function fromLibraryFdi(fdi: string, dentition: Dentition): number {
  const permanent = swapQuadrant34(Number(fdi));
  return dentition === "infantil" ? permanent + 40 : permanent;
}

// ─── Overlay de orientación (maxilar superior/inferior, derecha/izquierda,
// regiones 1-4 y numeración de cada pieza) ─────────────────────────────────
// react-odontogram no expone esta geometría como prop, así que se replica acá
// la ubicación real de cada cuadrante (misma matriz que `oldquadrants` del
// paquete, viewBox 409x694) para poder dibujar nuestras propias etiquetas
// encima del SVG, ya corregidas con swapQuadrant34.

const VIEWBOX_W = 409;
const VIEWBOX_H = 694;

// La dentición infantil solo dibuja 5 piezas por cuadrante (maxTeeth=5) en
// vez de 8 — las piezas 1-5 del cuadrante ocupan como mucho y≈[1, 142] (ver
// TOOTH_BOX abajo), muy lejos del centro del viewBox (y=347). Como el arco
// completo de 8 piezas SÍ llega hasta y≈290, el maxilar superior/inferior
// infantil queda con un hueco enorme en el medio si se dibuja en el mismo
// viewBox de 694 sin recortar. INFANTIL_CROP_Y (con margen para la
// numeración empujada hacia afuera) define, simétrico arriba/abajo, hasta
// dónde llega cada arco — se usa para recortar el SVG en dos paneles
// (superior/inferior) y "juntarlos" sin distorsionar el tamaño real de los
// dientes (un scaleY uniforme encogería igual el hueco Y los dientes).
const INFANTIL_CROP_Y = 180;
// La pieza 1 (la más al frente del arco) empuja su número hacia y≈-7 —
// fuera del viewBox real (y=0 es su borde) — así que recortar exacto en
// y=0 lo clipea invisible y deja el texto "Maxilar superior/inferior" sin
// aire respecto al arco. INFANTIL_TOP_MARGIN extiende cada panel ese
// colchón hacia el borde externo (arriba del superior, abajo del inferior).
const INFANTIL_TOP_MARGIN = 35;
const INFANTIL_PANEL_H = INFANTIL_CROP_Y + INFANTIL_TOP_MARGIN;

// Caja real (bbox) de cada pieza (1-8) dentro de un cuadrante, en el espacio
// de coordenadas SIN transformar del paquete — centro + medio-ancho/medio-alto,
// obtenidos renderizando los 8 outlinePath reales de data.ts y midiendo con
// `getBBox()` en el navegador (no una aproximación a mano: la versión
// original, basada en el primer punto de cada path, quedaba hasta 28
// unidades desviada para las piezas de en medio del arco).
const TOOTH_BOX: Record<number, { cx: number; cy: number; hw: number; hh: number }> = {
  1: { cx: 179.1, cy: 30.9, hw: 24.9, hh: 29.8 },
  2: { cx: 133.2, cy: 36.1, hw: 21.6, hh: 26.8 },
  3: { cx: 101.1, cy: 56.9, hw: 27.1, hh: 24.3 },
  4: { cx: 76.8, cy: 87.0, hw: 28.3, hh: 22.4 },
  5: { cx: 59.5, cy: 121.0, hw: 30.1, hh: 20.6 },
  6: { cx: 43.1, cy: 170.6, hw: 36.5, hh: 32.7 },
  7: { cx: 35.2, cy: 233.5, hw: 34.6, hh: 29.5 },
  8: { cx: 32.3, cy: 290.1, hw: 31.6, hh: 27.2 },
};

// Centro real del arco (centroide de los 8 centros) — solo se usa para
// decidir CUÁL de las dos normales perpendiculares a la tangente local es la
// que apunta "hacia afuera" (ver tangentNormal). Ya NO se usa como origen del
// que irradian los empujes: empujar en línea recta desde un solo punto
// converge mal cerca de la línea media (los incisivos 1-2 terminaban
// empujados el uno HACIA el otro en vez de alejarse por el borde real —
// verificado: con ese modelo, 20 de 32 números quedaban geométricamente más
// cerca del diente vecino que del propio).
const ARCH_CENTER: [number, number] = [82.5, 128.3];

// Línea media real del cuadrante (mitad del viewBox) — el diente 1 queda
// justo ahí, pegado al cuadrante espejado (2). Se usa para reconstruir un
// "vecino anterior" virtual del diente 1 (el reflejo del diente 2 sobre esta
// línea), necesario para calcular su tangente local sin salirse del cuadrante.
const MID_X = VIEWBOX_W / 2;

const QUADRANT_TRANSFORM: Record<1 | 2 | 3 | 4, (x: number, y: number) => [number, number]> = {
  1: (x, y) => [x, y],
  2: (x, y) => [VIEWBOX_W - x, y],
  3: (x, y) => [x, VIEWBOX_H - y],
  4: (x, y) => [VIEWBOX_W - x, VIEWBOX_H - y],
};

// Margen fijo, chico, más allá del propio borde del diente — no es la
// distancia total (esa se calcula por diente), solo el "aire" extra para
// que el número no quede pegado al trazo.
const LABEL_MARGIN = 8;

// Diente vecino (en la secuencia real 1-8) usado para estimar la tangente
// local del arco en la posición `pos`. Para el diente 1 (pegado a la línea
// media) el "anterior" no existe dentro del cuadrante — se usa el reflejo
// del diente 2 sobre esa línea media, para que la tangente en el límite
// quede casi horizontal (apuntando hacia afuera), no hacia el diente del
// cuadrante espejado. Para el diente 8 (última muela) no hay "siguiente" —
// se repite el propio diente, dejando el tangente definido solo por el lado
// que sí existe.
function neighborTooth(pos: number, dir: 1 | -1): { cx: number; cy: number } {
  const n = pos + dir;
  if (n >= 1 && n <= 8) return TOOTH_BOX[n];
  if (n === 0) {
    const t2 = TOOTH_BOX[2];
    return { cx: 2 * MID_X - t2.cx, cy: t2.cy };
  }
  return TOOTH_BOX[8];
}

// Dirección "hacia afuera" real en la posición `pos`: perpendicular a la
// tangente local del arco (aproximada con el diente anterior/siguiente en la
// secuencia), no una línea recta desde un centro fijo — así los dientes
// vecinos se separan siguiendo la curva real en vez de converger unos sobre
// otros cerca de la línea media (ver ARCH_CENTER). De las dos perpendiculares
// posibles se elige la que apunta lejos de ARCH_CENTER (la de "afuera").
function tangentNormal(pos: number): [number, number] {
  const prev = neighborTooth(pos, -1);
  const next = neighborTooth(pos, 1);
  const tx = next.cx - prev.cx;
  const ty = next.cy - prev.cy;
  let nx = -ty;
  let ny = tx;
  const tooth = TOOTH_BOX[pos];
  const toCenterX = tooth.cx - ARCH_CENTER[0];
  const toCenterY = tooth.cy - ARCH_CENTER[1];
  if (nx * toCenterX + ny * toCenterY < 0) {
    nx = -nx;
    ny = -ny;
  }
  const d = Math.hypot(nx, ny) || 1;
  return [nx / d, ny / d];
}

// Empuja el diente en su dirección "hacia afuera" (ver tangentNormal) hasta
// SU PROPIO borde (intersección rayo-caja, usando su ancho/alto real de
// TOOTH_BOX) más el margen fijo — cada número despeja su diente exacto, sea
// angosto o ancho, sin acercarse al vecino.
function pushOutward(pos: number): [number, number] {
  const tooth = TOOTH_BOX[pos];
  const [ux, uy] = tangentNormal(pos);
  const edge = Math.min(
    ux !== 0 ? tooth.hw / Math.abs(ux) : Infinity,
    uy !== 0 ? tooth.hh / Math.abs(uy) : Infinity,
  );
  const total = edge + LABEL_MARGIN;
  return [tooth.cx + ux * total, tooth.cy + uy * total];
}

function screenPosition(realTooth: number, dentition: Dentition): { left: string; top: string } {
  const permanent = dentition === "infantil" ? realTooth - 40 : realTooth;
  const libraryPermanent = swapQuadrant34(permanent);
  const quadrant = Math.floor(libraryPermanent / 10) as 1 | 2 | 3 | 4;
  const pos = libraryPermanent % 10;
  if (!TOOTH_BOX[pos]) return { left: "0%", top: "0%" };
  const [ox, oy] = pushOutward(pos);
  const [fx, fy] = QUADRANT_TRANSFORM[quadrant](ox, oy);
  return { left: `${(fx / VIEWBOX_W) * 100}%`, top: `${(fy / VIEWBOX_H) * 100}%` };
}

// Remapea un top% relativo al viewBox COMPLETO (694) al top% local dentro de
// uno de los dos paneles recortados de la dentición infantil (ver
// INFANTIL_CROP_Y) — cada panel muestra solo INFANTIL_CROP_Y unidades de
// imagen, así que un número que en el viewBox completo caía cerca del centro
// (dentro del hueco recortado) se reubica al borde más cercano de su panel.
function panelPosition(fullTop: string, fullLeft: string): { panel: "top" | "bottom"; left: string; top: string } {
  const y = (parseFloat(fullTop) / 100) * VIEWBOX_H;
  const bottomStart = VIEWBOX_H - INFANTIL_CROP_Y;
  if (y <= bottomStart) {
    return { panel: "top", left: fullLeft, top: `${((y + INFANTIL_TOP_MARGIN) / INFANTIL_PANEL_H) * 100}%` };
  }
  return { panel: "bottom", left: fullLeft, top: `${((y - bottomStart) / INFANTIL_PANEL_H) * 100}%` };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// La condición se guarda como texto libre en la tabla `condicion` de BD — si
// hay datos previos con un valor que no coincide con ninguna de nuestras 4
// claves internas, no se debe romper la vista: se cae a "Otro" en vez de
// crashear (antes usaba `.find(...)!` sin respaldo).
const UNKNOWN_CONVENTION = { key: "hallazgo" as Convention, label: "Otro", color: "#94a3b8" };

function findConvention(key: string | undefined, conventions: any[]) {
  return conventions.find(c => c.key === key) ?? UNKNOWN_CONVENTION;
}

const odontogramaCache = new Map<string, { data: any[], conds: any[] }>();

function dominantConvention(f: SessionFinding, conventions: any[]): Convention {
  if (f.isAll && f.allConvention) return findConvention(f.allConvention, conventions).key;
  const set = new Set(f.surfaceConditions.map(sc => sc.convention));
  const priority = conventions.find(c => set.has(c.key))?.key;
  return findConvention(priority ?? f.surfaceConditions[0]?.convention, conventions).key;
}

// Color representativo de un borrador (sin guardar aún) — usado en las chips
// de "dientes seleccionados" para dar una vista previa rápida de qué se le
// asignó a cada uno. Gris neutro mientras no tenga nada registrado todavía.
function draftDominantColor(draft: ToothDraft | undefined, conventions: any[]): string {
  if (!draft) return "#cbd5e1";
  if (draft.isAll && draft.allConvention) return findConvention(draft.allConvention, conventions).color;
  const values = Object.values(draft.surfaceConventions);
  if (values.length === 0) return "#cbd5e1";
  return findConvention(values[0], conventions).color;
}

// El color de `condicion.color` puede ser muy claro (pasteles) — usarlo tal
// cual como texto sobre su propio fondo tintado lo vuelve casi ilegible. Se
// oscurece para el texto/ícono, manteniendo el tono original solo en fondo/borde.
function darkenForText(hex: string): string {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map(c => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16), g = parseInt(full.slice(2, 4), 16), b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return "#334155";
  const mix = (c: number) => Math.round(c * 0.55);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function fmtDate(d: string): { day: string; month: string } {
  const dt = new Date(d + "T12:00:00");
  return {
    day: dt.getDate().toString().padStart(2, "0"),
    month: dt.toLocaleDateString("es-PE", { month: "short" }).replace(".", "").toUpperCase(),
  };
}

// ─── Timeline de registros (HISTORIAL) ─────────────────────────────────────
// Un ítem por hallazgo, siempre desplegado (sin acordeón). Cada entrada se
// puede tocar para ver el estado del odontograma tal como quedó en esa
// sesión (misma mecánica que antes tenía el header de sesión).

function RegistroTimelineRow({ entry, isLast, showTooth, active, onClick, conventions }: {
  entry: TimelineEntry;
  isLast: boolean;
  showTooth: boolean;
  active: boolean;
  onClick: () => void;
  conventions: any[];
}) {
  const { session: s, finding } = entry;
  const fdate = fmtDate(s.fecha);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${active ? "bg-cyan-600" : "bg-slate-300"}`} />
        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1" />}
      </div>

      <button
        type="button"
        onClick={onClick}
 className={`flex-1 min-w-0 text-left rounded-xl p-3 mb-3 border transition-colors ${active ? "border-cyan-500 bg-cyan-50/20" : "border-slate-200 bg-white hover:border-slate-300"}`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
          <div className="flex items-baseline gap-1">
 <span className="text-[13px] font-bold text-slate-700">{fdate.day}</span>
 <span className="text-[10px] font-bold text-slate-400 uppercase">{fdate.month}</span>
          </div>
          {showTooth && (
 <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
 <Icon name="dentistry" size={12} className="text-slate-400"/>
              #{finding.toothNumber} · {TOOTH_NAMES[finding.toothNumber]}
            </span>
          )}
 <span className="text-[11px] text-slate-400 truncate">{s.dentista}</span>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {finding.isAll && finding.allConvention ? (() => {
            const conv = findConvention(finding.allConvention, conventions);
            return (
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: conv.color + "55", borderColor: conv.color + "cc", color: darkenForText(conv.color) }}>
                completo · {conv.label}
              </span>
            );
          })() : finding.surfaceConditions.map(sc => {
            const conv = findConvention(sc.convention, conventions);
            const surf = SURFACES.find(x => x.key === sc.surface);
            return (
              <span key={sc.surface} className="text-[10px] font-semibold px-2.5 py-1 rounded-full border"
                style={{ background: conv.color + "55", borderColor: conv.color + "cc", color: darkenForText(conv.color) }}>
                {surf?.label.toLowerCase()} · {conv.label}
              </span>
            );
          })}
        </div>

        {finding.observaciones && (
 <p className="text-[11px] italic text-slate-500 bg-slate-50 rounded-lg border border-slate-100 px-2.5 py-1.5">
            {finding.observaciones}
          </p>
        )}
      </button>
    </div>
  );
}

function RegistroTimeline({ entries, expandedSessionId, onToggleSession, showTooth, conventions, emptyLabel = "Sin registros aún" }: {
  entries: TimelineEntry[];
  expandedSessionId: string | null;
  onToggleSession: (id: string) => void;
  showTooth: boolean;
  conventions: any[];
  emptyLabel?: string;
}) {
  if (entries.length === 0) {
    return (
 <div className="text-center p-6 border border-dashed rounded-xl border-slate-200">
 <Icon name="history" size={24} className="text-slate-300 mx-auto mb-2"/>
 <p className="text-[12px] text-slate-400 italic">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {entries.map((entry, i) => (
        <RegistroTimelineRow
          key={entry.finding.id}
          entry={entry}
          isLast={i === entries.length - 1}
          showTooth={showTooth}
          active={expandedSessionId === entry.session.id}
          onClick={() => onToggleSession(entry.session.id)}
          conventions={conventions}
        />
      ))}
    </div>
  );
}

// ─── Filtros del Historial (mes/año + diente) — mismo patrón de "filtro
// maestro" con tags que Diagnóstico/Presupuestos: un botón ☰ agrega/quita la
// categoría de filtro (sin valor propio), y cada categoría activa aparece
// como un tag cian con su propio dropdown para elegir el valor; el tag se
// quita con su × sin afectar a los demás. */

type HistorialFilterKey = "diente" | "mes";
const HISTORIAL_FILTER_CATEGORIES: Record<HistorialFilterKey, FilterCategoryMeta> = {
  diente: { label: "Diente", icon: "dentistry" },
  mes: { label: "Mes", icon: "calendar_today" },
};

// ─── Tags de un borrador (superficies asignadas / resumen) ────────────────────
// Mismo componente para "Superficies asignadas" (removible, del diente activo)
// y "Resumen" (solo lectura, uno por cada diente seleccionado).

function DraftTags({ draft, conventions, removable, onRemoveSurface, onRemoveAll }: {
  draft: ToothDraft;
  conventions: any[];
  removable?: boolean;
  onRemoveSurface?: (s: Surface) => void;
  onRemoveAll?: () => void;
}) {
  if (draft.isAll && draft.allConvention) {
    const conv = findConvention(draft.allConvention, conventions);
    return (
      <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-semibold border"
        style={{ background: conv.color + "1a", borderColor: conv.color + "55", color: darkenForText(conv.color) }}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: conv.color }} />
        Diente completo · {conv.label}
        {removable && (
          <button type="button" onClick={onRemoveAll} className="w-3.5 h-3.5 rounded-full hover:bg-black/10 flex items-center justify-center text-[10px] ml-0.5 border-0 bg-transparent">×</button>
        )}
      </span>
    );
  }

  const entries = Object.entries(draft.surfaceConventions) as [Surface, Convention][];
  if (entries.length === 0) {
 return <span className="text-[11px] text-slate-400 italic">Sin superficies registradas</span>;
  }

  return (
    <>
      {entries.map(([s, c]) => {
        const conv = findConvention(c, conventions);
        return (
          <span key={s} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-semibold border"
            style={{ background: conv.color + "1a", borderColor: conv.color + "55", color: darkenForText(conv.color) }}>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: conv.color }} />
            {SURFACE_INITIAL[s]} · {conv.label}
            {removable && (
              <button type="button" onClick={() => onRemoveSurface?.(s)} className="w-3.5 h-3.5 rounded-full hover:bg-black/10 flex items-center justify-center text-[10px] ml-0.5 border-0 bg-transparent">×</button>
            )}
          </span>
        );
      })}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OdontogramaTab({ paciente, consultaId, onNavigateTab }: { paciente: any; consultaId?: string; onNavigateTab?: (tab: string) => void }) {
  // El registro de hallazgos solo ocurre dentro de una consulta activa; la
  // Ficha del Paciente (sin consultaId) es de solo lectura del historial.
  const isEditable = !!consultaId;

  // La dentición no es una elección libre: depende de la edad real del
  // paciente. Sólo se ofrece el selector en la ventana de dentición mixta
  // (~6-13 años, donde de verdad puede haber piezas permanentes y deciduas
  // a la vez); fuera de ese rango se muestra directamente la que corresponde.
  const edadPaciente = paciente?.fecha_nacimiento ? calcEdad(paciente.fecha_nacimiento) : null;
  const defaultDentition: Dentition = edadPaciente !== null && edadPaciente < 12 ? "infantil" : "adulto";
  const showDentitionToggle = edadPaciente !== null && edadPaciente >= 6 && edadPaciente <= 13;

  const [conventions, setConventions] = useState<{ key: string, label: string, color: string }[]>([]);
  const [dentition, setDentition] = useState<Dentition>(defaultDentition);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [chartResetKey, setChartResetKey] = useState(0);

  // Filtros del Historial de Exámenes — por mes/año y/o número de diente.
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroDiente, setFiltroDiente] = useState<number | "">("");
  const [activeFilterTags, setActiveFilterTags] = useState<Set<HistorialFilterKey>>(new Set());
  const toggleFilterTag = (k: HistorialFilterKey) => {
    setActiveFilterTags(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };
  const removeFilterTag = (k: HistorialFilterKey) => {
    setActiveFilterTags(prev => { const next = new Set(prev); next.delete(k); return next; });
    if (k === "diente") setFiltroDiente("");
    else if (k === "mes") setFiltroMes("");
  };

  // En mobile, fuera de una consulta activa, no se ve el panel de Historial
  // — tocar un diente en el odontograma abre su historial acá, en un modal.
  const [mobileToothModal, setMobileToothModal] = useState<number | null>(null);

  // ── Selección múltiple de dientes ────────────────────────────────────────
  // `selectedTeeth` refleja lo que react-odontogram tiene marcado (ya no usa
  // `singleSelect`); cada diente seleccionado tiene su propio borrador
  // (superficies/condición/observaciones) en `drafts`, independiente de los
  // demás. `activeTooth` es cuál de esos borradores se está editando ahora
  // mismo (el panel de la derecha siempre edita uno solo a la vez).
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [activeTooth, setActiveTooth] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, ToothDraft>>({});
  const [activeSurfaces, setActiveSurfaces] = useState<Set<Surface>>(new Set());
  const prevSelectedRef = useRef<number[]>([]);
  // Tablet además de mobile: el editor de Registro clínico solo se abre en
  // modal por debajo de 1024px, dejando el panel inline solo para desktop.
  const isCompactViewer = useIsMobile(1024);
  // Mobile "real" (< md, 768px) — fuera de una consulta activa determina si
  // el odontograma es clickeable (para abrir el modal de historial por
  // diente) y si el panel de Historial se muestra inline o no.
  const isMobile = useIsMobile();
  const toast = useToast();
  const confirm = useConfirm();
  const fetchOdontogramas = async (force = false) => {
    if (!force && odontogramaCache.has(String(paciente.id))) {
      const cached = odontogramaCache.get(String(paciente.id))!;
      setSessions(cached.data);
      setConventions(cached.conds);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [data, conds] = await Promise.all([
      getOdontogramasAction(String(paciente.id)),
      getCondicionesOdontogramaAction()
    ]);
    const mappedConds = conds.map((c: any) => {
      const raw = String(c.condicion || "").toLowerCase();
      const label = raw.replace(/\b\w/g, (match) => match.toUpperCase());
      return {
        key: String(c.id),
        label,
        color: c.color || "#94a3b8" // Default slate-400 if no color
      };
    });
    setConventions(mappedConds);
    setSessions(data as ExamSession[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchOdontogramas();
  }, [paciente.id]);

  const isViewingSession = !!expandedSessionId;
  const selectedSession = sessions.find(s => s.id === expandedSessionId) ?? null;

  const combinedFindings = useMemo(
    () => [...sessions].reverse().flatMap(s => s.findings),
    [sessions],
  );

  const chartFindings = selectedSession ? selectedSession.findings : combinedFindings;

  // Sólo se muestran en el odontograma los hallazgos de la dentición activa
  // (permanente 11-48 vs decidua 51-85) — un paciente en transición puede
  // tener registros de ambas.
  const visibleFindings = useMemo(
    () => chartFindings.filter(f => (dentition === "adulto" ? isAdultCode(f.toothNumber) : !isAdultCode(f.toothNumber))),
    [chartFindings, dentition],
  );

  const teethConditions = useMemo(() => {
    // 1. Determinar la condición definitiva (la última cronológicamente) por cada diente
    const finalToothConv = new Map<string, string>();
    for (const f of visibleFindings) {
      const conv = dominantConvention(f, conventions);
      const libId = toLibraryId(f.toothNumber, dentition);
      // Dado que visibleFindings procesa desde el más antiguo al más reciente
      // el último en registrarse para este diente sobrescribirá a los anteriores.
      finalToothConv.set(libId, conv);
    }

    // 2. Agrupar por condición para dárselo a la librería
    const byConv = new Map<Convention, string[]>();
    for (const [libId, conv] of finalToothConv.entries()) {
      const list = byConv.get(conv) ?? [];
      list.push(libId);
      byConv.set(conv, list);
    }

    return conventions.filter(c => byConv.has(c.key)).map(c => ({
      label: c.label,
      teeth: byConv.get(c.key)!,
      fillColor: c.color,
      outlineColor: c.color,
    }));
  }, [visibleFindings, dentition, conventions]);

  // Numeración de cada pieza, siempre visible sobre el gráfico (antes solo
  // aparecía al pasar el cursor, vía tooltip). Depende únicamente de la
  // dentición activa — no de los hallazgos registrados.
  const toothLabels = useMemo(() => {
    const quadrantes = dentition === "adulto" ? [1, 2, 3, 4] : [5, 6, 7, 8];
    const piezasPorCuadrante = dentition === "adulto" ? 8 : 5;
    const list: { num: number; left: string; top: string }[] = [];
    for (const q of quadrantes) {
      for (let i = 1; i <= piezasPorCuadrante; i++) {
        const num = q * 10 + i;
        list.push({ num, ...screenPosition(num, dentition) });
      }
    }
    return list;
  }, [dentition]);

  // Solo se usa en dentición infantil, para repartir toothLabels entre los
  // dos paneles recortados (ver INFANTIL_CROP_Y).
  const panelLabels = useMemo(
    () => toothLabels.map(t => ({ num: t.num, ...panelPosition(t.top, t.left) })),
    [toothLabels],
  );

  const sessionsSorted = useMemo(
    () => [...sessions].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [sessions],
  );

  // Dientes con al menos un registro — opciones reales del filtro (nunca inventadas).
  const dientesConRegistro = useMemo(
    () => Array.from(new Set(sessionsSorted.flatMap(s => s.findings.map(f => f.toothNumber)))).sort((a, b) => a - b),
    [sessionsSorted],
  );

  // Timeline de registros: un ítem por hallazgo (no por sesión) — cada
  // control dental puede haber tratado varios dientes, y cada uno se ve como
  // una entrada propia en la línea de tiempo.
  const timelineEntries = useMemo(
    () => sessionsSorted.flatMap(s => s.findings.map(f => ({ session: s, finding: f }))),
    [sessionsSorted],
  );

  const timelineEntriesFiltradas = useMemo(
    () => timelineEntries.filter(e =>
      (!filtroMes || e.session.fecha.slice(0, 7) === filtroMes) &&
      (filtroDiente === "" || e.finding.toothNumber === filtroDiente)
    ),
    [timelineEntries, filtroMes, filtroDiente],
  );

  function resetSelection() {
    setSelectedTeeth([]);
    setDrafts({});
    setActiveTooth(null);
    setActiveSurfaces(new Set());
    prevSelectedRef.current = [];
  }

  function clearSelection() {
    resetSelection();
    setChartResetKey(k => k + 1); // el paquete no expone forma de deseleccionar desde afuera — se remonta el SVG
  }

  function toggleSession(id: string) {
    resetSelection();
    setExpandedSessionId(expandedSessionId === id ? null : id);
    setChartResetKey(k => k + 1);
  }

  // Núcleo de "cambió la selección de dientes", independiente de quién lo
  // dispare — el <Odontogram> de la librería (desktop) o la grilla custom de
  // mobile (ver MobileOdontogramaGrid), que no pasa por la librería en
  // absoluto y por lo tanto no necesita el workaround de setTimeout de abajo.
  function applySelectedTeeth(nums: number[]) {
    const prev = prevSelectedRef.current;
    const added = nums.find(n => !prev.includes(n));
    prevSelectedRef.current = nums;

    setSelectedTeeth(nums);
    if (isViewingSession) return;

    if (added !== undefined) {
      // Diente nuevo en la selección — le da su propio borrador y pasa a ser
      // el que se edita en el panel de la derecha.
      setDrafts(d => (d[added] ? d : { ...d, [added]: emptyDraft() }));
      setActiveTooth(added);
      setActiveSurfaces(new Set());
    } else if (nums.length > 0) {
      // Se quitó un diente de la selección (clic de nuevo sobre uno ya
      // marcado) — si era el que se estaba editando, pasa a editar otro.
      setActiveTooth(at => (at !== null && nums.includes(at) ? at : nums[nums.length - 1]));
      setActiveSurfaces(new Set());
    } else {
      setActiveTooth(null);
    }
  }

  function handleOdontogramChange(selected: ToothDetail[]) {
    // react-odontogram llama a onChange desde dentro del updater de su propio
    // setState interno (no desde el evento de clic directamente), lo que dispara
    // "Cannot update a component while rendering a different component" si
    // actualizamos nuestro estado de forma síncrona. setTimeout(0) lo saca por
    // completo del ciclo de render/commit actual (más confiable que un microtask,
    // que aún puede correr antes de que React termine de confirmar la actualización).
    setTimeout(() => {
      const nums = selected.map(d => fromLibraryFdi(d.notations.fdi, dentition));
      // Fuera de una consulta activa no hay nada que editar — acá el toque
      // en un diente solo sirve para abrir su historial en el modal de
      // mobile (el gráfico solo es clickeable en ese caso, ver `readOnly`
      // de <Odontogram> más abajo).
      if (!isEditable) {
        if (nums.length > 0) setMobileToothModal(nums[nums.length - 1]);
        return;
      }
      applySelectedTeeth(nums);
    }, 0);
  }

  function changeDentition(next: Dentition) {
    setDentition(next);
    resetSelection();
    setChartResetKey(k => k + 1);
  }

  function currentDraft(): ToothDraft {
    return (activeTooth !== null && drafts[activeTooth]) || emptyDraft();
  }

  function updateActiveDraft(patch: Partial<ToothDraft>) {
    if (activeTooth === null) return;
    const tooth = activeTooth;
    setDrafts(d => ({ ...d, [tooth]: { ...(d[tooth] ?? emptyDraft()), ...patch } }));
  }

  function toggleAll() {
    const draft = currentDraft();
    if (!draft.isAll) setActiveSurfaces(new Set());
    updateActiveDraft({ isAll: !draft.isAll, ...(!draft.isAll ? { surfaceConventions: {} } : {}) });
  }

  function handleSelectSurface(s: Surface) {
    setActiveSurfaces(prev => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }

  // Aplica la condición elegida a todas las superficies seleccionadas a la vez
  // (antes solo se podía asignar de a una superficie por vez).
  function assignConvention(conv: Convention) {
    const draft = currentDraft();
    if (draft.isAll) { updateActiveDraft({ allConvention: conv }); return; }
    if (activeSurfaces.size === 0) return;
    const nextSurfaceConventions = { ...draft.surfaceConventions };
    activeSurfaces.forEach(s => { nextSurfaceConventions[s] = conv; });
    updateActiveDraft({ surfaceConventions: nextSurfaceConventions });
    setActiveSurfaces(new Set());
  }

  function removeSurfaceConvention(s: Surface) {
    const draft = currentDraft();
    const next = { ...draft.surfaceConventions };
    delete next[s];
    updateActiveDraft({ surfaceConventions: next });
    setActiveSurfaces(prev => {
      if (!prev.has(s)) return prev;
      const next = new Set(prev);
      next.delete(s);
      return next;
    });
  }

  function clearAllConvention() {
    updateActiveDraft({ isAll: false, allConvention: null });
  }

  // Copia el borrador del diente activo (superficies/condición/observaciones)
  // a los demás dientes seleccionados — atajo para no repetir la misma
  // condición diente por diente cuando aplica a todos por igual.
  function applyActiveToAll() {
    if (activeTooth === null) return;
    const draft = currentDraft();
    setDrafts(d => {
      const next = { ...d };
      for (const t of selectedTeeth) {
        if (t === activeTooth) continue;
        next[t] = { ...draft, surfaceConventions: { ...draft.surfaceConventions } };
      }
      return next;
    });
  }

  const readyTeeth = selectedTeeth.filter(t => {
    const d = drafts[t];
    if (!d) return false;
    return d.isAll ? !!d.allConvention : Object.keys(d.surfaceConventions).length > 0;
  });

  async function addRecords() {
    if (!isEditable || isViewingSession || readyTeeth.length === 0) return;

    setSaving(true);
    let firstError: string | null = null;
    for (const tooth of readyTeeth) {
      const d = drafts[tooth];
      const res = await addFindingAction({
        consulta_id: String(consultaId),
        diente: tooth,
        isAll: d.isAll,
        allConvention: d.isAll ? (d.allConvention ?? undefined) : undefined,
        surfaceConditions: d.isAll ? [] : Object.entries(d.surfaceConventions).map(([s, c]) => ({
          surface: s as string, convention: c as string,
        })),
        observaciones: d.observaciones,
      });
      if (res?.error && !firstError) firstError = res.error;
    }
    setSaving(false);

    if (!firstError) {
      toast.success(readyTeeth.length > 1 ? `${readyTeeth.length} registros guardados correctamente` : "Registro guardado correctamente");
      clearSelection();
      fetchOdontogramas(); // Recargar datos
    } else {
      toast.error("Error al guardar: " + firstError);
    }
  }

  async function handleUpdateFindingObs(finding: SessionFinding, obs: string) {
    setSaving(true);
    const res = await updateFindingAction(finding.db_ids.map(String), obs);
    setSaving(false);
    if (!res?.error) {
      fetchOdontogramas(true);
    }
  }

  async function handleDeleteFinding(finding: SessionFinding) {
    const ok = await confirm({
      title: "Eliminar hallazgo",
      message: `¿Seguro que deseas eliminar el registro del diente #${finding.toothNumber}? Esta acción no se puede deshacer.`,
      confirmLabel: "Sí, eliminar",
    });
    if (!ok) return;
    setSaving(true);
    const res = await deleteFindingAction(finding.db_ids.map(String));
    setSaving(false);
    if (!res?.error) {
      fetchOdontogramas(true);
    }
  }

  const activeDraft = currentDraft();
  const canPickConv = activeDraft.isAll || activeSurfaces.size > 0;

  const convPickerLabel = activeDraft.isAll
    ? "Condición — diente completo"
    : activeSurfaces.size === 1
      ? `Condición — ${SURFACES.find(s => s.key === [...activeSurfaces][0])?.label}`
      : activeSurfaces.size > 1
        ? `Condición — ${activeSurfaces.size} superficies`
        : "Condición";

  // El lado "Registro clínico" solo tiene sentido dentro de una consulta activa
  // y mientras no se esté revisando el historial — fuera de eso, la tarjeta
  // muestra solo el odontograma (de solo lectura), sin dividir en dos lados.
  const showRegistro = isEditable && !isViewingSession;

  // Contenido del editor del diente activo — compartido entre el layout
  // inline (desktop/tablet) y el bottom sheet (mobile, ver más abajo). Ya no
  // tiene su propio scroll, scrollea junto con todo el panel que lo contenga.
  const registroEditorContent = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
 <span className="text-[13px] font-bold text-slate-800">#{activeTooth}</span>
          {activeTooth !== null && TOOTH_NAMES[activeTooth] && (
 <span className="text-[11.5px] text-slate-400">{TOOTH_NAMES[activeTooth]}</span>
          )}
          {activeDraft.isAll ? (
 <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">
              Diente completo registrado
            </span>
          ) : Object.keys(activeDraft.surfaceConventions).length > 0 && (
 <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">
              {Object.keys(activeDraft.surfaceConventions).length} superficie{Object.keys(activeDraft.surfaceConventions).length > 1 ? "s" : ""} registrada{Object.keys(activeDraft.surfaceConventions).length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {selectedTeeth.length > 1 && (
 <button onClick={applyActiveToAll} className="text-[12.5px] font-semibold text-cyan-700 border border-cyan-300 rounded-lg px-3 py-1.5 bg-transparent hover:bg-cyan-50 transition-colors">
            Aplicar a todos los dientes
          </button>
        )}
      </div>

 <button onClick={toggleAll} className={`self-start flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors ${activeDraft.isAll ? "bg-cyan-600 text-white border-cyan-600" : "border-slate-200 text-slate-500 bg-white"}`}>
 <Icon name="tooth" size={13} className={activeDraft.isAll ? "text-white" : "text-slate-400"} />
        Diente completo
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Superficie */}
        <div className={activeDraft.isAll ? "opacity-40 pointer-events-none" : ""}>
 <p className="text-[13px] font-bold text-slate-700 mb-1.5">Superficie</p>
          <div className="flex flex-wrap gap-1.5">
            {SURFACES.map(s => {
              const conv = activeDraft.surfaceConventions[s.key] ? conventions.find(c => c.key === activeDraft.surfaceConventions[s.key]) : null;
              const isActv = activeSurfaces.has(s.key);
              return (
                <button key={s.key} type="button" onClick={() => handleSelectSurface(s.key)}
 className={`flex items-center gap-1.5 pl-2.5 pr-1.5 py-1.5 rounded-xl text-[11.5px] font-semibold border transition-all ${isActv && !conv ? "border-cyan-400 bg-cyan-50 text-cyan-700": !conv ? "border-slate-200 text-slate-600 bg-white" : ""
 } ${isActv && conv ? "ring-2 ring-cyan-500 ring-offset-1 ring-offset-slate-50" : ""}`}
                  style={conv ? { background: conv.color + "1a", color: darkenForText(conv.color), borderColor: isActv ? conv.color : conv.color + "55" } : undefined}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: conv ? conv.color : "#cbd5e1" }} />
                  {s.label}
                  {conv && (
                    <span onClick={e => { e.stopPropagation(); removeSurfaceConvention(s.key); }}
                      className="w-3.5 h-3.5 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-[9px] ml-0.5">×</span>
                  )}
                </button>
              );
            })}
          </div>
          {activeSurfaces.size > 1 && (
 <p className="text-[10.5px] text-cyan-600 font-medium mt-1.5">
              {activeSurfaces.size} superficies seleccionadas — elige una condición para aplicarla a todas.
            </p>
          )}
        </div>

        {/* Condición — el color de cada opción es la única leyenda */}
        <div>
 <p className="text-[13px] font-bold text-slate-700 mb-1.5">{convPickerLabel}</p>
          <div className={`flex flex-wrap gap-1.5 ${!canPickConv ? "pointer-events-none" : ""}`}>
            {conventions.map(c => {
              const isActive = activeDraft.isAll ? activeDraft.allConvention === c.key : false;
              return (
                <button key={c.key} onClick={() => assignConvention(c.key)}
 className={`px-3 py-2 rounded-full text-[12px] font-semibold border transition-all shadow-sm ${isActive ? "ring-2 ring-offset-2 ring-offset-slate-50 ring-cyan-500" : ""} ${!canPickConv ? "grayscale opacity-60" : ""}`}
                  style={{ background: c.color + "66", borderColor: c.color + "cc", color: darkenForText(c.color) }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {/* Sin esto, el bloque deshabilitado se lee como roto en vez
              de "elige primero una superficie" — Vestibular puede verse
              "seleccionada" (tiene condición asignada) sin estar activa
              para edición, lo cual confunde si no se explica. */}
          {!canPickConv && (
 <p className="text-[11px] text-slate-400 mt-1.5">Toca una superficie arriba para asignarle una condición.</p>
          )}
        </div>
      </div>

      {/* Superficies asignadas — tags removibles del diente activo */}
      <div>
 <p className="text-[13px] font-bold text-slate-700 mb-1.5">Superficies asignadas</p>
        <div className="flex flex-wrap gap-1.5">
          <DraftTags draft={activeDraft} conventions={conventions} removable onRemoveSurface={removeSurfaceConvention} onRemoveAll={clearAllConvention} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1 gap-2">
 <p className="text-[13px] font-bold text-slate-700">Observaciones</p>
          {selectedTeeth.length > 1 && (
            <Select
              value={String(activeTooth ?? "")}
              onChange={v => { setActiveTooth(Number(v)); setActiveSurfaces(new Set()); }}
              options={selectedTeeth.map(t => ({ value: String(t), label: `Diente #${t}` }))}
              className="w-36"
            />
          )}
        </div>
        <textarea rows={3} value={activeDraft.observaciones} onChange={e => updateActiveDraft({ observaciones: e.target.value })}
          placeholder="Escribe detalles del hallazgo clínico…"
 className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none text-[16px] sm:text-[13px]"
        />
        {/* La BD guarda la observación pegada a una superficie/condición — un
            diente sin ninguna asignada no tiene dónde guardarla, aunque tenga
            texto escrito. Avisa ANTES de que se pierda al guardar. */}
        {activeDraft.observaciones.trim().length > 0 && !(activeDraft.isAll ? activeDraft.allConvention : Object.keys(activeDraft.surfaceConventions).length > 0) && (
 <p className="text-[11px] text-amber-600 font-medium mt-1.5 flex items-center gap-1">
            <Icon name="warning" size={13} className="shrink-0" />
            Esta observación no se guardará si al diente #{activeTooth} no le asignas al menos una superficie (o "Diente completo") con una condición.
          </p>
        )}
      </div>
    </div>
  );

  if (loading) return <OdontogramaSkeleton />;

  // Compartido entre el título mobile (arriba, junto a Historial) y la fila
  // propia de tablet/desktop (dentro de la columna del odontograma).
  const dentitionControl = showDentitionToggle ? (
    // Dentición mixta (~6-13 años): el doctor puede necesitar alternar entre
    // piezas permanentes y deciduas en la misma visita.
 <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit shrink-0">
      {(["adulto", "infantil"] as Dentition[]).map(d => (
        <button key={d}
          onClick={() => changeDentition(d)}
 className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[12px] font-bold transition-colors outline-none ${dentition === d ? "bg-cyan-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Icon name={d === "adulto" ? "person" : "cake"} size={13} />
          {d === "adulto" ? "Adulto" : "Infantil"}
        </button>
      ))}
    </div>
  ) : (
    // Fuera de la ventana de transición: la dentición se determina sola por edad.
 <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-[12px] font-bold text-slate-600 w-fit shrink-0">
 <Icon name={dentition === "adulto" ? "person" : "cake"} size={13} className="text-slate-400"/>
      {dentition === "adulto" ? "Adulta" : "Infantil"}
    </span>
  );

  return (
    <>
 <div className="flex flex-col w-full md:h-full relative bg-white">

      {/* Título + descripción — mismo diseño en todos los breakpoints. Pegado
          (sticky) justo debajo del navbar de tabs, mismo fondo blanco y sin
          espacio entre ambos, para que se lea como una sola pieza — el
          separador gris queda abajo, pegado al contenido. La dentición vive
          en esta misma fila, junto al título, en todos los breakpoints. */}
      {!isEditable && (
 <div className="sticky top-0 z-20 px-4 sm:px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-3">
 <div className="flex items-center gap-3">
 <h2 className="text-[15px] font-bold text-slate-800">Odontograma</h2>
              {dentitionControl}
            </div>
          </div>
 <p className="hidden md:block text-[12px] text-slate-400 mt-1.5 leading-snug">Estado dental actual y marcaciones por pieza</p>
        </div>
      )}

      {/* Sin tarjeta/contenedor propio — el odontograma y el registro clínico
          quedan directamente sobre el fondo blanco de la vista; el trazo
          (border-r en desktop, border-b en mobile) es lo único que los separa. */}
      <div className="flex flex-col md:flex-row w-full md:flex-1 md:min-h-0">

 <div className="w-full flex flex-col items-center p-6 sm:p-8 border-b md:border-b-0 md:border-r border-slate-200 bg-white md:min-h-0 md:flex-none md:w-[26rem] xl:w-[30rem]">
          <div className="w-full flex justify-center flex-1 min-h-0">
          <div className="flex w-full gap-6 min-h-0 justify-center">
            {/* DERECHA — convención odontológica: el lado derecho del paciente
                se dibuja a la izquierda de la imagen, arriba y abajo por igual.
                Va en el borde exterior de toda la columna (no pegada al
                gráfico) y se lee de abajo hacia arriba — al revés de
                IZQUIERDA — para que ambas "apunten" hacia el centro. */}
            <span
 className="shrink-0 flex items-center justify-center text-[16px] font-bold tracking-widest text-slate-400"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
            >
              DERECHA
            </span>

            {/* El diente graficado llena el alto disponible del panel (el
                mismo que reciben el resto de las pestañas — cadena de
                md:h-full / md:flex-1 / md:min-h-0 desde el contenedor de la
                pestaña "Dental" hasta acá) y el ancho se deriva de ese alto
                manteniendo la proporción real del viewBox (409x694) vía
                aspect-ratio — así nunca se recorta ni exige scroll propio,
                sea cual sea el alto real de la pantalla. El padding del
                contenedor (p-6/p-8 de arriba) es lo que le da aire al
                gráfico respecto al borde del panel, no un padding sobre el
                propio SVG. La dentición infantil (2 paneles recortados y
                apilados) sigue calculándose por ancho, como antes. */}
            <div className={`min-w-0 ${dentition === "adulto" ? "max-h-full max-w-[calc(100%-1rem)] md:max-w-full aspect-[409/694] h-full" : "self-start w-full max-w-56 sm:max-w-64"}`}>
            {dentition === "adulto" ? (
              <div className="relative w-full h-full">
                <Odontogram
                  key={`${dentition}-${chartResetKey}`}
                  theme="light"
                  layout="circle"
                  maxTeeth={8}
                  readOnly={isEditable ? isViewingSession : !isMobile}
                  showTooltip={false}
                  showLabels={false}
                  teethConditions={teethConditions}
                  onChange={handleOdontogramChange}
                />

                {/* Overlay de orientación — maxilar sup./inf., regiones 1-4 y
                      numeración de cada pieza. Puramente visual (pointer-events-none),
                      los clics siguen yendo al SVG de abajo. */}
                <div className="absolute inset-0 pointer-events-none select-none">
 <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] font-bold text-slate-500" style={{ top: "44%" }}>
                    Maxilar superior
                  </span>
                  {/* Separador entre maxilar superior e inferior */}
 <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 h-px w-1/3 bg-slate-200" style={{ top: "50%" }} />
 <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[12px] font-bold text-slate-500" style={{ top: "56%" }}>
                    Maxilar inferior
                  </span>

                  {toothLabels.map(t => (
                    <span
                      key={t.num}
 className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500"
                      style={{ left: t.left, top: t.top }}
                    >
                      {t.num}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              // Dentición infantil (5 piezas/cuadrante): el arco completo de
              // 694 unidades deja un hueco enorme en el centro entre maxilar
              // superior e inferior (ver INFANTIL_CROP_Y). En vez de un
              // scaleY (que encogería los dientes junto con el hueco), se
              // recorta el mismo SVG en dos paneles — cada uno muestra solo
              // su franja real de contenido — y se apilan pegados.
              <div className="flex flex-col gap-2">
                <div className="relative w-full overflow-hidden" style={{ height: 0, paddingBottom: `${(INFANTIL_PANEL_H / VIEWBOX_W) * 100}%` }}>
                  <div className="absolute left-0 w-full" style={{ top: 0, transform: `translateY(${(INFANTIL_TOP_MARGIN / VIEWBOX_H) * 100}%)` }}>
                    <Odontogram
                      key={`${dentition}-${chartResetKey}-top`}
                      theme="light"
                      layout="circle"
                      maxTeeth={5}
                      readOnly={isEditable ? isViewingSession : !isMobile}
                      showTooltip={false}
                      showLabels={false}
                      teethConditions={teethConditions}
                      onChange={handleOdontogramChange}
                    />
                  </div>
                  <div className="absolute inset-0 pointer-events-none select-none">
                    {panelLabels.filter(p => p.panel === "top").map(p => (
                      <span
                        key={p.num}
 className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500"
                        style={{ left: p.left, top: p.top }}
                      >
                        {p.num}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Maxilar superior/inferior flanqueando el separador central —
                    igual que en dentición adulta, donde ambos textos y la
                    línea viven juntos en el hueco entre los dos arcos. */}
 <p className="text-center text-[12px] font-bold text-slate-500 mb-0">Maxilar superior</p>
 <div className="h-px w-1/3 mx-auto bg-slate-200"/>
 <p className="text-center text-[12px] font-bold text-slate-500 mt-0">Maxilar inferior</p>

                <div className="relative w-full overflow-hidden" style={{ height: 0, paddingBottom: `${(INFANTIL_PANEL_H / VIEWBOX_W) * 100}%` }}>
                  <div className="absolute left-0 w-full" style={{ top: 0, transform: `translateY(-${((VIEWBOX_H - INFANTIL_CROP_Y) / VIEWBOX_H) * 100}%)` }}>
                    <Odontogram
                      key={`${dentition}-${chartResetKey}-bottom`}
                      theme="light"
                      layout="circle"
                      maxTeeth={5}
                      readOnly={isEditable ? isViewingSession : !isMobile}
                      showTooltip={false}
                      showLabels={false}
                      teethConditions={teethConditions}
                      onChange={handleOdontogramChange}
                    />
                  </div>
                  <div className="absolute inset-0 pointer-events-none select-none">
                    {panelLabels.filter(p => p.panel === "bottom").map(p => (
                      <span
                        key={p.num}
 className="absolute -translate-x-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500"
                        style={{ left: p.left, top: p.top }}
                      >
                        {p.num}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            </div>

            {/* IZQUIERDA — lado izquierdo del paciente, a la derecha de la imagen.
                Se lee de arriba hacia abajo (al revés de DERECHA). */}
            <span
 className="shrink-0 flex items-center justify-center text-[16px] font-bold tracking-widest text-slate-400"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              IZQUIERDA
            </span>
          </div>
          </div>

        </div>

        {/* Columna del historial — crece para llenar el resto de la fila,
            pero su contenido real (tope md:max-w-[620px]) queda centrado
            dentro de ese espacio en vez de pegado al borde del odontograma.
            Fuera de una consulta activa, en mobile no se muestra: solo se ve
            el odontograma, y el historial de cada diente se abre en un modal
            al tocarlo (ver mobileToothModal más abajo). Tablet ya se
            considera "desktop" para este layout (md:, no lg:). */}
        <div className={`w-full md:flex-1 md:h-full min-w-0 md:flex justify-center ${isEditable ? "flex" : "hidden"}`}>
        {/* En consulta activa (isEditable) todo el panel es una sola región de
            scroll, acotada a la altura del odontograma. Fuera de consulta,
            el panel no scrollea como bloque — solo la lista de registros de
            más abajo lo hace, quedando el título y los filtros siempre fijos. */}
        <div
          className={`w-full md:min-w-[360px] xl:min-w-[440px] md:max-w-[620px] md:h-full md:min-h-0 min-w-0 flex flex-col gap-3 p-4 sm:p-6 bg-white ${isEditable ? "md:overflow-y-auto md:overflow-x-visible no-scrollbar overscroll-contain" : ""}`}
        >
          {showRegistro && (
            <>
              <div>
 <h3 className="text-[14px] font-bold text-slate-800">Registro clínico</h3>
 <p className="text-[11px] text-slate-400">Cada superficie puede tener su propia condición</p>
              </div>

              {/* Dientes seleccionados */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dientes seleccionados</p>
                  {selectedTeeth.length > 0 && (
 <button onClick={clearSelection} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-red-600 border border-red-300 rounded-lg px-3 py-1.5 bg-transparent hover:bg-red-50 transition-colors">
                      <Icon name="eraser" size={14} />
                      Limpiar selección
                    </button>
                  )}
                </div>

                {selectedTeeth.length === 0 ? (
                  <div className="flex flex-col gap-2">
 <div className="border border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center text-center gap-1">
 <Icon name="lightbulb" size={22} className="text-slate-300 mb-1"/>
 <p className="text-[13px] font-semibold text-slate-500">Toca uno o más dientes en el odontograma</p>
 <p className="text-[11px] text-slate-400">Cada superficie puede tener su propia condición</p>
                    </div>
 <div className="rounded-xl bg-slate-100 text-slate-400 text-[12px] font-semibold text-center py-2.5">
                      Selecciona dientes en el odontograma
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTeeth.map(t => {
                      const isActive = activeTooth === t;
                      return (
                        <button key={t} type="button" onClick={() => { setActiveTooth(t); setActiveSurfaces(new Set()); }}
 className={`flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${isActive ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 text-slate-600 bg-white"
                            }`}
                        >
                          {t}
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: draftDominantColor(drafts[t], conventions) }} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedTeeth.length > 0 && (isCompactViewer ? (
                <ResponsiveSheet
                  onClose={clearSelection}
                  title="Registro clínico"
                  snapPoints={[0.12, 0.7, 1]}
                  initialSnap={1}
                  backdrop="none"
                  dismissible={false}
                  footer={
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={addRecords} disabled={readyTeeth.length === 0 || saving} className="h-10 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12.5px] font-bold transition-colors border-0">
                        <Icon name="add" size={14} />
                        {saving ? "Guardando..." : readyTeeth.length > 1 ? `Guardar ${readyTeeth.length} registros` : "Agregar registro"}
                      </button>
                      {onNavigateTab && (
                        <button onClick={() => onNavigateTab("diagnosticos")} className="h-10 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[12.5px] font-bold transition-colors border-0">
                          Continuar a Diagnóstico
                          <Icon name="chevron_right" size={14} />
                        </button>
                      )}
                    </div>
                  }
                >
                  {registroEditorContent}
                </ResponsiveSheet>
              ) : (
                <>
                  {registroEditorContent}

                  {/* Guardar + Continuar a Diagnóstico — fuera del contenedor con
                      scroll (y de su efecto humo), siempre visibles. Ya no es
                      flotante: vive junto a Guardar, en el otro extremo, y solo
                      se habilita con contenido en Observaciones. */}
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={addRecords} disabled={readyTeeth.length === 0 || saving} className="h-10 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white rounded-lg text-[12.5px] font-bold transition-colors border-0">
                      <Icon name="add" size={14} />
                      {saving ? "Guardando..." : readyTeeth.length > 1 ? `Guardar ${readyTeeth.length} registros` : "Agregar registro"}
                    </button>
                    {onNavigateTab && (
                      <button onClick={() => onNavigateTab("diagnosticos")} className="h-10 shrink-0 whitespace-nowrap flex items-center justify-center gap-1.5 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[12.5px] font-bold transition-colors border-0">
                        Continuar a Diagnóstico
                        <Icon name="chevron_right" size={14} />
                      </button>
                    )}
                  </div>
                  </>
              ))}

                  {/* Separador — debajo de Guardar (o del estado vacío), antes del
                      historial. Solo tiene sentido si el historial de abajo
                      realmente se muestra (no en consulta activa). */}
 {!isEditable && <div className="border-t border-slate-200"/>}
                </>
              )}

              {/* Historial de Exámenes. No se muestra dentro de una consulta
                  activa (isEditable), solo al ver el odontograma fuera de ese
                  flujo. Siempre inline (antes en mobile abría en un bottom
                  sheet aparte) — listado scrollable dentro de la misma
                  pestaña, junto con el resto del panel. */}
              {!isEditable && (
              <div className="flex flex-col gap-2.5 md:flex-1 md:min-h-0">
                <div className="shrink-0 flex items-center justify-between gap-2">
 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Historial de Exámenes</p>
                  <FilterCategoryPicker variant="icon" categories={HISTORIAL_FILTER_CATEGORIES} activeKeys={activeFilterTags} onToggle={toggleFilterTag} />
                </div>

                {activeFilterTags.size > 0 && (
                  <div className="shrink-0 flex items-center gap-2 flex-wrap">
                    {activeFilterTags.has("diente") && (
                      <TagDropdown
                        icon="dentistry"
                        label={`Diente: ${filtroDiente === "" ? "Todos" : `#${filtroDiente}`}`}
                        onRemove={() => removeFilterTag("diente")}
                      >
                        {(close) => (
                          <>
                            <button
                              type="button"
                              onMouseDown={() => { setFiltroDiente(""); close(); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${filtroDiente === "" ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                            >
                              Todos
                            </button>
                            {dientesConRegistro.map(n => (
                              <button
                                key={n}
                                type="button"
                                onMouseDown={() => { setFiltroDiente(n); close(); }}
 className={`w-full flex items-center gap-2 text-left px-3 py-2 text-[13px] rounded-md hover:bg-slate-50 ${n === filtroDiente ? "text-cyan-700 font-semibold" : "text-slate-600"}`}
                              >
 <Icon name="dentistry" size={14} className={n === filtroDiente ? "text-cyan-600" : "text-slate-400"}/>
                                #{n} · {TOOTH_NAMES[n]}
                              </button>
                            ))}
                          </>
                        )}
                      </TagDropdown>
                    )}
                    {activeFilterTags.has("mes") && (
                      <TagDropdown
                        icon="calendar_today"
                        label={`Mes: ${filtroMes || "Todos"}`}
                        onRemove={() => removeFilterTag("mes")}
 panelClassName="bg-white border border-slate-200 rounded-lg shadow-lg p-3"
                      >
                        {(close) => (
                          <DatePicker value={filtroMes} onChange={(v) => { setFiltroMes(v); close(); }} mode="month" />
                        )}
                      </TagDropdown>
                    )}
                    <FilterCategoryPicker variant="chip" categories={HISTORIAL_FILTER_CATEGORIES} activeKeys={activeFilterTags} onToggle={toggleFilterTag} />
                  </div>
                )}

                <div className="flex flex-col gap-2 w-full md:flex-1 md:min-h-0 md:overflow-y-auto no-scrollbar">
                  <RegistroTimeline
                    entries={timelineEntriesFiltradas}
                    expandedSessionId={expandedSessionId}
                    onToggleSession={toggleSession}
                    showTooth={filtroDiente === ""}
                    conventions={conventions}
                    emptyLabel={timelineEntries.length > 0 ? "Ningún registro coincide con estos filtros" : "Sin registros aún"}
                  />
                </div>
              </div>
              )}
            </div>
        </div>
        </div>
      </div>

      {/* Mobile: el panel de Historial no se muestra inline (solo desde
          md hacia arriba) — tocar un diente en el odontograma abre acá su
          historial completo. */}
      {mobileToothModal !== null && (
        <ResponsiveSheet
          onClose={() => { setMobileToothModal(null); setChartResetKey(k => k + 1); }}
          title={`#${mobileToothModal} · ${TOOTH_NAMES[mobileToothModal]}`}
          size="lg"
          snapPoints={[0.5, 0.9]}
        >
          <RegistroTimeline
            entries={timelineEntries.filter(e => e.finding.toothNumber === mobileToothModal)}
            expandedSessionId={expandedSessionId}
            onToggleSession={toggleSession}
            showTooth={false}
            conventions={conventions}
            emptyLabel="Sin registros para este diente"
          />
        </ResponsiveSheet>
      )}
    </>
  );
}
