"use client";

import { useEffect } from "react";

/** Bloquea el scroll de `<body>` mientras el componente que la usa está
 * montado — necesario en modales portados a document.body (createPortal),
 * ya que al salir del árbol de la página dejan de estar contenidos por su
 * scroll interno y, sin este bloqueo, la página de fondo sigue siendo
 * scrolleable detrás del overlay. */
export function useBodyScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
}
