"use client";

import { useEffect } from "react";

export function MouseGlowEnhancer() {
  useEffect(() => {
    // Check if prefers-reduced-motion is enabled
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // Helper to check if touch device
    const isTouchDevice = () => {
      return (
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    if (isTouchDevice()) return;

    let rafId: number | null = null;
    let lastEvent: MouseEvent | null = null;

    const processMouseMove = () => {
      if (!lastEvent) return;
      const e = lastEvent;
      const target = e.target as HTMLElement;

      const interactiveEl = target.closest<HTMLElement>(
        'button:not(:disabled), a.glass-button, a.glass-button-secondary, [role="button"]:not([aria-disabled="true"]), .clickable-card, a.btn, a.nav-link'
      );

      if (interactiveEl) {
        const rect = interactiveEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        interactiveEl.style.setProperty("--mouse-glow-x", `${x}px`);
        interactiveEl.style.setProperty("--mouse-glow-y", `${y}px`);

        const isDark = document.documentElement.classList.contains("dark");
        if (isDark) {
          interactiveEl.style.setProperty("--liquid-color-1", "rgba(255, 255, 255, 0.65)");
          interactiveEl.style.setProperty("--liquid-color-2", "rgba(255, 255, 255, 0.25)");
          interactiveEl.style.setProperty("--mouse-glow-active-opacity", "0.5");
          interactiveEl.style.setProperty("--mouse-glow-opacity", "1");
        } else {
          interactiveEl.style.setProperty("--liquid-color-1", "rgba(255, 255, 255, 0.85)");
          interactiveEl.style.setProperty("--liquid-color-2", "rgba(255, 255, 255, 0.40)");
          interactiveEl.style.setProperty("--mouse-glow-active-opacity", "0.4");
          interactiveEl.style.setProperty("--mouse-glow-opacity", "1");
        }
      }
      rafId = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastEvent = e;
      if (!rafId) {
        rafId = requestAnimationFrame(processMouseMove);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;

      const currentInteractive = target.closest<HTMLElement>(
        'button:not(:disabled), a.glass-button, a.glass-button-secondary, [role="button"]:not([aria-disabled="true"]), .clickable-card, a.btn, a.nav-link'
      );

      const nextInteractive = relatedTarget?.closest<HTMLElement>(
        'button:not(:disabled), a.glass-button, a.glass-button-secondary, [role="button"]:not([aria-disabled="true"]), .clickable-card, a.btn, a.nav-link'
      );

      if (currentInteractive && currentInteractive !== nextInteractive) {
        currentInteractive.style.setProperty("--mouse-glow-opacity", "0");
      }
    };

    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseout", handleMouseOut, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return null;
}
