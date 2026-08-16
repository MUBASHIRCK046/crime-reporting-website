"use client"; // Beginner Note: This tells Next.js this file runs in the user's browser, not the server.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/auth";
import { Shield, Mail, Lock, User, Loader2, Eye, EyeOff, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "@/components/Toast";

export default function RegisterPage() {
  const router = useRouter();
  
  // State variables for inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dob, setDob] = useState("");
  const [role, setRole] = useState("citizen"); // Default role
  
  // State variables for password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // Stops the page from refreshing when we click submit
    setLoading(true);
    setToast(null);

    // 1. Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setToast({
        message: "Please enter a valid email address, e.g. example@gmail.com.",
        type: "warning"
      });
      setLoading(false);
      return;
    }

    // 2. Password Strength Validation
    const uppercaseRegex = /[A-Z]/;
    const lowercaseRegex = /[a-z]/;
    const numberRegex = /[0-9]/;
    const specialRegex = /[@#$!%*?&]/;

    if (
      password.length < 8 ||
      !uppercaseRegex.test(password) ||
      !lowercaseRegex.test(password) ||
      !numberRegex.test(password) ||
      !specialRegex.test(password)
    ) {
      setToast({
        message: "Password must be at least 8 characters and contain an uppercase letter, lowercase letter, number, and special character.",
        type: "warning"
      });
      setLoading(false);
      return;
    }

    // 3. Password Confirmation Validation
    if (password !== confirmPassword) {
      setToast({
        message: "Passwords do not match.",
        type: "warning"
      });
      setLoading(false);
      return;
    }

    // 4. Date of Birth Validation
    if (!dob) {
      setToast({
        message: "Please enter your date of birth.",
        type: "warning"
      });
      setLoading(false);
      return;
    }

    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      setToast({
        message: "Please enter a valid date of birth.",
        type: "warning"
      });
      setLoading(false);
      return;
    }

    if (dobDate > new Date()) {
      setToast({
        message: "Date of birth cannot be in the future.",
        type: "warning"
      });
      setLoading(false);
      return;
    }

    const minAgeDate = new Date();
    minAgeDate.setFullYear(minAgeDate.getFullYear() - 120);
    if (dobDate < minAgeDate) {
      setToast({
        message: "Please enter a realistic date of birth.",
        type: "warning"
      });
      setLoading(false);
      return;
    }

    // Call helper function from lib/auth.ts (now supports dob)
    const result = await registerUser(email, password, name, role, dob);

    if (result.error) {
      let userFriendlyError = "Registration failed. Please try again.";
      const errStr = result.error.toLowerCase();
      
      if (errStr.includes("auth/email-already-in-use") || errStr.includes("email-already-in-use")) {
        userFriendlyError = "An account already exists for this email address.";
      } else if (errStr.includes("auth/invalid-email") || errStr.includes("invalid-email")) {
        userFriendlyError = "Please enter a valid email address, e.g. example@gmail.com.";
      } else if (errStr.includes("auth/weak-password") || errStr.includes("weak-password")) {
        userFriendlyError = "Password is too weak. Please choose a stronger password.";
      } else {
        userFriendlyError = result.error;
      }

      setToast({ message: userFriendlyError, type: "error" });
      setLoading(false);
    } else {
      setToast({ message: "Account created successfully!", type: "success" });
      // Delay redirect slightly so user can view the success toast message
      setTimeout(() => {
        if (role === "citizen") router.push("/citizen");
        if (role === "police") router.push("/police");
      }, 1500);
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
          <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight drop-shadow-sm">Create Account</h1>
          <p className="text-text-secondary mt-3 max-w-sm text-lg md:text-xl font-semibold">Join the Crime Assist network today</p>
        </motion.div>

        {/* Right Column: Form Container */}
        <motion.div variants={itemVariants}>
          <motion.form 
            variants={formContainerVariants}
            initial="hidden"
            animate="visible"
            onSubmit={handleRegister} 
            className="flex flex-col space-y-5"
          >
            {/* Name Input */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-text-secondary mb-2">Full Name</label>
              <motion.div 
                whileHover={{ scale: 1.005 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <User className="h-5 w-5 text-text-tertiary" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 glass-input text-text-primary placeholder-text-tertiary"
                  placeholder="John Doe"
                />
              </motion.div>
            </motion.div>

            {/* Email Input */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
              <motion.div 
                whileHover={{ scale: 1.005 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-text-tertiary" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 glass-input text-text-primary placeholder-text-tertiary"
                  placeholder="you@example.com"
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

            {/* Re-enter Password Input */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-text-secondary mb-2">Re-enter Password</label>
              <motion.div 
                whileHover={{ scale: 1.005 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-text-tertiary" />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 glass-input text-text-primary placeholder-text-tertiary"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-secondary focus:outline-none z-20 cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </motion.div>
            </motion.div>

            {/* Date of Birth Input */}
            <motion.div variants={itemVariants}>
              <label className="block text-sm font-medium text-text-secondary mb-2">Date of Birth</label>
              <motion.div 
                whileHover={{ scale: 1.005 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Calendar className="h-5 w-5 text-text-tertiary" />
                </div>
                <input
                  type="date"
                  required
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 glass-input text-text-primary placeholder-text-tertiary"
                />
              </motion.div>
            </motion.div>

            {/* Button */}
            <motion.div variants={itemVariants}>
              <motion.button
                whileHover={!loading ? { scale: 1.015, translateY: -1 } : {}}
                whileTap={!loading ? { scale: 0.985 } : {}}
                transition={{ duration: 0.2 }}
                type="submit"
                disabled={loading}
                className="w-full mt-4 glass-button py-3 px-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
              </motion.button>
            </motion.div>

            {/* Link */}
            <motion.div variants={itemVariants}>
              <p className="text-center text-sm text-text-secondary mt-2">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors">
                  Sign in
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
