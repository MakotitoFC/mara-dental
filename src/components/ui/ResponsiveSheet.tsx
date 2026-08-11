"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, useDragControls, type PanInfo } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { fadeIn, slideUp, scaleIn } from "@/lib/animations";
import { useBodyScrollLock } from "@/lib/hooks/useBodyScrollLock";

/**
 * Chrome compartido por los modales del sistema: bottom sheet en mobile
 * (desliza desde abajo, handle de arrastre, cierre al tocar fuera) y modal
 * centrado en desktop, ambos con el mismo fondo desenfocado. El padre debe
 * envolver el uso condicional en <AnimatePresence> para que las animaciones
 * de salida se reproduzcan.
 *
 * El handle es arrastrable en mobile: abajo fuerte cierra, arriba fuerte
 * expande a casi pantalla completa, y sin gesto claro vuelve a su alto por
 * defecto — mismo mecanismo (dragControls iniciado solo desde el handle,
 * nunca desde el contenido) que HistorialBottomSheet en OdontogramaTab.
 */
export function ResponsiveSheet({
  onClose, title, header, children, footer, maxWidthDesktop = "440px",
}: {
  onClose: () => void;
  title?: string;
  /** Contenido de header a medida (ej. progreso de pasos) en vez del título simple. */
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthDesktop?: string;
}) {
  useBodyScrollLock();
  const dragControls = useDragControls();
  const [expanded, setExpanded] = useState(false);

  function handleDragEnd(_: PointerEvent | MouseEvent | TouchEvent, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 600) {
      onClose();
    } else if (info.offset.y < -60 || info.velocity.y < -600) {
      setExpanded(true);
    } else if (info.offset.y > 40) {
      setExpanded(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Mobile — bottom sheet */}
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        exit="exit"
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.1, bottom: 0.6 }}
        onDragEnd={handleDragEnd}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className={`md:hidden absolute inset-x-0 bottom-0 ${expanded ? "max-h-[96vh]" : "max-h-[85vh]"} bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden transition-[max-height] duration-200`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex justify-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <span className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-600" />
        </div>
        <SheetChrome title={title} header={header} onClose={onClose}>{children}</SheetChrome>
        {footer && <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">{footer}</div>}
      </motion.div>

      {/* Desktop — modal centrado */}
      <div className="hidden md:flex absolute inset-0 items-center justify-center p-4">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden"
          style={{ maxWidth: maxWidthDesktop, maxHeight: "min(88vh, 720px)" }}
        >
          <SheetChrome title={title} header={header} onClose={onClose}>{children}</SheetChrome>
          {footer && <div className="px-5 pb-5 pt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">{footer}</div>}
        </motion.div>
      </div>
    </div>,
    document.body
  );
}

function SheetChrome({ title, header, onClose, children }: { title?: string; header?: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      {(title || header) && (
        <div className="flex items-start justify-between px-4 md:px-5 pt-1 md:pt-4 pb-3 shrink-0 gap-2">
          <div className="flex-1 min-w-0">
            {header ?? <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 truncate">{title}</h2>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-9 h-9 md:w-8 md:h-8 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-4 md:px-5 pb-2">{children}</div>
    </>
  );
}
