"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ShieldAlert,
  Shield,
  Building2,
  FileText,
  FileSpreadsheet,
  ChevronRight,
  X,
} from "lucide-react";

export interface NavDockItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
  glowColor?: string;
}

export interface NavDockProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  sosAlertsCount?: number;
  officersCount?: number;
  casesCount?: number;
}

export function NavDock({
  activeTab,
  onTabChange,
  sosAlertsCount = 0,
  officersCount = 0,
  casesCount = 0,
}: NavDockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  const navItems: NavDockItem[] = [
    {
      id: "Dashboard",
      label: "Dashboard",
      shortLabel: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "SOS",
      label: "SOS Alerts",
      shortLabel: "SOS",
      icon: ShieldAlert,
      badge: sosAlertsCount,
      badgeColor: "bg-red-500 text-white",
      glowColor: "rgba(239, 68, 68, 0.6)",
    },
    {
      id: "Officers",
      label: "Officers",
      shortLabel: "Officers",
      icon: Shield,
      badge: officersCount,
      badgeColor: "bg-cyan-500 text-white",
      glowColor: "rgba(6, 182, 212, 0.6)",
    },
    {
      id: "Police Stations",
      label: "Stations",
      shortLabel: "Stations",
      icon: Building2,
    },
    {
      id: "Cases",
      label: "Cases",
      shortLabel: "Cases",
      icon: FileText,
      badge: casesCount,
      badgeColor: "bg-amber-500 text-white",
      glowColor: "rgba(245, 158, 11, 0.6)",
    },
    {
      id: "Reports",
      label: "Reports",
      shortLabel: "Reports",
      icon: FileSpreadsheet,
    },
  ];

  // Close dock on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close dock on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const currentItem =
    navItems.find((item) => item.id === activeTab) || navItems[0];
  const CurrentIcon = currentItem.icon;
  const hasSosAlerts = sosAlertsCount > 0;

  // Stagger container variants for toolbar items
  const toolbarContainerVariants = {
    hidden: {
      opacity: 0,
      x: -20,
      scale: 0.92,
      transition: {
        staggerChildren: 0.03,
        staggerDirection: -1,
        when: "afterChildren",
      },
    },
    visible: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 420,
        damping: 30,
        mass: 0.65,
        staggerChildren: 0.045,
        delayChildren: 0.02,
      },
    },
  };

  // Item cascade variants
  const itemVariants = {
    hidden: {
      opacity: 0,
      scale: 0.85,
      x: -8,
    },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 450,
        damping: 26,
      },
    },
  };

  return (
    <nav
      ref={dockRef}
      aria-label="Admin Navigation Dock"
      className="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-[120] flex items-center select-none"
    >
      {/* AMBIENT BACKGROUND GLOW */}
      <motion.div
        animate={{
          opacity: isOpen ? 0.85 : isHovered ? 0.55 : 0.25,
          scale: isOpen ? 1.08 : 1,
        }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="absolute -inset-4 bg-gradient-to-r from-emerald-600/20 via-green-600/15 to-teal-500/15 rounded-full blur-2xl pointer-events-none -z-10"
      />

      {/* 1. MAIN FLOATING PILL BUTTON */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{
          opacity: 1,
          scale: isHovered && !isOpen ? 1.04 : 1,
          y: isHovered && !isOpen ? -2 : 0,
        }}
        whileTap={{ scale: 0.94 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 28,
          mass: 0.7,
        }}
        aria-label="Toggle Navigation Dock"
        aria-expanded={isOpen}
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, rgba(13, 27, 19, 0.95) 0%, rgba(5, 8, 5, 0.98) 100%)",
          boxShadow: isOpen
            ? "0 0 32px rgba(31, 107, 58, 0.4), 0 20px 40px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(232, 240, 234, 0.25)"
            : isHovered
            ? "0 0 24px rgba(31, 107, 58, 0.25), 0 16px 36px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(232, 240, 234, 0.2)"
            : "0 12px 30px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(232, 240, 234, 0.15)",
        }}
        className={`group relative h-[58px] sm:h-[64px] px-4 sm:px-6 rounded-full backdrop-blur-2xl border transition-colors duration-300 flex items-center gap-3 cursor-pointer shrink-0 z-20 overflow-hidden ${
          isOpen
            ? "border-emerald-600/60 ring-2 ring-emerald-500/40"
            : "border-[#24382B] hover:border-emerald-700/50"
        }`}
      >
        {/* SUBTLE MOVING SHIMMER/GLASS REFLECTION */}
        <motion.div
          animate={{
            x: ["-100%", "200%"],
          }}
          transition={{
            repeat: Infinity,
            duration: 5.5,
            ease: "linear",
          }}
          className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -skew-x-12 pointer-events-none"
        />

        {/* SOS ACTIVE PULSING INDICATOR */}
        {hasSosAlerts && (
          <div className="absolute -top-1 -right-1 flex h-4 w-4">
            <motion.span
              animate={{
                scale: [1, 1.35, 1],
                opacity: [0.8, 0.2, 0.8],
              }}
              transition={{
                repeat: Infinity,
                duration: 1.6,
                ease: "easeInOut",
              }}
              className="absolute inline-flex h-full w-full rounded-full bg-red-500"
            />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.9)]" />
          </div>
        )}

        {/* ICON CONTAINER WITH MORPHING ANIMATION */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.07] border border-white/10 shrink-0">
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close-icon"
                initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <X className="w-4 h-4 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key={currentItem.id}
                initial={{ opacity: 0, scale: 0.7, rotate: -15 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.7, rotate: 15 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={
                  currentItem.id === "SOS" && hasSosAlerts
                    ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                    : "text-emerald-400"
                }
              >
                <CurrentIcon className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DYNAMIC LABEL WITH MORPHING SLIDE TRANSITION */}
        <div className="min-w-[70px] sm:min-w-[85px] text-left">
          <AnimatePresence mode="wait">
            <motion.span
              key={isOpen ? "close-label" : currentItem.id}
              initial={{ opacity: 0, x: 8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.95 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
              className="text-xs sm:text-sm font-semibold tracking-wide text-white block"
            >
              {isOpen ? "Close" : currentItem.label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* ROTATING CHEVRON INDICATOR */}
        <motion.div
          animate={{
            rotate: isOpen ? 180 : 0,
            x: isHovered && !isOpen ? 2 : 0,
          }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="text-white/60 group-hover:text-white transition-colors ml-auto pl-1"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.div>
      </motion.button>

      {/* 2. EXPANDED SIDEWAYS GLASS TOOLBAR (OPENS HORIZONTALLY TO THE RIGHT) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={toolbarContainerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{
              originX: 0,
              background:
                "radial-gradient(120% 120% at 50% 0%, rgba(13, 27, 19, 0.95) 0%, rgba(5, 8, 5, 0.98) 100%)",
              boxShadow:
                "0 20px 50px rgba(0,0,0,0.75), 0 4px 15px rgba(0,0,0,0.5), inset 0 1px 0 rgba(232, 240, 234, 0.18)",
            }}
            className="ml-2.5 sm:ml-3 h-[58px] sm:h-[64px] rounded-full p-1.5 sm:p-2 backdrop-blur-2xl border border-[#24382B] flex items-center max-w-[calc(100vw-6.5rem)] sm:max-w-none overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] z-10 relative"
          >
            {/* AMBIENT GLASS SHIMMER ACROSS TOOLBAR */}
            <motion.div
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                repeat: Infinity,
                duration: 6,
                ease: "linear",
              }}
              className="absolute inset-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/[0.06] to-transparent -skew-x-12 pointer-events-none rounded-full"
            />

            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 px-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;

                return (
                  <motion.button
                    key={item.id}
                    variants={itemVariants}
                    onClick={() => {
                      onTabChange(item.id);
                      setIsOpen(false);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.94 }}
                    className={`relative flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-200 cursor-pointer shrink-0 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      isActive
                        ? "text-emerald-400 font-bold"
                        : "text-[#B8C8BC] hover:text-white"
                    }`}
                  >
                    {/* ACTIVE SLIDING PILL INDICATOR (layoutId) */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35,
                        }}
                        style={{
                          background: "rgba(31, 107, 58, 0.25)",
                          boxShadow:
                            "0 0 16px rgba(31, 107, 58, 0.3), inset 0 1px 0 rgba(232, 240, 234, 0.2)",
                        }}
                        className="absolute inset-0 rounded-full border border-[#24382B] z-0"
                      />
                    )}

                    {/* ITEM ICON */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 3 }}
                      className={`relative z-10 ${
                        isActive
                          ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(31,107,58,0.65)]"
                          : "text-[#B8C8BC]"
                      }`}
                    >
                      <IconComponent className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                    </motion.div>

                    {/* ITEM LABEL */}
                    <span className="relative z-10 tracking-tight">
                      <span className="hidden md:inline">{item.label}</span>
                      <span className="inline md:hidden">
                        {item.shortLabel || item.label}
                      </span>
                    </span>

                    {/* ANIMATED BADGE WITH VERTICAL NUMBER MORPHING */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 25,
                        }}
                        style={{
                          boxShadow: item.glowColor
                            ? `0 0 10px ${item.glowColor}`
                            : undefined,
                        }}
                        className={`relative z-10 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold leading-none shrink-0 ${item.badgeColor}`}
                      >
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={item.badge}
                            initial={{ y: -6, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 6, opacity: 0 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="inline-block"
                          >
                            {item.badge}
                          </motion.span>
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
