"use client";

import * as React from "react";
import { Moon, Sun, Home } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Hide the home button if we are already on the home page
  const isHome = pathname === "/";

  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
      {!isHome && (
        <Link
          href="/"
          className="p-4 rounded-full glass-panel glass-panel-hover text-text-primary shadow-xl hover:scale-110 transition-all flex items-center justify-center group"
          aria-label="Go to home page"
        >
          <Home className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300 text-blue-500" />
        </Link>
      )}

      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="p-4 rounded-full glass-panel glass-panel-hover text-text-primary shadow-xl hover:scale-110 transition-transform flex items-center justify-center group"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun className="w-6 h-6 text-yellow-400 group-hover:rotate-45 transition-transform duration-300" />
        ) : (
          <Moon className="w-6 h-6 text-purple-500 group-hover:-rotate-12 transition-transform duration-300" />
        )}
      </button>
    </div>
  );
}

