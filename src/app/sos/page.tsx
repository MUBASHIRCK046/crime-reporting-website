"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ShieldAlert, PhoneCall, MapPin, AlertTriangle, ArrowLeft, 
  Home, CheckCircle2, Loader2, QrCode, Radio, ExternalLink
} from "lucide-react";
import { auth, db } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { triggerSOS } from "@/lib/complaints";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

export default function EmergencySOSPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [sosSent, setSosSent] = useState(false);
  const [sosId, setSosId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            setUserData(snap.data());
          }
        } catch (e) {
          console.error("Error fetching user profile:", e);
        }
      }
    });

    // Auto-detect location for quick emergency dispatch
    detectLocation();

    return () => unsub();
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        setLocError(err.message || "Failed to retrieve current location");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleTriggerSOS = async () => {
    if (!currentUser) {
      toast.error("Please log in to link this SOS alert with your verified profile.", {
        action: {
          label: "Login",
          onClick: () => router.push("/login"),
        },
      });
      return;
    }

    setLoading(true);
    try {
      const lat = location?.lat || 11.3217;
      const lng = location?.lng || 75.9928;
      const res = await triggerSOS(currentUser.uid, lat, lng);

      if (res.success) {
        setSosSent(true);
        setSosId(res.id || null);
        toast.success("EMERGENCY SOS BROADCASTED TO POLICE DISPATCH!");
      } else {
        toast.error(res.error || "Failed to broadcast SOS alert.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col justify-between p-4 sm:p-6 md:p-10 relative overflow-hidden transition-colors duration-300">
      {/* Background Pulse Ambience */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 dark:bg-red-950/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Top Navbar */}
      <header className="relative z-10 flex items-center justify-between max-w-4xl mx-auto w-full mb-8">
        <Link 
          href="/" 
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl glass-panel hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs sm:text-sm font-semibold text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <Link
              href="/citizen"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ui-bg border border-ui-border text-xs sm:text-sm font-medium hover:border-emerald-500/40 transition-all"
            >
              <span>Citizen Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition-all shadow-md"
            >
              <span>Citizen Sign In</span>
            </Link>
          )}
        </div>
      </header>

      {/* Main SOS Cockpit */}
      <main className="relative z-10 max-w-2xl mx-auto w-full text-center flex-1 flex flex-col items-center justify-center">
        {/* Urgent Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider mb-6 animate-pulse">
          <Radio className="w-4 h-4 animate-spin text-red-500" style={{ animationDuration: "3s" }} />
          <span>Kerala Police Emergency Protocol</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight mb-4 text-text-primary">
          Emergency <span className="text-red-600 dark:text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">SOS</span> Dispatch
        </h1>

        <p className="text-text-secondary text-sm sm:text-base max-w-lg mx-auto mb-8">
          Activate instant police emergency alert with automatic GPS coordinates broadcast to Mukkom Police Station and regional patrol units.
        </p>

        {/* SOS Sent Confirmation Banner */}
        {sosSent ? (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border-2 border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_35px_rgba(16,185,129,0.25)] mb-8 max-w-md w-full animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              SOS Broadcast Active
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary mb-4 leading-relaxed">
              Your emergency signal has been registered with ID:{" "}
              <code className="px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono font-bold text-text-primary">
                {sosId?.slice(0, 10)}...
              </code>
              <br />Mukkom Police Duty Officers have received your distress coordinates.
            </p>

            <div className="flex flex-col gap-2">
              <Link
                href="/citizen"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all"
              >
                Track Status in Citizen Portal
              </Link>
              <button
                onClick={() => setSosSent(false)}
                className="w-full py-2.5 px-4 rounded-xl glass-button-secondary text-xs text-text-secondary hover:text-text-primary transition-all cursor-pointer"
              >
                Send Another Alert
              </button>
            </div>
          </div>
        ) : (
          /* Massive Emergency SOS Trigger Button */
          <div className="relative mb-10 flex flex-col items-center">
            {/* Radar Rings */}
            <div className="absolute inset-0 -m-8 rounded-full border border-red-500/20 animate-ping pointer-events-none" style={{ animationDuration: "2.8s" }} />
            <div className="absolute inset-0 -m-4 rounded-full border border-red-500/30 animate-pulse pointer-events-none" />

            <button
              onClick={handleTriggerSOS}
              disabled={loading}
              className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-gradient-to-br from-red-600 via-red-500 to-rose-700 text-white font-black text-2xl sm:text-3xl shadow-[0_0_50px_rgba(239,68,68,0.7)] hover:shadow-[0_0_70px_rgba(239,68,68,0.9)] active:scale-95 transition-all duration-300 flex flex-col items-center justify-center gap-2 cursor-pointer border-4 border-red-400/50 group"
            >
              {loading ? (
                <>
                  <Loader2 className="w-12 h-12 animate-spin" />
                  <span className="text-xs uppercase tracking-widest font-mono">Broadcasting...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-12 h-12 sm:w-14 sm:h-14 group-hover:scale-110 transition-transform" />
                  <span className="tracking-widest drop-shadow-md">ACTIVATE</span>
                  <span className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase opacity-90">Instant Dispatch</span>
                </>
              )}
            </button>

            {/* GPS Status Indicator */}
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-text-secondary">
              <MapPin className={`w-3.5 h-3.5 ${location ? "text-emerald-500" : "text-amber-500"}`} />
              {locating ? (
                <span>Locating GPS coordinates...</span>
              ) : location ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  GPS Ready ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  {locError || "GPS default: Mukkom Sector"} •{" "}
                  <button onClick={detectLocation} className="underline cursor-pointer">Retry</button>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Direct Emergency Telephone Hotlines */}
        <div className="glass-panel p-5 sm:p-6 rounded-2xl w-full max-w-xl text-left shadow-xl border border-ui-border">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary mb-4">
            <PhoneCall className="w-4 h-4 text-red-500" />
            <span>Immediate Emergency Helplines (24/7)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="tel:112"
              className="flex items-center justify-between p-3 rounded-xl bg-ui-bg hover:bg-red-500/10 border border-ui-border hover:border-red-500/30 transition-all group"
            >
              <div>
                <div className="text-base font-extrabold text-red-600 dark:text-red-400">112</div>
                <div className="text-xs text-text-secondary">National Emergency System</div>
              </div>
              <PhoneCall className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
            </a>

            <a
              href="tel:100"
              className="flex items-center justify-between p-3 rounded-xl bg-ui-bg hover:bg-blue-500/10 border border-ui-border hover:border-blue-500/30 transition-all group"
            >
              <div>
                <div className="text-base font-extrabold text-blue-600 dark:text-blue-400">100</div>
                <div className="text-xs text-text-secondary">Police Control Room</div>
              </div>
              <PhoneCall className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
            </a>

            <a
              href="tel:9497947245"
              className="flex items-center justify-between p-3 rounded-xl bg-ui-bg hover:bg-emerald-500/10 border border-ui-border hover:border-emerald-500/30 transition-all group"
            >
              <div>
                <div className="text-sm font-bold text-text-primary">9497947245</div>
                <div className="text-xs text-text-secondary">Station House Officer (SHO)</div>
              </div>
              <PhoneCall className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
            </a>

            <a
              href="tel:04952297133"
              className="flex items-center justify-between p-3 rounded-xl bg-ui-bg hover:bg-purple-500/10 border border-ui-border hover:border-purple-500/30 transition-all group"
            >
              <div>
                <div className="text-sm font-bold text-text-primary">0495-2297133</div>
                <div className="text-xs text-text-secondary">Mukkom Police Landline</div>
              </div>
              <PhoneCall className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="relative z-10 max-w-4xl mx-auto w-full mt-8 pt-4 border-t border-ui-border flex flex-col sm:flex-row items-center justify-between text-xs text-text-secondary gap-3">
        <div>
          <span>Mukkom Police Station Emergency Command • Kerala State Police</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/citizen/report" className="hover:text-text-primary transition-colors">
            File Regular Incident (FIR)
          </Link>
          <Link href="/citizen/csr" className="hover:text-text-primary transition-colors">
            File CSR
          </Link>
          <Link href="/" className="hover:text-text-primary transition-colors">
            Home
          </Link>
        </div>
      </footer>
    </div>
  );
}
