"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, animate } from "framer-motion";

const DISMISS_PX = 90; // arrastre mínimo hacia abajo para cerrar un sheet sin snap points
const DISMISS_MARGIN = 0.55; // fracción del snap más chico por debajo de la cual se interpreta como "cerrar" en vez de "volver al snap más chico"

/**
 * Arrastre con snap points para bottom sheets, con eventos de puntero
 * nativos (no el prop `drag` de framer-motion) — con `drag="y"` +
 * dragConstraints de rango cero (para que el handle no se desplace
 * visualmente) el gesto no se reconocía de forma confiable y el sheet
 * quedaba fijo. Con pointer events el control es explícito.
 *
 * `snapPoints` son fracciones del alto de la ventana (0–1), en orden
 * ascendente. Pasar un array vacío desactiva el ajuste por altura.
 *
 * `onDismiss`, si se pasa, habilita arrastrar el handle hacia abajo para
 * cerrar el sheet — con snap points, al soltar por debajo del más chico;
 * sin snap points (modales de alto natural/contenido), arrastrando la hoja
 * entera vía un offset `y` que vuelve a 0 si no se supera el umbral.
 */
export function useSnapDrag(snapPoints: number[], initialIndex = 0, onDismiss?: () => void) {
  const hasSnap = snapPoints.length > 0;
  const draggable = hasSnap || !!onDismiss;
  const [snapIndex, setSnapIndex] = useState(() => Math.min(initialIndex, Math.max(snapPoints.length - 1, 0)));
  const height = useMotionValue(0);
  const y = useMotionValue(0);
  const dragStartHeight = useRef(0);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!hasSnap || typeof window === "undefined") return;
    const target = snapPoints[snapIndex] * window.innerHeight;
    const controls = animate(height, target, { type: "spring", damping: 32, stiffness: 300 });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapIndex, hasSnap]);

  function onPointerDown(e: React.PointerEvent) {
    if (!draggable) return;
    // Si el sheet todavía está en pleno spring (p.ej. se acaba de expandir
    // desde el botón "Historial" y el usuario agarra el handle al toque),
    // esa animación seguía compitiendo con los `.set()` manuales de abajo —
    // el resultado eran saltos de alto impredecibles, hasta desaparecer del
    // todo. Cortarla acá deja el valor actual como único dueño del gesto.
    height.stop();
    y.stop();
    isDragging.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = hasSnap ? height.get() : 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDragging.current || typeof window === "undefined") return;
    if (hasSnap) {
      const vh = window.innerHeight;
      const min = snapPoints[0] * vh;
      const max = snapPoints[snapPoints.length - 1] * vh;
      const delta = dragStartY.current - e.clientY; // arrastrar hacia arriba = altura crece
      const floor = onDismiss ? 0 : min * 0.85;
      height.set(Math.max(floor, Math.min(max * 1.08, dragStartHeight.current + delta)));
    } else {
      // Solo hacia abajo — hacia arriba no hace nada (no hay a dónde crecer).
      const delta = e.clientY - dragStartY.current;
      y.set(Math.max(0, delta));
    }
  }

  function endDrag(e: React.PointerEvent) {
    if (!isDragging.current || typeof window === "undefined") return;
    isDragging.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ya liberado */ }

    if (hasSnap) {
      const vh = window.innerHeight;
      const current = height.get();
      const minTarget = snapPoints[0] * vh;
      if (onDismiss && current < minTarget * DISMISS_MARGIN) {
        onDismiss();
        return;
      }
      let nearest = 0;
      let nearestDist = Infinity;
      snapPoints.forEach((p, i) => {
        const dist = Math.abs(p * vh - current);
        if (dist < nearestDist) { nearestDist = dist; nearest = i; }
      });
      setSnapIndex(nearest);
    } else {
      const dragged = y.get();
      if (onDismiss && dragged > DISMISS_PX) {
        onDismiss();
      } else {
        animate(y, 0, { type: "spring", damping: 32, stiffness: 300 });
      }
    }
  }

  return {
    enabled: hasSnap,
    draggable,
    snapIndex,
    setSnapIndex,
    height,
    y,
    handleDragProps: draggable
      ? { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag }
      : {},
  };
}
