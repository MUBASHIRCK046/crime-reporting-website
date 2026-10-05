"use client";

import { useEffect } from "react";

export function ClientErrorSuppressor() {
  useEffect(() => {
    // Suppress React 19 script tag & Firestore stream cancellation AbortErrors
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const fullMsg = args.map(a => (typeof a === "object" ? (a?.message || JSON.stringify(a)) : String(a))).join(" ");
      if (
        fullMsg.includes("Encountered a script tag while rendering React component") ||
        fullMsg.includes("Scripts inside React components are never executed") ||
        fullMsg.includes("signal is aborted") ||
        fullMsg.includes("AbortError")
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    const handleWindowError = (event: ErrorEvent) => {
      const msg = event.message || String(event.error || "");
      if (msg.includes("signal is aborted") || msg.includes("AbortError")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (!reason) return;

      const reasonStr = typeof reason === "object" ? (reason.message || reason.name || String(reason)) : String(reason);
      const isAbortError = 
        reason.name === "AbortError" || 
        reasonStr.includes("aborted") ||
        reasonStr.includes("Abort") ||
        reasonStr.includes("signal is aborted without reason");

      if (isAbortError) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      console.error = originalError;
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}

