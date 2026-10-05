// KEYWORD: ADMIN-NAVDOCK
// PURPOSE: Dock navigation bar for administrator cockpit.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  LayoutDashboard, ShieldAlert, Shield, Building2, FileText, 
  FileSpreadsheet, LogOut, X, Database
} from "lucide-react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { logoutUser } from "@/lib/auth";

interface AdminNavDockProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeSOSCount?: number;
  officersCount?: number;
  casesCount?: number;
}

export default function AdminNavDock({
  activeTab,
  setActiveTab,
  activeSOSCount = 0,
  officersCount = 0,
  casesCount = 0
}: AdminNavDockProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const navItems = [
    { 
      id: "Dashboard", 
      label: "Dashboard", 
      icon: LayoutDashboard,
      color: "text-blue-500 dark:text-blue-400"
    },
    { 
      id: "SOS", 
      label: "SOS Alerts", 
      icon: ShieldAlert, 
      badge: activeSOSCount,
      badgeColor: "bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.9)]",
      color: "text-red-500 dark:text-red-400"
    },
    { 
      id: "Cases", 
      label: "Cases", 
      icon: FileText, 
      badge: casesCount,
      badgeColor: "bg-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.8)]",
      color: "text-cyan-500 dark:text-cyan-400"
    },
    { 
      id: "Officers", 
      label: "Officers", 
      icon: Shield, 
      badge: officersCount,
      badgeColor: "bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.8)]",
      color: "text-purple-500 dark:text-purple-400"
    },
    { 
      id: "Reports", 
      label: "Reports", 
      icon: FileSpreadsheet,
      color: "text-indigo-500 dark:text-indigo-400"
    },
    { 
      id: "Police Stations", 
      label: "Stations", 
      icon: Building2,
      color: "text-amber-500 dark:text-amber-400"
    },
    { 
      id: "Backup", 
      label: "Database Backup", 
      icon: Database,
      color: "text-emerald-500 dark:text-emerald-400"
    },
  ];

  const handleSignOut = async () => {
    await logoutUser();
    router.push("/login");
  };

  const itemVariants: Variants = {
    closed: { 
      opacity: 0, 
      x: -20, 
      scale: 0.85,
      filter: "blur(6px)",
      transition: { duration: 0.2 }
    },
    open: { 
      opacity: 1, 
      x: 0, 
      scale: 1,
      filter: "blur(0px)",
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 28 
      }
    }
  };

  return (
    <aside 
      aria-label="Apple Liquid Glass Admin Navigation"
      className="fixed bottom-6 left-6 z-[100] max-w-[calc(100vw-3rem)] pointer-events-auto flex items-center"
    >
      <motion.div 
        layout
        transition={{ type: "spring", stiffness: 450, damping: 35 }}
        className="flex items-center gap-2 p-2 md:p-2.5 rounded-full backdrop-blur-3xl transition-all duration-300 border border-white/25 dark:border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.35),inset_0_1px_1.5px_rgba(255,255,255,0.5)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_1.5px_rgba(255,255,255,0.2)] bg-white/85 dark:bg-[#0c0c0e]/90"
      >
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 shrink-0 border ${
            isOpen 
              ? "bg-gradient-to-tr from-red-600 to-rose-500 text-white border-red-400/50 shadow-[0_0_25px_rgba(239,68,68,0.6)]" 
              : "bg-black/10 dark:bg-white/10 text-text-primary border-black/10 dark:border-white/15 hover:bg-black/15 dark:hover:bg-white/20 shadow-lg"
          }`}
          title={isOpen ? "Collapse Navigation" : "Expand Navigation"}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white transition-transform duration-300 rotate-0 hover:rotate-90" />
          ) : (
            <div className="relative flex items-center justify-center">
              <span className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)] animate-pulse" />
              <span className="absolute w-7 h-7 rounded-full border-2 border-red-500/60 animate-ping opacity-75" />
            </div>
          )}

          {!isOpen && activeSOSCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center shadow-lg animate-bounce border-2 border-white dark:border-slate-900">
              {activeSOSCount}
            </span>
          )}
        </motion.button>

        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial="closed"
              animate="open"
              exit="closed"
              transition={{ staggerChildren: 0.035, delayChildren: 0.02 }}
              className="flex items-center gap-1.5 md:gap-2 overflow-x-auto scrollbar-none pr-1 max-w-[calc(100vw-8rem)]"
            >
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <motion.button
                    key={item.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-full text-xs md:text-sm font-extrabold tracking-wide transition-all duration-300 shrink-0 cursor-pointer border ${
                      isActive
                        ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-white border-white/40 shadow-[0_8px_25px_rgba(225,29,72,0.45),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_10px_30px_rgba(225,29,72,0.6),inset_0_1px_1px_rgba(255,255,255,0.35)] scale-[1.02]"
                        : "border-transparent text-text-secondary dark:text-neutral-300 hover:text-text-primary dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 hover:border-black/10 dark:hover:border-white/15"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${isActive ? "text-white drop-shadow-sm" : item.color}`} />
                    <span className="whitespace-nowrap">{item.label}</span>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black leading-none ${
                        isActive ? "bg-white text-red-600 shadow-sm" : item.badgeColor
                      }`}>
                        {item.badge}
                      </span>
                    )}

                    {isActive && (
                      <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff]" />
                    )}
                  </motion.button>
                );
              })}

              <motion.button
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3.5 md:px-4 py-2.5 md:py-3 rounded-full text-xs md:text-sm font-extrabold text-red-600 dark:text-red-400 hover:bg-red-500/15 border border-transparent hover:border-red-500/20 transition-all shrink-0 cursor-pointer ml-1"
                title="Sign Out of Admin Cockpit"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5 shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </aside>
  );
}
