"use client";

import Link from "next/link";
import { ArrowLeft, Home, LogIn, ShieldAlert, FileText, Shield, UserPlus } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-600/10 dark:bg-[#12351F]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 dark:bg-emerald-500/10 border border-blue-500/20 dark:border-emerald-500/20 text-blue-600 dark:text-emerald-400 text-xs font-semibold mb-6">
          <ShieldAlert className="w-4 h-4" />
          <span>Error 404 • Resource Not Found</span>
        </div>

        {/* 404 Big Heading */}
        <h1 className="text-8xl md:text-9xl font-extrabold tracking-tight bg-gradient-to-b from-text-primary via-text-secondary to-text-tertiary bg-clip-text text-transparent mb-3 drop-shadow-sm">
          404
        </h1>

        <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">
          Page Not Found
        </h2>

        <p className="text-text-secondary text-sm md:text-base leading-relaxed mb-8 max-w-md mx-auto">
          The requested route or resource could not be located. It might have been moved, renamed, or is temporarily unavailable.
        </p>

        {/* Quick Route Shortcuts */}
        <div className="glass-panel p-4 mb-8 shadow-2xl">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3 text-left px-2">
            Available Application Routes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
            <Link
              href="/"
              className="flex items-center gap-3 p-3 rounded-xl bg-ui-bg hover:bg-black/5 dark:hover:bg-white/5 border border-ui-border transition-all group"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 dark:bg-emerald-500/10 text-blue-600 dark:text-emerald-400 group-hover:bg-blue-500 dark:group-hover:bg-[#12351F] group-hover:text-white transition-colors">
                <Home className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Home Portal</div>
                <div className="text-xs text-text-secondary">Main landing page</div>
              </div>
            </Link>

            <Link
              href="/login"
              className="flex items-center gap-3 p-3 rounded-xl bg-ui-bg hover:bg-black/5 dark:hover:bg-white/5 border border-ui-border transition-all group"
            >
              <div className="p-2 rounded-lg bg-indigo-500/10 dark:bg-emerald-500/10 text-indigo-600 dark:text-emerald-400 group-hover:bg-indigo-500 dark:group-hover:bg-[#12351F] group-hover:text-white transition-colors">
                <LogIn className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Sign In</div>
                <div className="text-xs text-text-secondary">Access your account</div>
              </div>
            </Link>

            <Link
              href="/register"
              className="flex items-center gap-3 p-3 rounded-xl bg-ui-bg hover:bg-black/5 dark:hover:bg-white/5 border border-ui-border transition-all group"
            >
              <div className="p-2 rounded-lg bg-purple-500/10 dark:bg-emerald-500/10 text-purple-600 dark:text-emerald-400 group-hover:bg-purple-500 dark:group-hover:bg-[#12351F] group-hover:text-white transition-colors">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Register</div>
                <div className="text-xs text-text-secondary">Create a citizen account</div>
              </div>
            </Link>

            <Link
              href="/citizen"
              className="flex items-center gap-3 p-3 rounded-xl bg-ui-bg hover:bg-black/5 dark:hover:bg-white/5 border border-ui-border transition-all group"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 dark:group-hover:bg-[#12351F] group-hover:text-white transition-colors">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Citizen Portal</div>
                <div className="text-xs text-text-secondary">Dashboard &amp; alerts</div>
              </div>
            </Link>

            <Link
              href="/citizen/report"
              className="flex items-center gap-3 p-3 rounded-xl bg-ui-bg hover:bg-black/5 dark:hover:bg-white/5 border border-ui-border transition-all group"
            >
              <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-[#12351F]/40 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 dark:group-hover:bg-[#164A2A] group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Report Incident</div>
                <div className="text-xs text-text-secondary">Submit crime report (FIR)</div>
              </div>
            </Link>

            <Link
              href="/citizen/csr"
              className="flex items-center gap-3 p-3 rounded-xl bg-ui-bg hover:bg-black/5 dark:hover:bg-white/5 border border-ui-border transition-all group"
            >
              <div className="p-2 rounded-lg bg-sky-500/10 dark:bg-[#12351F]/40 text-sky-600 dark:text-sky-400 group-hover:bg-sky-500 dark:group-hover:bg-[#164A2A] group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">File CSR</div>
                <div className="text-xs text-text-secondary">Community Service Request</div>
              </div>
            </Link>

            <Link
              href="/admin"
              className="flex items-center gap-3 p-3 rounded-xl bg-ui-bg hover:bg-black/5 dark:hover:bg-white/5 border border-ui-border transition-all group"
            >
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 dark:group-hover:bg-rose-900 group-hover:text-white transition-colors">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Admin Dashboard</div>
                <div className="text-xs text-text-secondary">Administrator cockpit</div>
              </div>
            </Link>

            <Link
              href="/police"
              className="flex items-center gap-3 p-3 rounded-xl bg-ui-bg hover:bg-black/5 dark:hover:bg-white/5 border border-ui-border transition-all group"
            >
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500 dark:group-hover:bg-cyan-900 group-hover:text-white transition-colors">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Police Portal</div>
                <div className="text-xs text-text-secondary">Officer dashboard</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass-button font-semibold shadow-lg transition-all"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass-button-secondary font-medium transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Page
          </button>
        </div>
      </div>
    </div>
  );
}
