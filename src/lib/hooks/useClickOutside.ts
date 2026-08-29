"use client";

import { useEffect, type RefObject } from "react";

/** Cierra un dropdown/select/popover al detectar un click o touch fuera de
    los elementos referenciados. Acepta uno o varios refs — un popover cuyo
    panel vive en un portal (SmartPopover, fuera del DOM del trigger) debe
    pasar TANTO el ref del trigger COMO el del panel, para que un click
    dentro de cualquiera de los dos cuente como "adentro".

    `active` (default true) permite no atar los listeners globales de
    document cuando el popover está cerrado — con decenas de dropdowns en
    una misma pantalla, escuchar solo mientras cada uno está abierto evita
    apilar listeners innecesarios.

    `ignoreSelector` (opcional): un click dentro de un elemento que matchea
    este selector también cuenta como "adentro", aunque no esté contenido en
    ninguno de los `refs`. Existe para popovers anidados: si un dropdown
    anidado dentro de este panel vive en OTRO portal (otro SmartPopover), su
    panel flotante no es descendiente ni del trigger ni del panel de este —
    sin esta excepción, elegir una opción ahí cerraría de golpe el popover
    padre. */
export function useClickOutside(
  refs: RefObject<Element | null> | RefObject<Element | null>[],
  onOutside: () => void,
  active = true,
  ignoreSelector?: string,
) {
  useEffect(() => {
    if (!active) return;
    const list = Array.isArray(refs) ? refs : [refs];

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      const isInside =
        list.some((r) => r.current && r.current.contains(target)) ||
        (!!ignoreSelector && target instanceof Element && !!target.closest(ignoreSelector));
      if (!isInside) onOutside();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, onOutside, ignoreSelector]);
}
