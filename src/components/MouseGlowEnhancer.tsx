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

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Select all interactive buttons, cards, links
      const interactiveEl = target.closest<HTMLElement>(
        'button:not(:disabled), a.glass-button, a.glass-button-secondary, [role="button"]:not([aria-disabled="true"]), .clickable-card, a.btn, a.nav-link'
      );

      if (interactiveEl) {
        const rect = interactiveEl.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        interactiveEl.style.setProperty("--mouse-glow-x", `${x}px`);
        interactiveEl.style.setProperty("--mouse-glow-y", `${y}px`);

        // Check dark mode status
        const isDark = document.documentElement.classList.contains("dark");

        // Dynamically assign variables for the liquid gradient
        if (isDark) {
          interactiveEl.style.setProperty("--liquid-color-1", "rgba(80, 22, 214, 0.8)");
          interactiveEl.style.setProperty("--liquid-color-2", "rgba(13, 98, 255, 1)");
          interactiveEl.style.setProperty("--mouse-glow-active-opacity", "0.45");
          interactiveEl.style.setProperty("--mouse-glow-opacity", "1");
        } else {
          // Subtle tint in light theme
          interactiveEl.style.setProperty("--liquid-color-1", "rgba(2, 91, 255, 1)");
          interactiveEl.style.setProperty("--liquid-color-2", "rgba(139, 92, 246, 0.10)");
          interactiveEl.style.setProperty("--mouse-glow-active-opacity", "0.3");
          interactiveEl.style.setProperty("--mouse-glow-opacity", "1");
        }
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
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
    };
  }, []);

  return null;
}
