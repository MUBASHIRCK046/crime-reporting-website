"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/firebase/client";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { saveSOSResolutionNote } from "@/lib/admin";
import { getUserProfile } from "@/lib/profile";
import { toast } from "sonner";
import { 
  ShieldAlert, ArrowLeft, Search, CheckCircle2, Clock, MapPin, 
  User, Phone, Mail, FileText, Lock, AlertCircle, Loader2,
  ExternalLink, ShieldCheck, X, Printer, QrCode
} from "lucide-react";
import { AnimatedSubmitButton } from "@/components/AnimatedSubmitButton";
import { motion, AnimatePresence } from "framer-motion";
import { printSOSHistoryRecord } from "@/lib/export";
import SOSQRModal from "@/components/SOSQRModal";

export default function SOSHistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [resolvedAlerts, setResolvedAlerts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Resolution Note Modal State
  const [selectedAlertForNote, setSelectedAlertForNote] = useState<any | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [resolutionNoteInput, setResolutionNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // SOS QR Modal State
  const [selectedAlertForQR, setSelectedAlertForQR] = useState<any | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // View Citizen Profile Modal State
  const [selectedCitizenProfile, setSelectedCitizenProfile] = useState<any | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);

  useEffect(() => {
    document.title = "SOS Alert History — Admin";
  }, []);

  useEffect(() => {
    let unsubscribeSOS: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        if (unsubscribeSOS) {
          unsubscribeSOS();
          unsubscribeSOS = null;
        }
        router.push("/login");
      } else {
        // Realtime Listener for Resolved SOS Alerts
        const sosQuery = query(
          collection(db, "sos_alerts"),
          where("status", "==", "Resolved")
        );

        unsubscribeSOS = onSnapshot(
          sosQuery,
          (snapshot) => {
            const alerts: any[] = [];
            snapshot.forEach((doc) => {
              alerts.push({ id: doc.id, ...doc.data() });
            });

            // Sort newest resolved first
            alerts.sort((a, b) => {
              const timeA = new Date(a.resolvedAt || a.updatedAt || a.createdAt || a.timestamp || 0).getTime();
              const timeB = new Date(b.resolvedAt || b.updatedAt || b.createdAt || b.timestamp || 0).getTime();
              return timeB - timeA;
            });

            setResolvedAlerts(alerts);
            setLoading(false);
          },
          (err) => {
            console.error("Error listening to resolved SOS alerts:", err);
            setLoading(false);
          }
        );
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSOS) {
        unsubscribeSOS();
      }
    };
  }, [router]);

  // Search filtering
  const filteredAlerts = resolvedAlerts.filter((alert) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (alert.citizenName || "").toLowerCase();
    const id = (alert.id || "").toLowerCase();
    const citizenId = (alert.citizenId || "").toLowerCase();
    const phone = (alert.citizenPhone || "").toLowerCase();
    const address = (alert.citizenAddress || "").toLowerCase();
    const date = new Date(alert.createdAt || alert.timestamp).toLocaleDateString().toLowerCase();
    return name.includes(q) || id.includes(q) || citizenId.includes(q) || phone.includes(q) || address.includes(q) || date.includes(q);
  });

  // KPI calculations
  const totalResolved = resolvedAlerts.length;
  const today = new Date().toDateString();
  const resolvedToday = resolvedAlerts.filter(a => {
    const d = new Date(a.resolvedAt || a.createdAt || a.timestamp).toDateString();
    return d === today;
  }).length;
  const withResolutionNotes = resolvedAlerts.filter(a => a.resolutionNote || a.resolutionNoteImmutable).length;

  const handleOpenNoteModal = (alert: any) => {
    setSelectedAlertForNote(alert);
    setResolutionNoteInput(alert.resolutionNote || "");
    setIsNoteModalOpen(true);
  };

  const handleSaveResolutionNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForNote) return;
    if (!resolutionNoteInput.trim()) {
      toast.error("Please enter a resolution note before saving.");
      return;
    }

    if (selectedAlertForNote.resolutionNote || selectedAlertForNote.resolutionNoteImmutable) {
      toast.error("This resolution note has already been permanently recorded and cannot be modified.");
      setIsNoteModalOpen(false);
      return;
    }

    setSavingNote(true);
    const adminUser = auth.currentUser;
    const adminName = adminUser?.displayName || adminUser?.email || "System Admin";
    
    const result = await saveSOSResolutionNote(selectedAlertForNote.id, resolutionNoteInput, adminName);
    setSavingNote(false);

    if (result.success) {
      toast.success("Resolution note permanently recorded successfully.");
      setIsNoteModalOpen(false);
      setSelectedAlertForNote(null);
      setResolutionNoteInput("");
    } else {
      toast.error(result.error || "Failed to save resolution note.");
    }
  };

  const handleViewProfile = async (citizenId: string) => {
    setIsProfileModalOpen(true);
    setFetchingProfile(true);
    try {
      const { profile } = await getUserProfile(citizenId);
      setSelectedCitizenProfile(profile);
    } catch (err) {
      console.error("Error fetching citizen profile:", err);
    } finally {
      setFetchingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 dark:text-emerald-400" />
        <p className="text-sm font-bold text-text-secondary">Loading Resolved SOS Alert History...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text-primary p-4 md:p-8 lg:p-12 transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-ui-border">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="p-3 rounded-2xl glass-panel hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary transition-all border border-ui-border shadow-sm group"
              title="Return to Admin Dashboard"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  Historical Records
                </span>
                <span className="text-xs text-text-tertiary">• Official Police Archive</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight mt-1 flex items-center gap-2.5">
                <ShieldAlert className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                SOS Alert History
              </h1>
              <p className="text-xs md:text-sm text-text-secondary mt-0.5">
                Permanent log of all safely resolved emergency SOS dispatches and official resolution statements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="px-5 py-2.5 rounded-xl glass-button-secondary text-xs font-bold transition-all shadow-sm"
            >
              Admin Dashboard
            </Link>
          </div>
        </div>

        {/* KPI Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Resolved Cases</p>
                <p className="text-3xl font-black text-text-primary mt-1">{totalResolved}</p>
                <p className="text-[11px] text-text-secondary mt-1">Safely closed emergency alerts</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-blue-500/20 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Resolved Today</p>
                <p className="text-3xl font-black text-text-primary mt-1">{resolvedToday}</p>
                <p className="text-[11px] text-text-secondary mt-1">Closed in past 24 hours</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Clock className="w-7 h-7" />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-purple-500/20 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Resolution Notes Recorded</p>
                <p className="text-3xl font-black text-text-primary mt-1">{withResolutionNotes}</p>
                <p className="text-[11px] text-text-secondary mt-1">Permanent statements logged</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Lock className="w-7 h-7" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-ui-border shadow-md flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search resolved history by citizen name, alert ID, phone, address, or date..."
              className="w-full pl-10 pr-4 py-2.5 glass-input text-xs font-medium text-text-primary placeholder:text-text-tertiary"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-xs font-bold text-text-secondary shrink-0">
            Showing <span className="text-emerald-600 dark:text-emerald-400 font-mono">{filteredAlerts.length}</span> of <span className="font-mono">{resolvedAlerts.length}</span> cases
          </div>
        </div>

        {/* Resolved SOS Records Table / Cards */}
        <div className="glass-panel rounded-2xl border border-ui-border shadow-xl overflow-hidden">
          <div className="p-6 border-b border-ui-border flex items-center justify-between bg-black/5 dark:bg-white/5">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Resolved Emergency Incidents
            </h2>
            <span className="text-xs text-text-secondary font-mono">
              Immutable Police Archive
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-[11px] uppercase tracking-wider text-text-secondary border-b border-ui-border">
                  <th className="px-6 py-4 font-bold">Citizen & Contact</th>
                  <th className="px-6 py-4 font-bold">Case ID</th>
                  <th className="px-6 py-4 font-bold">Date & Time</th>
                  <th className="px-6 py-4 font-bold">Location</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Resolution Note</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border text-xs">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-text-secondary">
                      <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-600" />
                      <p className="font-bold text-base text-text-primary">No Resolved SOS Cases Found</p>
                      <p className="text-xs text-text-tertiary mt-1">
                        {searchQuery ? "No records match your search criteria." : "Resolved SOS alerts will automatically be archived here."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((alert) => {
                    const hasNote = !!(alert.resolutionNote || alert.resolutionNoteImmutable);
                    const alertDate = new Date(alert.createdAt || alert.timestamp);
                    const mapsUrl = alert.latitude && alert.longitude 
                      ? `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`
                      : null;

                    return (
                      <tr 
                        key={alert.id} 
                        className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                      >
                        {/* Citizen Name & Phone */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            {alert.citizenName || "Unknown Citizen"}
                          </div>
                          <div className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-2">
                            <span>📞 {alert.citizenPhone || "N/A"}</span>
                          </div>
                          {alert.citizenEmail && alert.citizenEmail !== "N/A" && (
                            <div className="text-[11px] text-text-tertiary truncate max-w-[180px]">
                              ✉️ {alert.citizenEmail}
                            </div>
                          )}
                        </td>

                        {/* Case ID */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                            SOS-{alert.id.substring(0, 8).toUpperCase()}
                          </span>
                        </td>

                        {/* Date & Time */}
                        <td className="px-6 py-4 text-text-secondary whitespace-nowrap">
                          <div className="font-semibold text-text-primary">{alertDate.toLocaleDateString()}</div>
                          <div className="text-[11px] text-text-tertiary">{alertDate.toLocaleTimeString()}</div>
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4 max-w-[200px]">
                          {alert.citizenAddress && alert.citizenAddress !== "N/A" ? (
                            <p className="text-text-secondary text-xs truncate" title={alert.citizenAddress}>
                              {alert.citizenAddress}
                            </p>
                          ) : null}
                          {mapsUrl ? (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-0.5"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          ) : (
                            <span className="text-text-tertiary text-[11px]">N/A</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 shadow-sm">
                            <CheckCircle2 className="w-3 h-3" />
                            Resolved
                          </span>
                        </td>

                        {/* Resolution Note */}
                        <td className="px-6 py-4 max-w-[240px]">
                          {hasNote ? (
                            <div className="space-y-1">
                              <p className="text-xs text-text-primary line-clamp-2 italic bg-black/5 dark:bg-white/5 p-2 rounded-lg border border-ui-border">
                                "{alert.resolutionNote}"
                              </p>
                              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                <Lock className="w-3 h-3" />
                                <span>Permanently Recorded</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Note Pending
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasNote ? (
                              <button
                                onClick={() => handleOpenNoteModal(alert)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>View Note</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenNoteModal(alert)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Add Note</span>
                              </button>
                            )}

                            {/* Print Button */}
                            <button
                              onClick={() => printSOSHistoryRecord(alert)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                              title="Print Single SOS History Record"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>Print</span>
                            </button>

                            {/* QR Generate Button */}
                            <button
                              onClick={() => {
                                setSelectedAlertForQR(alert);
                                setIsQRModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                              title="Generate Verification QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>QR</span>
                            </button>

                            <button
                              onClick={() => handleViewProfile(alert.citizenId)}
                              className="px-2.5 py-1.5 rounded-lg bg-ui-bg hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary hover:text-text-primary text-xs font-bold border border-ui-border transition-all cursor-pointer"
                              title="View Citizen KYC Profile"
                            >
                              <User className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* RESOLUTION NOTE MODAL (WITH PERMANENT IMMUTABILITY) */}
      <AnimatePresence>
        {isNoteModalOpen && selectedAlertForNote && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-ui-border relative overflow-hidden bg-card"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-ui-border mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">
                      {selectedAlertForNote.resolutionNote || selectedAlertForNote.resolutionNoteImmutable
                        ? "Official Resolution Note"
                        : "Record Resolution Note"}
                    </h3>
                    <p className="text-xs text-text-secondary font-mono">
                      SOS-{selectedAlertForNote.id.substring(0, 8).toUpperCase()} • {selectedAlertForNote.citizenName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsNoteModalOpen(false)}
                  className="p-2 text-text-tertiary hover:text-text-primary rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Immutable Saved Note View */}
              {selectedAlertForNote.resolutionNote || selectedAlertForNote.resolutionNoteImmutable ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-text-primary text-xs leading-relaxed space-y-2">
                    <p className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
                      Permanent Resolution Statement
                    </p>
                    <p className="text-sm font-medium text-text-primary whitespace-pre-wrap">
                      "{selectedAlertForNote.resolutionNote}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-ui-border">
                    <div>
                      <p className="text-text-secondary text-[10px] uppercase font-bold">Recorded By</p>
                      <p className="font-bold text-text-primary mt-0.5">{selectedAlertForNote.resolutionNoteAddedBy || "Administrator"}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary text-[10px] uppercase font-bold">Recorded At</p>
                      <p className="font-mono text-text-primary mt-0.5">
                        {selectedAlertForNote.resolutionNoteAddedAt 
                          ? new Date(selectedAlertForNote.resolutionNoteAddedAt).toLocaleString() 
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Immutability Notice Badge */}
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-3">
                    <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      ✓ Permanently Recorded — This official police record is cryptographically immutable and cannot be edited or deleted.
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsNoteModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl glass-button text-xs font-bold cursor-pointer"
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : (
                /* Add New Note Form (One-Time Creation) */
                <form onSubmit={handleSaveResolutionNote} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
                      Resolution Statement *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={resolutionNoteInput}
                      onChange={(e) => setResolutionNoteInput(e.target.value)}
                      placeholder="e.g. Police patrol unit reached the location at 10:45 AM. Confirmed situation resolved safely. Citizen received required assistance."
                      className="w-full p-4 rounded-2xl glass-input text-xs leading-relaxed text-text-primary resize-none placeholder:text-text-tertiary focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>

                  {/* Warning on Immutability */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-bold">Permanent Legal Record Notice</p>
                      <p className="text-[11px] opacity-90 mt-0.5">
                        Once saved, this resolution note CANNOT be edited, modified, or deleted by anyone. Please verify all details before submitting.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsNoteModalOpen(false)}
                      className="px-5 py-2.5 rounded-xl glass-button-secondary text-xs font-bold"
                    >
                      Cancel
                    </button>

                    <AnimatedSubmitButton
                      text="Save Resolution Note"
                      disabled={savingNote}
                      width={220}
                      height={48}
                      onClick={async () => {
                        await handleSaveResolutionNote({ preventDefault: () => {} } as any);
                      }}
                    />
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CITIZEN KYC PROFILE MODAL */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl glass-panel rounded-3xl p-6 md:p-8 shadow-2xl border border-ui-border relative overflow-hidden bg-card"
            >
              <div className="flex items-center justify-between pb-4 border-b border-ui-border mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-text-primary">Citizen KYC Profile</h3>
                    <p className="text-xs text-text-secondary">Verified citizen identity records</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  className="p-2 text-text-tertiary hover:text-text-primary rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {fetchingProfile ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs text-text-secondary">Loading KYC Profile...</p>
                </div>
              ) : selectedCitizenProfile ? (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-ui-border">
                    <div>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Full Name</span>
                      <p className="font-bold text-text-primary text-sm mt-0.5">{selectedCitizenProfile.name || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Phone Number</span>
                      <p className="font-bold text-text-primary text-sm mt-0.5">{selectedCitizenProfile.mobileNumber || selectedCitizenProfile.phone || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Email Address</span>
                      <p className="font-medium text-text-primary mt-0.5">{selectedCitizenProfile.email || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Date of Birth</span>
                      <p className="font-medium text-text-primary mt-0.5">{selectedCitizenProfile.dob || "N/A"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">ID Proof Type</span>
                      <p className="font-medium text-text-primary mt-0.5">{selectedCitizenProfile.idProofType || "Aadhaar"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-text-secondary uppercase">ID Proof Number</span>
                      <p className="font-mono font-bold text-text-primary mt-0.5">{selectedCitizenProfile.idProofNumber || "N/A"}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold text-text-secondary uppercase">Residential Address</span>
                      <p className="font-medium text-text-primary mt-0.5">{selectedCitizenProfile.residentialAddress || selectedCitizenProfile.address || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => setIsProfileModalOpen(false)}
                      className="px-6 py-2.5 rounded-xl glass-button text-xs font-bold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-center py-8 text-text-secondary">No additional KYC profile data found.</p>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* SOS QR MODAL */}
      <SOSQRModal
        alert={selectedAlertForQR}
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setSelectedAlertForQR(null);
        }}
      />
    </div>
  );
}
