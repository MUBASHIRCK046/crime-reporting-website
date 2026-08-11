"use client"; // Beginner Note: This tells Next.js this file runs in the user's browser, not the server.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser } from "@/lib/auth";
import { Shield, Mail, Lock, User, AlertCircle, Loader2, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  
  // Beginner Note: 'useState' is like a memory box for our screen. 
  // It remembers what the user typed in the text boxes!
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("citizen"); // Default role
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); // Stops the page from refreshing when we click submit
    setLoading(true);
    setError("");

    // Call our helper function from lib/auth.ts
    const result = await registerUser(email, password, name, role);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      // Success! Send them to their dashboard
      if (role === "citizen") router.push("/citizen");
      if (role === "police") router.push("/police");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 mb-4 border border-ui-border glass-panel">
            <UserPlus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-tight drop-shadow-sm">Create Account</h1>
          <p className="text-text-secondary mt-2">Join the Crime Assist network today</p>
        </div>

        <form onSubmit={handleRegister} className="glass-panel p-8">
          {/* Error Message Box */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start gap-3 backdrop-blur-md">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
            </div>
          )}

          <div className="space-y-5">
            {/* Name Input */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Full Name</label>
              <div className="relative">
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
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email Address</label>
              <div className="relative">
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
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-text-tertiary" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 glass-input text-text-primary placeholder-text-tertiary"
                  placeholder="••••••••"
                />
              </div>
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 glass-button py-3 px-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
          </button>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
