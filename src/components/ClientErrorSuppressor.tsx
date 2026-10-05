"use client";

import { useEffect } from "react";

// Inline script content to run synchronously in <head> before Next.js error overlay scripts attach
export const abortSuppressorScript = `
(function() {
  if (typeof window === 'undefined') return;

  // 1. Patch AbortController.prototype.abort to always provide a reason if omitted
  if (typeof AbortController !== 'undefined' && AbortController.prototype) {
    var origAbort = AbortController.prototype.abort;
    AbortController.prototype.abort = function(reason) {
      if (reason === undefined) {
        try {
          return origAbort.call(this, new DOMException("Operation aborted.", "AbortError"));
        } catch(e) {
          return origAbort.call(this);
        }
      }
      return origAbort.call(this, reason);
    };
  }

  // 2. Helper to identify benign cancellation / abort errors
  function isAbortLike(err, msg) {
    if (!err && !msg) return false;
    var name = (err && (err.name || err.constructor && err.constructor.name)) || "";
    var message = (err && err.message) || "";
    var str = String(msg || "") + " " + String(message) + " " + String(name);
    return (
      name === "AbortError" ||
      str.indexOf("signal is aborted") !== -1 ||
      str.indexOf("AbortError") !== -1 ||
      str.indexOf("aborted without reason") !== -1 ||
      str.indexOf("The user aborted a request") !== -1 ||
      str.indexOf("Request was aborted") !== -1
    );
  }

  // 3. Early capture-phase error listener (runs before Next.js dev overlay)
  window.addEventListener("error", function(event) {
    if (isAbortLike(event.error, event.message)) {
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      return true;
    }
  }, true);

  // 4. Early capture-phase unhandledrejection listener
  window.addEventListener("unhandledrejection", function(event) {
    var reason = event.reason;
    var reasonStr = typeof reason === "object" && reason !== null ? (reason.message || reason.name || "") : String(reason || "");
    if (isAbortLike(reason, reasonStr)) {
      event.preventDefault();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      return true;
    }
  }, true);
})();
`;

export function ClientErrorSuppressor() {
  useEffect(() => {
    // Suppress console.error logging for React 19 script warnings & Firestore aborts
    const originalError = console.error;
    console.error = (...args: any[]) => {
      const fullMsg = args
        .map((a) => (typeof a === "object" ? a?.message || JSON.stringify(a) : String(a)))
        .join(" ");

      if (
        fullMsg.includes("Encountered a script tag while rendering React component") ||
        fullMsg.includes("Scripts inside React components are never executed") ||
        fullMsg.includes("signal is aborted") ||
        fullMsg.includes("AbortError") ||
        fullMsg.includes("aborted without reason") ||
        fullMsg.includes("The user aborted a request")
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    const isAbortLike = (err: any, msg: any) => {
      const name = err?.name || "";
      const message = err?.message || "";
      const str = `${String(msg || "")} ${String(message)} ${String(name)}`;
      return (
        name === "AbortError" ||
        str.includes("signal is aborted") ||
        str.includes("AbortError") ||
        str.includes("aborted without reason") ||
        str.includes("The user aborted a request") ||
        str.includes("Request was aborted")
      );
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (isAbortLike(event.error, event.message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonStr =
        typeof reason === "object" && reason !== null
          ? reason.message || reason.name || ""
          : String(reason || "");

      if (isAbortLike(reason, reasonStr)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener("error", handleWindowError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      console.error = originalError;
      window.removeEventListener("error", handleWindowError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  return null;
}
