"use client";

import { useEffect } from "react";

export function ClientErrorSuppressor() {
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Suppress Next.js Turbopack Runtime AbortError
      if (
        event.reason &&
        (event.reason.name === "AbortError" || 
         event.reason.message?.includes("The user aborted a request"))
      ) {
        event.preventDefault();
        console.log("Suppressed unhandled AbortError in Next.js Turbopack.");
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
