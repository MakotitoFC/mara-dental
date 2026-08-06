"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const FADE = 20; // px

/**
 * Desvanece (mask-image) los bordes de un contenedor con scroll independiente,
 * solo del lado donde realmente hay más contenido por revelar — arriba solo
 * una vez que se hizo scroll hacia abajo (nunca en el primer registro, en
 * reposo), abajo solo si falta contenido por ver. Nunca en listas cortas que
 * ya caben completas. Se aplica vía estilo inline (no depende de que el
 * contenedor tenga overflow visible en el breakpoint actual).
 */
export function useScrollFade<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [hasTop, setHasTop] = useState(false);
  const [hasBottom, setHasBottom] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function check() {
      if (!el) return;
      setHasTop(el.scrollTop > 1);
      setHasBottom(el.scrollHeight - el.clientHeight - el.scrollTop > 1);
    }

    check();
    el.addEventListener("scroll", check);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    // El contenido (no solo el tamaño del propio contenedor) puede cambiar —
    // p.ej. al seleccionar otro registro o cargar más datos.
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true, characterData: true });

    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  let style: CSSProperties = {};
  if (hasTop || hasBottom) {
    const stops = [
      "to bottom",
      hasTop ? "transparent 0" : "black 0",
      hasTop ? `black ${FADE}px` : null,
      hasBottom ? `black calc(100% - ${FADE}px)` : null,
      hasBottom ? "transparent 100%" : "black 100%",
    ].filter(Boolean).join(", ");
    const mask = `linear-gradient(${stops})`;
    style = { WebkitMaskImage: mask, maskImage: mask };
  }

  return { ref, style };
}
