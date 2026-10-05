"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { changePolicePassword, logoutUser } from "@/lib/auth";
import { toast } from "sonner";
import { Lock, CheckCircle2, Loader2, LogOut } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== "police") {
            // Redirect non-police roles to their appropriate pages
            if (userData.role === "admin") router.push("/admin");
            else router.push("/citizen");
            return;
          }

          setCurrentUser({ uid: user.uid, ...userData });
          
          // If they don't need to change password, send them to the main dashboard
          if (!userData.mustChangePassword) {
            router.push("/police");
            return;
          }
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth check error:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await logoutUser();
    router.push("/login");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPasswordInput.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      toast.error("Passwords do not match.");
      return;
    }

    setChangingPassword(true);
    const result = await changePolicePassword(newPasswordInput);
    if (result.success) {
      toast.success("Password updated successfully! Welcome to your Police Portal.");
      router.push("/police");
    } else {
      toast.error(result.error || "Failed to update password.");
    }
    setChangingPassword(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md overflow-hidden shadow-2xl border border-purple-500/40 rounded-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 border-b border-purple-500/30 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-500/20 border-2 border-purple-500/40 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Change Temporary Password</h2>
          <p className="text-xs text-text-secondary mt-1">
            You are currently logged in with an administrator-assigned temporary password. Please set your permanent confidential password to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              New Permanent Password *
            </label>
            <input
              type="password"
              required
              placeholder="Enter new password (min 6 characters)"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              placeholder="Re-enter new password"
              value={confirmPasswordInput}
              onChange={(e) => setConfirmPasswordInput(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Save New Password & Enter Portal</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2 px-4 bg-ui-bg hover:bg-white/10 border border-ui-border text-text-secondary hover:text-text-primary text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Cancel & Sign Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
