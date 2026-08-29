"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { FilterTag } from "./FilterTag";
import { SmartPopover } from "./SmartPopover";

/** Paso 2 del patrón de "filtro maestro": tag de filtro activo con dropdown
    propio. Clic en el tag (o su chevron) abre sus opciones específicas; su
    "X" (siempre aparte del chevron) lo elimina del todo.

    `children` es un render-prop que recibe `close()` — así tanto una lista
    de opciones simples (cierra al elegir con `onMouseDown={() => {
    onChange(v); close(); }}`) como un control con su propio popover interno
    (ej. un <DatePicker>, que solo expone un `onChange`) pueden cerrar ESTE
    MISMO dropdown al aplicar su selección, sin depender de un click afuera
    ni de que ese control interno sepa nada de este wrapper. */
export function TagDropdown({
  icon, label, onRemove, children, panelClassName,
}: {
  icon: string;
  label: string;
  onRemove: () => void;
  children: (close: () => void) => ReactNode;
  /** Override para contenido que no es una lista larga (ej. un DatePicker) —
      el `max-h-72 overflow-y-auto` por defecto está pensado para listas y
      recortaría/scrollearía un calendario mensual sin necesidad. */
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <SmartPopover
      open={open}
      onClose={() => setOpen(false)}
      placement="bottom-start"
      renderTrigger={(ref) => (
        <FilterTag ref={ref as any} onClick={() => setOpen((o) => !o)} onRemove={onRemove} icon={icon} label={label} />
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
 className={panelClassName ?? "min-w-[200px] max-h-72 overflow-y-auto no-scrollbar bg-white border border-slate-200 rounded-lg shadow-lg p-1"}
      >
        {children(() => setOpen(false))}
      </motion.div>
    </SmartPopover>
  );
}
