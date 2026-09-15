"use client";

// Reemplazo de next/link para cualquier navegación que pueda sacar al
// usuario de una consulta activa (ver ActiveConsultaGuard.tsx) — mismo uso
// que <Link>, solo intercepta el click para pasar por guardedNavigate.

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps, MouseEvent, TouchEvent } from "react";
import { useActiveConsultaGuard } from "./ActiveConsultaGuard";

export function GuardedLink({ href, onClick, onMouseEnter, onTouchStart, ...props }: ComponentProps<typeof Link>) {
  const { guardedNavigate } = useActiveConsultaGuard();
  const router = useRouter();

  const target = typeof href === "string" ? href : (href.pathname ?? href.toString());

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Deja pasar clicks con modificador (abrir en pestaña nueva, etc.) tal cual next/link.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    guardedNavigate(target);
  }

  function handleMouseEnter(e: MouseEvent<HTMLAnchorElement>) {
    onMouseEnter?.(e);
    if (target) {
      try {
        router.prefetch(target);
      } catch {}
    }
  }

  function handleTouchStart(e: TouchEvent<HTMLAnchorElement>) {
    onTouchStart?.(e);
    if (target) {
      try {
        router.prefetch(target);
      } catch {}
    }
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      prefetch={props.prefetch ?? true}
      {...props}
    />
  );
}
