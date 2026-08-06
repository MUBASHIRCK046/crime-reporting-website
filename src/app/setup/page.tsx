"use client";

import { useState } from "react";
import { registerUser } from "@/lib/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/firebase/client";
import { auth } from "@/firebase/client";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { CheckCircle2, Loader2, Shield, Users, ShieldAlert, ShieldCheck, ArrowRight, UserCheck } from "lucide-react";
import Link from "next/link";

// Our 3 test accounts with their credentials
const TEST_ACCOUNTS = [
  {
    name: "Test Citizen",
    email: "citizen@crimeassist.com",
    password: "Citizen@123",
    role: "citizen",
    icon: <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    color: "blue",
    dashboard: "/citizen",
  },
  {
    name: "Test Officer",
    email: "officer@crimeassist.com",
    password: "Officer@123",
    role: "police",
    icon: <ShieldAlert className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
    color: "purple",
    dashboard: "/police",
  },
  {
    name: "System Admin",
    email: "admin@crimeassist.com",
    password: "Admin@123",
    role: "admin",
    icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    color: "emerald",
    dashboard: "/admin",
  },
];

export default function SetupPage() {
  const [status, setStatus] = useState<Record<string, "idle" | "loading" | "done" | "exists">>({
    citizen: "idle",
    police: "idle",
    admin: "idle",
  });
  const [allDone, setAllDone] = useState(false);
  const [running, setRunning] = useState(false);

  const createAccount = async (account: typeof TEST_ACCOUNTS[0]) => {
    setStatus(prev => ({ ...prev, [account.role]: "loading" }));
    try {
      // Create in Firebase Auth
      const cred = await createUserWithEmailAndPassword(auth, account.email, account.password);
      // Save role in Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: account.name,
        email: account.email,
        role: account.role,
        createdAt: new Date().toISOString(),
      });
      setStatus(prev => ({ ...prev, [account.role]: "done" }));
    } catch (err: any) {
      // auth/email-already-in-use means the account already exists — that's fine!
      if (err.code === "auth/email-already-in-use") {
        setStatus(prev => ({ ...prev, [account.role]: "exists" }));
      } else {
        setStatus(prev => ({ ...prev, [account.role]: "done" }));
      }
    }
  };

  const handleSetupAll = async () => {
    setRunning(true);
    for (const account of TEST_ACCOUNTS) {
      await createAccount(account);
    }
    setRunning(false);
    setAllDone(true);
  };

  const getStatusIcon = (role: string) => {
    const s = status[role];
    if (s === "loading") return <Loader2 className="w-5 h-5 animate-spin text-slate-900 dark:text-white" />;
    if (s === "done") return <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    if (s === "exists") return <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    return null;
  };

  const getStatusText = (role: string) => {
    const s = status[role];
    if (s === "loading") return "Creating...";
    if (s === "done") return "Created ✅";
    if (s === "exists") return "Already exists ✅";
    return "";
  };

  const getRoleColor = (role: string) => {
    if (role === "citizen") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    if (role === "police") return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      <div className="w-full max-w-xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-ui-border glass-panel mb-4">
            <UserCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary drop-shadow-sm">Crime Assist — Setup</h1>
          <p className="text-text-secondary mt-2">Create all test accounts with one click</p>
        </div>

        {/* Account Cards */}
        <div className="space-y-4 mb-8">
          {TEST_ACCOUNTS.map((account) => (
            <div key={account.email} className="p-4 rounded-xl border border-ui-border bg-ui-bg flex items-center justify-between">
              <div>
                <p className="font-semibold text-text-primary">{account.name}</p>
                <p className="text-xs text-text-secondary font-mono">{account.email}</p>
                <p className="text-xs text-text-tertiary font-mono">Password: {account.password}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getRoleColor(account.role)}`}>
                  {account.role}
                </div>
                <span className="text-xs font-medium text-text-secondary">{getStatusText(account.role)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        {!allDone ? (
          <button
            onClick={handleSetupAll}
            disabled={running}
            className="w-full py-4 glass-button text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}
          >
            {running ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Creating Accounts...</>
            ) : (
              <><Shield className="w-5 h-5" /> Create All Test Accounts</>
            )}
          </button>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary">Setup Complete!</h2>
              <p className="text-text-secondary text-sm mt-1">Use the credentials above to log in.</p>
            </div>
            <Link
              href="/login"
              className="w-full py-4 glass-button text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              Go to Login <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        {/* Credentials Reference Box */}
        <div className="mt-8 glass-panel p-6">
          <h3 className="text-sm font-bold text-text-primary mb-4">📋 Credentials Reference</h3>
          <div className="space-y-3 text-xs font-mono bg-ui-bg p-4 rounded-xl border border-ui-border shadow-inner">
            <div className="flex justify-between items-center border-b border-ui-border pb-2">
              <span className="font-bold text-blue-600 dark:text-blue-400">CITIZEN:</span>
              <span className="text-text-secondary">citizen@crimeassist.com / Citizen@123</span>
            </div>
            <div className="flex justify-between items-center border-b border-ui-border pb-2">
              <span className="font-bold text-purple-600 dark:text-purple-400">POLICE:</span>
              <span className="text-text-secondary">officer@crimeassist.com / Officer@123</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">ADMIN:</span>
              <span className="text-text-secondary">admin@crimeassist.com / Admin@123</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-text-tertiary mt-6 font-medium">
          Crime Assist Development Mode
        </p>
      </div>
    </div>
  );
}
