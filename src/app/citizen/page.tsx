"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { triggerSOS, getMyComplaints } from "@/lib/complaints";
import { getUserProfile, updateUserProfile } from "@/lib/profile";
import { auth, db } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { logoutUser } from "@/lib/auth";
import { 
  Shield, LayoutDashboard, FileText, Settings, ShieldAlert, AlertCircle,
  Loader2, User, Activity, Monitor, Bell, Users, FileCheck, Car, Lock, LogOut, Clock, MapPin, Save, CheckCircle, UploadCloud, ImageIcon, Search, X,
  Download, Printer
} from "lucide-react";
import dynamic from "next/dynamic";
const SafetyMap = dynamic(() => import("@/components/SafetyMap").then(mod => mod.SafetyMap), { ssr: false, loading: () => <div className="h-[400px] w-full flex items-center justify-center bg-muted/20 rounded-md animate-pulse">Loading Map...</div> });
import { toast } from "sonner";

import { doc, getDoc } from "firebase/firestore";
import { getCaseLogs } from "@/lib/police";
import { CaseLog } from "@/lib/types";
import { formatCaseId } from "@/shared/utils/caseId";
import { exportCaseToPDF, printCaseDetails } from "@/lib/export";
import EvidenceGallery from "@/components/EvidenceGallery";

export default function CitizenDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userUid, setUserUid] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [complaints, setComplaints] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  
  // Profile State
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    mobileNumber: "",
    dob: "",
    gender: "",
    guardianName: "",
    residentialAddress: "",
    permanentAddress: "",
    bloodGroup: "",
    occupation: "",
    nationality: "",
    idProofType: "",
    idProofNumber: "",
    photographUrl: "",
    signatureUrl: "",
    emergencyContactName: "",
    emergencyContactPhone: ""
  });

  // SOS State
  const [sosActive, setSosActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  // Timeline Modal State
  const [trackingComplaint, setTrackingComplaint] = useState<any | null>(null);
  const [caseLogs, setCaseLogs] = useState<CaseLog[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Enforce role
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            if (role === "admin") {
              setLoading(false);
              router.push("/admin");
              return;
            } else if (role === "police") {
              setLoading(false);
              router.push("/police");
              return;
            }
          }

          setUserUid(user.uid);
          
          // Fetch complaints & profile concurrently in parallel
          const [result, profResult] = await Promise.all([
            getMyComplaints(user.uid),
            getUserProfile(user.uid)
          ]);

          if (!result.error) setComplaints(result.complaints);
          
          if (profResult.profile) {
            setProfileData({
              name: profResult.profile.name || "",
              email: profResult.profile.email || "",
              mobileNumber: profResult.profile.mobileNumber || profResult.profile.phone || "",
              dob: profResult.profile.dob || "",
              gender: profResult.profile.gender || "",
              guardianName: profResult.profile.guardianName || "",
              residentialAddress: profResult.profile.residentialAddress || profResult.profile.address || "",
              permanentAddress: profResult.profile.permanentAddress || "",
              bloodGroup: profResult.profile.bloodGroup || "",
              occupation: profResult.profile.occupation || "",
              nationality: profResult.profile.nationality || "Indian",
              idProofType: profResult.profile.idProofType || "",
              idProofNumber: profResult.profile.idProofNumber || "",
              photographUrl: profResult.profile.photographUrl || "",
              signatureUrl: profResult.profile.signatureUrl || "",
              emergencyContactName: profResult.profile.emergencyContactName || "",
              emergencyContactPhone: profResult.profile.emergencyContactPhone || ""
            });
          }
        } catch (err) {
          console.error("Citizen auth error:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleSOS = async () => {
    if (!userUid || sosLoading || sosActive) return;
    
    if (navigator.geolocation) {
      setSosLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const result = await triggerSOS(userUid, position.coords.latitude, position.coords.longitude);
            if (result.success) {
              setSosActive(true);
              toast.success("Emergency SOS triggered! Nearby police units have been notified.");
              setTimeout(() => setSosActive(false), 5000);
            } else {
              toast.error("Unable to send SOS alert: " + (result.error || "Please try again."));
            }
          } catch (err: any) {
            console.error("SOS trigger error:", err);
            toast.error("Unable to send SOS alert. Please try again.");
          } finally {
            setSosLoading(false);
          }
        },
        (error) => {
          console.error("SOS geolocation error:", error);
          if (error.code === error.PERMISSION_DENIED) {
            toast.error("Unable to access your location. Please enable location permission to send an SOS alert.");
          } else {
            toast.error("GPS location is unavailable or timed out. Please try again.");
          }
          setSosLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error("Your browser does not support GPS location.");
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid) return;

    setProfileLoading(true);
    setProfileSuccess(false);

    const updatedData = {
      ...profileData,
      phone: profileData.mobileNumber, // Legacy field sync
      address: profileData.residentialAddress, // Legacy field sync
    };

    const result = await updateUserProfile(userUid, updatedData);

    if (result.success) {
      setProfileData(updatedData);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } else {
      toast.error("Failed to update profile: " + result.error);
    }

    setProfileLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  const getMissingKYCFields = () => {
    const missing: string[] = [];
    if (!profileData.name) missing.push("Full Name");
    if (!profileData.mobileNumber) missing.push("Mobile Number");
    if (!profileData.dob) missing.push("Date of Birth");
    if (!profileData.gender) missing.push("Gender");
    if (!profileData.residentialAddress) missing.push("Residential Address");
    if (!profileData.idProofNumber) missing.push("ID Proof Number");
    return missing;
  };

  const isProfileComplete = () => {
    return getMissingKYCFields().length === 0;
  };

  const handleReportClick = (type: "fir" | "csr") => {
    const missing = getMissingKYCFields();
    if (missing.length > 0) {
      toast.error(`KYC Incomplete! Please complete missing fields: ${missing.join(", ")} before filing a report.`);
      setActiveTab("Profile Settings");
      return;
    }
    if (type === "csr") {
      router.push("/citizen/csr");
    } else {
      router.push("/citizen/report");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-500 animate-spin" />
      </div>
    );
  }

  const handleTrackCase = async (complaint: any) => {
    setTrackingComplaint(complaint);
    setFetchingLogs(true);
    const result = await getCaseLogs(complaint.id);
    setCaseLogs((result.logs || []).filter(log => log.isPublic !== false));
    setFetchingLogs(false);
  };

  const handleDownloadCasePDF = async (complaint: any) => {
    try {
      setDownloadingId(complaint.id);
      const result = await getCaseLogs(complaint.id);
      const publicLogs = (result.logs || []).filter((log: any) => log.isPublic !== false);
      await exportCaseToPDF(complaint, publicLogs);
      toast.success("Case report downloaded successfully!");
    } catch (err: any) {
      console.error("Error exporting PDF:", err);
      toast.error("Failed to download PDF report");
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrintCase = async (complaint: any) => {
    try {
      const result = await getCaseLogs(complaint.id);
      const publicLogs = (result.logs || []).filter((log: any) => log.isPublic !== false);
      printCaseDetails(complaint, publicLogs);
    } catch (err: any) {
      console.error("Error printing case:", err);
      toast.error("Failed to prepare print view");
    }
  };

  const awarenessCards = [
    { icon: User, label: "Women Safety", color: "text-pink-600 dark:text-pink-400", description: "Information about women's protection, harassment reporting, domestic violence support, and emergency assistance.", phone: "181" },
    { icon: Activity, label: "Child Protection", color: "text-blue-600 dark:text-blue-400", description: "Information about child abuse reporting, missing children, child safety, and support services.", phone: "1098" },
    { icon: Monitor, label: "Cyber Crime Reporting", color: "text-orange-600 dark:text-orange-400", description: "Information about online fraud, cyber attacks, scams, identity theft, and digital safety complaints.", phone: "1930" },
    { icon: Bell, label: "Emergency Alerts", color: "text-red-600 dark:text-red-400", description: "Information about immediate emergency support for police, ambulance, fire, and urgent situations.", phone: "112" },
    { icon: Users, label: "Community Safety", color: "text-emerald-600 dark:text-emerald-400", description: "Information about reporting unsafe activities, public concerns, and neighborhood safety issues.", phone: "100" },
    { icon: FileCheck, label: "Secure Digital Complaints", color: "text-blue-500 dark:text-blue-300", description: "Information about submitting secure online complaints related to cyber fraud and digital issues.", phone: "1930" },
    { icon: Car, label: "Road Safety", color: "text-purple-600 dark:text-purple-400", description: "Information about road accidents, traffic emergencies, and highway assistance.", phone: "1033" },
    { icon: Lock, label: "Privacy Protection", color: "text-yellow-600 dark:text-yellow-400", description: "Information about protecting personal data, online privacy, identity theft, and digital security.", phone: "1930" },
  ];

  return (
    <div className="min-h-screen text-text-primary flex transition-colors duration-300 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-[260px] glass-panel h-[calc(100vh-2rem)] m-4 flex flex-col fixed left-0 top-0 z-20 transition-colors duration-300">
        <div className="p-6 pb-2">
          <div className="flex items-center gap-2 text-text-primary mb-6">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span className="font-bold text-lg drop-shadow-sm">Citizen Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ui-bg overflow-hidden shrink-0 border border-ui-border backdrop-blur-md">
              {profileData.photographUrl ? (
                <img src={profileData.photographUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 m-2.5 text-text-tertiary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-0.5">Welcome</div>
              <div className="font-bold text-sm truncate">{profileData.name || "Citizen"}</div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 mt-2">
          <button 
            onClick={() => setActiveTab("Dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
              activeTab === "Dashboard" ? "glass-panel shadow-md text-blue-700 dark:text-blue-300 border-blue-500/30" : "text-text-secondary hover:glass-panel"
            }`}
          >
            <Activity className="w-5 h-5" />
            Dashboard
          </button>
          
          {[
            { icon: FileText, label: "My Complaints" },
            { icon: MapPin, label: "Safety Map" },
            { icon: Settings, label: "Profile Settings" },
          ].map((item) => (
            <button 
              key={item.label} 
              onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                activeTab === item.label ? "glass-panel shadow-md text-blue-700 dark:text-blue-300 border-blue-500/30 font-medium" : "text-text-secondary hover:glass-panel"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto">
          <button onClick={() => logoutUser().then(() => router.push("/login"))} className="flex items-center gap-3 text-text-secondary hover:text-red-600 dark:hover:text-red-400 transition-colors w-full px-4 py-3 hover:glass-panel rounded-xl">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-[280px] p-8 md:p-12 overflow-y-auto min-h-screen">
        <div className="max-w-5xl mx-auto">
          
          {activeTab === "Dashboard" ? (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary mb-2 drop-shadow-sm">Safety Dashboard</h1>
                <p className="text-text-secondary text-sm">Access emergency services and monitor your community safety.</p>
              </div>

              {/* Quick Actions (SOS & Report) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                
                {/* SOS BUTTON */}
                <div className="glass-panel p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group">
                  <div className="absolute inset-0 bg-red-500/5 dark:bg-red-500/10 pointer-events-none group-hover:bg-red-500/10 transition-colors"></div>
                  <div className="mb-4 bg-red-100/50 dark:bg-red-900/30 p-4 rounded-full border border-red-200/50 dark:border-red-500/30 backdrop-blur-sm">
                    <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-2">Emergency SOS</h2>
                  <p className="text-text-secondary mb-6 text-xs max-w-xs">Send immediate alert with your live GPS location to nearby police.</p>
                  
                  <button 
                    onClick={handleSOS}
                    disabled={sosLoading || sosActive}
                    className={`w-full max-w-xs py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      sosActive 
                        ? "bg-emerald-500/80 text-white backdrop-blur-md shadow-lg border border-emerald-400/50 cursor-default" 
                        : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 disabled:opacity-50 border border-red-500/50"
                    }`}
                  >
                    {sosLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> 
                     : sosActive ? <><CheckCircle className="w-5 h-5"/> Alert Sent!</> 
                     : "PRESS TO ALERT"}
                  </button>
                </div>

                {/* REPORT BUTTON */}
                <div className="glass-panel p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
                  <div className="mb-4 bg-blue-100/50 dark:bg-blue-900/30 p-4 rounded-full border border-blue-200/50 dark:border-blue-500/30 backdrop-blur-sm">
                    <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-text-primary mb-2">Report an Incident</h2>
                  <p className="text-text-secondary mb-6 text-xs max-w-xs">File a formal complaint (FIR or CSR). Upload images and details securely.</p>
                  
                  <div className="flex w-full max-w-sm gap-4 relative z-10">
                    <button onClick={() => handleReportClick("fir")} className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all text-center flex flex-col shadow-lg shadow-red-500/20 border border-red-400/30 items-center justify-center">
                      <span>File FIR</span>
                      <span className="text-[10px] font-normal opacity-80">(Cognizable)</span>
                    </button>
                    <button onClick={() => handleReportClick("csr")} className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold text-xs py-3 px-4 rounded-xl transition-all text-center flex flex-col shadow-lg shadow-blue-500/20 border border-blue-400/30 items-center justify-center">
                      <span>File CSR</span>
                      <span className="text-[10px] font-normal opacity-80">(Non-Cognizable)</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Public Safety Awareness Section */}
              <div className="glass-panel p-8 shadow-lg">
                <h3 className="text-xl font-bold text-text-primary flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  Public Safety Awareness
                </h3>
                <p className="text-text-secondary text-sm mb-8 ml-12">Click to access resources and important information on various safety topics in India.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {awarenessCards.map((card, idx) => {
                    const isExpanded = selectedModule === card.label;
                    return (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedModule(isExpanded ? null : card.label)}
                      className={`glass-panel p-6 flex flex-col items-center justify-start text-center cursor-pointer hover:bg-white/40 dark:hover:bg-black/20 transition-all duration-300 hover:shadow-lg ${isExpanded ? 'shadow-lg border-blue-500/30 scale-[1.02]' : 'shadow-sm'}`}
                    >
                      <card.icon className={`w-8 h-8 mb-4 transition-transform duration-300 ${isExpanded ? 'scale-110' : ''} ${card.color}`} />
                      <span className="text-sm font-bold text-text-primary">{card.label}</span>
                      
                      <div className={`overflow-hidden transition-all duration-500 ease-in-out flex flex-col items-center justify-between ${isExpanded ? 'max-h-[200px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
                        <p className="text-xs text-text-secondary mb-4 px-1">{card.description}</p>
                        <a 
                          href={`tel:${card.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center glass-button text-sm font-bold py-2.5 px-6 w-full mt-auto"
                        >
                          Call Now ({card.phone})
                        </a>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            </>
          ) : activeTab === "My Complaints" ? (
            <div className="glass-panel p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-text-primary mb-8 flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                Recent Complaints
              </h3>

              <div className="space-y-4">
                {complaints.length === 0 ? (
                  <div className="glass-panel p-12 text-center border-dashed">
                    <p className="text-text-secondary text-lg">You haven't filed any complaints yet.</p>
                  </div>
                ) : (
                  complaints.map((complaint) => (
                    <div key={complaint.id} className="glass-panel p-6 hover:bg-white/40 dark:hover:bg-black/20 transition-all group">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-bold text-text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{complaint.title}</h4>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${
                          complaint.status === "Approved" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" :
                          complaint.status === "Rejected" ? "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30" :
                          complaint.status === "Pending" ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" :
                          complaint.status === "Investigating" ? "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30" :
                          "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                        }`}>
                          {complaint.status}
                        </span>
                      </div>
                      <p className="text-text-secondary text-sm mb-6 line-clamp-2">{complaint.description}</p>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-5 text-xs text-text-tertiary font-medium">
                          <span className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
                            <MapPin className="w-3.5 h-3.5" />
                            {complaint.location}
                          </span>
                          <span className="flex items-center gap-1.5 bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-black/5 dark:border-white/5">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button 
                            onClick={() => handleTrackCase(complaint)}
                            className="text-xs font-bold flex items-center gap-1.5 glass-button-secondary px-3.5 py-2 shadow-sm"
                          >
                            <Search className="w-3.5 h-3.5" />
                            Track Case
                          </button>
                          <button 
                            onClick={() => handleDownloadCasePDF(complaint)}
                            disabled={downloadingId === complaint.id}
                            title="Download PDF"
                            className="text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 hover:bg-blue-500/20 transition-all shadow-sm"
                          >
                            {downloadingId === complaint.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            Download
                          </button>
                          <button 
                            onClick={() => handlePrintCase(complaint)}
                            title="Print Case"
                            className="text-xs font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all shadow-sm"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                          </button>
                          <span className={`px-3 py-2 rounded-xl text-xs font-bold border backdrop-blur-md shadow-sm flex items-center gap-1.5 ${
                            complaint.status === "Approved" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" :
                            complaint.status === "Rejected" ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30" :
                            complaint.status === "Investigating" ? "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30" :
                            "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30"
                          }`}>
                            {complaint.status === "Approved" ? "🟢 Approved" :
                             complaint.status === "Rejected" ? "🔴 Rejected" :
                             complaint.status === "Investigating" ? "🔵 Investigating" :
                             "🟡 Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === "Safety Map" ? (
            <div className="glass-panel p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-text-primary mb-8 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                  <MapPin className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                Safety Map
              </h3>
              <p className="text-text-secondary text-sm mb-6">View nearby police stations, hospitals, and safe zones on the interactive map.</p>
              <div className="h-[500px] w-full rounded-xl overflow-hidden border border-ui-border relative">
                 <SafetyMap />
              </div>
            </div>
          ) : activeTab === "Profile Settings" ? (
            <div className="glass-panel p-10 shadow-lg w-full max-w-4xl mx-auto">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-500/30">
                  <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-text-primary drop-shadow-sm">KYC Profile</h3>
                  <p className="text-text-secondary mt-1">Complete your personal details for official verification.</p>
                </div>
              </div>

              {/* KYC Status Banner */}
              {isProfileComplete() ? (
                <div className="mb-8 p-4 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 backdrop-blur-md shadow-md">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">KYC Profile Verified & Complete</h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400">Your profile meets official verification requirements for filing FIR & CSR reports.</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-extrabold uppercase">
                    Verified
                  </span>
                </div>
              ) : (
                <div className="mb-8 p-4 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex flex-col gap-2 text-amber-800 dark:text-amber-300 backdrop-blur-md shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <h4 className="font-bold text-sm">KYC Profile Incomplete</h4>
                        <p className="text-xs text-amber-700 dark:text-amber-400">Required fields must be completed before you can file an official FIR or CSR report.</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full text-xs font-extrabold uppercase">
                      Action Required
                    </span>
                  </div>
                  <div className="text-xs font-semibold bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 mt-1">
                    Missing Fields: <span className="font-bold text-amber-900 dark:text-amber-200">{getMissingKYCFields().join(", ")}</span>
                  </div>
                </div>
              )}

              {profileSuccess && (
                <div className="mb-8 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 backdrop-blur-md shadow-lg">
                  <CheckCircle className="w-6 h-6" />
                  <span className="font-bold">Profile updated successfully!</span>
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="space-y-12">
                
                {/* 1. Basic Account Information */}
                <section className="glass-panel p-6 bg-white/30 dark:bg-black/10 border-white/20 dark:border-white/5">
                  <h4 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2 border-b border-ui-border pb-3">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400">1</span>
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Full Name</label>
                      <input type="text" value={profileData.name} disabled className="w-full px-4 py-3 glass-input opacity-70 cursor-not-allowed bg-black/5 dark:bg-black/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Email Address</label>
                      <input type="email" value={profileData.email} disabled className="w-full px-4 py-3 glass-input opacity-70 cursor-not-allowed bg-black/5 dark:bg-black/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Date of Birth</label>
                      <input 
                        type="date" 
                        name="dob"
                        value={profileData.dob}
                        onChange={handleChange}
                        className="w-full px-4 py-3 glass-input" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Gender</label>
                      <select 
                        name="gender"
                        value={profileData.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-3 glass-input [&>option]:bg-white dark:[&>option]:bg-slate-900"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </section>

                {/* 2. Personal & Contact Details */}
                <section className="glass-panel p-6 bg-white/30 dark:bg-black/10 border-white/20 dark:border-white/5">
                  <h4 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2 border-b border-ui-border pb-3">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400">2</span>
                    Personal Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Father's/Mother's/Spouse Name</label>
                      <input 
                        type="text" 
                        name="guardianName"
                        value={profileData.guardianName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 glass-input" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Mobile Number</label>
                      <input 
                        type="tel" 
                        name="mobileNumber"
                        value={profileData.mobileNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-3 glass-input" 
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Blood Group</label>
                      <select 
                        name="bloodGroup"
                        value={profileData.bloodGroup}
                        onChange={handleChange}
                        className="w-full px-4 py-3 glass-input [&>option]:bg-white dark:[&>option]:bg-slate-900"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Occupation</label>
                      <input 
                        type="text" 
                        name="occupation"
                        value={profileData.occupation}
                        onChange={handleChange}
                        className="w-full px-4 py-3 glass-input" 
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Residential Address</label>
                      <textarea 
                        name="residentialAddress"
                        value={profileData.residentialAddress}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-4 py-3 glass-input resize-none" 
                        placeholder="Current living address"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Permanent Address</label>
                      <textarea 
                        name="permanentAddress"
                        value={profileData.permanentAddress}
                        onChange={handleChange}
                        rows={2}
                        className="w-full px-4 py-3 glass-input resize-none" 
                        placeholder="Permanent address (if different)"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Emergency Contact Name</label>
                      <input 
                        type="text" 
                        name="emergencyContactName"
                        value={profileData.emergencyContactName}
                        onChange={handleChange}
                        className="w-full px-4 py-3 glass-input" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Emergency Contact Phone</label>
                      <input 
                        type="tel" 
                        name="emergencyContactPhone"
                        value={profileData.emergencyContactPhone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 glass-input" 
                      />
                    </div>
                  </div>
                </section>

                {/* 3. Identity Proof */}
                <section className="glass-panel p-6 bg-white/30 dark:bg-black/10 border-white/20 dark:border-white/5">
                  <h4 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2 border-b border-ui-border pb-3">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-700 dark:text-blue-400">3</span>
                    Identity Proof
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Nationality</label>
                      <input 
                        type="text" 
                        name="nationality"
                        value={profileData.nationality}
                        onChange={handleChange}
                        className="w-full px-4 py-3 glass-input" 
                      />
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">ID Proof Type</label>
                        <select 
                          name="idProofType"
                          value={profileData.idProofType}
                          onChange={handleChange}
                          className="w-full px-4 py-3 glass-input [&>option]:bg-white dark:[&>option]:bg-slate-900"
                        >
                          <option value="">Select ID Type</option>
                          <option value="Aadhaar">Aadhaar Card</option>
                          <option value="Passport">Passport</option>
                          <option value="Driving Licence">Driving Licence</option>
                          <option value="Voter ID">Voter ID</option>
                          <option value="PAN Card">PAN Card</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">ID Proof Number</label>
                        <input 
                          type="text" 
                          name="idProofNumber"
                          value={profileData.idProofNumber}
                          onChange={handleChange}
                          className="w-full px-4 py-3 glass-input uppercase" 
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <div className="pt-6 mt-6 sticky bottom-6 z-10 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={profileLoading}
                    className="flex items-center justify-center gap-2 w-full md:w-auto px-10 py-4 glass-button text-lg disabled:opacity-50"
                  >
                    {profileLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save KYC Profile
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          ) : (
            <div className="glass-panel p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-lg">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-3">{activeTab}</h2>
              <p className="text-text-secondary max-w-md mx-auto">This section is currently under development. Please check back later.</p>
            </div>
          )}

        </div>
      </main>

      {/* TRACK CASE MODAL */}
      {trackingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-opacity">
          <div className="glass-panel rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border-white/20 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-ui-border bg-ui-bg">
              <div>
                <h2 className="text-xl font-bold text-text-primary flex items-center gap-3 drop-shadow-sm">
                  <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                    <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Case Tracking
                </h2>
                <p className="text-xs text-text-secondary font-mono mt-2 opacity-80">
                  ID: {formatCaseId(trackingComplaint)} • {trackingComplaint.title}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDownloadCasePDF(trackingComplaint)}
                  disabled={downloadingId === trackingComplaint.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/20 backdrop-blur-sm"
                >
                  {downloadingId === trackingComplaint.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Download PDF
                </button>
                <button 
                  onClick={() => handlePrintCase(trackingComplaint)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors border border-purple-500/20 backdrop-blur-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button 
                  onClick={() => setTrackingComplaint(null)}
                  className="p-2 text-text-tertiary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8">
              {/* Evidence Gallery */}
              <EvidenceGallery complaint={trackingComplaint} className="mb-8" />

              {/* Timeline */}
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-500" />
                Investigation Updates & Timeline
              </h3>

              {fetchingLogs ? (
                <div className="flex flex-col items-center justify-center h-40 gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm font-medium text-text-secondary">Retrieving case updates...</p>
                </div>
              ) : caseLogs.length === 0 ? (
                <div className="text-center text-text-tertiary text-sm mt-10 p-8 glass-panel border-dashed">
                  <Clock className="w-10 h-10 mx-auto mb-4 opacity-50 text-blue-500" />
                  <p className="font-semibold text-base">Your case is currently pending review.</p>
                  <p className="text-sm mt-2 opacity-80">Updates will appear here once an officer begins investigation.</p>
                </div>
              ) : (
                <div className="relative border-l-2 border-blue-300/50 dark:border-blue-700/50 ml-4 space-y-10 pb-4">
                  {caseLogs.map((log) => (
                    <div key={log.id} className="relative pl-8">
                      <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-[4px] border-slate-100 dark:border-slate-900 shadow-md"></div>
                      
                      <div className="glass-panel p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                            <Shield className="w-4 h-4" />
                            {log.authorName} ({log.authorRole})
                          </span>
                          <span className="text-xs text-text-tertiary font-mono bg-black/5 dark:bg-white/5 px-2 py-1 rounded-md">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-text-primary leading-relaxed">
                          {log.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-ui-bg border-t border-ui-border text-center backdrop-blur-md">
              <p className="text-xs font-medium text-text-secondary">Updates are posted directly by the assigned officers.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
