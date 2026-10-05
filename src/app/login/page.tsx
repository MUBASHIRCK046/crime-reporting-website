"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser } from "@/lib/auth";
import { Shield, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  
  const [emailOrPoliceId, setEmailOrPoliceId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);
  const [loading, setLoading] = useState(false);

  // Pre-warm / prefetch dashboard routes on mount for instant zero-delay navigation
  useEffect(() => {
    router.prefetch("/citizen");
    router.prefetch("/admin");
    router.prefetch("/police");
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setToast(null);

    const input = emailOrPoliceId.trim();

    // 1. Email Format Validation (Only if it looks like an email)
    if (input.includes("@")) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        setToast({
          message: "Please enter a valid email address, e.g. example@gmail.com.",
          type: "warning"
        });
        setLoading(false);
        return;
      }
    } else {
      // It's a Police ID, ensure it is non-empty
      if (!input) {
        setToast({
          message: "Please enter your Email Address or Police ID.",
          type: "warning"
        });
        setLoading(false);
        return;
      }
    }

    const result = await loginUser(input, password);

    if (result.error) {
      let userFriendlyError = "Incorrect email or password. Please try again.";
      const errStr = result.error.toLowerCase();

      // If it's a known Firebase Auth error or invalid credential error, map it
      if (
        errStr.includes("auth/invalid-credential") ||
        errStr.includes("invalid-credential") ||
        errStr.includes("auth/user-not-found") ||
        errStr.includes("user-not-found") ||
        errStr.includes("auth/wrong-password") ||
        errStr.includes("wrong-password") ||
        errStr.includes("auth/invalid-email") ||
        errStr.includes("invalid-email")
      ) {
        userFriendlyError = "Incorrect email or password. Please try again.";
      } else {
        userFriendlyError = result.error.includes("auth/")
          ? "Incorrect email or password. Please try again."
          : result.error;
      }

      setToast({ message: userFriendlyError, type: "error" });
      setLoading(false);
    } else {
      // Instant redirect for maximum performance
      const destination =
        result.role === "admin" ? "/admin" : result.role === "police" ? "/police" : "/citizen";
      router.push(destination);
    }
  };

  // Outer container stagger
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15,
      },
    },
  };

  // Inner form elements stagger
  const formContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.25,
      },
    },
  };

  // Individual element fade + slide-up
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number], // easeOutExpo
      },
    },
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center p-4 md:p-8 relative overflow-hidden transition-colors duration-300"
    >
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-4xl glass-panel p-6 md:p-10 lg:p-12 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center"
      >
        {/* Left Column: Branding and Header */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-ui-border pb-8 md:pb-0 md:pr-8 lg:pr-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-6 border border-ui-border glass-panel shadow-inner">
            <Shield className="w-10 h-10 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold tracking-widest text-blue-600 dark:text-blue-400 uppercase">Crime Assist Portal</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight drop-shadow-sm font-bold">Welcome Back</h1>
          <p className="text-text-secondary mt-3 max-w-sm text-lg md:text-xl font-semibold">Sign in to your Crime Assist account</p>
        </motion.div>

        {/* Right Column: Form Container */}
        <motion.div variants={itemVariants}>
          <motion.form 
            variants={formContainerVariants}
            initial="hidden"
            animate="visible"
            onSubmit={handleLogin} 
            className="flex flex-col space-y-5"
          >
            {/* Email / Police ID Input */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email Address or Police ID</label>
              <motion.div 
                whileHover={{ scale: 1.005 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-text-tertiary" />
                </div>
                <input
                  type="text"
                  required
                  value={emailOrPoliceId}
                  onChange={(e) => setEmailOrPoliceId(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 glass-input text-text-primary placeholder-text-tertiary"
                  placeholder="you@example.com or POL-2026-8569"
                />
              </motion.div>
            </motion.div>

            {/* Password Input */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
              <motion.div 
                whileHover={{ scale: 1.005 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-text-tertiary" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 glass-input text-text-primary placeholder-text-tertiary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-secondary focus:outline-none z-20 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </motion.div>
            </motion.div>

            {/* Forgot Password Link */}
            <motion.div variants={itemVariants} className="flex justify-end">
              <Link href="#" className="text-xs text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium">
                Forgot password?
              </Link>
            </motion.div>

            {/* Button */}
            <motion.div variants={itemVariants}>
              <button
                type="submit"
                disabled={loading}
                className="animated-button w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="arr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z" />
                </svg>
                <span className="text flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </span>
                <span className="circle"></span>
                <svg className="arr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.7781L10.8076 18.3639L16.1716 12.9999H4V10.9999H16.1716Z" />
                </svg>
              </button>
            </motion.div>

            {/* Link to Register */}
            <motion.div variants={itemVariants}>
              <p className="text-center text-sm text-text-secondary mt-2">
                Don't have an account?{" "}
                <Link href="/register" className="text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors">
                  Register now
                </Link>
              </p>
            </motion.div>

          </motion.form>
        </motion.div>
      </motion.div>

      {/* Reusable Toast Notification */}
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
