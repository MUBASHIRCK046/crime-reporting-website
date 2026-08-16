"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";
import { motion } from "framer-motion";

export type ToastType = "success" | "error" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const config = {
    success: {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-500/30 dark:border-emerald-500/50",
      text: "text-emerald-800 dark:text-emerald-200",
      icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      title: "Success"
    },
    error: {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      border: "border-rose-500/30 dark:border-rose-500/50",
      text: "text-rose-800 dark:text-rose-200",
      icon: <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
      title: "Error"
    },
    warning: {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-500/30 dark:border-amber-500/50",
      text: "text-amber-800 dark:text-amber-200",
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
      title: "Warning"
    }
  };

  const current = config[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={`fixed top-6 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 z-[100] flex items-start gap-3.5 p-4 rounded-2xl border backdrop-blur-lg shadow-xl shadow-black/5 max-w-sm w-[calc(100vw-2rem)] md:w-80 ${current.bg} ${current.border} ${current.text}`}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold tracking-tight mb-0.5">{current.title}</p>
        <p className="text-xs opacity-90 leading-relaxed font-semibold">{message}</p>
      </div>
      <button
        onClick={onClose}
        type="button"
        className="shrink-0 text-text-tertiary hover:text-text-secondary transition-colors focus:outline-none cursor-pointer mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
