"use client";

// Reemplazo de next/link para cualquier navegación que pueda sacar al
// usuario de una consulta activa (ver ActiveConsultaGuard.tsx) — mismo uso
// que <Link>, solo intercepta el click para pasar por guardedNavigate.

import Link from "next/link";
import type { ComponentProps, MouseEvent } from "react";
import { useActiveConsultaGuard } from "./ActiveConsultaGuard";

export function GuardedLink({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const { guardedNavigate } = useActiveConsultaGuard();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Deja pasar clicks con modificador (abrir en pestaña nueva, etc.) tal cual next/link.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    guardedNavigate(typeof href === "string" ? href : href.toString());
  }

  return <Link href={href} onClick={handleClick} {...props} />;
}
