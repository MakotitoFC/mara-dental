// src/components/offline/OfflineActionButton.tsx
"use client";

import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

interface OfflineActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  fallbackTooltip?: string;
}

export function OfflineActionButton({
  children,
  onClick,
  className = "",
  disabled = false,
  fallbackTooltip = "Disponible al reconectar",
  title,
  ...props
}: OfflineActionButtonProps) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(typeof navigator !== "undefined" && !navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const isDisabled = disabled || isOffline;
  const currentTitle = isOffline ? fallbackTooltip : title;

  return (
    <button
      {...props}
      disabled={isDisabled}
      title={currentTitle}
      onClick={(e) => {
        if (isOffline) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.(e);
      }}
      className={`${className} ${
        isOffline ? "opacity-50 cursor-not-allowed filter grayscale-[30%]" : ""
      }`}
    >
      {children}
    </button>
  );
}
