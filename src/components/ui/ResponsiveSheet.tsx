"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { fadeIn, slideUp, scaleIn } from "@/lib/animations";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";
import { useSnapDrag } from "@/lib/hooks/useSnapDrag";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

// Ver mara-dental-design-spec.md sección 2.6 — reemplaza los 7 valores de
// `maxWidthDesktop` en píxeles sueltos por 3 tamaños con nombre.
export type SheetSize = "sm" | "md" | "lg";
const SHEET_SIZE_MAP: Record<SheetSize, string> = {
  sm: "440px",
  md: "580px",
  lg: "700px",
};

/**
 * Chrome compartido por los modales del sistema: bottom sheet en mobile
 * (desliza desde abajo, handle decorativo, cierre al tocar fuera) y modal
 * centrado en desktop, ambos con el mismo fondo desenfocado. El padre debe
 * envolver el uso condicional en <AnimatePresence> para que las animaciones
 * de salida se reproduzcan.
 *
 * `snapPoints` activa opcionalmente un handle arrastrable con snap points
 * (mobile únicamente) — sin esa prop el comportamiento es exactamente el de
 * siempre (alto fijo al contenido, handle decorativo).
 */
export function ResponsiveSheet({
  onClose, title, header, children, footer, size = "sm",
  snapPoints, initialSnap = 0, backdrop = "dark", persistent = false, forceExpand, dismissible = true,
}: {
  onClose: () => void;
  title?: string;
  /** Contenido de header a medida (ej. progreso de pasos) en vez del título simple. */
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Ancho en desktop: sm=440px (formularios simples/confirmaciones), md=580px
      (formularios complejos/detalles), lg=700px (paneles anchos: presupuestos, historial). */
  size?: SheetSize;
  /** Fracciones de alto de pantalla (0–1), ascendentes — ej. [0.7, 1]. Solo aplica en mobile. */
  snapPoints?: number[];
  /** Índice inicial dentro de snapPoints (default: el más chico). */
  initialSnap?: number;
  /** "none" deja el fondo transparente y no interactuable (para sheets persistentes tipo historial, donde el contenido de atrás debe seguir usable). */
  backdrop?: "dark" | "none";
  /** Con snapPoints: el botón "X" colapsa al snap más chico en vez de desmontar el sheet. */
  persistent?: boolean;
  /** Cualquier cambio de valor expande el sheet al snap más alto — para abrirlo desde un botón externo (p.ej. un pill "Historial") en vez de solo arrastrando. */
  forceExpand?: number;
  /** false desactiva el cierre "accidental" — arrastrar hacia abajo o tocar el
      backdrop — dejando solo la "X"/footer como salida. Para formularios donde
      perder los datos capturados por un toque fuera de lugar sería costoso
      (p.ej. el registro clínico de una consulta activa). */
  dismissible?: boolean;
}) {
  useBodyScrollLock();
  // Las dos ramas de abajo (mobile/desktop) están SIEMPRE ambas en el DOM —
  // solo una se oculta por CSS (md:hidden / hidden md:flex) según el
  // viewport. Montar `children` en las dos a la vez duplicaba cualquier
  // estado interactivo de adentro (ej. un SmartPopover con su propio
  // `open`): la copia oculta también reaccionaba al mismo estado y su
  // panel flotante (que vive en un portal aparte, fuera del `display:none`
  // que lo esconde) terminaba flotando en la esquina superior izquierda,
  // porque su trigger oculto mide (0,0). Por eso `children`/`footer` solo
  // se montan en la rama que coincide con el viewport real.
  const isMobile = useIsMobile();
  const drag = useSnapDrag(snapPoints ?? [], initialSnap, persistent || !dismissible ? undefined : onClose);

  useEffect(() => {
    if (forceExpand !== undefined && snapPoints && snapPoints.length > 0) {
      drag.setSnapIndex(snapPoints.length - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceExpand]);

  function handleClose() {
    if (persistent && drag.enabled) drag.setSnapIndex(0);
    else onClose();
  }

  // Con backdrop "none" (sheets persistentes tipo historial) el contenedor
  // fijo de pantalla completa NO debe capturar clicks fuera del sheet visible
  // — sin esto, aunque el backdrop en sí sea invisible/transparente, seguía
  // bloqueando toques a cualquier cosa detrás suyo (p.ej. la barra de tabs),
  // porque un <div> sin pointer-events-none intercepta clicks en toda su
  // área aunque no tenga contenido visible ahí.
  const clickThrough = backdrop === "none";

  return createPortal(
    <div className={`fixed inset-0 z-[70] ${clickThrough ? "pointer-events-none" : ""}`}>
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={backdrop === "dark" ? "absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" : "absolute inset-0 bg-transparent pointer-events-none"}
        onClick={backdrop === "dark" && dismissible ? onClose : undefined}
      />

      {/* Mobile — bottom sheet. Los persistentes (siempre montados, ver
          `persistent`) se quedan arriba de la bottom nav en vez de taparla —
          los bloqueantes normales sí cubren todo, como cualquier modal. */}
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
 className={`md:hidden absolute inset-x-0 max-h-[85vh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden ${clickThrough ? "pointer-events-auto" : ""}`}
        style={{
          bottom: persistent ? "calc(56px + env(safe-area-inset-bottom))" : 0,
          paddingBottom: persistent ? 0 : "env(safe-area-inset-bottom)",
          y: drag.y,
          ...(drag.enabled ? { height: drag.height } : {}),
        }}
      >
        {/* Handle decorativo — pill redondeado, no una flecha/chevron.
            Siempre visible en el bottom sheet de mobile (con o sin snap
            points); solo cuando es arrastrable (`drag.draggable`) lleva
            además los props de drag encima. */}
        <div className="flex justify-center pt-2 pb-1 shrink-0 touch-none select-none" style={{ touchAction: "none" }} {...(drag.draggable ? drag.handleDragProps : {})}>
 <div className="w-10 h-1.5 rounded-full bg-slate-300"/>
        </div>
        <SheetChrome title={title} header={header} onClose={handleClose} showClose={!persistent}>{isMobile ? children : null}</SheetChrome>
 {footer && isMobile && <div className="px-4 pb-4 pt-3 border-t border-slate-100 shrink-0">{footer}</div>}
      </motion.div>

      {/* Desktop — modal centrado (snapPoints no aplica acá) */}
      <div className={`hidden md:flex absolute inset-0 items-center justify-center p-4 ${clickThrough ? "pointer-events-auto" : ""}`}>
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
 className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
          style={{ maxWidth: SHEET_SIZE_MAP[size], maxHeight: "min(88vh, 720px)" }}
        >
          <SheetChrome title={title} header={header} onClose={onClose} showClose={!persistent}>{!isMobile ? children : null}</SheetChrome>
 {footer && !isMobile && <div className="px-5 pb-5 pt-3 border-t border-slate-100 shrink-0">{footer}</div>}
        </motion.div>
      </div>
    </div>,
    document.body
  );
}

function SheetChrome({ title, header, onClose, children, showClose = true }: { title?: string; header?: React.ReactNode; onClose: () => void; children: React.ReactNode; showClose?: boolean }) {
  return (
    <>
      {(title || header) && (
        <div className="flex items-start justify-between px-4 md:px-5 pt-1 md:pt-4 pb-3 shrink-0 gap-2">
          <div className="flex-1 min-w-0">
 {header ?? <h2 className="text-[15px] font-bold text-slate-900 truncate">{title}</h2>}
          </div>
          {showClose && (
            <button
              onClick={onClose}
              aria-label="Cerrar"
 className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>
      )}
      {/* min-h-0 es necesario: sin él, un hijo con alto propio (p.ej. una
          lista con maxHeight fijo) puede forzar a este flex-1 a crecer más
          allá del alto real del sheet (fijado por `drag.height` en mobile),
          y el overflow se recorta en el contenedor exterior en vez de
          scrollear acá — el síntoma es "no hay scroll" pese al overflow-y-auto. */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden no-scrollbar px-4 md:px-5 pb-2">{children}</div>
    </>
  );
}
