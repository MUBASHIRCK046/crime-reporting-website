"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ArrowLeft, Home, LogIn, ShieldAlert, FileText, Shield, UserPlus, 
  Search, ExternalLink, Compass, HelpCircle, Check, Database, Radio
} from "lucide-react";
import { auth, db } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface RouteItem {
  name: string;
  desc: string;
  path: string;
  category: "Citizen" | "Police" | "Admin" | "General";
  icon: React.ElementType;
  badge?: string;
}

const ALL_ROUTES: RouteItem[] = [
  { name: "Home Portal", desc: "Main public landing page & station overview", path: "/", category: "General", icon: Home },
  { name: "Sign In", desc: "Citizen, Police, and Admin authentication", path: "/login", category: "General", icon: LogIn },
  { name: "Register", desc: "Create a verified citizen account", path: "/register", category: "General", icon: UserPlus },
  { name: "Emergency SOS", desc: "Fast-response police dispatch with GPS", path: "/sos", category: "Citizen", icon: Radio, badge: "Emergency" },
  { name: "Citizen Portal", desc: "Citizen personal cockpit, stats & safety alerts", path: "/citizen", category: "Citizen", icon: ShieldAlert },
  { name: "Report Incident (FIR)", desc: "File an official crime report with evidence", path: "/citizen/report", category: "Citizen", icon: FileText },
  { name: "File CSR", desc: "Community Service Register application", path: "/citizen/csr", category: "Citizen", icon: FileText },
  { name: "Police Portal", desc: "Station duty officer dashboard & FIR management", path: "/police", category: "Police", icon: Shield },
  { name: "Police Password Change", desc: "Update officer credentials securely", path: "/police/change-password", category: "Police", icon: Shield },
  { name: "Admin Dashboard", desc: "Central administration, officers, and backups", path: "/admin", category: "Admin", icon: ShieldAlert },
  { name: "Admin SOS History", desc: "Audit logs of all activated SOS alerts", path: "/admin/sos-history", category: "Admin", icon: Radio },
];

export default function NotFound() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            setUserRole(snap.data().role || "citizen");
          }
        } catch {
          // ignore
        }
      }
    });
    return () => unsub();
  }, []);

  // Compute smart suggested route based on the attempted path
  const smartSuggestion = React.useMemo(() => {
    if (!pathname) return null;
    const lower = pathname.toLowerCase();

    if (lower.includes("dash")) {
      return { path: userRole === "admin" ? "/admin" : userRole === "police" ? "/police" : "/citizen", label: "Go to your Dashboard" };
    }
    if (lower.includes("sos")) {
      return { path: "/sos", label: "Go to Emergency SOS Dispatch" };
    }
    if (lower.includes("report") || lower.includes("fir") || lower.includes("crime")) {
      return { path: "/citizen/report", label: "Go to Crime Report (FIR) Page" };
    }
    if (lower.includes("csr") || lower.includes("petition")) {
      return { path: "/citizen/csr", label: "Go to File CSR Page" };
    }
    if (lower.includes("police") || lower.includes("officer")) {
      return { path: "/police", label: "Go to Police Officer Portal" };
    }
    if (lower.includes("admin") || lower.includes("backup")) {
      return { path: "/admin", label: "Go to Admin Dashboard" };
    }
    if (lower.includes("sign") || lower.includes("log") || lower.includes("auth")) {
      return { path: "/login", label: "Go to Sign In" };
    }
    return null;
  }, [pathname, userRole]);

  // Filter routes according to search query
  const filteredRoutes = React.useMemo(() => {
    if (!search.trim()) return ALL_ROUTES;
    const q = search.toLowerCase();
    return ALL_ROUTES.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden transition-colors duration-300">
      {/* Background glowing gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 dark:bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-indigo-600/10 dark:bg-[#12351F]/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full text-center my-6">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/10 dark:bg-red-500/15 border border-red-500/25 text-red-600 dark:text-red-400 text-xs font-semibold mb-5">
          <ShieldAlert className="w-4 h-4" />
          <span>Error 404 • Resource Not Found</span>
        </div>

        {/* 404 Big Heading */}
        <h1 className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tight bg-gradient-to-b from-text-primary via-text-secondary to-text-tertiary bg-clip-text text-transparent mb-2 drop-shadow-sm font-mono">
          404
        </h1>

        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
          Page Not Found
        </h2>

        <p className="text-text-secondary text-xs sm:text-sm md:text-base leading-relaxed mb-4 max-w-md mx-auto">
          The requested route or resource could not be located. It might have been moved, renamed, or is temporarily unavailable.
        </p>

        {/* Display Attempted Path */}
        {pathname && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ui-bg border border-ui-border text-xs font-mono text-text-secondary mb-6">
            <span className="opacity-60">Attempted Route:</span>
            <span className="font-bold text-red-500 dark:text-red-400">{pathname}</span>
          </div>
        )}

        {/* Smart Suggestion Banner if detected */}
        {smartSuggestion && (
          <div className="glass-panel p-3.5 mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-2.5">
              <Compass className="w-5 h-5 text-emerald-500 shrink-0" />
              <div>
                <div className="text-xs text-text-secondary font-medium">Looking for this page?</div>
                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{smartSuggestion.label}</div>
              </div>
            </div>
            <Link
              href={smartSuggestion.path}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 transition-all shadow-md"
            >
              Go to Page &rarr;
            </Link>
          </div>
        )}

        {/* Quick Route Shortcuts & Search */}
        <div className="glass-panel p-5 mb-8 shadow-2xl rounded-2xl text-left border border-ui-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Available Application Routes
              </p>
              <p className="text-[11px] text-text-secondary">
                Select a valid destination below or search by keyword
              </p>
            </div>

            {/* Filter Search Input */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search routes..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-ui-bg border border-ui-border text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
            {filteredRoutes.map((r) => {
              const IconComp = r.icon;
              return (
                <Link
                  key={r.path}
                  href={r.path}
                  className="flex items-center gap-3 p-3 rounded-xl bg-ui-bg hover:bg-black/5 dark:hover:bg-white/5 border border-ui-border hover:border-emerald-500/40 transition-all group"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-text-primary truncate">
                        {r.name}
                      </span>
                      {r.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/15 text-red-500 border border-red-500/30">
                          {r.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-text-secondary truncate">
                      {r.desc}
                    </div>
                  </div>
                </Link>
              );
            })}

            {filteredRoutes.length === 0 && (
              <div className="col-span-full py-8 text-center text-xs text-text-secondary">
                No matching application routes found for &quot;{search}&quot;.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {currentUser && userRole ? (
            <Link
              href={userRole === "admin" ? "/admin" : userRole === "police" ? "/police" : "/citizen"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-lg transition-all"
            >
              <Compass className="w-4 h-4" />
              Return to {userRole.toUpperCase()} Dashboard
            </Link>
          ) : (
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass-button font-semibold text-sm shadow-lg transition-all"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          )}

          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass-button-secondary font-medium text-sm transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Page
          </button>
        </div>
      </div>
    </div>
  );
}
