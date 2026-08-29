"use client";

import type { ReactNode } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  size,
  autoUpdate,
  FloatingPortal,
  type Placement,
} from "@floating-ui/react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

interface SmartPopoverProps {
  /** Controla si el panel flotante está visible. El consumidor sigue siendo
      dueño de su estado `open`/`setOpen`; el cierre por click/tap AFUERA
      (trigger y panel incluidos) lo maneja este wrapper de forma centralizada
      vía `onClose` — no hace falta que cada consumidor reimplemente su propio
      onBlur/click-outside. */
  open: boolean;
  /** Se invoca cuando el usuario hace click o tap fuera del trigger Y del
      panel flotante, mientras `open` es true. El consumidor típico solo hace
      `onClose={() => setOpen(false)}`. Opcional por compatibilidad, pero
      todo dropdown nuevo debería pasarlo. */
  onClose?: () => void;
  /** Renderiza el disparador (botón/input) recibiendo el ref que hay que
      adjuntarle — así el propio consumidor conserva control total sobre su
      onClick/onBlur/estilos, sin cloneElement ni gimnasia de refs. */
  renderTrigger: (ref: (node: HTMLElement | null) => void) => ReactNode;
  /** Contenido del panel flotante (el <motion.div> con la lista/calendario/etc). */
  children: ReactNode;
  placement?: Placement;
  /** Separación en px entre el trigger y el panel (default 4, igual al
      `top-10`/`mt-1` que usaban los dropdowns antes de este wrapper). */
  offsetPx?: number;
  /** Fuerza que el panel tenga al menos el mismo ancho que el trigger
      (útil para selects tipo <select> nativo). */
  matchWidth?: boolean;
  /** Clases extra para el div que envuelve el panel (además de la posición). */
  panelClassName?: string;
}

/** Wrapper estándar para todo dropdown/select-custom/datepicker de MaraDental.
 *
 * Usa @floating-ui/react (`flip()` + `shift()`) para que el panel nunca
 * quede cortado por el borde de la pantalla: `flip()` lo pasa arriba del
 * trigger si no cabe abajo (o lo manda al lado contrario si `placement`
 * es horizontal), y `shift()` lo desliza lateralmente para que no se salga
 * por los costados, en vez de la lógica manual de `openUpward`/`openLeft`
 * que antes había que reimplementar en cada componente (ver DatePicker.tsx).
 *
 * El panel se renderiza en un `FloatingPortal` (al final de <body>), no
 * como hijo del trigger — así tampoco lo puede recortar un ancestro con
 * `overflow: hidden`/`overflow: auto` (ej. una card con scroll propio).
 */
export function SmartPopover({
  open,
  onClose,
  renderTrigger,
  children,
  placement = "bottom-start",
  offsetPx = 4,
  matchWidth = false,
  panelClassName = "",
}: SmartPopoverProps) {
  const { refs, floatingStyles } = useFloating({
    open,
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(offsetPx),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      ...(matchWidth
        ? [
            size({
              apply({ rects, elements }) {
                Object.assign(elements.floating.style, {
                  minWidth: `${rects.reference.width}px`,
                });
              },
            }),
          ]
        : []),
    ],
  });

  // Trigger Y panel cuentan como "adentro" — el panel vive en un portal,
  // fuera del subárbol DOM del trigger, así que hay que pasar ambos refs.
  // `ignoreSelector` cubre además el caso de popovers ANIDADOS (ej. un
  // <Select>/<DatePicker> dentro del panel de este SmartPopover): el panel
  // flotante de ese hijo vive en OTRO portal, no es descendiente de ninguno
  // de los dos refs de este — sin la excepción, elegir una opción ahí
  // cerraría de golpe el popover padre.
  useClickOutside(
    [refs.domReference, refs.floating],
    () => onClose?.(),
    open && !!onClose,
    "[data-smart-popover]",
  );

  return (
    <>
      {renderTrigger(refs.setReference)}
      {open && (
        <FloatingPortal>
          {/* z-[110]: por encima de cualquier modal/sheet de la app
              (ResponsiveSheet z-[70], lightboxes z-[80]/z-[85], otros
              modales z-[100]) — un dropdown/DatePicker abierto DENTRO de un
              modal debe quedar encima de ese modal, no debajo (con z-50
              quedaba tapado y parecía "no abrir"). Por debajo de ConfirmModal
              (z-[150]) y Toast (z-[200]), que si aparecen deben ganar siempre. */}
          <div ref={refs.setFloating} style={floatingStyles} className={`z-[110] ${panelClassName}`} data-smart-popover="">
            {children}
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
