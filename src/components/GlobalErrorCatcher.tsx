"use client";

import { useEffect } from "react";

export function GlobalErrorCatcher() {
  useEffect(() => {
    // Only swallow these specific React Server Components / Turbopack stream abort errors
    // that plague Next.js 14/15 development mode during fast tab switching.
    const handleRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || event.reason?.toString() || "";
      if (
        msg.includes("frame.join is not a function") ||
        msg.includes("enqueueModel") ||
        msg.includes("Cannot read properties of null (reading 'enqueueModel')") ||
        msg.includes("Connection closed") ||
        msg.includes("chunk.reason.enqueueModel is not a function")
      ) {
        // Prevent it from polluting the console and crashing the overlay
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = event.message || event.error?.message || "";
      if (
        msg.includes("frame.join is not a function") ||
        msg.includes("enqueueModel") ||
        msg.includes("Connection closed") ||
        msg.includes("Cannot read properties of undefined (reading 'stack')")
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    // React Error Overlay sometimes hooks console.error
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = args.map(a => (typeof a === 'string' ? a : (a?.message || ''))).join(" ");
      if (
        msg.includes("frame.join is not a function") ||
        msg.includes("enqueueModel") ||
        msg.includes("Connection closed") ||
        msg.includes("Cannot read properties of undefined (reading 'stack')")
      ) {
        return; // Swallow it
      }
      originalConsoleError.apply(console, args);
    };

    // Use capture phase to beat Next.js error overlay
    window.addEventListener("unhandledrejection", handleRejection, true);
    window.addEventListener("error", handleError, true);

    return () => {
      window.removeEventListener("unhandledrejection", handleRejection, true);
      window.removeEventListener("error", handleError, true);
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
