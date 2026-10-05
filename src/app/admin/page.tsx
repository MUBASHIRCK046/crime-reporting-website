"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase/client";
import { doc, getDoc, updateDoc, collection, query, onSnapshot } from "firebase/firestore";
import { getAllComplaints } from "@/lib/police";
import { getAllUsers, assignCaseToOfficer, updateCaseStatus, assignUserAsPolice, updatePoliceOfficerProfile } from "@/lib/admin";
import { logoutUser } from "@/lib/auth";
import { toast } from "sonner";
import { getUserProfile } from "@/lib/profile";
import { getCaseLogs } from "@/lib/police";
import { CaseLog } from "@/lib/types";
import { 
  Shield, LayoutDashboard, Users, Grid, FileText, 
  FileSignature, FileKey, BarChart2, LogOut, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, Clock, MapPin, Eye, EyeOff, X, Image as ImageIcon, User, Phone, Droplet, HeartPulse, Map, Calendar, Briefcase, Globe, Fingerprint, Search, Download, Printer, Save, Edit, Trash2, RotateCcw, Upload, Key, Power, Send, UserPlus, UserCheck, ShieldCheck, Award, Star, GraduationCap, Building2, Copy, Check, Lock, Sparkles, FileSpreadsheet,
  ShieldAlert, Mail, Radio, ChevronRight, History, ExternalLink, QrCode, Database
} from "lucide-react";
import dynamic from "next/dynamic";
import { exportCaseToPDF, printCaseDetails, printSOSHistoryRecord } from "@/lib/export";
import { motion, AnimatePresence } from "framer-motion";
import AdminNavDock from "@/components/AdminNavDock";
import { AnimatedSubmitButton } from "@/components/AnimatedSubmitButton";
import { saveSOSResolutionNote } from "@/lib/admin";
import SOSQRModal from "@/components/SOSQRModal";
import { formatCaseId } from "@/shared/utils/caseId";
import EvidenceGallery from "@/components/EvidenceGallery";

const MorphingCard = dynamic(() => import("@/components/MorphingStats").then(mod => mod.MorphingCard), { ssr: false });
const StatusDonutChart = dynamic(() => import("@/components/MorphingStats").then(mod => mod.StatusDonutChart), { ssr: false });
const PrecinctCircularStats = dynamic(() => import("@/components/MorphingStats").then(mod => mod.PrecinctCircularStats), { ssr: false });
const AnalyticsChart = dynamic(() => import("@/components/AnalyticsChart"), { ssr: false });

const SafetyMap = dynamic(() => import("@/components/SafetyMap").then(mod => mod.SafetyMap), { ssr: false, loading: () => <div className="h-[500px] w-full flex items-center justify-center bg-slate-900/20 rounded-xl border border-white/10 animate-pulse text-slate-400 font-bold">Loading Map...</div> });

export default function AdminDashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");
  
  const [complaintsData, setComplaintsData] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [caseSearchQuery, setCaseSearchQuery] = useState("");

  // SOS Alerts States
  const [sosAlertsData, setSosAlertsData] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

  // SOS History & Immutable Resolution Note States
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedAlertForNote, setSelectedAlertForNote] = useState<any | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [resolutionNoteInput, setResolutionNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // SOS QR Modal State
  const [selectedAlertForQR, setSelectedAlertForQR] = useState<any | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Case Approve / Reject States
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedComplaintForReject, setSelectedComplaintForReject] = useState<any | null>(null);
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);
  const [approvalPopup, setApprovalPopup] = useState<{ id: string; title: string; decision: "Approved" | "Rejected" } | null>(null);


  // Credentials Generator States
  const [generatorSelectedOfficer, setGeneratorSelectedOfficer] = useState("");
  const [generatedPoliceId, setGeneratedPoliceId] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [showGeneratedPassword, setShowGeneratedPassword] = useState(false);

  const selectedGeneratorOfficerObj = usersData.find((o: any) => o.uid === generatorSelectedOfficer);
  const generatorOfficerCredentialsExist = selectedGeneratorOfficerObj ? (selectedGeneratorOfficerObj.credentialsGenerated || !!selectedGeneratorOfficerObj.policeId) : false;

  // Police Management States
  const [policeSearchQuery, setPoliceSearchQuery] = useState("");
  const [isAddPoliceModalOpen, setIsAddPoliceModalOpen] = useState(false);
  const [isAssignPoliceModalOpen, setIsAssignPoliceModalOpen] = useState(false);
  const [isUpdatePoliceModalOpen, setIsUpdatePoliceModalOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [isPoliceIdModalOpen, setIsPoliceIdModalOpen] = useState(false);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [isResetSuccessModalOpen, setIsResetSuccessModalOpen] = useState(false);
  const [selectedOfficerForCredentials, setSelectedOfficerForCredentials] = useState<any | null>(null);
  const [showPasswordInModal, setShowPasswordInModal] = useState(false);
  const [resettingPasswordLoading, setResettingPasswordLoading] = useState(false);
  const [submittingPolice, setSubmittingPolice] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [generatedCredentials, setGeneratedCredentials] = useState<{
    name: string;
    userId: string;
    email: string;
    temporaryPassword: string;
    policeId: string;
    badgeNumber: string;
    rank: string;
    stationName: string;
  } | null>(null);

  const [newResetCredentials, setNewResetCredentials] = useState<{
    policeId: string;
    newTemporaryPassword: string;
    officerName: string;
  } | null>(null);

  // Backup & Restore States
  const [exportingBackup, setExportingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [backupFilePreview, setBackupFilePreview] = useState<any | null>(null);
  const [restoreMode, setRestoreMode] = useState<"merge" | "overwrite">("merge");
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // 23 Fields State for Add Police Officer
  const initialPoliceState = {
    policeId: "",
    badgeNumber: "",
    name: "",
    dob: "",
    gender: "Male",
    phone: "",
    email: "",
    password: "",
    doj: new Date().toISOString().split("T")[0],
    rank: "Sub-Inspector",
    stationName: "Central Police Station",
    yearsOfService: "1",
    previousExperience: "General policing & law enforcement",
    casesHandled: "10",
    casesSolved: "8",
    medalsAwards: "0",
    specialSkills: "Investigation, Emergency Response",
    postingLocation: "Central Division",
    promotionHistory: "Direct Entry",
    emergencyContact: "",
    bloodGroup: "O+",
    education: "Bachelor's Degree",
    transferHistory: "None",
    commendations: "None",
    serviceStatus: "Active"
  };

  const [newPolice, setNewPolice] = useState(initialPoliceState);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState<any | null>(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState("");
  const [officerToUpdate, setOfficerToUpdate] = useState<any | null>(null);

  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [selectedCitizenProfile, setSelectedCitizenProfile] = useState<any | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [assigningLoading, setAssigningLoading] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState("");
  
  // Timeline State
  const [caseLogs, setCaseLogs] = useState<CaseLog[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<"kyc" | "timeline">("kyc");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // Police Profile Modal State
  const [isPoliceProfileModalOpen, setIsPoliceProfileModalOpen] = useState(false);
  const [selectedPoliceProfile, setSelectedPoliceProfile] = useState<any | null>(null);
  const [isEditingPolice, setIsEditingPolice] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalComplaints: 0,
    totalFIRs: 0,
    totalCSRs: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0
  });

  useEffect(() => {
    document.title = "System Administrator";
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        router.push("/login");
        return;
      }

      try {
        // STRICT SECURITY: Verify they are an Admin!
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === "admin") {
            fetchSystemData();
          } else if (role === "police") {
            setLoading(false);
            router.push("/police");
          } else {
            setLoading(false);
            router.push("/citizen");
          }
        } else {
          setLoading(false);
          router.push("/login");
        }
      } catch (err) {
        console.error("Admin auth verification error:", err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Real-time SOS Alerts Listener
  useEffect(() => {
    let unsubscribeSOS: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(collection(db, "sos_alerts"));
        let isInitialLoad = true;

        unsubscribeSOS = onSnapshot(
          q,
          (snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === "added") {
                const alertData: any = { id: change.doc.id, ...change.doc.data() };
                
                if (!isInitialLoad && alertData.status === "Active") {
                  // Trigger emergency Sonner notification
                  toast.custom((t) => (
                    <div className="bg-red-950 border-2 border-red-500 rounded-xl p-4 shadow-2xl flex flex-col gap-2 text-white animate-bounce">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🚨</span>
                        <h3 className="font-extrabold text-sm tracking-wide text-red-100">NEW SOS ALERT</h3>
                      </div>
                      <p className="text-xs text-red-200">
                        <strong>{alertData.citizenName || "Unknown Citizen"}</strong> has triggered an emergency SOS.
                      </p>
                      {alertData.citizenAddress && alertData.citizenAddress !== "N/A" && (
                        <p className="text-[10px] text-red-350 font-mono">Location: {alertData.citizenAddress}</p>
                      )}
                      <p className="text-[10px] text-red-350 font-mono">
                        Time: {new Date(alertData.createdAt || alertData.timestamp).toLocaleTimeString()}
                      </p>
                      <button
                        onClick={() => {
                          setActiveTab("SOS");
                          setSelectedAlert(alertData);
                          toast.dismiss(t);
                        }}
                        className="mt-1 bg-red-600 hover:bg-red-550 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-all self-end cursor-pointer"
                      >
                        VIEW SOS
                      </button>
                    </div>
                  ), { duration: 15000 });
                }
              }
            });

            // Map snapshot docs to state
            const alerts: any[] = [];
            snapshot.docs.forEach((doc) => {
              alerts.push({ id: doc.id, ...doc.data() });
            });
            // Sort newest first
            alerts.sort((a, b) => new Date(b.createdAt || b.timestamp).getTime() - new Date(a.createdAt || a.timestamp).getTime());
            setSosAlertsData(alerts);
            isInitialLoad = false;
          },
          (err) => {
            console.error("Error listening to real-time SOS alerts:", err);
          }
        );
      } else {
        if (unsubscribeSOS) {
          unsubscribeSOS();
          unsubscribeSOS = null;
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSOS) {
        unsubscribeSOS();
      }
    };
  }, []);

  // Fetch citizen profile and case logs when a complaint is selected
  useEffect(() => {
    const fetchCitizenDetailsAndLogs = async () => {
      if (selectedComplaint) {
        setFetchingProfile(true);
        setFetchingLogs(true);
        
        try {
          const [profResult, logsResult] = await Promise.all([
            selectedComplaint.citizenId ? getUserProfile(selectedComplaint.citizenId) : Promise.resolve({ profile: null }),
            getCaseLogs(selectedComplaint.id)
          ]);
          setSelectedCitizenProfile(profResult.profile);
          setCaseLogs(logsResult.logs || []);
        } catch (err) {
          console.error("Error fetching modal details:", err);
        } finally {
          setFetchingProfile(false);
          setFetchingLogs(false);
        }

        // Default to KYC tab
        setActiveModalTab("kyc");
      } else {
        setSelectedCitizenProfile(null);
        setCaseLogs([]);
      }
    };
    fetchCitizenDetailsAndLogs();
  }, [selectedComplaint]);

  const fetchSystemData = async () => {
    setLoading(true);
    try {
      // Fetch Complaints & Users concurrently in parallel
      const [complaintsResult, usersResult] = await Promise.all([
        getAllComplaints(),
        getAllUsers()
      ]);

      if (!complaintsResult.error) {
        const complaints = complaintsResult.complaints;
        setComplaintsData(complaints);
        
        let firs = 0;
        let csrs = 0;
        let pend = 0;
        let prog = 0;
        let reso = 0;

        complaints.forEach(c => {
          if (c.type === "FIR") firs++;
          else if (c.type === "CSR") csrs++;
          else firs++; // Default fallback for old data
          
          if (c.status === "Pending") pend++;
          else if (c.status === "Investigating" || c.status === "In-Progress") prog++;
          else reso++;
        });

        setStats({
          totalComplaints: complaints.length,
          totalFIRs: firs,
          totalCSRs: csrs,
          pending: pend,
          inProgress: prog,
          resolved: reso
        });
      }

      if (!usersResult.error) {
        setUsersData(usersResult.users);
      }
    } catch (err) {
      console.error("Error in fetchSystemData:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCase = async (c: any) => {
    // 1. Instantly update local state (optimistic UI — no waiting for API)
    setComplaintsData((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, status: "Approved" } : item))
    );
    setSelectedComplaint((prev: any) =>
      prev && prev.id === c.id ? { ...prev, status: "Approved" } : prev
    );
    // 2. Show animated success popup immediately
    setApprovalPopup({ id: c.id, title: c.title || "Case", decision: "Approved" });
    setTimeout(() => setApprovalPopup(null), 3500);

    // 3. Sync with Firestore in background
    const adminUid = auth.currentUser?.uid;
    const res = await updateCaseStatus(c.id, c.type, c.firNumber, "Approved", adminUid);
    if (!res.success) {
      console.error("Background approve sync failed:", res.error);
      toast.error(`Approve sync warning: ${res.error}`);
    }
  };

  const handleOpenRejectModal = (c: any) => {
    setSelectedComplaintForReject(c);
    setIsRejectModalOpen(true);
  };

  const handleConfirmRejectCase = async () => {
    if (!selectedComplaintForReject) return;
    const c = selectedComplaintForReject;
    setIsRejectModalOpen(false);
    // 1. Instantly update local state (optimistic UI)
    setComplaintsData((prev) =>
      prev.map((item) => (item.id === c.id ? { ...item, status: "Rejected" } : item))
    );
    setSelectedComplaint((prev: any) =>
      prev && prev.id === c.id ? { ...prev, status: "Rejected" } : prev
    );
    // 2. Show animated popup immediately
    setApprovalPopup({ id: c.id, title: c.title || "Case", decision: "Rejected" });
    setTimeout(() => setApprovalPopup(null), 3500);
    setSelectedComplaintForReject(null);
    // 3. Background sync
    const adminUid = auth.currentUser?.uid;
    const res = await updateCaseStatus(c.id, c.type, c.firNumber, "Rejected", adminUid);
    if (!res.success) {
      console.error("Background reject sync failed:", res.error);
      toast.error(`Reject sync warning: ${res.error}`);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const handleUpdateSOSStatus = async (alertId: string, newStatus: string) => {
    try {
      const alertRef = doc(db, "sos_alerts", alertId);
      const updates: any = { status: newStatus };
      if (newStatus === "Acknowledged") {
        updates.acknowledgedAt = new Date().toISOString();
      } else if (newStatus === "Responding") {
        updates.respondingAt = new Date().toISOString();
      } else if (newStatus === "Resolved") {
        updates.resolvedAt = new Date().toISOString();
      }
      
      await updateDoc(alertRef, updates);
      
      // Update locally immediately to ensure instant UI response
      setSosAlertsData((prev: any[]) => prev.map(a => a.id === alertId ? { ...a, ...updates } : a));
      if (selectedAlert?.id === alertId) {
        setSelectedAlert((prev: any | null) => prev ? { ...prev, ...updates } : null);
      }
      
      toast.success(`SOS Alert status updated to ${newStatus}`);
    } catch (err: any) {
      console.error("Error updating SOS status:", err);
      toast.error(`Failed to update status: ${err.message}`);
    }
  };

  const handleAssignOfficer = async () => {
    if (!selectedOfficer || !selectedComplaint) return;
    
    // Strict status validation: Case must be Approved
    const isApproved = selectedComplaint.status === "Approved" || selectedComplaint.status === "Investigating" || selectedComplaint.status === "Under Review";
    if (!isApproved) {
      toast.error("Cannot assign officer: Case must be Approved first.");
      return;
    }

    setAssigningLoading(true);
    const officer = usersData.find(u => u.uid === selectedOfficer);
    
    const result = await assignCaseToOfficer(
      selectedComplaint.id,
      selectedComplaint.type,
      selectedComplaint.firNumber || null,
      selectedOfficer,
      officer?.name || "Unknown Officer"
    );

    if (result.success) {
      toast.success("Case successfully assigned to officer!");
      // Update local state to reflect assignment
      setSelectedComplaint({
        ...selectedComplaint,
        assignedOfficerId: selectedOfficer,
        assignedOfficerName: officer?.name || "Unknown Officer",
        status: "Investigating"
      });
      // Refresh complaints list
      fetchSystemData();
    } else {
      toast.error(result.error);
    }
    setAssigningLoading(false);
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    toast.success(`Copied ${fieldKey} to clipboard!`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleGenerateCredentials = async () => {
    if (!generatorSelectedOfficer) {
      toast.error("Please select a registered officer first.");
      return;
    }

    // 1. Generate Police ID
    const selectedOfficerObj = usersData.find((o: any) => o.uid === generatorSelectedOfficer);
    const generatedId = selectedOfficerObj?.policeId || `POL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 2. Generate Password strictly matching: 1 upper, 2 lower, 1 special, 8 numbers (total 12)
    const uppers = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lowers = "abcdefghijkmnopqrstuvwxyz";
    const specials = "@#$%!*&";
    const digits = "0123456789";

    const u = uppers[Math.floor(Math.random() * uppers.length)];
    const l1 = lowers[Math.floor(Math.random() * lowers.length)];
    const l2 = lowers[Math.floor(Math.random() * lowers.length)];
    const s = specials[Math.floor(Math.random() * specials.length)];
    
    let n = "";
    for (let i = 0; i < 8; i++) {
      n += digits[Math.floor(Math.random() * digits.length)];
    }

    const pwd = `${u}${l1}${l2}${s}${n}`;

    // Validate password format
    const upperCount = (pwd.match(/[A-Z]/g) || []).length;
    const lowerCount = (pwd.match(/[a-z]/g) || []).length;
    const digitCount = (pwd.match(/[0-9]/g) || []).length;
    const specialCount = (pwd.match(/[@#$%!*&]/g) || []).length;
    const isValid = pwd.length === 12 && upperCount === 1 && lowerCount === 2 && specialCount === 1 && digitCount === 8;

    if (!isValid) {
      toast.error("Generated password is invalid.");
      return;
    }

    // 3. Immediately save to database
    setSavingCredentials(true);
    try {
      const officerName = selectedOfficerObj.name || "";
      const badgeNumber = selectedOfficerObj.badgeNumber || selectedOfficerObj.policeId || "";
      const adminUid = auth.currentUser?.uid || "admin";
      const adminIdToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const policeEmail = `${generatedId}@police.gov`;
      const response = await fetch("/api/admin/save-police-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: generatorSelectedOfficer,
          name: officerName,
          policeId: generatedId,
          policeEmail: policeEmail,
          badgeNumber: badgeNumber,
          password: pwd,
          adminUid,
          adminIdToken
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to save credentials.");
      }

      setGeneratedPoliceId(generatedId);
      setGeneratedPassword(pwd);

      if (data.alreadyGenerated) {
        toast.info("Credentials have already been generated for this officer.");
      } else {
        toast.success("Police credentials successfully created and saved.");
      }

      // Refresh data
      fetchSystemData();
    } catch (err: any) {
      console.error("Save credentials error:", err);
      toast.error(err.message || "Failed to save credentials.");
    } finally {
      setSavingCredentials(false);
    }
  };

  const calculateYearsOfService = (dojStr: string): string => {
    if (!dojStr) return "0";
    const dojDate = new Date(dojStr);
    if (isNaN(dojDate.getTime())) return "0";
    const today = new Date();
    let years = today.getFullYear() - dojDate.getFullYear();
    const monthDiff = today.getMonth() - dojDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dojDate.getDate())) {
      years--;
    }
    return Math.max(0, years).toString();
  };

  const handleCreatePoliceOfficer = async (e: React.FormEvent) => {
    e.preventDefault();

    // Frontend Validations
    if (!newPolice.name || !newPolice.email || !newPolice.badgeNumber || !newPolice.dob || !newPolice.doj) {
      toast.error("Please fill in all required fields (Name, Email, Badge Number, DOB, and DOJ).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newPolice.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const dobDate = new Date(newPolice.dob);
    const dojDate = new Date(newPolice.doj);
    if (isNaN(dobDate.getTime())) {
      toast.error("Please enter a valid Date of Birth.");
      return;
    }
    if (isNaN(dojDate.getTime())) {
      toast.error("Please enter a valid Date of Joining.");
      return;
    }
    if (dobDate >= dojDate) {
      toast.error("Date of Birth must be before the Date of Joining.");
      return;
    }

    const ageAtJoining = dojDate.getFullYear() - dobDate.getFullYear();
    if (ageAtJoining < 18) {
      toast.error("Officer must be at least 18 years old at the Date of Joining.");
      return;
    }

    const handled = Number(newPolice.casesHandled) || 0;
    const solved = Number(newPolice.casesSolved) || 0;
    if (solved > handled) {
      toast.error("Cases successfully solved cannot exceed cases handled.");
      return;
    }

    setSubmittingPolice(true);

    try {
      // 1. Call the server API route to create officer and auto-generate credentials
      const adminUid = auth.currentUser?.uid || "admin";
      // Get the admin's ID token so the server-side Firestore REST API can authenticate the write
      const adminIdToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const response = await fetch("/api/admin/create-police", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPolice,
          yearsOfService: calculateYearsOfService(newPolice.doj), // Ensure correct years of service is sent
          adminUid,
          adminIdToken
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to create police officer account.");
      }

      // 2. Set credentials returned by backend for the success popup
      setGeneratedCredentials({
        name: data.officerName || newPolice.name,
        userId: newPolice.email,
        email: newPolice.email,
        temporaryPassword: data.temporaryPassword,
        policeId: data.policeId,
        badgeNumber: data.badgeNumber || newPolice.badgeNumber || "N/A",
        rank: newPolice.rank || data.profile?.rank || "Sub-Inspector",
        stationName: newPolice.stationName || data.profile?.stationName || "Central Police Station"
      });

      // 3. Update local state directly with the new officer profile data returned by backend
      if (data.profile) {
        setUsersData((prevUsers: any[]) => [data.profile, ...prevUsers]);
      }

      setIsAddPoliceModalOpen(false);
      setIsCredentialsModalOpen(true);
      setNewPolice(initialPoliceState);
      toast.success("Police Officer created successfully!");
      
      // Sync in the background without blocking the UI loading spinner
      fetchSystemData();
    } catch (err: any) {
      console.error("Create police error:", err);
      toast.error(err.message || "Failed to create police officer.");
    } finally {
      setSubmittingPolice(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedOfficerForCredentials) return;
    setResettingPasswordLoading(true);

    try {
      const adminUid = auth.currentUser?.uid || "admin";
      const adminIdToken = auth.currentUser ? await auth.currentUser.getIdToken() : "";
      const response = await fetch("/api/admin/reset-police-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: selectedOfficerForCredentials.uid,
          adminUid,
          adminIdToken
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setNewResetCredentials({
        policeId: data.policeId,
        newTemporaryPassword: data.newTemporaryPassword,
        officerName: data.officerName || selectedOfficerForCredentials.name
      });

      // Update local state and selected officer
      setSelectedOfficerForCredentials((prev: any) => ({
        ...prev,
        temporaryPassword: data.newTemporaryPassword,
        mustChangePassword: true
      }));

      setIsResetConfirmModalOpen(false);
      setIsPoliceIdModalOpen(false);
      setIsResetSuccessModalOpen(true);
      fetchSystemData();
      toast.success("Temporary password generated successfully!");
    } catch (err: any) {
      console.error("Reset password error:", err);
      toast.error(err.message || "Failed to reset password.");
    } finally {
      setResettingPasswordLoading(false);
    }
  };

  const handleAssignUserAsPolice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToAssign) {
      toast.error("Please select a user to assign as police officer.");
      return;
    }

    setSubmittingPolice(true);
    const assignedPoliceId = newPolice.policeId.trim() || `POL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const tempPassword = newPolice.password.trim() || "Police@2026!";

    try {
      const result = await assignUserAsPolice(selectedUserToAssign.uid, {
        ...newPolice,
        name: selectedUserToAssign.name || newPolice.name,
        email: selectedUserToAssign.email || newPolice.email,
        policeId: assignedPoliceId,
        badgeNumber: assignedPoliceId,
        role: "police",
        isActive: true
      });

      if (result.success) {
        setGeneratedCredentials({
          name: selectedUserToAssign.name || newPolice.name,
          userId: selectedUserToAssign.email || newPolice.email,
          email: selectedUserToAssign.email || newPolice.email,
          temporaryPassword: tempPassword,
          policeId: assignedPoliceId,
          badgeNumber: newPolice.badgeNumber || assignedPoliceId || "N/A",
          rank: newPolice.rank,
          stationName: newPolice.stationName
        });

        setIsAssignPoliceModalOpen(false);
        setIsCredentialsModalOpen(true);
        setSelectedUserToAssign(null);
        setNewPolice(initialPoliceState);
        toast.success(`${selectedUserToAssign.name || "User"} assigned as Police Officer!`);
        fetchSystemData();
      } else {
        toast.error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to assign user as police.");
    } finally {
      setSubmittingPolice(false);
    }
  };

  const handleSavePoliceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerToUpdate || !officerToUpdate.uid) {
      toast.error("No officer selected for update.");
      return;
    }

    setSubmittingPolice(true);
    try {
      const result = await updatePoliceOfficerProfile(officerToUpdate.uid, {
        ...officerToUpdate,
        badgeNumber: officerToUpdate.policeId || officerToUpdate.badgeNumber || "",
        updatedAt: new Date().toISOString()
      });

      if (result.success) {
        toast.success("Police officer profile updated successfully!");
        setIsUpdatePoliceModalOpen(false);
        setOfficerToUpdate(null);
        fetchSystemData();
      } else {
        toast.error(result.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update police officer profile.");
    } finally {
      setSubmittingPolice(false);
    }
  };

  const renderUsersTable = () => {
    // 1. Filter by role
    const roleFiltered = userRoleFilter === "ALL" 
      ? usersData 
      : usersData.filter(u => (u.role || "citizen").toLowerCase() === userRoleFilter.toLowerCase());

    // 2. Filter by search query (Name, Email, UID, Station, Badge)
    const filteredUsers = roleFiltered.filter(u => {
      if (!userSearchQuery.trim()) return true;
      const q = userSearchQuery.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.uid && u.uid.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.stationName && u.stationName.toLowerCase().includes(q)) ||
        (u.badgeNumber && u.badgeNumber.toLowerCase().includes(q))
      );
    });

    const counts = {
      all: usersData.length,
      admin: usersData.filter(u => u.role === "admin").length,
      citizen: usersData.filter(u => (u.role || "citizen") === "citizen").length,
      police: usersData.filter(u => u.role === "police").length,
    };

    const handlePrintUsers = () => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      printWindow.document.write(`
        <html>
          <head>
            <title>Users Registry (${userRoleFilter})</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111827; }
              h2 { margin-bottom: 8px; color: #059669; }
              p { color: #6b7280; font-size: 13px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; }
              th { background-color: #f9fafb; font-weight: bold; text-transform: uppercase; font-size: 11px; color: #374151; }
              tr:nth-child(even) { background-color: #fcfdfd; }
              .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
              .uid { font-family: monospace; font-size: 11px; color: #6b7280; }
            </style>
          </head>
          <body>
            <h2>Crime Assist &bull; Users Registry</h2>
            <p>Filter: <strong>${userRoleFilter}</strong> | Total Records: <strong>${filteredUsers.length}</strong> | Generated on: ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr>
                  <th style="width: 40px;"># ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Date of Join</th>
                  <th>UID</th>
                </tr>
              </thead>
              <tbody>
                ${filteredUsers.map((u, i) => `
                  <tr>
                    <td><strong>${i + 1}</strong></td>
                    <td><strong>${u.name || 'Unknown'}</strong></td>
                    <td>${u.email || '-'}</td>
                    <td><span class="badge">${u.role || 'Citizen'}</span></td>
                    <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                    <td class="uid">${u.uid || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    };

    const handleDownloadUsers = () => {
      const headers = ['ID', 'Name', 'Email', 'Role', 'Date of Join', 'UID'];
      const csvContent = [
        headers.join(','),
        ...filteredUsers.map((u, i) => [
          i + 1,
          `"${(u.name || '').replace(/"/g, '""')}"`,
          `"${(u.email || '').replace(/"/g, '""')}"`,
          `"${(u.role || 'citizen').toUpperCase()}"`,
          `"${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''}"`,
          `"${u.uid || ''}"`
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `Users_Registry_${userRoleFilter}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return (
      <div className="space-y-4">
        {/* TOP CONTROLS: Role Filter Tabs + Search + Actions */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-ui-bg border border-ui-border rounded-xl backdrop-blur-md overflow-x-auto">
            {[
              { id: "ALL", label: "All Users", count: counts.all },
              { id: "citizen", label: "Citizens", count: counts.citizen },
              { id: "police", label: "Police", count: counts.police },
              { id: "admin", label: "Admins", count: counts.admin },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setUserRoleFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  userRoleFilter === tab.id
                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/10 dark:hover:bg-white/5"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  userRoleFilter === tab.id
                    ? "bg-emerald-500 text-white dark:bg-emerald-400 dark:text-slate-900"
                    : "bg-black/10 dark:bg-white/10 text-text-tertiary"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Bar + Export/Print Buttons */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              <input
                type="text"
                placeholder="Search name, email, UID..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border focus:border-emerald-500/50 focus:outline-none transition-all placeholder:text-text-tertiary"
              />
              {userSearchQuery && (
                <button 
                  onClick={() => setUserSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button 
              onClick={handleDownloadUsers}
              className="p-2 rounded-xl bg-ui-bg border border-ui-border hover:bg-white/40 dark:hover:bg-white/5 transition-colors text-text-secondary hover:text-text-primary shrink-0"
              title="Download CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={handlePrintUsers}
              className="p-2 rounded-xl bg-ui-bg border border-ui-border hover:bg-white/40 dark:hover:bg-white/5 transition-colors text-text-secondary hover:text-text-primary shrink-0"
              title="Print Users"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN USERS TABLE */}
        <div className="glass-panel overflow-hidden shadow-sm border border-ui-border rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-wider text-text-secondary border-b border-white/20">
                  <th className="px-6 py-4 font-bold w-16">ID</th>
                  <th className="px-6 py-4 font-bold">NAME</th>
                  <th className="px-6 py-4 font-bold">EMAIL</th>
                  <th className="px-6 py-4 font-bold">ROLE</th>
                  <th className="px-6 py-4 font-bold">DATE OF JOIN</th>
                  <th className="px-6 py-4 font-bold">UID</th>
                  <th className="px-6 py-4 font-bold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-text-tertiary">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-medium text-sm">No users found matching the criteria.</p>
                      {userSearchQuery && (
                        <button 
                          onClick={() => setUserSearchQuery("")}
                          className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Clear search filter
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr 
                      key={user.id || user.uid || index} 
                      className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
                    >
                      {/* 1. ID Column: Sequential Display Number (1, 2, 3, etc.) */}
                      <td className="px-6 py-4 font-mono font-bold text-xs text-text-tertiary">
                        {index + 1}
                      </td>

                      {/* 2. Name Column */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            user.role === 'admin' 
                              ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                              : user.role === 'police' 
                              ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30' 
                              : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                          }`}>
                            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm text-text-primary leading-tight truncate">
                              {user.name || "Unknown User"}
                            </div>
                            {user.stationName && (
                              <div className="text-[10px] text-text-secondary truncate mt-0.5">
                                {user.stationName} {user.rank ? `• ${user.rank}` : ""}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Email Column */}
                      <td className="px-6 py-4 text-xs font-medium text-text-secondary">
                        {user.email || "-"}
                      </td>

                      {/* 4. Role Column */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${
                          user.role === "admin" 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                            : user.role === "police" 
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" 
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        }`}>
                          {user.role || "Citizen"}
                        </span>
                      </td>

                      {/* 5. Date of Join Column */}
                      <td className="px-6 py-4 text-xs font-medium text-text-secondary whitespace-nowrap">
                        {user.createdAt ? (
                          new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        ) : (
                          <span className="text-text-tertiary italic">-</span>
                        )}
                      </td>

                      {/* 6. UID Column: Visually smaller, compact, non-truncated */}
                      <td className="px-6 py-4">
                        <span 
                          className="text-[11px] font-mono text-text-tertiary bg-ui-bg px-2 py-1 rounded border border-ui-border select-all inline-block max-w-[200px] truncate"
                          title={user.uid}
                        >
                          {user.uid}
                        </span>
                      </td>

                      {/* 7. Actions Column */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {user.role === "citizen" && (
                          <button 
                            onClick={async () => {
                              setIsProfileModalOpen(true);
                              setFetchingProfile(true);
                              const { profile } = await getUserProfile(user.uid);
                              setSelectedCitizenProfile(profile);
                              setFetchingProfile(false);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 font-semibold bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/20 backdrop-blur-sm"
                            title="View KYC Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View KYC
                          </button>
                        )}
                        {user.role === "police" && (
                          <button 
                            onClick={async () => {
                              setIsPoliceProfileModalOpen(true);
                              setFetchingProfile(true);
                              const { profile } = await getUserProfile(user.uid);
                              setSelectedPoliceProfile({ ...user, ...profile });
                              setFetchingProfile(false);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 font-semibold bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-colors border border-purple-500/20 backdrop-blur-sm"
                            title="View Police Record"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View Record
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPoliceManagementSection = () => {
    const policeOfficers = usersData.filter(u => u.role === "police");

    const filteredOfficers = policeOfficers.filter(officer => {
      if (!policeSearchQuery.trim()) return true;
      const q = policeSearchQuery.toLowerCase();
      return (
        (officer.name && officer.name.toLowerCase().includes(q)) ||
        (officer.email && officer.email.toLowerCase().includes(q)) ||
        (officer.policeId && officer.policeId.toLowerCase().includes(q)) ||
        (officer.badgeNumber && officer.badgeNumber.toLowerCase().includes(q)) ||
        (officer.rank && officer.rank.toLowerCase().includes(q)) ||
        (officer.stationName && officer.stationName.toLowerCase().includes(q)) ||
        (officer.phone && officer.phone.toLowerCase().includes(q))
      );
    });

    const activeCount = policeOfficers.filter(p => (p.serviceStatus || p.dutyStatus || "Active").toLowerCase().includes("active")).length;
    const stationsCount = new Set(policeOfficers.map(p => p.stationName).filter(Boolean)).size;
    const totalSolved = policeOfficers.reduce((acc, p) => acc + (Number(p.casesSolved) || 0), 0);

    return (
      <div className="space-y-6">
        {/* TOP KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 border border-purple-500/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Total Officers</p>
                <p className="text-3xl font-extrabold text-text-primary mt-1">{policeOfficers.length}</p>
              </div>
              <div className="p-3 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/20">
                <Shield className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary mt-3">Enrolled in law enforcement grid</p>
          </div>

          <div className="glass-panel p-5 border border-emerald-500/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Active Duty</p>
                <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{activeCount}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary mt-3">Ready for emergency & case dispatch</p>
          </div>

          <div className="glass-panel p-5 border border-blue-500/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Police Stations</p>
                <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">{stationsCount || 1}</p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/20">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary mt-3">Jurisdictions & Precincts active</p>
          </div>

          <div className="glass-panel p-5 border border-amber-500/20 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Cases Solved</p>
                <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{totalSolved}</p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
                <Award className="w-6 h-6" />
              </div>
            </div>
            <p className="text-[11px] text-text-tertiary mt-3">Across all assigned officers</p>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS TOOLBAR */}
        <div className="glass-panel p-4 rounded-2xl border border-ui-border flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap gap-2.5">
            {/* Button 1: Add Police Officer */}
            <button
              onClick={() => {
                const defaultDoj = new Date().toISOString().split("T")[0];
                setNewPolice({
                  ...initialPoliceState,
                  doj: defaultDoj,
                  yearsOfService: calculateYearsOfService(defaultDoj),
                  policeId: `POL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                  password: `Police@${Math.floor(1000 + Math.random() * 9000)}!`
                });
                setIsAddPoliceModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Police Officer</span>
            </button>



            {/* Button 3: Update Police Officer */}
            <button
              onClick={() => {
                if (policeOfficers.length > 0) {
                  setOfficerToUpdate(policeOfficers[0]);
                  setIsUpdatePoliceModalOpen(true);
                } else {
                  toast.info("No police officers registered to update.");
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-ui-bg hover:bg-white/40 dark:hover:bg-white/10 text-text-primary text-xs font-bold rounded-xl border border-ui-border transition-all active:scale-95"
            >
              <Edit className="w-4 h-4 text-blue-500" />
              <span>Update Police Officer</span>
            </button>
          </div>

          {/* Search Bar & Export Tools */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
              <input
                type="text"
                placeholder="Search officer, rank, station..."
                value={policeSearchQuery}
                onChange={(e) => setPoliceSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border focus:border-purple-500/50 focus:outline-none transition-all placeholder:text-text-tertiary"
              />
              {policeSearchQuery && (
                <button 
                  onClick={() => setPoliceSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button 
              onClick={() => {
                const headers = ['Police ID', 'Name', 'Rank', 'Station', 'Phone', 'Cases Solved', 'Status', 'Email'];
                const csvContent = [
                  headers.join(','),
                  ...filteredOfficers.map((o) => [
                    `"${o.policeId || o.badgeNumber || ''}"`,
                    `"${(o.name || '').replace(/"/g, '""')}"`,
                    `"${o.rank || 'Officer'}"`,
                    `"${o.stationName || ''}"`,
                    `"${o.phone || ''}"`,
                    `"${o.casesSolved || 0}/${o.casesHandled || 0}"`,
                    `"${o.serviceStatus || 'Active'}"`,
                    `"${o.email || ''}"`
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.setAttribute('download', `Police_Officers_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="p-2 rounded-xl bg-ui-bg border border-ui-border hover:bg-white/40 dark:hover:bg-white/5 transition-colors text-text-secondary hover:text-text-primary shrink-0"
              title="Download Officers CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Generate Login Credentials Section */}
        <div className="glass-panel p-6 rounded-2xl border border-ui-border bg-slate-950/20 shadow-md">
          <h3 className="text-sm font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2 mb-4">
            <Key className="w-4 h-4" /> Generate Login Credentials
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Select Officer</label>
                <select
                  value={generatorSelectedOfficer}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setGeneratorSelectedOfficer(uid);
                    if (uid) {
                      const officer = usersData.find(u => u.uid === uid);
                      if (officer) {
                        if (officer.credentialsGenerated || officer.policeId) {
                          setGeneratedPoliceId(officer.policeId);
                          setGeneratedPassword(officer.temporaryPassword || "********");
                        } else {
                          setGeneratedPoliceId("");
                          setGeneratedPassword("");
                        }
                      }
                    } else {
                      setGeneratedPoliceId("");
                      setGeneratedPassword("");
                    }
                    setShowGeneratedPassword(false);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary font-bold focus:outline-none focus:border-purple-500 [&>option]:bg-white dark:[&>option]:bg-slate-900"
                >
                  <option value="">-- Select Registered Officer --</option>
                  {policeOfficers.map(officer => (
                    <option key={officer.uid} value={officer.uid}>
                      {officer.name} (Current ID: {officer.policeId || "None"})
                    </option>
                  ))}
                </select>
              </div>



              {(() => {
                const selectedOfficerObj = usersData.find((o: any) => o.uid === generatorSelectedOfficer);
                const credentialsAlreadyExist = selectedOfficerObj ? (selectedOfficerObj.credentialsGenerated || !!selectedOfficerObj.policeId) : false;
                return (
                  <div className="space-y-3 pt-2">
                    {credentialsAlreadyExist && (
                      <p className="text-xs text-yellow-500 font-semibold">
                        ⚠️ Credentials have already been generated for this officer.
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={credentialsAlreadyExist || savingCredentials || !generatorSelectedOfficer}
                      onClick={handleGenerateCredentials}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                    >
                      {savingCredentials ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Generate Credentials</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Right: Output */}
            <div className="bg-slate-900/40 border border-ui-border rounded-xl p-4 flex flex-col justify-between">
              {(generatedPoliceId || selectedGeneratorOfficerObj?.policeEmail) ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Generated Police Email</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={generatedPoliceId ? `${generatedPoliceId}@police.gov` : (selectedGeneratorOfficerObj?.policeEmail || "")}
                          className="flex-1 px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-ui-bg border border-ui-border text-purple-600 dark:text-purple-400"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedPoliceId ? `${generatedPoliceId}@police.gov` : (selectedGeneratorOfficerObj?.policeEmail || ""), "Police Email")}
                          className="p-1.5 rounded-lg bg-ui-bg border border-ui-border hover:bg-white/10 text-xs font-bold transition-all text-text-secondary hover:text-text-primary shrink-0"
                        >
                          {copiedField === "Police Email" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Generated Password</span>
                      <div className="flex items-center gap-2">
                        <input
                          type={showGeneratedPassword ? "text" : "password"}
                          readOnly
                          value={generatedPassword || (selectedGeneratorOfficerObj?.temporaryPassword || "••••••••••••")}
                          className="flex-1 px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-ui-bg border border-ui-border text-emerald-600 dark:text-emerald-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeneratedPassword(!showGeneratedPassword)}
                          className="p-1.5 rounded-lg bg-ui-bg border border-ui-border hover:bg-white/10 text-text-secondary hover:text-text-primary shrink-0 cursor-pointer"
                        >
                          {showGeneratedPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(generatedPassword || (selectedGeneratorOfficerObj?.temporaryPassword || ""), "Password")}
                          className="p-1.5 rounded-lg bg-ui-bg border border-ui-border hover:bg-white/10 text-xs font-bold transition-all text-text-secondary hover:text-text-primary shrink-0"
                        >
                          {copiedField === "Password" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text-tertiary">
                  <Sparkles className="w-8 h-8 mb-2 text-purple-500 opacity-50 animate-pulse" />
                  <p className="text-xs font-semibold text-text-primary">Credentials Sandbox</p>
                  <p className="text-[10px] text-text-secondary max-w-[200px] mt-1">
                    Select a registered officer, then click <strong>"Generate Credentials"</strong> to provision their account credentials.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* POLICE OFFICERS TABLE */}
        <div className="glass-panel overflow-hidden shadow-sm border border-ui-border rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-wider text-text-secondary border-b border-white/20">
                  <th className="px-6 py-4 font-bold w-16">#</th>
                  <th className="px-6 py-4 font-bold">POLICE ID</th>
                  <th className="px-6 py-4 font-bold">NAME & RANK</th>
                  <th className="px-6 py-4 font-bold">POLICE STATION</th>
                  <th className="px-6 py-4 font-bold">PHONE</th>
                  <th className="px-6 py-4 font-bold">CASES (SOLVED/TOTAL)</th>
                  <th className="px-6 py-4 font-bold">STATUS</th>
                  <th className="px-6 py-4 font-bold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {filteredOfficers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-text-tertiary">
                      <Shield className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-500" />
                      <p className="font-semibold text-sm text-text-primary">No police officers found.</p>
                      <p className="text-xs text-text-secondary mt-1">Use the "Add Police Officer" button above to enroll officers.</p>
                    </td>
                  </tr>
                ) : (
                  filteredOfficers.map((officer, idx) => (
                    <tr 
                      key={officer.id || officer.uid || idx} 
                      className="hover:bg-purple-500/5 transition-colors group"
                    >
                      {/* # Index */}
                      <td className="px-6 py-4 font-mono font-bold text-xs text-text-tertiary">
                        {idx + 1}
                      </td>

                      {/* Police ID */}
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                          {officer.policeId || "Not Generated"}
                        </span>
                      </td>

                      {/* Name & Rank */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                            {officer.name ? officer.name.charAt(0).toUpperCase() : "P"}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-text-primary leading-tight flex items-center gap-1.5">
                              {officer.name || "Unnamed Officer"}
                            </div>
                            <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                              {officer.rank || "Sub-Inspector"} {officer.yearsOfService ? `• ${officer.yearsOfService} yrs exp` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Police Station */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-medium text-text-primary flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-text-tertiary" />
                          <span>{officer.stationName || "Central Station"}</span>
                        </div>
                        {officer.postingLocation && (
                          <div className="text-[10px] text-text-secondary mt-0.5">
                            Loc: {officer.postingLocation}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="px-6 py-4 text-xs font-mono text-text-secondary">
                        {officer.phone || officer.mobileNumber || "-"}
                      </td>

                      {/* Cases */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {officer.casesSolved || 0} Solved
                          </span>
                          <span className="text-[11px] text-text-tertiary">
                            / {officer.casesHandled || 0} Total
                          </span>
                        </div>
                      </td>

                      {/* Service Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${
                          (officer.serviceStatus || officer.dutyStatus || "Active").toLowerCase() === "retired" 
                            ? "bg-slate-500/10 text-slate-500 border-slate-500/20"
                            : (officer.serviceStatus || officer.dutyStatus || "Active").toLowerCase().includes("leave")
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}>
                          {officer.serviceStatus || officer.dutyStatus || "Active"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {/* Police ID Credentials Button */}
                          <button
                            onClick={() => {
                              setSelectedOfficerForCredentials({ ...officer });
                              setShowPasswordInModal(false);
                              setIsPoliceIdModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-400 font-bold text-xs rounded-xl border border-purple-500/30 transition-all shadow-sm active:scale-95"
                            title="View Officer Police ID & Credentials"
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Police ID</span>
                          </button>

                          {/* View Profile */}
                          <button
                            onClick={async () => {
                              setIsPoliceProfileModalOpen(true);
                              setFetchingProfile(true);
                              const { profile } = await getUserProfile(officer.uid);
                              setSelectedPoliceProfile({ ...officer, ...profile });
                              setFetchingProfile(false);
                            }}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20 transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Update Officer */}
                          <button
                            onClick={() => {
                              setOfficerToUpdate({ ...officer });
                              setIsUpdatePoliceModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-500/10 hover:bg-slate-500/20 text-text-secondary hover:text-text-primary rounded-lg border border-ui-border transition-colors"
                            title="Update Officer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderComplaintsTable = (filterType: string | null = null) => {
    const baseFiltered = filterType 
      ? complaintsData.filter(c => c.type === filterType || (!c.type && filterType === "FIR"))
      : complaintsData;

    const q = caseSearchQuery.trim().toLowerCase();
    const filteredComplaints = q
      ? baseFiltered.filter(c =>
          (c.id || "").toLowerCase().includes(q) ||
          formatCaseId(c).toLowerCase().includes(q) ||
          (c.title || "").toLowerCase().includes(q) ||
          (c.citizenName || "").toLowerCase().includes(q) ||
          (c.status || "").toLowerCase().includes(q) ||
          (c.type || "FIR").toLowerCase().includes(q)
        )
      : baseFiltered;

    return (
      <div className="glass-panel overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-wider text-text-secondary border-b border-white/20">
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">TITLE</th>
                <th className="px-6 py-4 font-semibold">CITIZEN</th>
                <th className="px-6 py-4 font-semibold">TYPE</th>
                <th className="px-6 py-4 font-semibold">STATUS</th>
                <th className="px-6 py-4 font-semibold">DATE</th>
                <th className="px-6 py-4 font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm text-text-primary">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-text-tertiary text-xs">
                    No complaints found.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => {
                  const isApproved = c.status === "Approved" || c.status === "Investigating" || c.status === "Under Review" || c.status === "Resolved";
                  const isRejected = c.status === "Rejected";

                  return (
                    <tr key={c.id} className="border-b border-white/10 hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-text-tertiary">{formatCaseId(c)}</td>
                      <td className="px-6 py-4 font-medium text-text-primary max-w-[250px] truncate">{c.title}</td>
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
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border backdrop-blur-sm ${
                          c.status === "Approved" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                          c.status === "Rejected" ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" :
                          c.status === "Pending" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" :
                          c.status === "Investigating" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" :
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-text-tertiary">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        {/* Approve / Reject Buttons (Enabled when Pending, Hidden/Badge when Approved or Rejected) */}
                        {!isApproved && !isRejected ? (
                          <>
                            <button 
                              onClick={() => handleApproveCase(c)}
                              disabled={updatingCaseId === c.id}
                              className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-100 font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 rounded-lg transition-all border border-emerald-500/30 backdrop-blur-sm shadow-sm active:scale-95 disabled:opacity-50"
                              title="Approve Case"
                            >
                              {updatingCaseId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                              Approve
                            </button>
                            <button 
                              onClick={() => handleOpenRejectModal(c)}
                              disabled={updatingCaseId === c.id}
                              className="flex items-center gap-1 text-xs text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-100 font-semibold bg-red-500/15 hover:bg-red-500/25 px-3 py-1.5 rounded-lg transition-all border border-red-500/30 backdrop-blur-sm shadow-sm active:scale-95 disabled:opacity-50"
                              title="Reject Case"
                            >
                              <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border backdrop-blur-sm ${
                            isApproved 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          }`}>
                            {isApproved ? "🟢 Approved" : "🔴 Rejected"}
                          </span>
                        )}

                        {/* View Button (Always Enabled) */}
                        <button 
                          onClick={() => setSelectedComplaint(c)}
                          className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 font-semibold bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/20 backdrop-blur-sm"
                          title="View Case Details"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>

                        {/* Assign Button (Enabled ONLY after Approved, Locked when Pending or Rejected) */}
                        {isApproved ? (
                          <button 
                            onClick={() => {
                              setSelectedComplaint(c);
                              setTimeout(() => {
                                document.getElementById('assignment-section')?.scrollIntoView({ behavior: 'smooth' });
                              }, 150);
                            }}
                            className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-100 font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 px-3 py-1.5 rounded-lg transition-all border border-emerald-500/30 backdrop-blur-sm shadow-sm active:scale-95 cursor-pointer"
                            title="Assign Officer to Case"
                          >
                            <Briefcase className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            Assign
                          </button>
                        ) : (
                          <button 
                            disabled
                            className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium bg-slate-500/10 px-3 py-1.5 rounded-lg border border-slate-500/20 backdrop-blur-sm cursor-not-allowed opacity-60"
                            title={isRejected ? "Rejected cases cannot be assigned" : "Case must be Approved before assigning"}
                          >
                            <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            Assign
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const handleExportBackup = async () => {
    try {
      setExportingBackup(true);
      const res = await fetch('/api/admin/backup?download=true');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to export backup');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crime-app-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Database backup JSON downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to export backup");
    } finally {
      setExportingBackup(false);
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedBackupFile(null);
      setBackupFilePreview(null);
      return;
    }
    setSelectedBackupFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.collections || typeof json.collections !== 'object') {
          toast.error("Invalid backup file: Missing collections object.");
          setBackupFilePreview(null);
          return;
        }
        setBackupFilePreview(json);
        toast.success("Backup file parsed successfully!");
      } catch (err) {
        toast.error("Failed to parse JSON file.");
        setBackupFilePreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!backupFilePreview) return;
    try {
      setRestoringBackup(true);
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collections: backupFilePreview.collections,
          mode: restoreMode
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to restore backup');
      }
      toast.success(data.message || "Database backup restored successfully!");
      setIsRestoreModalOpen(false);
      setSelectedBackupFile(null);
      setBackupFilePreview(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to restore database");
    } finally {
      setRestoringBackup(false);
    }
  };

  const renderBackupSection = () => {
    const totalDocs = complaintsData.length + usersData.length + sosAlertsData.length;

    return (
      <div className="space-y-6 pb-12">
        {/* Top Header Card */}
        <div className="p-6 bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border border-emerald-500/20 rounded-3xl shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                Firestore Database Backup & Disaster Recovery Cockpit
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  v1.0 Ready
                </span>
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Generate full JSON snapshots of all active Firestore collections or restore data back into the system with 1-click controls.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportBackup}
              disabled={exportingBackup}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 border border-emerald-400/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {exportingBackup ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export Full Database Backup
            </button>
          </div>
        </div>

        {/* Database Metric Rings */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col">
            <span className="text-xs font-semibold text-text-secondary">Estimated Records</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 font-mono">{totalDocs}</span>
            <span className="text-[10px] text-text-secondary mt-0.5">Active Firestore Docs</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col">
            <span className="text-xs font-semibold text-text-secondary">Complaints</span>
            <span className="text-2xl font-black text-cyan-400 mt-1 font-mono">{complaintsData.length}</span>
            <span className="text-[10px] text-text-secondary mt-0.5">FIR & CSR Records</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col">
            <span className="text-xs font-semibold text-text-secondary">Registered Users</span>
            <span className="text-2xl font-black text-purple-400 mt-1 font-mono">{usersData.length}</span>
            <span className="text-[10px] text-text-secondary mt-0.5">Citizens & Officers</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/10 flex flex-col">
            <span className="text-xs font-semibold text-text-secondary">SOS Signals</span>
            <span className="text-2xl font-black text-rose-400 mt-1 font-mono">{sosAlertsData.length}</span>
            <span className="text-[10px] text-text-secondary mt-0.5">Emergency Dispatch</span>
          </div>
        </div>

        {/* Main Grid: Export & Import Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Export Database */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Download className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">1-Click JSON Snapshot Export</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Export all Firestore documents (`users`, `complaints`, `sos_signals`, `police_officers`, `activity_logs`, `broadcasts`) into a single structured JSON file. Includes document metadata, timestamps, and schema versioning.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/5 space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Target Collections:</span>
                  <span className="text-emerald-400 font-bold">7 Collections</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Format:</span>
                  <span className="text-amber-400">JSON (.json)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Encoding:</span>
                  <span>UTF-8 Standard</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleExportBackup}
              disabled={exportingBackup}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {exportingBackup ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating JSON Backup...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Backup JSON File
                </>
              )}
            </button>
          </div>

          {/* Card 2: Import & Restore Database */}
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Upload className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-text-primary">Restore Database Snapshot</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Upload a previously saved `.json` database backup file to restore records directly into Firestore via batch operations.
              </p>

              {/* File Input Picker */}
              <div className="mt-4">
                <label className="block text-xs font-bold text-text-secondary mb-2">
                  Select Backup JSON File:
                </label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleBackupFileChange}
                  className="w-full text-xs text-text-primary file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-500 file:cursor-pointer cursor-pointer border border-white/10 rounded-xl p-1 bg-black/20"
                />
              </div>

              {/* Parsed Preview Info */}
              {backupFilePreview && (
                <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2 text-xs font-mono text-purple-200">
                  <div className="flex justify-between">
                    <span>Exported Date:</span>
                    <span className="font-bold">{backupFilePreview.exportedAt ? new Date(backupFilePreview.exportedAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Collections:</span>
                    <span className="font-bold">{backupFilePreview.metadata?.totalCollections || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Documents:</span>
                    <span className="font-bold text-emerald-400">{backupFilePreview.metadata?.totalDocuments || 0}</span>
                  </div>

                  {/* Mode Selector */}
                  <div className="pt-2 border-t border-purple-500/20 flex items-center justify-between font-sans">
                    <span className="text-xs font-bold text-text-secondary">Restore Mode:</span>
                    <select
                      value={restoreMode}
                      onChange={(e: any) => setRestoreMode(e.target.value)}
                      className="text-xs font-bold bg-slate-900 border border-white/20 rounded-lg px-2 py-1 text-white cursor-pointer"
                    >
                      <option value="merge">Merge & Update (Safe)</option>
                      <option value="overwrite">Overwrite (Full Replace)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsRestoreModalOpen(true)}
              disabled={!backupFilePreview || restoringBackup}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition-all cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              Start Database Restore
            </button>
          </div>
        </div>

        {/* Card 4: CLI Commands Cheat Sheet */}
        <div className="p-6 rounded-3xl bg-slate-900/40 border border-white/10 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">Developer CLI Backup Commands</h3>
              <p className="text-xs text-text-secondary">Run these automated scripts directly from the terminal shell:</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between font-mono text-xs text-emerald-400">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">$</span>
                <span>npm run backup</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("npm run backup");
                  toast.success("Command copied to clipboard!");
                }}
                className="px-2 py-1 text-[10px] rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                Copy
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between font-mono text-xs text-purple-400">
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">$</span>
                <span>npm run restore</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("npm run restore");
                  toast.success("Command copied to clipboard!");
                }}
                className="px-2 py-1 text-[10px] rounded bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        {/* Restore Confirmation Modal */}
        {isRestoreModalOpen && backupFilePreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
            <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-purple-500/30 shadow-2xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirm Database Restore</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Are you sure you want to proceed?</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-xs font-mono text-slate-300">
                <div className="flex justify-between">
                  <span>Restore Mode:</span>
                  <span className="text-amber-400 font-bold uppercase">{restoreMode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Collections:</span>
                  <span>{backupFilePreview.metadata?.totalCollections || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Records:</span>
                  <span className="text-emerald-400 font-bold">{backupFilePreview.metadata?.totalDocuments || 0}</span>
                </div>
              </div>

              <p className="text-xs text-amber-300/80 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                ⚠️ Warning: Restoring data will modify live Firestore records. Please ensure your backup source is trusted.
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsRestoreModalOpen(false)}
                  disabled={restoringBackup}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRestore}
                  disabled={restoringBackup}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {restoringBackup ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Restoring Data...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Start Restore
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSOSAlertsSection = () => {
    const activeCount = sosAlertsData.filter(a => a.status === "Active").length;
    const acknowledgedCount = sosAlertsData.filter(a => a.status === "Acknowledged").length;
    const respondingCount = sosAlertsData.filter(a => a.status === "Responding").length;
    const resolvedCount = sosAlertsData.filter(a => a.status === "Resolved").length;

    return (
      <div className="space-y-6 relative z-10 text-slate-100">
        {/* Action Bar with Animated HISTORY Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-5 rounded-2xl border border-ui-border shadow-md">
          <div>
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" />
              <span>Live SOS Emergency Dispatch Grid</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">Real-time citizen alerts with GPS telemetry and response controls</p>
          </div>
          
          <div className="sos-history-wrapper shrink-0">
            <div className="sos-history-link-wrapper">
              <button 
                onClick={() => setActiveTab("SOS History")} 
                className="sos-history-btn"
                title="View Resolved SOS Alert History"
              >
                HISTORY
              </button>
              <div className="sos-history-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 268.832 268.832">
                  <path d="M265.17 125.577l-80-80c-4.88-4.88-12.796-4.88-17.677 0-4.882 4.882-4.882 12.796 0 17.678l58.66 58.66H12.5c-6.903 0-12.5 5.598-12.5 12.5 0 6.903 5.597 12.5 12.5 12.5h213.654l-58.66 58.662c-4.88 4.882-4.88 12.796 0 17.678 2.44 2.44 5.64 3.66 8.84 3.66 s6.398-1.22 8.84-3.66l79.997-80c4.883-4.882 4.883-12.796 0-17.678z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* KPI stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 border border-red-500/20 shadow-sm relative overflow-hidden bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-red-500 dark:text-red-400">🔴 Active</p>
                <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{activeCount}</p>
              </div>
            </div>
          </div>
          <div className="glass-panel p-5 border border-yellow-500/20 shadow-sm relative overflow-hidden bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">🟡 Acknowledged</p>
                <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{acknowledgedCount}</p>
              </div>
            </div>
          </div>
          <div className="glass-panel p-5 border border-blue-500/20 shadow-sm relative overflow-hidden bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">🔵 Responding</p>
                <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{respondingCount}</p>
              </div>
            </div>
          </div>
          <div className="glass-panel p-5 border border-emerald-500/20 shadow-sm relative overflow-hidden bg-white dark:bg-slate-900/40">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">🟢 Resolved</p>
                <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mt-1">{resolvedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area: Split List and Map */}
        <div className="flex flex-col lg:flex-row gap-6 h-[500px]">
          {/* Left Column: SOS Alert Cards (scrollable list) */}
          <div className="flex-1 lg:max-w-[420px] overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
            {(() => {
              const activeSOSAlerts = sosAlertsData.filter(a => a.status !== "Resolved");
              if (activeSOSAlerts.length === 0) {
                return (
                  <div className="glass-panel p-12 text-center text-slate-500 dark:text-slate-400 border-dashed">
                    <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="font-medium text-sm">No Active SOS Alerts Registered</p>
                  </div>
                );
              }
              return activeSOSAlerts.map((alert) => {
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlert(alert)}
                    className={`glass-panel p-5 border cursor-pointer transition-all ${
                      isSelected 
                        ? "border-red-500/40 bg-red-500/10 shadow-lg" 
                        : "border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-xs text-red-500 flex items-center gap-1">
                        🚨 EMERGENCY SOS
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        alert.status === "Active" ? "bg-red-500/25 text-red-500 dark:text-red-400 border-red-500/40 animate-pulse" :
                        alert.status === "Acknowledged" ? "bg-yellow-500/25 text-yellow-600 dark:text-yellow-400 border-yellow-500/40" :
                        alert.status === "Responding" ? "bg-blue-500/25 text-blue-600 dark:text-blue-400 border-blue-500/40" :
                        "bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                      }`}>
                        {alert.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs font-normal text-slate-800 dark:text-slate-200 mb-4">
                      <p><span className="font-medium text-slate-600 dark:text-slate-400">Citizen:</span> <span className="font-medium text-slate-950 dark:text-slate-100">{alert.citizenName || "Unknown Citizen"}</span></p>
                      <p><span className="font-medium text-slate-600 dark:text-slate-400">Citizen ID:</span> <span className="font-mono text-slate-900 dark:text-slate-200">{alert.citizenId ? alert.citizenId.substring(0, 12).toUpperCase() : "N/A"}</span></p>
                      <p><span className="font-medium text-slate-600 dark:text-slate-400">Phone:</span> <span className="text-slate-900 dark:text-slate-200">{alert.citizenPhone || "N/A"}</span></p>
                      <p><span className="font-medium text-slate-600 dark:text-slate-400">Email:</span> <span className="text-slate-900 dark:text-slate-200">{alert.citizenEmail || "N/A"}</span></p>
                      {alert.citizenAddress && alert.citizenAddress !== "N/A" && (
                        <p className="truncate"><span className="font-medium text-slate-600 dark:text-slate-400">Address:</span> <span className="text-slate-900 dark:text-slate-200">{alert.citizenAddress}</span></p>
                      )}
                      <p><span className="font-medium text-slate-600 dark:text-slate-400">Date:</span> <span className="text-slate-900 dark:text-slate-200">{new Date(alert.createdAt || alert.timestamp).toLocaleDateString()}</span></p>
                      <p><span className="font-medium text-slate-600 dark:text-slate-400">Time:</span> <span className="text-slate-900 dark:text-slate-200">{new Date(alert.createdAt || alert.timestamp).toLocaleTimeString()}</span></p>
                      <p className="font-mono text-[10px] text-slate-600 dark:text-slate-400">Lat: {alert.latitude?.toFixed(4)}, Lng: {alert.longitude?.toFixed(4)}</p>
                    </div>

                    <div className="border-t border-slate-200 dark:border-white/5 pt-3 flex flex-wrap gap-2 items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAlert(alert);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold shadow-md shadow-red-600/20 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>View on Map</span>
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsProfileModalOpen(true);
                          setFetchingProfile(true);
                          const { profile } = await getUserProfile(alert.citizenId);
                          setSelectedCitizenProfile(profile);
                          setFetchingProfile(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-[10px] font-bold transition-all cursor-pointer"
                      >
                        View Profile
                      </button>
                      
                      <div className="ml-auto flex gap-1">
                        {alert.status === "Active" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateSOSStatus(alert.id, "Acknowledged");
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-[10px] font-bold shadow-md shadow-yellow-600/20 transition-all cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}
                        
                        {alert.status === "Acknowledged" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateSOSStatus(alert.id, "Responding");
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                          >
                            Respond
                          </button>
                        )}

                        {(alert.status === "Active" || alert.status === "Acknowledged" || alert.status === "Responding") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateSOSStatus(alert.id, "Resolved");
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Right Column: Existing Map Reused */}
          <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 relative h-full min-h-[300px]">
            <SafetyMap
              sosAlerts={sosAlertsData.filter(a => a.status !== "Resolved")}
              selectedAlertId={selectedAlert?.id || null}
              onAlertMarkerClick={(alert) => setSelectedAlert(alert)}
              hideDetails={true}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderSOSHistorySection = () => {
    const resolvedList = sosAlertsData.filter(a => a.status === "Resolved");
    const filteredHistory = resolvedList.filter((alert) => {
      const q = historySearchQuery.toLowerCase().trim();
      if (!q) return true;
      const name = (alert.citizenName || "").toLowerCase();
      const id = (alert.id || "").toLowerCase();
      const phone = (alert.citizenPhone || "").toLowerCase();
      const address = (alert.citizenAddress || "").toLowerCase();
      const date = new Date(alert.createdAt || alert.timestamp).toLocaleDateString().toLowerCase();
      return name.includes(q) || id.includes(q) || phone.includes(q) || address.includes(q) || date.includes(q);
    });

    const totalResolved = resolvedList.length;
    const today = new Date().toDateString();
    const resolvedToday = resolvedList.filter(a => {
      const d = new Date(a.resolvedAt || a.createdAt || a.timestamp).toDateString();
      return d === today;
    }).length;
    const withNotes = resolvedList.filter(a => a.resolutionNote || a.resolutionNoteImmutable).length;

    return (
      <div className="space-y-6 relative z-10">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-ui-border shadow-md">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                Historical Archive
              </span>
              <span className="text-xs text-text-tertiary">• Permanent Record</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-text-primary mt-1 flex items-center gap-2">
              <History className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              <span>SOS Alert History</span>
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Review previously resolved emergency cases, responder logs, and permanent resolution statements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab("SOS")}
              className="px-4 py-2.5 rounded-xl glass-button-secondary text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>Live SOS Dispatch</span>
            </button>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Total Resolved Cases</p>
            <p className="text-3xl font-black text-text-primary mt-1">{totalResolved}</p>
            <p className="text-[11px] text-text-secondary mt-1">Safely concluded alerts</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-blue-500/20 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Resolved Today</p>
            <p className="text-3xl font-black text-text-primary mt-1">{resolvedToday}</p>
            <p className="text-[11px] text-text-secondary mt-1">Closed in past 24 hours</p>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-purple-500/20 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Notes Recorded</p>
            <p className="text-3xl font-black text-text-primary mt-1">{withNotes}</p>
            <p className="text-[11px] text-text-secondary mt-1">Permanent statements logged</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="glass-panel p-4 rounded-2xl border border-ui-border shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              placeholder="Search resolved history by citizen name, ID, phone, or date..."
              className="w-full pl-10 pr-4 py-2.5 glass-input text-xs font-medium text-text-primary placeholder:text-text-tertiary"
            />
            {historySearchQuery && (
              <button
                onClick={() => setHistorySearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="text-xs font-bold text-text-secondary shrink-0">
            Showing <span className="text-emerald-600 dark:text-emerald-400 font-mono">{filteredHistory.length}</span> of <span className="font-mono">{totalResolved}</span>
          </div>
        </div>

        {/* Table of Resolved Alerts */}
        <div className="glass-panel rounded-2xl border border-ui-border shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5 text-[11px] uppercase tracking-wider text-text-secondary border-b border-ui-border">
                  <th className="px-6 py-4 font-bold">Citizen & Contact</th>
                  <th className="px-6 py-4 font-bold">Case ID</th>
                  <th className="px-6 py-4 font-bold">Resolved Date</th>
                  <th className="px-6 py-4 font-bold">Location</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Resolution Note</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border text-xs">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-text-secondary">
                      <History className="w-10 h-10 mx-auto mb-3 opacity-30 text-emerald-600" />
                      <p className="font-bold text-sm text-text-primary">No Resolved Cases Found</p>
                      <p className="text-xs text-text-tertiary mt-1">
                        {historySearchQuery ? "No history matches your search filter." : "Resolved emergency SOS cases will be recorded here."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((alert) => {
                    const hasNote = !!(alert.resolutionNote || alert.resolutionNoteImmutable);
                    const alertDate = new Date(alert.resolvedAt || alert.createdAt || alert.timestamp);
                    const mapsUrl = alert.latitude && alert.longitude 
                      ? `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`
                      : null;

                    return (
                      <tr key={alert.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            {alert.citizenName || "Unknown Citizen"}
                          </div>
                          <div className="text-[11px] text-text-secondary mt-0.5">📞 {alert.citizenPhone || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          <span className="bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                            SOS-{alert.id.substring(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-text-secondary whitespace-nowrap">
                          <div className="font-semibold text-text-primary">{alertDate.toLocaleDateString()}</div>
                          <div className="text-[11px] text-text-tertiary">{alertDate.toLocaleTimeString()}</div>
                        </td>
                        <td className="px-6 py-4 max-w-[200px]">
                          {alert.citizenAddress && alert.citizenAddress !== "N/A" && (
                            <p className="text-text-secondary text-xs truncate">{alert.citizenAddress}</p>
                          )}
                          {mapsUrl && (
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>{alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40">
                            <CheckCircle2 className="w-3 h-3" />
                            Resolved
                          </span>
                        </td>
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
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasNote ? (
                              <button
                                onClick={() => {
                                  setSelectedAlertForNote(alert);
                                  setResolutionNoteInput(alert.resolutionNote || "");
                                  setIsNoteModalOpen(true);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 font-bold text-xs border border-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>View Note</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedAlertForNote(alert);
                                  setResolutionNoteInput("");
                                  setIsNoteModalOpen(true);
                                }}
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

                            {/* QR Code Generate Button */}
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
                              onClick={async () => {
                                setIsProfileModalOpen(true);
                                setFetchingProfile(true);
                                const { profile } = await getUserProfile(alert.citizenId);
                                setSelectedCitizenProfile(profile);
                                setFetchingProfile(false);
                              }}
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
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  const citizenCount = usersData.filter(u => u.role !== "police" && u.role !== "admin").length;
  const policeCount = usersData.filter(u => u.role === "police").length;
  const adminCount = usersData.filter(u => u.role === "admin").length;

  const policeOfficers = usersData.filter(u => u.role === "police");
  const activeCount = policeOfficers.filter(p => (p.serviceStatus || p.dutyStatus || "Active").toLowerCase().includes("active")).length;
  const stationsCount = new Set(policeOfficers.map(p => p.stationName).filter(Boolean)).size;
  const totalSolved = policeOfficers.reduce((acc, p) => acc + (Number(p.casesSolved) || 0), 0);

  const defaultOfficers = [
    { uid: "p1", name: "Inspector Ramesh Kumar", policeId: "POL-2026-9812", badgeNumber: "9812", rank: "Inspector", stationName: "Central Police Station", serviceStatus: "Active", casesSolved: 32, casesHandled: 35 },
    { uid: "p2", name: "SI Ananya Sen", policeId: "POL-2026-4421", badgeNumber: "4421", rank: "Sub-Inspector", stationName: "Cyber Crime Precinct", serviceStatus: "Active", casesSolved: 28, casesHandled: 30 },
    { uid: "p3", name: "Constable Vikram Rathore", policeId: "POL-2026-1109", badgeNumber: "1109", rank: "Constable", stationName: "Central Police Station", serviceStatus: "On Leave", casesSolved: 14, casesHandled: 16 },
    { uid: "p4", name: "SI David Gonsalves", policeId: "POL-2026-5778", badgeNumber: "5778", rank: "Sub-Inspector", stationName: "Metro Traffic Division", serviceStatus: "Active", casesSolved: 25, casesHandled: 28 },
    { uid: "p5", name: "Constable Sunita Deshmukh", policeId: "POL-2026-2341", badgeNumber: "2341", rank: "Constable", stationName: "West Precinct Station", serviceStatus: "Off Duty", casesSolved: 22, casesHandled: 24 }
  ];

  const displayOfficers = policeOfficers.length > 0 
    ? [...policeOfficers, ...defaultOfficers.slice(policeOfficers.length)].slice(0, 5)
    : defaultOfficers;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="min-h-screen bg-slate-50 dark:bg-[#040815] text-slate-900 dark:text-[#f1f5f9] flex transition-colors duration-300 font-sans w-full"
    >
      {/* MAIN CONTENT */}
      <main className="flex-1 p-8 md:p-12 min-h-screen relative overflow-hidden pb-32">
        {/* Top Branding Header */}
        <div className="max-w-6xl mx-auto relative z-10 mb-8 flex items-center justify-between bg-white/90 dark:bg-slate-900/30 p-4 rounded-2xl border border-slate-200 dark:border-white/5 backdrop-blur-sm shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-cyan-500/30 flex items-center justify-center bg-cyan-500/10 backdrop-blur-sm shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <span className="font-black text-lg tracking-wide text-slate-900 dark:text-slate-100 drop-shadow-sm uppercase block leading-tight">Precinct Command</span>
              <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">Admin Operations</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Sign Out Button in Header */}
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 text-red-500 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-red-400 transition-all rounded-xl cursor-pointer group shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:shadow-[0_0_25px_rgba(239,68,68,0.3)] shrink-0">
              <LogOut className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-xs tracking-wide font-bold hidden sm:block">Sign Out</span>
            </button>
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
        {/* Liquid Glass Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-30 dark:opacity-20">
          <motion.div
            animate={{
              x: [0, 40, -20, 0],
              y: [0, -30, 40, 0],
              scale: [1, 1.15, 0.9, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 blur-[100px]"
          />
          <motion.div
            animate={{
              x: [0, -50, 30, 0],
              y: [0, 50, -40, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute top-1/2 left-1/3 w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 blur-[110px]"
          />
          <motion.div
            animate={{
              x: [0, 20, -40, 0],
              y: [0, -50, 20, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -bottom-40 right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-emerald-400 to-teal-500 blur-[120px]"
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {activeTab === "Dashboard" ? (
            /* 4. Centered Main Page Header & 5. Red Animated SOS Indicator */
            <div className="flex flex-col items-center justify-center text-center border-b border-ui-border pb-8 mb-8 relative">
              {/* Red Animated SOS Beacon Indicator */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab("SOS")}
                className="mb-4 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-500 hover:bg-red-500/25 transition-all shadow-[0_0_20px_rgba(239,68,68,0.35)] cursor-pointer group"
              >
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"></span>
                </span>
                <span className="text-[11px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                  {sosAlertsData.filter((a: any) => a.status === "Active").length > 0
                    ? `🚨 SOS ALERT: ${sosAlertsData.filter((a: any) => a.status === "Active").length} ACTIVE EMERGENCY CASES`
                    : "🔴 LIVE SOS EMERGENCY GRID ACTIVE"}
                </span>
                <span className="text-[10px] font-bold text-red-400 group-hover:translate-x-0.5 transition-transform">→ View</span>
              </motion.button>

              {/* Centered Main Title */}
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="text-3xl md:text-4xl font-black tracking-tight text-text-primary flex items-center justify-center gap-3"
              >
                <Shield className="w-8 h-8 text-red-500" />
                <span>MANAGE OFFICER REGISTRY</span>
              </motion.h1>
              <p className="text-xs md:text-sm text-text-secondary mt-2 max-w-2xl">
                Precinct Command Administration, Real-Time Officer Dispatch Grid, and Rapid Case Resolution Operations
              </p>

              {/* Action Hub: 1. MANAGE OFFICER REGISTRY + 2. Red Animated SOS ALERT Button */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
                <button 
                  onClick={() => setActiveTab("Officers")} 
                  className="officer-registry-btn"
                  title="Open Officer Registry"
                >
                  <span>MANAGE OFFICER REGISTRY</span>
                </button>

                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setActiveTab("SOS")}
                  className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-black text-xs md:text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(239,68,68,0.55)] border-2 border-red-400/50 hover:shadow-[0_0_35px_rgba(239,68,68,0.8)] transition-all cursor-pointer relative overflow-hidden group"
                  title="Go to Live SOS Emergency Alert Grid"
                >
                  <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
                  <span>SOS ALERT ({sosAlertsData.filter((a: any) => a.status === "Active").length} ACTIVE)</span>
                </motion.button>
              </div>
            </div>
          ) : (
            <h1 className="text-2xl font-bold text-text-primary mb-6 flex items-center gap-2">
              {activeTab === "Officers" ? <Shield className="w-5 h-5 text-cyan-400" /> : null}
              {activeTab === "Police Stations" ? <Building2 className="w-5 h-5 text-cyan-400" /> : null}
              {activeTab === "Cases" ? <FileText className="w-5 h-5 text-cyan-400" /> : null}
              {activeTab === "Reports" ? <FileSpreadsheet className="w-5 h-5 text-cyan-400" /> : null}
              {activeTab === "SOS" ? <ShieldAlert className="w-5 h-5 text-red-500 animate-pulse" /> : null}
              {activeTab === "Backup" ? <Database className="w-5 h-5 text-emerald-400" /> : null}
              <span>{activeTab === "Users" ? "Citizen & Users Registry" : activeTab === "SOS" ? "Emergency SOS Alerts Grid" : activeTab === "Backup" ? "Database Backup & Recovery" : activeTab}</span>
            </h1>
          )}

          {activeTab === "Dashboard" ? (
            <div className="space-y-8 py-2">
              {/* 6. Redesigned 6 Circular Statistic Rings Section */}
              <div className="w-full">
                <PrecinctCircularStats
                  totalComplaints={stats.totalComplaints}
                  activeSOS={sosAlertsData.filter((a: any) => a.status === "Active").length}
                  totalOfficers={policeOfficers.length || policeCount}
                  totalUsers={citizenCount}
                  pendingCases={stats.pending}
                  resolvedCases={stats.resolved}
                  onSOSClick={() => setActiveTab("SOS")}
                  onOfficersClick={() => setActiveTab("Officers")}
                />
              </div>

              {/* Analytics Graph Row */}
              <div className="w-full">
                <AnalyticsChart 
                  totalOfficers={policeOfficers.length || 5} 
                  activeOfficers={activeCount || 5} 
                  solvedCases={totalSolved || 121} 
                  pendingCases={stats.pending || 3} 
                />
              </div>

              {/* Officer Table Row */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                      Officer Status Registry
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">Realtime activity sync and precinct assignments</p>
                  </div>
                </div>

                <div className="glass-panel overflow-hidden border border-ui-border bg-white dark:bg-slate-900/20 shadow-xl rounded-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-wider text-text-secondary border-b border-ui-border">
                          <th className="px-6 py-4 font-bold">Officer</th>
                          <th className="px-6 py-4 font-bold">Badge ID</th>
                          <th className="px-6 py-4 font-bold">Rank</th>
                          <th className="px-6 py-4 font-bold">Station</th>
                          <th className="px-6 py-4 font-bold">Status</th>
                          <th className="px-6 py-4 font-bold">Cases</th>
                          <th className="px-6 py-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ui-border text-sm text-text-primary">
                        {displayOfficers.map((officer, idx) => (
                          <tr 
                            key={officer.uid || idx} 
                            className="hover:bg-cyan-500/[0.04] transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center font-bold text-xs text-cyan-600 dark:text-cyan-400 shrink-0">
                                  {officer.name ? officer.name.charAt(0).toUpperCase() : "P"}
                                </div>
                                <span className="font-semibold text-text-primary group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                                  {officer.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-text-secondary">
                              {officer.policeId || officer.badgeNumber || "POL-2026-9812"}
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-text-primary">
                              {officer.rank || "Sub-Inspector"}
                            </td>
                            <td className="px-6 py-4 text-xs text-text-secondary">
                              {officer.stationName || "Central Station"}
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const stat = officer.serviceStatus || "Active";
                                const isLeave = stat.toLowerCase().includes("leave");
                                const isOff = stat.toLowerCase().includes("off") || stat.toLowerCase().includes("retired");
                                return (
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm ${
                                    isLeave 
                                      ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                      : isOff 
                                      ? "bg-slate-500/15 text-slate-700 dark:text-slate-400 border-slate-500/30"
                                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  }`}>
                                    {stat}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 text-xs font-mono">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{officer.casesSolved || 0}</span>
                              <span className="text-text-tertiary"> / {officer.casesHandled || 0}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={async () => {
                                    setIsPoliceProfileModalOpen(true);
                                    setFetchingProfile(true);
                                    const { profile } = await getUserProfile(officer.uid);
                                    setSelectedPoliceProfile({ ...officer, ...profile });
                                    setFetchingProfile(false);
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 rounded-lg transition-colors cursor-pointer"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => {
                                    setOfficerToUpdate({ ...officer });
                                    setIsUpdatePoliceModalOpen(true);
                                  }}
                                  className="p-1.5 bg-ui-bg hover:bg-black/5 dark:hover:bg-white/10 text-text-secondary rounded-lg border border-ui-border transition-colors cursor-pointer"
                                  title="Update Officer"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedOfficerForCredentials({ ...officer });
                                    setShowPasswordInModal(false);
                                    setIsPoliceIdModalOpen(true);
                                  }}
                                  className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/20 transition-colors cursor-pointer"
                                  title="Police ID"
                                >
                                  <Key className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "SOS History" || activeTab === "SOS Alert History" ? (
            renderSOSHistorySection()
          ) : activeTab === "Officers" || activeTab === "Police Officer Management" || activeTab === "Police Management" ? (
            renderPoliceManagementSection()
          ) : activeTab === "Police Stations" ? (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="glass-panel p-6 bg-white dark:bg-slate-900/40 border border-ui-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Kozhikode Rural</h4>
                  <p className="text-3xl font-black text-text-primary mt-1">Mukkom Police Station</p>
                </div>
                <div className="px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">OPEN 24 HOURS, 7 DAYS A WEEK</span>
                </div>
              </div>

              {/* Main Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Contact Info */}
                <div className="glass-panel p-5 bg-white dark:bg-slate-900/40 border border-ui-border space-y-4">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Emergency Contact</h4>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase font-bold">Mobile</p>
                      <a href="tel:9497947245" className="text-sm font-bold text-text-primary hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">9497947245</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase font-bold">Landline</p>
                      <a href="tel:04952297133" className="text-sm font-bold text-text-primary hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">0495-2297133</a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Radio className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase font-bold">VPN</p>
                      <p className="text-sm font-bold text-text-primary">15229</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-ui-border">
                    <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <div className="w-full">
                      <p className="text-[10px] text-text-tertiary uppercase font-bold">Official Email</p>
                      <a href="mailto:shomukkmkkdrl.pol@kerala.gov.in" className="text-xs font-bold text-text-primary hover:text-purple-600 dark:hover:text-purple-400 transition-colors block truncate" title="shomukkmkkdrl.pol@kerala.gov.in">shomukkmkkdrl.pol@kerala.gov.in</a>
                    </div>
                  </div>
                </div>

                {/* Location & Jurisdiction Metrics */}
                <div className="glass-panel p-5 bg-white dark:bg-slate-900/40 border border-ui-border space-y-4">
                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Location & Metrics</h4>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-1 shrink-0" />
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase font-bold">Address</p>
                      <p className="text-xs font-medium text-text-primary leading-relaxed mt-1">
                        Koyilandy - Edavanna Road, <br/>
                        Health Centre Road, Mukkom Post, <br/>
                        Kozhikode, Kerala - 673602
                      </p>
                      <a href="https://maps.google.com/?q=Mukkom+Police+Station+Kerala" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 mt-2 hover:underline uppercase">
                        View on Map <ChevronRight className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-4 border-t border-ui-border">
                    <Map className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1 flex justify-between items-center">
                      <p className="text-xs font-bold text-text-primary">Total Area</p>
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">89.63 sq km</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <div className="flex-1 flex justify-between items-center">
                      <p className="text-xs font-bold text-text-primary">Population</p>
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">102,312</p>
                    </div>
                  </div>
                </div>

                {/* Coverage Details */}
                <div className="glass-panel p-5 bg-white dark:bg-slate-900/40 border border-ui-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Territory Details</h4>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase font-bold">Municipality</p>
                      <p className="text-xs font-medium text-text-primary">Mukkom Municipality</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase font-bold">Grama Panchayaths</p>
                      <p className="text-xs font-medium text-text-primary">Karassery & Kodiyathoor</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary uppercase font-bold">Covered Villages</p>
                      <p className="text-[11px] font-medium text-text-primary leading-relaxed">Thazhekode, Neeleswaram, Kumaranelloor, Kakkad, Kodiyathor</p>
                    </div>
                    <div className="pt-2 border-t border-ui-border">
                      <p className="text-[10px] text-text-tertiary uppercase font-bold">Bordering Districts</p>
                      <p className="text-[11px] font-medium text-text-primary">Malappuram & Kozhikode City</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : activeTab === "Cases" ? (
            <div className="space-y-6">
              {/* Search + Tab strip */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950/20 border border-ui-border rounded-xl">
                  {["All Cases", "FIR Only", "CSR Only"].map((tabLabel, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (idx === 0) setActiveTab("Cases");
                        else if (idx === 1) setActiveTab("FIR");
                        else setActiveTab("CSR");
                      }}
                      className={`flex-1 py-1.5 px-3 text-[11px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        activeTab === "Cases" && idx === 0
                          ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-white/10 shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {tabLabel}
                    </button>
                  ))}
                </div>
                {/* Search bar */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by title, ID, citizen, status..."
                    value={caseSearchQuery}
                    onChange={e => setCaseSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-ui-border bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all"
                  />
                  {caseSearchQuery && (
                    <button
                      onClick={() => setCaseSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {renderComplaintsTable(null)}
            </div>
          ) : activeTab === "FIR" ? (
            <div className="space-y-6">
              {/* Search + Tab strip */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950/20 border border-ui-border rounded-xl">
                  {["All Cases", "FIR Only", "CSR Only"].map((tabLabel, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (idx === 0) setActiveTab("Cases");
                        else if (idx === 1) setActiveTab("FIR");
                        else setActiveTab("CSR");
                      }}
                      className={`flex-1 py-1.5 px-3 text-[11px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        activeTab === "FIR" && idx === 1
                          ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-white/10 shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {tabLabel}
                    </button>
                  ))}
                </div>
                {/* Search bar */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search FIR by title, ID, citizen, status..."
                    value={caseSearchQuery}
                    onChange={e => setCaseSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-ui-border bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-red-500/40 transition-all"
                  />
                  {caseSearchQuery && (
                    <button
                      onClick={() => setCaseSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {renderComplaintsTable("FIR")}
            </div>
          ) : activeTab === "CSR" ? (
            <div className="space-y-6">
              {/* Search + Tab strip */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-950/20 border border-ui-border rounded-xl">
                  {["All Cases", "FIR Only", "CSR Only"].map((tabLabel, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (idx === 0) setActiveTab("Cases");
                        else if (idx === 1) setActiveTab("FIR");
                        else setActiveTab("CSR");
                      }}
                      className={`flex-1 py-1.5 px-3 text-[11px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                        activeTab === "CSR" && idx === 2
                          ? "bg-white dark:bg-white/10 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-white/10 shadow-sm"
                          : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {tabLabel}
                    </button>
                  ))}
                </div>
                {/* Search bar */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search CSR by title, ID, citizen, status..."
                    value={caseSearchQuery}
                    onChange={e => setCaseSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-xs rounded-xl border border-ui-border bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
                  />
                  {caseSearchQuery && (
                    <button
                      onClick={() => setCaseSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {renderComplaintsTable("CSR")}
            </div>
          ) : activeTab === "Reports" ? (
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-slate-900/40 border border-ui-border rounded-2xl flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-text-primary">Precinct Record Registry Export</h4>
                  <p className="text-xs text-text-secondary mt-1">Download CSV logs or print lists of registered systems users.</p>
                </div>
              </div>
              {renderUsersTable()}
            </div>
          ) : activeTab === "SOS" ? (
            renderSOSAlertsSection()
          ) : activeTab === "Backup" || activeTab === "Database Backup" ? (
            renderBackupSection()
          ) : null}
        </div>
      </main>

      {/* COMPLAINT DETAILS MODAL */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity">
          <div className="glass-panel w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/20 bg-black/5 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl backdrop-blur-sm ${
                  selectedComplaint.type === "FIR" || !selectedComplaint.type 
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" 
                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                }`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary leading-tight drop-shadow-sm">
                    {selectedComplaint.type || "FIR"} Details
                  </h2>
                  <p className="text-xs text-text-secondary font-mono">
                    ID: {formatCaseId(selectedComplaint)}
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

            {/* Modal Body */}
            <div className="p-0 overflow-y-auto flex-1 bg-white/10 dark:bg-black/10 flex flex-col lg:flex-row">
              
              {/* Left Column: Complaint Details */}
              <div className="flex-1 p-6 lg:border-r border-white/20 space-y-6">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  Incident Information
                </h3>
                
                {/* Status & Date */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[150px] bg-ui-bg p-4 rounded-xl border border-ui-border backdrop-blur-sm">
                    <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Status</span>
                    <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase border backdrop-blur-sm ${
                      selectedComplaint.status === "Pending" || selectedComplaint.status === "Submitted" ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" :
                      selectedComplaint.status === "Investigating" || selectedComplaint.status === "Under Review" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" :
                      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    }`}>
                      {selectedComplaint.status}
                    </span>
                  </div>
                  <div className="flex-1 min-w-[150px] bg-ui-bg p-4 rounded-xl border border-ui-border backdrop-blur-sm">
                    <span className="block text-[10px] uppercase font-bold text-text-secondary mb-1">Filed Date</span>
                    <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                      <Clock className="w-4 h-4 text-text-tertiary" />
                      {new Date(selectedComplaint.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Citizen & Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-ui-bg p-4 rounded-xl border border-ui-border backdrop-blur-sm">
                    <span className="block text-[10px] uppercase font-bold text-text-secondary mb-2">Citizen Name</span>
                    <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                      <User className="w-4 h-4 text-text-tertiary" />
                      <span>{selectedComplaint.citizenName || "Name Not Available"}</span>
                    </div>
                  </div>
                  <div className="bg-ui-bg p-4 rounded-xl border border-ui-border backdrop-blur-sm">
                    <span className="block text-[10px] uppercase font-bold text-text-secondary mb-2">Location</span>
                    <div className="flex items-start gap-2 text-sm font-medium text-text-primary">
                      <MapPin className="w-4 h-4 text-text-tertiary mt-0.5 shrink-0" />
                      <span>{selectedComplaint.location}</span>
                    </div>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h4 className="text-base font-bold text-text-primary mb-2">{selectedComplaint.title}</h4>
                  <div className="bg-ui-bg p-4 rounded-xl border border-ui-border backdrop-blur-sm">
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </p>
                  </div>
                </div>

                {/* Case Evidence & Attachments (Local Storage & Video Streaming) */}
                <EvidenceGallery complaint={selectedComplaint} />

                {/* Assignment Section */}
                <div id="assignment-section" className="mt-8 pt-6 border-t border-ui-border">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                    Case Assignment
                  </h3>
                  
                  {(() => {
                    const isModalCaseApproved = selectedComplaint.status === "Approved" || selectedComplaint.status === "Investigating" || selectedComplaint.status === "Under Review" || selectedComplaint.status === "Resolved";
                    const isModalCaseRejected = selectedComplaint.status === "Rejected";

                    if (isModalCaseRejected) {
                      return (
                        <div className="bg-red-500/10 border border-red-500/20 backdrop-blur-sm p-4 rounded-xl flex items-center gap-3">
                          <Lock className="w-5 h-5 text-red-500 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Case Assignment Locked</p>
                            <p className="text-xs text-red-700/80 dark:text-red-300/80">This case has been Rejected and cannot be assigned to an investigating officer.</p>
                          </div>
                        </div>
                      );
                    }

                    if (!isModalCaseApproved) {
                      return (
                        <div className="bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">Approval Required</p>
                              <p className="text-xs text-amber-700/80 dark:text-amber-300/80">This case must be approved before assigning an investigating officer.</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleApproveCase(selectedComplaint)}
                            className="flex items-center justify-center gap-1.5 text-xs text-white font-bold bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 rounded-lg transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approve Case Now
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="bg-white/20 dark:bg-black/10 backdrop-blur-sm p-4 rounded-xl border border-ui-border">
                        {selectedComplaint.assignedOfficerId ? (
                          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3 backdrop-blur-md">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            <div>
                              <p className="text-xs text-emerald-700 dark:text-emerald-300 font-bold uppercase">Assigned To</p>
                              <p className="text-sm text-emerald-800 dark:text-emerald-200">{selectedComplaint.assignedOfficerName || "Unknown Officer"}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="mb-4">
                            <span className="inline-block px-2 py-1 bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 text-xs font-bold rounded uppercase mb-2 backdrop-blur-sm">Unassigned</span>
                            <p className="text-xs text-text-secondary">This approved case needs an investigating officer.</p>
                          </div>
                        )}
                        
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-2">Assign to Officer</label>
                            <select 
                              value={selectedOfficer} 
                              onChange={(e) => setSelectedOfficer(e.target.value)}
                              className="w-full glass-input p-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 [&>option]:bg-white dark:[&>option]:bg-slate-900"
                            >
                              <option value="">-- Select Police Officer --</option>
                              {usersData.filter(u => u.role === "police").map(officer => (
                                <option key={officer.uid} value={officer.uid}>
                                  {officer.name} - {officer.stationName || "No Station Assigned"}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button 
                            onClick={handleAssignOfficer}
                            disabled={!selectedOfficer || assigningLoading}
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-all shadow-sm disabled:opacity-50 flex items-center gap-2"
                          >
                            {assigningLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Right Column: Dynamic Tabs (KYC or Timeline) */}
              <div className="flex-1 p-6 lg:max-w-[450px] flex flex-col bg-black/5 dark:bg-white/5 relative">
                
                {/* Tabs Header */}
                <div className="flex gap-2 p-1 bg-ui-bg backdrop-blur-md rounded-xl mb-6 border border-ui-border">
                  <button 
                    onClick={() => setActiveModalTab("kyc")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${activeModalTab === "kyc" ? "bg-white/60 dark:bg-black/40 text-emerald-600 dark:text-emerald-400 shadow-sm border border-white/20" : "text-text-secondary hover:text-text-primary"}`}
                  >
                    <User className="w-3.5 h-3.5" /> Complainant KYC
                  </button>
                  <button 
                    onClick={() => setActiveModalTab("timeline")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 ${activeModalTab === "timeline" ? "bg-white/60 dark:bg-black/40 text-blue-600 dark:text-blue-400 shadow-sm border border-white/20" : "text-text-secondary hover:text-text-primary"}`}
                  >
                    <Clock className="w-3.5 h-3.5" /> Case Timeline
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1">
                  {activeModalTab === "kyc" ? (
                    <>
                      {fetchingProfile ? (
                        <div className="glass-panel p-8 flex flex-col items-center justify-center shadow-sm h-64">
                          <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                          <p className="text-xs text-slate-500">Loading comprehensive citizen data...</p>
                        </div>
                      ) : selectedCitizenProfile ? (
                        <div className="glass-panel overflow-hidden shadow-sm">
                          
                          {/* Avatar Header */}
                          <div className="p-6 border-b border-ui-border flex items-center gap-4 bg-emerald-500/10 backdrop-blur-md">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-2xl overflow-hidden shrink-0">
                              {selectedCitizenProfile.photographUrl ? (
                                <img src={selectedCitizenProfile.photographUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                selectedCitizenProfile.name?.charAt(0) || "C"
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-lg font-bold text-text-primary truncate drop-shadow-sm">{selectedCitizenProfile.name || "Unknown Citizen"}</h4>
                              <p className="text-xs text-text-secondary truncate">{selectedCitizenProfile.email}</p>
                              {selectedCitizenProfile.mobileNumber && (
                                 <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                   <Phone className="w-3 h-3" /> {selectedCitizenProfile.mobileNumber}
                                 </p>
                              )}
                            </div>
                          </div>

                          {/* KYC Details Grid */}
                          <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-5 text-sm border-b border-ui-border">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Date of Birth</p>
                              <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.dob || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Gender</p>
                              <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.gender || "-"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Blood Group</p>
                              {selectedCitizenProfile.bloodGroup ? (
                                <span className="inline-block px-1.5 py-0.5 bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/20 rounded text-[10px] font-bold backdrop-blur-sm">
                                  {selectedCitizenProfile.bloodGroup}
                                </span>
                              ) : "-"}
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Nationality</p>
                              <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.nationality || "-"}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Guardian Name (Father/Mother/Spouse)</p>
                              <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.guardianName || "-"}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Occupation</p>
                              <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.occupation || "-"}</p>
                            </div>
                          </div>

                          {/* Address Details */}
                          <div className="p-5 space-y-4 border-b border-ui-border bg-ui-bg backdrop-blur-md">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5 flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Residential Address
                              </p>
                              <p className="text-xs text-text-primary font-medium">
                                {selectedCitizenProfile.residentialAddress || <span className="text-slate-500 italic">Not provided</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5 flex items-center gap-1">
                                <Map className="w-3 h-3" /> Permanent Address
                              </p>
                              <p className="text-xs text-text-primary font-medium">
                                {selectedCitizenProfile.permanentAddress || <span className="text-slate-500 italic">Not provided</span>}
                              </p>
                            </div>
                          </div>

                          {/* ID Proof & Emergency */}
                          <div className="p-5 space-y-4 border-b border-ui-border">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-1 flex items-center gap-1">
                                <Fingerprint className="w-3 h-3" /> Identity Proof
                              </p>
                              {selectedCitizenProfile.idProofType ? (
                                <div className="bg-ui-bg rounded border border-ui-border p-2 flex justify-between items-center backdrop-blur-sm">
                                  <span className="text-xs font-bold text-text-primary">{selectedCitizenProfile.idProofType}</span>
                                  <span className="text-xs font-mono text-text-secondary">{selectedCitizenProfile.idProofNumber || "-"}</span>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 italic">No ID proof registered</p>
                              )}
                            </div>

                            <div>
                              <p className="text-[10px] uppercase font-bold text-text-secondary mb-1 flex items-center gap-1">
                                <HeartPulse className="w-3 h-3" /> Emergency Contact
                              </p>
                              <div className="text-xs">
                                <p className="text-text-primary font-medium">{selectedCitizenProfile.emergencyContactName || "-"}</p>
                                <p className="text-text-secondary font-mono mt-0.5">{selectedCitizenProfile.emergencyContactPhone || "-"}</p>
                              </div>
                            </div>
                          </div>

                          {/* Signature */}
                          <div className="p-5 bg-ui-bg backdrop-blur-md text-center">
                            <p className="text-[10px] uppercase font-bold text-text-secondary mb-2">Digital Signature / Thumb Impression</p>
                            {selectedCitizenProfile.signatureUrl ? (
                              <div className="h-16 w-full max-w-[200px] mx-auto rounded border border-ui-border bg-white/80 dark:bg-white/10 flex items-center justify-center p-1 backdrop-blur-sm">
                                <img src={selectedCitizenProfile.signatureUrl} alt="Signature" className="h-full object-contain mix-blend-multiply dark:mix-blend-normal dark:invert" />
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic">No signature recorded</p>
                            )}
                          </div>
                          
                        </div>
                      ) : (
                        <div className="glass-panel p-8 text-center shadow-sm h-64 flex flex-col items-center justify-center">
                          <Search className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
                          <p className="text-sm text-text-secondary">Citizen details could not be loaded.</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Timeline View */}
                      {fetchingLogs ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                          <p className="text-xs text-slate-500">Retrieving case updates...</p>
                        </div>
                      ) : caseLogs.length === 0 ? (
                        <div className="text-center text-text-tertiary text-sm mt-10">
                          <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
                          <p>No timeline updates yet.</p>
                          <p className="text-xs mt-1">Updates will appear here once an officer begins investigation.</p>
                        </div>
                      ) : (
                        <div className="relative border-l-2 border-blue-500/30 ml-4 space-y-6 pb-4">
                          {caseLogs.map((log) => (
                            <div key={log.id} className="relative pl-6">
                              <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-4 border-white/50 dark:border-black/50 shadow-sm"></div>
                              
                              <div className="bg-ui-bg backdrop-blur-md p-4 rounded-xl shadow-sm border border-ui-border">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    {log.authorName} ({log.authorRole})
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
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CITIZEN PROFILE MODAL */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity">
          <div className="glass-panel w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between p-6 border-b border-white/20 bg-black/5 dark:bg-white/5">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-500" />
                Citizen Profile
              </h2>
              <button 
                onClick={() => {
                  setIsProfileModalOpen(false);
                  if (!selectedComplaint) setSelectedCitizenProfile(null);
                }} 
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-ui-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 overflow-y-auto flex-1 bg-black/5 dark:bg-white/5">
               {fetchingProfile ? (
                 <div className="p-8 flex flex-col items-center justify-center h-64">
                   <Loader2 className="w-6 h-6 animate-spin text-emerald-500 mb-2" />
                   <p className="text-xs text-slate-500">Loading citizen profile...</p>
                 </div>
               ) : selectedCitizenProfile ? (
                 <div className="pb-8">
                   <div className="p-6 border-b border-ui-border flex items-center gap-4 bg-emerald-500/10 backdrop-blur-md">
                     <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-2xl overflow-hidden shrink-0">
                       {selectedCitizenProfile.photographUrl ? (
                         <img src={selectedCitizenProfile.photographUrl} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                         selectedCitizenProfile.name?.charAt(0) || "C"
                       )}
                     </div>
                     <div className="min-w-0">
                       <h4 className="text-lg font-bold text-text-primary truncate drop-shadow-sm">{selectedCitizenProfile.name || "Unknown Citizen"}</h4>
                       <p className="text-xs text-text-secondary truncate">{selectedCitizenProfile.email}</p>
                       {selectedCitizenProfile.mobileNumber && (
                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {selectedCitizenProfile.mobileNumber}
                          </p>
                       )}
                     </div>
                   </div>
                   
                   <div className="p-5 grid grid-cols-2 gap-x-4 gap-y-5 text-sm border-b border-ui-border">
                     <div>
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Date of Birth</p>
                       <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.dob || "-"}</p>
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Gender</p>
                       <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.gender || "-"}</p>
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Blood Group</p>
                       {selectedCitizenProfile.bloodGroup ? (
                         <span className="inline-block px-1.5 py-0.5 bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/20 rounded text-[10px] font-bold backdrop-blur-sm">
                           {selectedCitizenProfile.bloodGroup}
                         </span>
                       ) : "-"}
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Nationality</p>
                       <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.nationality || "-"}</p>
                     </div>
                     <div className="col-span-2">
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Guardian Name</p>
                       <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.guardianName || "-"}</p>
                     </div>
                     <div className="col-span-2">
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5">Occupation</p>
                       <p className="text-text-primary font-medium truncate">{selectedCitizenProfile.occupation || "-"}</p>
                     </div>
                   </div>

                   <div className="p-5 space-y-4 border-b border-ui-border bg-ui-bg backdrop-blur-md">
                     <div>
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5 flex items-center gap-1">
                         <MapPin className="w-3 h-3" /> Residential Address
                       </p>
                       <p className="text-xs text-text-primary font-medium">
                         {selectedCitizenProfile.residentialAddress || <span className="text-slate-500 italic">Not provided</span>}
                       </p>
                     </div>
                     <div>
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-0.5 flex items-center gap-1">
                         <Map className="w-3 h-3" /> Permanent Address
                       </p>
                       <p className="text-xs text-text-primary font-medium">
                         {selectedCitizenProfile.permanentAddress || <span className="text-slate-500 italic">Not provided</span>}
                       </p>
                     </div>
                   </div>

                   <div className="p-5 space-y-4 border-b border-ui-border">
                     <div>
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-1 flex items-center gap-1">
                         <Fingerprint className="w-3 h-3" /> Identity Proof
                       </p>
                       {selectedCitizenProfile.idProofType ? (
                         <div className="bg-ui-bg rounded border border-ui-border p-2 flex justify-between items-center backdrop-blur-sm">
                           <span className="text-xs font-bold text-text-primary">{selectedCitizenProfile.idProofType}</span>
                           <span className="text-xs font-mono text-text-secondary">{selectedCitizenProfile.idProofNumber || "-"}</span>
                         </div>
                       ) : (
                         <p className="text-xs text-slate-500 italic">No ID proof registered</p>
                       )}
                     </div>

                     <div>
                       <p className="text-[10px] uppercase font-bold text-text-secondary mb-1 flex items-center gap-1">
                         <HeartPulse className="w-3 h-3" /> Emergency Contact
                       </p>
                       <div className="text-xs">
                         <p className="text-text-primary font-medium">{selectedCitizenProfile.emergencyContactName || "-"}</p>
                         <p className="text-text-secondary font-mono mt-0.5">{selectedCitizenProfile.emergencyContactPhone || "-"}</p>
                       </div>
                     </div>
                   </div>
                 </div>
               ) : (
                 <div className="p-8 text-center flex flex-col items-center justify-center h-64">
                   <Search className="w-8 h-8 text-slate-400 mb-2 opacity-50" />
                   <p className="text-sm text-text-secondary">Citizen profile not found.</p>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* POLICE OFFICER PROFILE MODAL */}
      {isPoliceProfileModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity">
          <div className="glass-panel w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl relative border border-purple-500/20">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/20 bg-black/10 dark:bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg border border-purple-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-text-primary uppercase tracking-widest drop-shadow-sm">
                  Police Officer Profile
                </h2>
              </div>
              <button 
                onClick={() => {
                  setIsPoliceProfileModalOpen(false);
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
                   <p className="text-sm text-text-secondary">Loading officer records...</p>
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
                  <p className="text-sm text-text-secondary">Officer data not found.</p>
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
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-bold transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20 rounded-lg text-xs font-bold transition-colors">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ADD POLICE OFFICER MODAL (ALL 23 FIELDS) */}
      {/* ========================================================================= */}
      {isAddPoliceModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel w-full max-w-4xl my-8 overflow-hidden flex flex-col shadow-2xl border border-emerald-500/30 rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-emerald-500/10 dark:bg-emerald-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/30">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Add New Police Officer</h2>
                  <p className="text-xs text-text-secondary">Enroll officer with automatic login credential generation</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddPoliceModalOpen(false)}
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-ui-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePoliceOfficer} className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
              
              {/* SECTION 1: OFFICER BASIC INFORMATION */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2 border-b border-white/10 pb-2">
                  <User className="w-4 h-4" /> Officer Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Inspector Ramesh Kumar"
                      value={newPolice.name}
                      onChange={(e) => setNewPolice({ ...newPolice, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Badge Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5119"
                      value={newPolice.badgeNumber}
                      onChange={(e) => setNewPolice({ ...newPolice, badgeNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="officer@police.gov.in"
                      value={newPolice.email}
                      onChange={(e) => setNewPolice({ ...newPolice, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 9876543210"
                      value={newPolice.phone}
                      onChange={(e) => setNewPolice({ ...newPolice, phone: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={newPolice.dob}
                      onChange={(e) => setNewPolice({ ...newPolice, dob: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-emerald-500 [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Current Service Status</label>
                    <select
                      value={newPolice.serviceStatus}
                      onChange={(e) => setNewPolice({ ...newPolice, serviceStatus: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: SERVICE & RANK DETAILS */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Shield className="w-4 h-4" /> Designation & Posting Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Rank / Designation *</label>
                    <select
                      value={newPolice.rank}
                      onChange={(e) => setNewPolice({ ...newPolice, rank: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary font-semibold focus:outline-none focus:border-purple-500"
                    >
                      <option value="Constable">Constable</option>
                      <option value="Head Constable">Head Constable</option>
                      <option value="Sub-Inspector">Sub-Inspector (SI)</option>
                      <option value="Inspector">Inspector</option>
                      <option value="ACP">Assistant Commissioner of Police (ACP)</option>
                      <option value="DCP">Deputy Commissioner of Police (DCP)</option>
                      <option value="DSP">Deputy Superintendent of Police (DSP)</option>
                      <option value="SP">Superintendent of Police (SP)</option>
                      <option value="Other">Other Rank</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Police Station / Department *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Central Police Station, Cyber Crime Cell"
                      value={newPolice.stationName}
                      onChange={(e) => setNewPolice({ ...newPolice, stationName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Current Posting Location</label>
                    <input
                      type="text"
                      placeholder="e.g. North Zone, Sector 4"
                      value={newPolice.postingLocation}
                      onChange={(e) => setNewPolice({ ...newPolice, postingLocation: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={newPolice.doj}
                      onChange={(e) => {
                        const calculated = calculateYearsOfService(e.target.value);
                        setNewPolice({ ...newPolice, doj: e.target.value, yearsOfService: calculated });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-purple-500 [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Years of Service (Auto)</label>
                    <input
                      type="number"
                      min="0"
                      disabled
                      value={newPolice.yearsOfService}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg/50 border border-ui-border text-text-tertiary focus:outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Previous Service Experience</label>
                    <input
                      type="text"
                      placeholder="e.g. Special Task Force, Patrol Division"
                      value={newPolice.previousExperience}
                      onChange={(e) => setNewPolice({ ...newPolice, previousExperience: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PERFORMANCE, SKILLS & EDUCATION */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b border-white/10 pb-2">
                  <Award className="w-4 h-4" /> Performance & Qualifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Cases Handled</label>
                    <input
                      type="number"
                      min="0"
                      value={newPolice.casesHandled}
                      onChange={(e) => setNewPolice({ ...newPolice, casesHandled: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Cases Successfully Solved</label>
                    <input
                      type="number"
                      min="0"
                      value={newPolice.casesSolved}
                      onChange={(e) => setNewPolice({ ...newPolice, casesSolved: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Medals / Awards Received</label>
                    <input
                      type="number"
                      min="0"
                      value={newPolice.medalsAwards}
                      onChange={(e) => setNewPolice({ ...newPolice, medalsAwards: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Training / Special Skills</label>
                    <input
                      type="text"
                      placeholder="e.g. Cyber Forensics, Bomb Disposal, Tactical Driving"
                      value={newPolice.specialSkills}
                      onChange={(e) => setNewPolice({ ...newPolice, specialSkills: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Education Qualification</label>
                    <input
                      type="text"
                      placeholder="e.g. B.A. Criminology, M.Sc Cyber Security"
                      value={newPolice.education}
                      onChange={(e) => setNewPolice({ ...newPolice, education: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Commendations</label>
                    <input
                      type="text"
                      placeholder="e.g. DGP Commendation Disc 2024"
                      value={newPolice.commendations}
                      onChange={(e) => setNewPolice({ ...newPolice, commendations: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: PERSONAL & HISTORY */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2 border-b border-white/10 pb-2">
                  <User className="w-4 h-4" /> Personal Info & Service History
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Gender</label>
                    <select
                      value={newPolice.gender}
                      onChange={(e) => setNewPolice({ ...newPolice, gender: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-amber-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Blood Group</label>
                    <select
                      value={newPolice.bloodGroup}
                      onChange={(e) => setNewPolice({ ...newPolice, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-amber-500"
                    >
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      placeholder="Contact Name & Phone"
                      value={newPolice.emergencyContact}
                      onChange={(e) => setNewPolice({ ...newPolice, emergencyContact: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Promotion History</label>
                    <input
                      type="text"
                      placeholder="e.g. Constable 2018 -> HC 2021 -> SI 2024"
                      value={newPolice.promotionHistory}
                      onChange={(e) => setNewPolice({ ...newPolice, promotionHistory: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Transfer History</label>
                    <input
                      type="text"
                      placeholder="e.g. South Precinct (2020-2023)"
                      value={newPolice.transferHistory}
                      onChange={(e) => setNewPolice({ ...newPolice, transferHistory: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddPoliceModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary bg-ui-bg rounded-xl border border-ui-border transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPolice}
                  className="relative px-6 py-2.5 text-sm font-bold rounded-xl border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 min-w-[180px] justify-center"
                >
                  {submittingPolice ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating Officer...
                    </>
                  ) : (
                    <>✦ Create Police Officer</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ASSIGN AS POLICE MODAL */}
      {/* ========================================================================= */}
      {isAssignPoliceModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel w-full max-w-3xl my-8 overflow-hidden flex flex-col shadow-2xl border border-purple-500/30 rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-purple-500/10 dark:bg-purple-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Assign Existing User as Police Officer</h2>
                  <p className="text-xs text-text-secondary">Select an eligible registered person and configure their law enforcement profile</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAssignPoliceModalOpen(false)}
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-ui-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssignUserAsPolice} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Step 1: Select User */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Step 1: Select Person from Registry
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter by name, email, or UID..."
                    value={assignSearchQuery}
                    onChange={(e) => setAssignSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-black/5 dark:bg-white/5 rounded-xl border border-ui-border">
                  {usersData
                    .filter(u => u.role === "police" && (
                      !assignSearchQuery.trim() ||
                      (u.name && u.name.toLowerCase().includes(assignSearchQuery.toLowerCase())) ||
                      (u.email && u.email.toLowerCase().includes(assignSearchQuery.toLowerCase())) ||
                      (u.uid && u.uid.toLowerCase().includes(assignSearchQuery.toLowerCase()))
                    ))
                    .map(u => (
                      <div
                        key={u.uid}
                        onClick={() => setSelectedUserToAssign(u)}
                        className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                          selectedUserToAssign?.uid === u.uid
                            ? "bg-purple-500/20 border border-purple-500 text-purple-600 dark:text-purple-300 font-bold"
                            : "hover:bg-black/5 dark:hover:bg-white/5 text-text-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <User className="w-4 h-4 text-purple-500 shrink-0" />
                          <div className="text-xs truncate">
                            <span className="font-semibold text-text-primary">{u.name || "Unknown User"}</span>
                            <span className="ml-2 font-mono text-[11px] opacity-70">({u.email})</span>
                          </div>
                        </div>
                        {selectedUserToAssign?.uid === u.uid && (
                          <Check className="w-4 h-4 text-purple-500 shrink-0" />
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Step 2: Complete Police Details */}
              {selectedUserToAssign && (
                <div className="space-y-4 pt-2 border-t border-white/10">
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    Step 2: Assign Officer ID, Rank & Posting
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Police ID / Employee ID</label>
                      <input
                        type="text"
                        required
                        placeholder="POL-2026-XXXX"
                        value={newPolice.policeId}
                        onChange={(e) => setNewPolice({ ...newPolice, policeId: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-purple-600 dark:text-purple-400 font-mono font-bold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Rank / Designation</label>
                      <select
                        value={newPolice.rank}
                        onChange={(e) => setNewPolice({ ...newPolice, rank: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary font-semibold focus:outline-none"
                      >
                        <option value="Constable">Constable</option>
                        <option value="Head Constable">Head Constable</option>
                        <option value="Sub-Inspector">Sub-Inspector (SI)</option>
                        <option value="Inspector">Inspector</option>
                        <option value="ACP">ACP</option>
                        <option value="DCP">DCP</option>
                        <option value="DSP">DSP</option>
                        <option value="SP">SP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Police Station / Dept</label>
                      <input
                        type="text"
                        required
                        placeholder="Central Police Station"
                        value={newPolice.stationName}
                        onChange={(e) => setNewPolice({ ...newPolice, stationName: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Posting Location</label>
                      <input
                        type="text"
                        placeholder="Sector / Zone"
                        value={newPolice.postingLocation}
                        onChange={(e) => setNewPolice({ ...newPolice, postingLocation: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Service Status</label>
                      <select
                        value={newPolice.serviceStatus}
                        onChange={(e) => setNewPolice({ ...newPolice, serviceStatus: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none"
                      >
                        <option value="Active">Active Duty</option>
                        <option value="On Leave">On Leave</option>
                        <option value="Retired">Retired</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Temporary Password</label>
                      <input
                        type="text"
                        value={newPolice.password}
                        onChange={(e) => setNewPolice({ ...newPolice, password: e.target.value })}
                        placeholder="Police@2026!"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignPoliceModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-secondary bg-ui-bg rounded-xl border border-ui-border"
                >
                  Cancel
                </button>
                <AnimatedSubmitButton
                  text="Confirm Police Assignment"
                  type="submit"
                  disabled={!selectedUserToAssign || submittingPolice}
                  width={240}
                  height={42}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. UPDATE POLICE OFFICER MODAL (FULL EDITING) */}
      {/* ========================================================================= */}
      {isUpdatePoliceModalOpen && officerToUpdate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="glass-panel w-full max-w-4xl my-8 overflow-hidden flex flex-col shadow-2xl border border-blue-500/30 rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-blue-500/10 dark:bg-blue-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-500/30">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text-primary">Update Police Officer Profile</h2>
                  <p className="text-xs text-text-secondary">Modify rank, posting, cases solved, history and service records</p>
                </div>
              </div>
              <button 
                onClick={() => setIsUpdatePoliceModalOpen(false)}
                className="p-2 text-text-tertiary hover:text-text-primary hover:bg-ui-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePoliceUpdate} className="p-6 overflow-y-auto max-h-[80vh] space-y-6">
              
              {/* Select Officer Dropdown (if user wants to switch) */}
              <div>
                <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Select Officer to Edit</label>
                <select
                  value={officerToUpdate.uid}
                  onChange={(e) => {
                    const found = usersData.find(u => u.uid === e.target.value);
                    if (found) setOfficerToUpdate({ ...found });
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary font-bold focus:outline-none"
                >
                  {usersData.filter(u => u.role === "police").map(o => (
                    <option key={o.uid} value={o.uid}>
                      {o.policeId || o.badgeNumber || "POL"} - {o.name} ({o.rank || "Officer"} @ {o.stationName || "Station"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Police ID / Employee ID</label>
                  <input
                    type="text"
                    value={officerToUpdate.policeId || officerToUpdate.badgeNumber || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, policeId: e.target.value, badgeNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border font-mono text-purple-600 dark:text-purple-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    value={officerToUpdate.name || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Rank / Designation</label>
                  <select
                    value={officerToUpdate.rank || "Sub-Inspector"}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, rank: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary font-semibold"
                  >
                    <option value="Constable">Constable</option>
                    <option value="Head Constable">Head Constable</option>
                    <option value="Sub-Inspector">Sub-Inspector (SI)</option>
                    <option value="Inspector">Inspector</option>
                    <option value="ACP">ACP</option>
                    <option value="DCP">DCP</option>
                    <option value="DSP">DSP</option>
                    <option value="SP">SP</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Police Station / Dept</label>
                  <input
                    type="text"
                    value={officerToUpdate.stationName || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, stationName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Current Posting Location</label>
                  <input
                    type="text"
                    value={officerToUpdate.postingLocation || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, postingLocation: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Current Service Status</label>
                  <select
                    value={officerToUpdate.serviceStatus || officerToUpdate.dutyStatus || "Active"}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, serviceStatus: e.target.value, dutyStatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary font-semibold"
                  >
                    <option value="Active">Active Duty</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={officerToUpdate.phone || officerToUpdate.mobileNumber || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, phone: e.target.value, mobileNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Cases Handled</label>
                  <input
                    type="number"
                    value={officerToUpdate.casesHandled || 0}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, casesHandled: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Cases Solved</label>
                  <input
                    type="number"
                    value={officerToUpdate.casesSolved || 0}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, casesSolved: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Medals / Awards</label>
                  <input
                    type="number"
                    value={officerToUpdate.medalsAwards || 0}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, medalsAwards: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Special Skills / Certifications</label>
                  <input
                    type="text"
                    value={officerToUpdate.specialSkills || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, specialSkills: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={officerToUpdate.emergencyContact || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, emergencyContact: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Blood Group</label>
                  <input
                    type="text"
                    value={officerToUpdate.bloodGroup || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Education Qualification</label>
                  <input
                    type="text"
                    value={officerToUpdate.education || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, education: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Promotion History</label>
                  <input
                    type="text"
                    value={officerToUpdate.promotionHistory || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, promotionHistory: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Transfer History</label>
                  <input
                    type="text"
                    value={officerToUpdate.transferHistory || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, transferHistory: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">Commendations</label>
                  <input
                    type="text"
                    value={officerToUpdate.commendations || ""}
                    onChange={(e) => setOfficerToUpdate({ ...officerToUpdate, commendations: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUpdatePoliceModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-text-secondary bg-ui-bg rounded-xl border border-ui-border"
                >
                  Cancel
                </button>
                <AnimatedSubmitButton
                  text="Save Profile Updates"
                  type="submit"
                  disabled={submittingPolice}
                  width={200}
                  height={42}
                />
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUCCESS POPUP: Police Officer Created Successfully ✓ */}
      {/* ========================================================================= */}
      {isCredentialsModalOpen && generatedCredentials && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-emerald-500/50 rounded-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-b border-emerald-500/30 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Police Officer Created Successfully ✓</h2>
              <p className="text-xs text-text-secondary mt-1">Official police profile and login credentials provisioned.</p>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4 bg-black/5 dark:bg-white/5">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-text-secondary uppercase">Officer Name:</span>
                <p className="text-sm font-bold text-text-primary">{generatedCredentials.name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-text-secondary uppercase">Badge Number:</span>
                <p className="text-sm font-bold text-text-primary">{generatedCredentials.badgeNumber}</p>
              </div>

              <div className="p-3 bg-ui-bg rounded-xl border border-ui-border flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-text-secondary uppercase">Police ID:</span>
                  <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                    {generatedCredentials.policeId}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedCredentials.policeId, "Police ID")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                >
                  {copiedField === "Police ID" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>

              <div className="p-3 bg-ui-bg rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Temporary Password:</span>
                  <span className="text-sm font-mono font-bold text-text-primary">
                    {generatedCredentials.temporaryPassword}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedCredentials.temporaryPassword, "Password")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                >
                  {copiedField === "Password" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>

              {/* Warning Note */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                  This is a temporary password. The officer must reset the password after the first login.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="p-4 border-t border-white/10 bg-ui-bg flex flex-wrap gap-2">
              <button
                onClick={() => copyToClipboard(generatedCredentials.policeId, "Police ID")}
                className="flex-1 py-2 px-3 rounded-xl bg-ui-bg border border-ui-border text-xs font-bold text-text-primary hover:bg-white/40 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-purple-500" />
                <span>Copy Police ID</span>
              </button>
              <button
                onClick={() => copyToClipboard(generatedCredentials.temporaryPassword, "Password")}
                className="flex-1 py-2 px-3 rounded-xl bg-ui-bg border border-ui-border text-xs font-bold text-text-primary hover:bg-white/40 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copy Temporary Password</span>
              </button>
              <button
                onClick={() => {
                  const allText = `Police Officer Credentials\nOfficer: ${generatedCredentials.name}\nBadge Number: ${generatedCredentials.badgeNumber}\nPolice ID: ${generatedCredentials.policeId}\nEmail: ${generatedCredentials.email}\nTemporary Password: ${generatedCredentials.temporaryPassword}\nLogin Portal: http://localhost:3000/login`;
                  navigator.clipboard.writeText(allText);
                  toast.success("All credentials copied to clipboard!");
                }}
                className="w-full py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-600 dark:text-purple-300 border border-purple-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Credentials</span>
              </button>
              <button
                onClick={() => setIsCredentialsModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-md shadow-emerald-600/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. POLICE ID POPUP: Police Officer Credentials */}
      {/* ========================================================================= */}
      {isPoliceIdModalOpen && selectedOfficerForCredentials && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-purple-500/40 rounded-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 bg-gradient-to-br from-purple-500/20 to-indigo-500/10 border-b border-purple-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl border border-purple-500/30">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-text-primary">Police Officer Credentials</h2>
                  <p className="text-xs text-text-secondary">Administrative credential management</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPoliceIdModalOpen(false)}
                className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-ui-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 bg-black/5 dark:bg-white/5">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-text-secondary uppercase">Officer:</span>
                <p className="text-sm font-bold text-text-primary">{selectedOfficerForCredentials.name || "Police Officer"}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                  {selectedOfficerForCredentials.rank || "Officer"} • {selectedOfficerForCredentials.stationName || "Central Station"}
                </p>
              </div>

              {/* Police ID */}
              <div className="p-3 bg-ui-bg rounded-xl border border-ui-border flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-text-secondary uppercase">Police ID:</span>
                  <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                    {selectedOfficerForCredentials.policeId || "Not Generated"}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedOfficerForCredentials.policeId || "Not Generated", "Police ID")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                >
                  {copiedField === "Police ID" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>

              {/* Police Email */}
              <div className="p-3 bg-ui-bg rounded-xl border border-ui-border flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-text-secondary uppercase">Police Email:</span>
                  <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                    {selectedOfficerForCredentials.policeEmail || (selectedOfficerForCredentials.policeId ? `${selectedOfficerForCredentials.policeId}@police.gov` : "Not Generated")}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedOfficerForCredentials.policeEmail || (selectedOfficerForCredentials.policeId ? `${selectedOfficerForCredentials.policeId}@police.gov` : ""), "Police Email")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                >
                  {copiedField === "Police Email" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>

              {/* Password Display */}
              <div className="p-3 bg-ui-bg rounded-xl border border-ui-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] font-bold text-text-secondary uppercase">Password:</span>
                  <button
                    onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showPasswordInModal ? "Hide Password" : "Show Password"}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-bold text-text-primary">
                    {showPasswordInModal 
                      ? (selectedOfficerForCredentials.temporaryPassword || "Temporary password set during creation/reset") 
                      : "••••••••••••••"}
                  </span>
                  {showPasswordInModal && selectedOfficerForCredentials.temporaryPassword && (
                    <button
                      onClick={() => copyToClipboard(selectedOfficerForCredentials.temporaryPassword, "Password")}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                    >
                      {copiedField === "Password" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => copyToClipboard(selectedOfficerForCredentials.policeId || selectedOfficerForCredentials.badgeNumber || "POL-2026", "Police ID")}
                  className="py-2 px-3 rounded-xl bg-ui-bg border border-ui-border text-xs font-bold text-text-primary hover:bg-white/40 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-purple-500" />
                  <span>Copy Police ID</span>
                </button>
                <button
                  onClick={() => {
                    if (selectedOfficerForCredentials.temporaryPassword) {
                      copyToClipboard(selectedOfficerForCredentials.temporaryPassword, "Password");
                    } else {
                      toast.info("Password is only revealed when generated or reset.");
                    }
                  }}
                  className="py-2 px-3 rounded-xl bg-ui-bg border border-ui-border text-xs font-bold text-text-primary hover:bg-white/40 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copy Password</span>
                </button>
              </div>

              <div className="border-t border-white/10 pt-3"></div>

              {/* Reset Password Button */}
              <button
                onClick={() => setIsResetConfirmModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Password</span>
              </button>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-ui-bg flex justify-end">
              <button
                onClick={() => setIsPoliceIdModalOpen(false)}
                className="w-full py-2 px-4 rounded-xl bg-ui-bg border border-ui-border hover:bg-white/10 text-xs font-bold text-text-secondary transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. RESET PASSWORD CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {isResetConfirmModalOpen && selectedOfficerForCredentials && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md">
          <div className="glass-panel w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-amber-500/40 rounded-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3 shadow-inner">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-text-primary">Reset Password?</h2>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                Are you sure you want to reset the password for <span className="font-bold text-text-primary">{selectedOfficerForCredentials.name}</span>?
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
                A new temporary password will be generated.
              </p>
            </div>

            <div className="p-4 border-t border-white/10 bg-ui-bg flex gap-2">
              <button
                onClick={() => setIsResetConfirmModalOpen(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-ui-bg border border-ui-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resettingPasswordLoading}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-xs font-bold text-white transition-all shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {resettingPasswordLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Reset Password</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. PASSWORD RESET SUCCESSFULLY MODAL */}
      {/* ========================================================================= */}
      {isResetSuccessModalOpen && newResetCredentials && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-emerald-500/50 rounded-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-b border-emerald-500/30 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3 shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-text-primary">Password Reset Successfully ✓</h2>
              <p className="text-xs text-text-secondary mt-1">A new temporary password has been provisioned for {newResetCredentials.officerName}</p>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4 bg-black/5 dark:bg-white/5">
              <div className="p-3 bg-ui-bg rounded-xl border border-ui-border flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-text-secondary uppercase">Police ID:</span>
                  <span className="text-sm font-mono font-bold text-purple-600 dark:text-purple-400">
                    {newResetCredentials.policeId}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(newResetCredentials.policeId, "Police ID")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                >
                  {copiedField === "Police ID" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>

              <div className="p-3 bg-ui-bg rounded-xl border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">New Temporary Password:</span>
                  <span className="text-sm font-mono font-bold text-text-primary">
                    {newResetCredentials.newTemporaryPassword}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(newResetCredentials.newTemporaryPassword, "New Password")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors"
                >
                  {copiedField === "New Password" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copy</span>
                </button>
              </div>

              {/* Warning Note */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium leading-relaxed">
                  This is a temporary password. The officer must reset the password after first login.
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="p-4 border-t border-white/10 bg-ui-bg flex gap-2">
              <button
                onClick={() => copyToClipboard(newResetCredentials.newTemporaryPassword, "New Password")}
                className="flex-1 py-2.5 px-4 rounded-xl bg-ui-bg border border-ui-border text-xs font-bold text-text-primary hover:bg-white/40 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5 text-emerald-500" />
                <span>Copy Password</span>
              </button>
              <button
                onClick={() => setIsResetSuccessModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-md shadow-emerald-600/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. RESOLUTION NOTE MODAL (WITH STRICT LEGAL IMMUTABILITY) */}
      {/* ========================================================================= */}
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
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!resolutionNoteInput.trim()) {
                      toast.error("Please enter a resolution note before saving.");
                      return;
                    }
                    setSavingNote(true);
                    const adminUser = auth.currentUser;
                    const adminName = adminUser?.displayName || adminUser?.email || "System Admin";
                    const res = await saveSOSResolutionNote(selectedAlertForNote.id, resolutionNoteInput, adminName);
                    setSavingNote(false);
                    if (res.success) {
                      toast.success("Resolution note permanently recorded successfully.");
                      setIsNoteModalOpen(false);
                      setSelectedAlertForNote(null);
                      setResolutionNoteInput("");
                    } else {
                      toast.error(res.error || "Failed to save resolution note.");
                    }
                  }} 
                  className="space-y-5"
                >
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
                      className="px-5 py-2.5 rounded-xl glass-button-secondary text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>

                    <AnimatedSubmitButton
                      text="Save Resolution Note"
                      disabled={savingNote}
                      width={220}
                      height={48}
                      onClick={async () => {
                        if (!resolutionNoteInput.trim()) {
                          toast.error("Please enter a resolution note before saving.");
                          throw new Error("Missing note");
                        }
                        setSavingNote(true);
                        const adminUser = auth.currentUser;
                        const adminName = adminUser?.displayName || adminUser?.email || "System Admin";
                        const res = await saveSOSResolutionNote(selectedAlertForNote.id, resolutionNoteInput, adminName);
                        setSavingNote(false);
                        if (res.success) {
                          toast.success("Resolution note permanently recorded successfully.");
                          setIsNoteModalOpen(false);
                          setSelectedAlertForNote(null);
                          setResolutionNoteInput("");
                        } else {
                          toast.error(res.error || "Failed to save resolution note.");
                          throw new Error(res.error);
                        }
                      }}
                    />
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT CASE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isRejectModalOpen && selectedComplaintForReject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5 text-white"
            >
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2.5 bg-red-500/10 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Confirm Case Rejection</h3>
                  <p className="text-xs text-slate-400">Case ID: {formatCaseId(selectedComplaintForReject)}</p>
                </div>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm font-semibold text-red-200">
                  Are you sure you want to reject this case?
                </p>
                <p className="text-xs text-slate-300 mt-1">
                  Title: <span className="font-medium text-white">{selectedComplaintForReject.title}</span>
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsRejectModalOpen(false);
                    setSelectedComplaintForReject(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectCase}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <X className="w-4 h-4" />
                  Confirm Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FEATURE 1: FLOATING BOTTOM-RIGHT NAVIGATION DOCK */}
      <AdminNavDock
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeSOSCount={sosAlertsData.filter((a: any) => a.status === "Active").length}
        officersCount={policeOfficers.length}
        casesCount={stats.totalComplaints}
      />
      {/* SOS QR MODAL */}
      <SOSQRModal
        alert={selectedAlertForQR}
        isOpen={isQRModalOpen}
        onClose={() => {
          setIsQRModalOpen(false);
          setSelectedAlertForQR(null);
        }}
      />

      {/* ✅ ANIMATED CASE DECISION POPUP */}
      <AnimatePresence>
        {approvalPopup && (
          <motion.div
            key="approval-popup"
            initial={{ opacity: 0, y: -80, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] w-full max-w-sm pointer-events-none"
          >
            <div className={`mx-4 rounded-2xl shadow-2xl border backdrop-blur-xl px-6 py-5 flex flex-col items-center gap-3 ${
              approvalPopup.decision === "Approved"
                ? "bg-emerald-950/90 border-emerald-500/40 shadow-emerald-500/20"
                : "bg-red-950/90 border-red-500/40 shadow-red-500/20"
            }`}>
              {/* Icon with pulse ring */}
              <div className="relative flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  className={`absolute w-16 h-16 rounded-full ${
                    approvalPopup.decision === "Approved" ? "bg-emerald-500/30" : "bg-red-500/30"
                  }`}
                />
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl z-10 ${
                    approvalPopup.decision === "Approved"
                      ? "bg-emerald-500/20 border border-emerald-400/40"
                      : "bg-red-500/20 border border-red-400/40"
                  }`}
                >
                  {approvalPopup.decision === "Approved" ? "✅" : "❌"}
                </motion.div>
              </div>

              {/* Text */}
              <div className="text-center">
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className={`font-extrabold text-base tracking-wide ${
                    approvalPopup.decision === "Approved" ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  Case {approvalPopup.decision === "Approved" ? "Approved!" : "Rejected!"}
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                  className="text-xs font-mono text-white/60 mt-1"
                >
                  ID: <span className="font-bold text-white/80">{formatCaseId(approvalPopup)}</span>
                </motion.p>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-[11px] text-white/40 mt-0.5 max-w-[220px] truncate"
                >
                  {approvalPopup.title}
                </motion.p>
              </div>

              {/* Progress bar */}
              <div className={`w-full h-1 rounded-full mt-1 overflow-hidden ${
                approvalPopup.decision === "Approved" ? "bg-emerald-900/60" : "bg-red-900/60"
              }`}>
                <motion.div
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 3.5, ease: "linear" }}
                  className={`h-full rounded-full ${
                    approvalPopup.decision === "Approved" ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
