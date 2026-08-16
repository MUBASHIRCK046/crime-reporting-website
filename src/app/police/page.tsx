"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { getAssignedCases, getActiveSOSAlerts, updateComplaintStatus, addCaseLog, getCaseLogs } from "@/lib/police";
import { logoutUser, changePolicePassword } from "@/lib/auth";
import { Shield, LogOut, Loader2, Search, Filter, Eye, X, FileText, Send, Clock, User, Briefcase, Download, Printer, Save, Edit, Trash2, RotateCcw, Upload, Key, Power, MapPin, Calendar, Grid, Phone, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { CaseLog } from "@/lib/types";
import { exportCaseToPDF, printCaseDetails } from "@/lib/export";
import { getUserProfile } from "@/lib/profile";

export default function PoliceDashboard() {
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Mandatory First-Login Password Change State
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Modal State
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [caseLogs, setCaseLogs] = useState<CaseLog[]>([]);
  const [newLogText, setNewLogText] = useState("");
  const [loggingLoading, setLoggingLoading] = useState(false);
  const [fetchingLogs, setFetchingLogs] = useState(false);

  // Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedPoliceProfile, setSelectedPoliceProfile] = useState<any | null>(null);
  const [isEditingPolice, setIsEditingPolice] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);

  // Citizen KYC Modal State
  const [selectedCitizenProfile, setSelectedCitizenProfile] = useState<any | null>(null);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [fetchingKyc, setFetchingKyc] = useState(false);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          router.push("/login");
          return;
        }

        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role === "police") {
            setCurrentUser({ uid: user.uid, ...userData });
            if (userData.mustChangePassword) {
              router.push("/police/change-password");
              return;
            }
            fetchDashboardData(user.uid);
          } else if (userData.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/citizen");
          }
        } else {
          router.push("/login");
        }
      });
    };
    checkAuthAndFetchData();
  }, [router]);

  // Fetch logs whenever a complaint is selected
  useEffect(() => {
    const fetchLogs = async () => {
      if (selectedComplaint) {
        setFetchingLogs(true);
        const { logs } = await getCaseLogs(selectedComplaint.id);
        setCaseLogs(logs);
        setFetchingLogs(false);
      } else {
        setCaseLogs([]);
      }
    };
    fetchLogs();
  }, [selectedComplaint]);

  const fetchDashboardData = async (officerId: string) => {
    setLoading(true);
    const complaintsResult = await getAssignedCases(officerId);
    const sosResult = await getActiveSOSAlerts();
    
    if (!complaintsResult.error) setComplaints(complaintsResult.complaints);
    if (!sosResult.error) setSosAlerts(sosResult.alerts);
    setLoading(false);
  };

  const handleStatusChange = async (complaintId: string, newStatus: string) => {
    setUpdatingId(complaintId);
    await updateComplaintStatus(complaintId, newStatus);
    setComplaints(complaints.map(c => 
      c.id === complaintId ? { ...c, status: newStatus } : c
    ));
    setUpdatingId(null);
    toast.success(`Status updated to ${newStatus}`);
  };

  const handleAddLog = async () => {
    if (!newLogText.trim() || !selectedComplaint || !currentUser) return;
    
    setLoggingLoading(true);
    const logEntry = {
      complaintId: selectedComplaint.id,
      text: newLogText.trim(),
      authorId: currentUser.uid,
      authorName: currentUser.name || "Police Officer",
      authorRole: "police" as const,
      timestamp: new Date().toISOString(),
      isPublic: true
    };

    const res = await addCaseLog(logEntry);
    if (res.success) {
      toast.success("Timeline updated successfully");
      setNewLogText("");
      // Add immediately to local state for fast UI
      setCaseLogs([{ id: res.id, ...logEntry }, ...caseLogs]);
    } else {
      toast.error(res.error || "Failed to add update");
    }
    setLoggingLoading(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const handleShowKyc = async (citizenId: string) => {
    setIsKycModalOpen(true);
    setFetchingKyc(true);
    const { profile } = await getUserProfile(citizenId);
    setSelectedCitizenProfile(profile);
    setFetchingKyc(false);
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin" />
      </div>
    );
  }

  const totalAssigned = complaints.length;
  const newCases = complaints.filter(c => c.status === "Pending" || c.status === "Submitted" || c.status === "Under Review").length;
  const investigating = complaints.filter(c => c.status === "Investigating" || c.status === "In-Progress").length;
  const resolved = complaints.filter(c => c.status === "Resolved" || c.status === "Closed").length;
  const highPriority = sosAlerts.length;

  const filteredComplaints = complaints.filter(c => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    const titleMatch = (c.title || "").toLowerCase().includes(query);
    const idMatch = (c.id || "").toLowerCase().includes(query);
    const typeMatch = (c.type || "").toLowerCase().includes(query);
    const statusMatch = (c.status || "").toLowerCase().includes(query);
    const citizenNameMatch = (c.citizenName || "").toLowerCase().includes(query);
    return titleMatch || idMatch || typeMatch || statusMatch || citizenNameMatch;
  });

  return (
    <div className="min-h-screen bg-background text-text-primary p-6 md:p-10 font-sans transition-colors duration-300">
      
      {/* HEADER */}
      <header className="max-w-7xl mx-auto glass-panel p-4 flex justify-between items-center mb-8 shadow-sm">
        <div className="flex items-center gap-4 px-2">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20 backdrop-blur-sm">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary drop-shadow-sm">Police Command Center</h1>
            <p className="text-xs text-text-secondary">
              Officer: {currentUser.name} • Station: {currentUser.stationName || "Headquarters"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              setIsProfileModalOpen(true);
              setFetchingProfile(true);
              const { profile } = await getUserProfile(currentUser.uid);
              setSelectedPoliceProfile({ ...currentUser, ...profile });
              setFetchingProfile(false);
            }}
            className="flex items-center gap-2 glass-button px-4 py-2 text-sm bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 transition-colors rounded-xl font-medium"
          >
            <User className="w-4 h-4" /> My Profile
          </button>
          <button onClick={handleLogout} className="flex items-center gap-2 glass-button-secondary px-4 py-2 text-sm">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="glass-panel p-5 flex flex-col justify-between h-28 shadow-sm">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">MY CASES</span>
            <span className="text-3xl font-bold text-text-primary">{totalAssigned}</span>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 backdrop-blur-md rounded-xl p-5 flex flex-col justify-between h-28 shadow-sm">
            <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">NEW CASES</span>
            <span className="text-3xl font-bold text-blue-800 dark:text-blue-200">{newCases}</span>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 backdrop-blur-md rounded-xl p-5 flex flex-col justify-between h-28 shadow-sm">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">INVESTIGATING</span>
            <span className="text-3xl font-bold text-purple-800 dark:text-purple-200">{investigating}</span>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md rounded-xl p-5 flex flex-col justify-between h-28 shadow-sm">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">RESOLVED</span>
            <span className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">{resolved}</span>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-md rounded-xl p-5 flex flex-col justify-between h-28 shadow-sm">
            <span className="text-[10px] font-bold text-red-700 dark:text-red-300 uppercase tracking-wider">HIGH PRIORITY SOS</span>
            <span className="text-3xl font-bold text-red-800 dark:text-red-200">{highPriority}</span>
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-text-primary drop-shadow-sm">Assigned Cases</h2>
            <div className="flex gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-text-tertiary absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search CSR, Name, Title..." 
                  className="glass-input pl-9 pr-4 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="glass-panel overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-wider text-text-secondary border-b border-white/20">
                    <th className="px-6 py-4 font-semibold">ID</th>
                    <th className="px-6 py-4 font-semibold">COMPLAINT TITLE</th>
                    <th className="px-6 py-4 font-semibold">CITIZEN</th>
                    <th className="px-6 py-4 font-semibold">TYPE</th>
                    <th className="px-6 py-4 font-semibold">STATUS</th>
                    <th className="px-6 py-4 font-semibold">DATE</th>
                    <th className="px-6 py-4 font-semibold text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="text-sm text-text-primary">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-text-tertiary text-xs">
                        No cases found.
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((c) => (
                      <tr key={c.id} className="border-b border-white/10 hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-text-tertiary">{c.id.substring(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4 font-medium text-text-primary max-w-[200px] truncate">{c.title}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-text-secondary">{c.citizenName || "Name Not Available"}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border backdrop-blur-sm ${
                            (c.type === "FIR" || !c.type) ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" :
                            "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          }`}>
                            {c.type || "FIR"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {updatingId === c.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                          ) : (
                            <select 
                              value={c.status}
                              onChange={(e) => handleStatusChange(c.id, e.target.value)}
                              className="bg-transparent border-none text-xs font-bold uppercase text-text-secondary outline-none cursor-pointer p-0 [&>option]:bg-white dark:[&>option]:bg-slate-900"
                            >
                              <option value="Submitted">Submitted</option>
                              <option value="Pending">Pending</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Investigating">Investigating</option>
                              <option value="Resolved">Resolved</option>
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-text-tertiary">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 flex justify-end">
                          <button 
                            onClick={() => setSelectedComplaint(c)}
                            className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 font-semibold bg-blue-500/10 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/20 backdrop-blur-sm hover:bg-blue-500/20"
                          >
                            <Eye className="w-3 h-3" />
                            Manage Case
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>

      {/* MANAGE CASE MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity">
          <div className="glass-panel w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20 bg-black/5 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl backdrop-blur-sm ${
                  selectedComplaint.type === "FIR" || !selectedComplaint.type 
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" 
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                }`}>
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary leading-tight drop-shadow-sm">
                    Manage {selectedComplaint.type || "FIR"}
                  </h2>
                  <p className="text-xs text-text-secondary font-mono">
                    ID: {selectedComplaint.id.toUpperCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => exportCaseToPDF(selectedComplaint, caseLogs)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20 backdrop-blur-sm"
                >
                  <Download className="w-3 h-3" /> Export PDF
                </button>
                <button 
                  onClick={() => printCaseDetails(selectedComplaint, caseLogs)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-text-secondary bg-ui-bg hover:bg-white/60 dark:hover:bg-black/40 rounded-lg transition-colors border border-white/20 backdrop-blur-sm"
                >
                  <Printer className="w-3 h-3" /> Print
                </button>
                <button 
                  onClick={() => setSelectedComplaint(null)}
                  className="p-2 ml-2 text-text-tertiary hover:text-text-primary hover:bg-ui-bg rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              
              {/* Left Column: Details */}
              <div className="flex-1 overflow-y-auto p-6 lg:border-r border-white/20 bg-ui-bg">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Case Details
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Title</span>
                    <h4 className="text-base font-bold text-text-primary">{selectedComplaint.title}</h4>
                  </div>
                  
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Description</span>
                    <div className="bg-ui-bg backdrop-blur-sm p-4 rounded-xl border border-ui-border text-sm text-text-secondary whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-ui-bg backdrop-blur-sm p-4 rounded-xl border border-ui-border flex flex-col justify-between">
                      <div>
                        <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Citizen Name</span>
                        <p className="text-sm font-semibold text-text-primary">{selectedComplaint.citizenName || "Name Not Available"}</p>
                      </div>
                      {selectedComplaint.citizenId && (
                        <button
                          onClick={() => handleShowKyc(selectedComplaint.citizenId)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-500 font-bold flex items-center gap-1 self-start cursor-pointer"
                        >
                          <User className="w-3.5 h-3.5" /> Show KYC
                        </button>
                      )}
                    </div>
                    <div className="bg-ui-bg backdrop-blur-sm p-4 rounded-xl border border-ui-border">
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Location</span>
                      <p className="text-sm font-medium text-text-primary">{selectedComplaint.location}</p>
                    </div>
                    <div className="bg-ui-bg backdrop-blur-sm p-4 rounded-xl border border-ui-border">
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Date Filed</span>
                      <p className="text-sm font-medium text-text-primary">{new Date(selectedComplaint.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {selectedComplaint.imageUrl && (
                     <div>
                       <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Evidence Attached</span>
                       <img src={selectedComplaint.imageUrl} alt="Evidence" className="w-full max-h-[300px] object-cover rounded-xl border border-white/20 shadow-sm" />
                     </div>
                  )}
                </div>
              </div>

              {/* Right Column: Investigation Timeline */}
              <div className="flex-1 lg:max-w-[500px] flex flex-col bg-black/5 dark:bg-white/5 relative">
                
                <div className="p-4 border-b border-white/20 bg-white/20 dark:bg-black/10 backdrop-blur-md">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    Investigation Timeline
                  </h3>
                </div>
                
                {/* Timeline Feed */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {fetchingLogs ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    </div>
                  ) : caseLogs.length === 0 ? (
                    <div className="text-center text-text-tertiary text-sm mt-10">
                      <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                      <p>No timeline updates yet.</p>
                      <p className="text-xs mt-1">Add the first log below to start tracking.</p>
                    </div>
                  ) : (
                    <div className="relative border-l-2 border-emerald-500/30 ml-3 space-y-8 pb-4">
                      {caseLogs.map((log) => (
                        <div key={log.id} className="relative pl-6">
                          {/* Timeline Dot */}
                          <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white/50 dark:border-black/50 shadow-sm"></div>
                          
                          <div className="bg-ui-bg backdrop-blur-md p-4 rounded-xl shadow-sm border border-ui-border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {log.authorName}
                              </span>
                              <span className="text-[10px] text-text-tertiary font-mono">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-text-primary leading-relaxed">
                              {log.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add Log Input */}
                <div className="p-4 bg-ui-bg backdrop-blur-md border-t border-ui-border mt-auto">
                  <div className="relative">
                    <textarea 
                      value={newLogText}
                      onChange={(e) => setNewLogText(e.target.value)}
                      placeholder="Add an investigation update..."
                      className="w-full glass-input p-3 pr-12 text-sm resize-none h-[80px]"
                    ></textarea>
                    <button 
                      onClick={handleAddLog}
                      disabled={loggingLoading || !newLogText.trim()}
                      className="absolute right-3 bottom-3 p-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                      {loggingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-text-tertiary mt-2 text-center">Updates posted here will be visible to the Citizen and Admin.</p>
                </div>
                
              </div>

            </div>
          </div>
        </div>
      )}


      {/* POLICE OFFICER PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity">
          <div className="glass-panel w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl relative border border-purple-500/20">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/20 bg-black/10 dark:bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest drop-shadow-sm">
                  My Police Profile
                </h2>
              </div>
              <button 
                onClick={() => {
                  setIsProfileModalOpen(false);
                  setIsEditingPolice(false);
                  setSelectedPoliceProfile(null);
                }} 
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-ui-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 bg-black/5 dark:bg-white/5 p-6">
              {fetchingProfile ? (
                 <div className="flex flex-col items-center justify-center h-64">
                   <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
                   <p className="text-sm text-text-secondary">Loading your records...</p>
                 </div>
              ) : selectedPoliceProfile ? (
                <div className="space-y-6">
                  {/* Top Section: Photo & ID */}
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {/* Photo Container */}
                    <div className="shrink-0 flex flex-col items-center gap-3">
                      <div className="w-32 h-32 rounded-xl bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center overflow-hidden shadow-inner">
                        {selectedPoliceProfile.photographUrl ? (
                          <img src={selectedPoliceProfile.photographUrl} alt="Officer" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-purple-500/50" />
                        )}
                      </div>
                      <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 tracking-wider">
                        {selectedPoliceProfile.dutyStatus || "Active Duty"}
                      </span>
                    </div>

                    {/* Core Identifiers */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                      <div className="bg-ui-bg p-3 rounded-lg border border-ui-border shadow-sm">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Full Name</label>
                        <input type="text" disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.name} className="w-full bg-transparent text-sm font-semibold text-text-primary outline-none disabled:opacity-90" />
                      </div>
                      <div className="bg-ui-bg p-3 rounded-lg border border-ui-border shadow-sm">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Officer ID (UID)</label>
                        <input type="text" disabled defaultValue={selectedPoliceProfile.uid} className="w-full bg-transparent text-sm font-mono text-text-secondary outline-none" />
                      </div>
                      <div className="bg-ui-bg p-3 rounded-lg border border-ui-border shadow-sm">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1 flex items-center gap-1"><Shield className="w-3 h-3"/> Badge Number</label>
                        <input type="text" disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.badgeNumber || "N/A"} placeholder="Enter Badge No." className="w-full bg-transparent text-sm font-medium text-text-primary outline-none" />
                      </div>
                      <div className="bg-ui-bg p-3 rounded-lg border border-ui-border shadow-sm">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">PEN/Employee Number</label>
                        <input type="text" disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.employeeNumber || "N/A"} placeholder="Enter PEN" className="w-full bg-transparent text-sm font-medium text-text-primary outline-none" />
                      </div>
                      <div className="bg-ui-bg p-3 rounded-lg border border-ui-border shadow-sm">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Rank</label>
                        <select disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.rank || ""} className="w-full bg-transparent text-sm font-medium text-text-primary outline-none disabled:appearance-none">
                          <option value="">Select Rank</option>
                          <option value="Constable">Constable</option>
                          <option value="Head Constable">Head Constable</option>
                          <option value="Sub-Inspector">Sub-Inspector (SI)</option>
                          <option value="Inspector">Inspector</option>
                          <option value="DSP">DSP</option>
                          <option value="ASP">ASP</option>
                          <option value="SP">SP</option>
                        </select>
                      </div>
                      <div className="bg-ui-bg p-3 rounded-lg border border-ui-border shadow-sm">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Role</label>
                        <input type="text" disabled defaultValue="POLICE" className="w-full bg-transparent text-sm font-medium text-text-primary outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Career & Timeline */}
                  <div className="glass-panel p-5">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 border-b border-ui-border pb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-500" /> Career Timeline
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Batch Year</label>
                        <input type="text" disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.batchYear || "N/A"} className="w-full border-b border-white/10 bg-transparent text-sm text-text-primary py-1 outline-none focus:border-emerald-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Date of Joining</label>
                        <input type="date" disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.dateOfJoining || ""} className="w-full border-b border-white/10 bg-transparent text-sm text-text-primary py-1 outline-none focus:border-emerald-500 [color-scheme:dark]" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Passing Out Year</label>
                        <input type="text" disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.passingOutYear || "N/A"} className="w-full border-b border-white/10 bg-transparent text-sm text-text-primary py-1 outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                  </div>

                  {/* Posting Details */}
                  <div className="glass-panel p-5">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 border-b border-ui-border pb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" /> Current Posting
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">District</label>
                        <select disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.district || ""} className="w-full border-b border-white/10 bg-transparent text-sm text-text-primary py-1 outline-none focus:border-blue-500 disabled:appearance-none">
                          <option value="">Select District</option>
                          <option value="Central">Central District</option>
                          <option value="North">North District</option>
                          <option value="South">South District</option>
                          <option value="East">East District</option>
                          <option value="West">West District</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Police Station</label>
                        <select disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.stationName || ""} className="w-full border-b border-white/10 bg-transparent text-sm text-text-primary py-1 outline-none focus:border-blue-500 disabled:appearance-none">
                          <option value="">Select Station</option>
                          <option value="HQ">Headquarters</option>
                          <option value="Central Station">Central Station</option>
                          <option value="North Precinct">North Precinct</option>
                          <option value="South Precinct">South Precinct</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Current Posting Details</label>
                        <input type="text" disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.currentPosting || "N/A"} placeholder="e.g. Traffic Division, Cyber Crime" className="w-full border-b border-white/10 bg-transparent text-sm text-text-primary py-1 outline-none focus:border-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="glass-panel p-5">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 border-b border-ui-border pb-2 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-yellow-500" /> Contact Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Mobile Number</label>
                        <input type="text" disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.mobileNumber || "N/A"} className="w-full border-b border-white/10 bg-transparent text-sm text-text-primary py-1 outline-none focus:border-yellow-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Official Email</label>
                        <input type="email" disabled={!isEditingPolice} defaultValue={selectedPoliceProfile.email} className="w-full border-b border-white/10 bg-transparent text-sm text-text-primary py-1 outline-none focus:border-yellow-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">System Username</label>
                        <input type="text" disabled defaultValue={selectedPoliceProfile.username || selectedPoliceProfile.email?.split('@')[0]} className="w-full border-b border-white/10 bg-transparent text-sm text-text-secondary py-1 outline-none cursor-not-allowed" />
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Shield className="w-12 h-12 text-slate-500 mb-3 opacity-30" />
                  <p className="text-sm text-text-secondary">Your profile data could not be loaded.</p>
                </div>
              )}
            </div>

            {/* Action Bar (Footer) */}
            {selectedPoliceProfile && (
              <div className="p-4 bg-ui-bg border-t border-ui-border flex flex-wrap gap-y-3 justify-between items-center backdrop-blur-md">
                
                {/* Left Actions */}
                <div className="flex gap-2 flex-wrap">
                  {isEditingPolice ? (
                    <>
                      <button onClick={() => setIsEditingPolice(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition-colors">
                        <Save className="w-3.5 h-3.5" /> Save
                      </button>
                      <button onClick={() => setIsEditingPolice(false)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-500/20 text-slate-600 dark:text-slate-400 hover:bg-slate-500/30 rounded-lg text-xs font-bold transition-colors">
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setIsEditingPolice(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-bold transition-colors">
                      <Edit className="w-3.5 h-3.5" /> Edit Profile
                    </button>
                  )}
                </div>

                {/* Management Actions */}
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="hidden lg:block h-6 w-px bg-white/20 mx-1"></div>
                  
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded border border-transparent hover:border-white/20 text-[10px] font-bold uppercase transition-all">
                    <Upload className="w-3 h-3" /> Upload Docs
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded border border-transparent hover:border-white/20 text-[10px] font-bold uppercase transition-all">
                    <Key className="w-3 h-3" /> Change Password
                  </button>
                  
                  <div className="hidden lg:block h-6 w-px bg-white/20 mx-1"></div>
                  
                  <button className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-white/10 rounded transition-colors" title="Print Profile">
                    <Printer className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-white/10 rounded transition-colors" title="Export PDF">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-white/10 rounded transition-colors" title="Export Excel">
                    <Grid className="w-4 h-4" />
                  </button>
                </div>
                
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANDATORY FIRST-LOGIN CHANGE PASSWORD MODAL */}
      {/* ========================================================================= */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg">
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

            <form
              onSubmit={async (e) => {
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
                  setIsChangePasswordModalOpen(false);
                  setCurrentUser((prev: any) => ({ ...prev, mustChangePassword: false }));
                } else {
                  toast.error(result.error || "Failed to update password.");
                }
                setChangingPassword(false);
              }}
              className="p-6 space-y-4"
            >
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

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Save New Password & Enter Portal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* CITIZEN KYC MODAL */}
      {isKycModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-opacity animate-fade-in">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative border border-emerald-500/20">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/20 bg-black/10 dark:bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20">
                  <User className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest drop-shadow-sm">
                  Citizen KYC Verification
                </h2>
              </div>
              <button 
                onClick={() => {
                  setIsKycModalOpen(false);
                  setSelectedCitizenProfile(null);
                }}
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-ui-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 bg-white/5 dark:bg-black/5 space-y-6">
              {fetchingKyc ? (
                <div className="p-8 flex flex-col items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                  <p className="text-xs text-slate-500">Loading comprehensive citizen data...</p>
                </div>
              ) : selectedCitizenProfile ? (
                <div className="space-y-6">
                  
                  {/* Photo & Basic Details */}
                  <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-white/10 pb-6">
                    <div className="w-24 h-24 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {selectedCitizenProfile.photographUrl ? (
                        <img src={selectedCitizenProfile.photographUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {selectedCitizenProfile.name?.charAt(0) || "C"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <h4 className="text-lg font-bold text-text-primary truncate">{selectedCitizenProfile.name || "Unknown Citizen"}</h4>
                      <p className="text-xs text-text-secondary truncate">{selectedCitizenProfile.email}</p>
                      <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400">ID: {selectedCitizenProfile.id}</p>
                    </div>
                  </div>

                  {/* Profile Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-ui-bg backdrop-blur-sm p-3.5 rounded-xl border border-ui-border">
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Mobile Number</span>
                      <p className="text-sm font-medium text-text-primary">{selectedCitizenProfile.mobileNumber || "-"}</p>
                    </div>
                    <div className="bg-ui-bg backdrop-blur-sm p-3.5 rounded-xl border border-ui-border">
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Date of Birth (DOB)</span>
                      <p className="text-sm font-medium text-text-primary">{selectedCitizenProfile.dob || "-"}</p>
                    </div>
                    <div className="bg-ui-bg backdrop-blur-sm p-3.5 rounded-xl border border-ui-border">
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Gender</span>
                      <p className="text-sm font-medium text-text-primary">{selectedCitizenProfile.gender || "-"}</p>
                    </div>
                    <div className="bg-ui-bg backdrop-blur-sm p-3.5 rounded-xl border border-ui-border">
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Occupation</span>
                      <p className="text-sm font-medium text-text-primary">{selectedCitizenProfile.occupation || "-"}</p>
                    </div>
                  </div>

                  {/* Addresses */}
                  <div className="space-y-4">
                    <div className="bg-ui-bg backdrop-blur-sm p-3.5 rounded-xl border border-ui-border">
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Residential Address</span>
                      <p className="text-xs text-text-primary leading-relaxed">{selectedCitizenProfile.residentialAddress || "Not Provided"}</p>
                    </div>
                    <div className="bg-ui-bg backdrop-blur-sm p-3.5 rounded-xl border border-ui-border">
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Permanent Address</span>
                      <p className="text-xs text-text-primary leading-relaxed">{selectedCitizenProfile.permanentAddress || "Not Provided"}</p>
                    </div>
                  </div>

                  {/* ID Document Details */}
                  <div className="bg-ui-bg backdrop-blur-sm p-3.5 rounded-xl border border-ui-border grid grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">ID Document Type</span>
                      <p className="text-xs font-bold text-text-primary">{selectedCitizenProfile.idProofType || "N/A"}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">ID Document Number</span>
                      <p className="text-xs font-mono text-text-secondary">{selectedCitizenProfile.idProofNumber || "-"}</p>
                    </div>
                  </div>

                </div>
              ) : (
                <p className="text-center text-sm text-text-secondary">Citizen details could not be loaded.</p>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
