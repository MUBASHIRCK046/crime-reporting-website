"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { getAllComplaints } from "@/lib/police";
import { getAllUsers, assignCaseToOfficer } from "@/lib/admin";
import { logoutUser } from "@/lib/auth";
import { toast } from "sonner";
import { getUserProfile } from "@/lib/profile";
import { getCaseLogs } from "@/lib/police";
import { CaseLog } from "@/lib/types";
import { 
  Shield, LayoutDashboard, Users, Grid, FileText, 
  FileSignature, FileKey, BarChart2, LogOut, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, Clock, MapPin, Eye, X, Image as ImageIcon, User, Phone, Droplet, HeartPulse, Map, Calendar, Briefcase, Globe, Fingerprint, Search, Download, Printer, Save, Edit, Trash2, RotateCcw, Upload, Key, Power, Send
} from "lucide-react";
import { exportCaseToPDF, printCaseDetails } from "@/lib/export";

export default function AdminDashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");
  
  const [complaintsData, setComplaintsData] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");

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
    const checkAuthAndFetchData = async () => {
      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          router.push("/login");
          return;
        }

        // STRICT SECURITY: Verify they are an Admin!
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const role = userDoc.data().role;
          if (role === "admin") {
            fetchSystemData();
          } else if (role === "police") {
            router.push("/police");
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

  // Fetch citizen profile and case logs when a complaint is selected
  useEffect(() => {
    const fetchCitizenDetailsAndLogs = async () => {
      if (selectedComplaint) {
        // Fetch Profile
        if (selectedComplaint.citizenId) {
          setFetchingProfile(true);
          const { profile } = await getUserProfile(selectedComplaint.citizenId);
          setSelectedCitizenProfile(profile);
          setFetchingProfile(false);
        } else {
          setSelectedCitizenProfile(null);
        }
        
        // Fetch Logs
        setFetchingLogs(true);
        const logsResult = await getCaseLogs(selectedComplaint.id);
        setCaseLogs(logsResult.logs || []);
        setFetchingLogs(false);
        
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
    
    // Fetch Complaints
    const complaintsResult = await getAllComplaints();
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

    // Fetch Users
    const usersResult = await getAllUsers();
    if (!usersResult.error) {
      setUsersData(usersResult.users);
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push("/login");
  };

  const handleAssignOfficer = async () => {
    if (!selectedOfficer || !selectedComplaint) return;
    
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
        assignedOfficerName: officer?.name || "Unknown Officer"
      });
      // Refresh complaints list
      fetchSystemData();
    } else {
      toast.error(result.error);
    }
    setAssigningLoading(false);
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

  const renderComplaintsTable = (filterType: string | null = null) => {
    const filteredComplaints = filterType 
      ? complaintsData.filter(c => c.type === filterType || (!c.type && filterType === "FIR")) // Default to FIR if missing
      : complaintsData;

    return (
      <div className="glass-panel overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5 text-[10px] uppercase tracking-wider text-text-secondary border-b border-white/20">
                <th className="px-6 py-4 font-semibold">ID</th>
                <th className="px-6 py-4 font-semibold">TITLE</th>
                <th className="px-6 py-4 font-semibold">TYPE</th>
                <th className="px-6 py-4 font-semibold">STATUS</th>
                <th className="px-6 py-4 font-semibold">DATE</th>
                <th className="px-6 py-4 font-semibold">ACTION</th>
              </tr>
            </thead>
            <tbody className="text-sm text-text-primary">
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-tertiary text-xs">
                    No complaints found.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr key={c.id} className="border-b border-white/10 hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-text-tertiary">{c.id.substring(0, 8).toUpperCase()}</td>
                    <td className="px-6 py-4 font-medium text-text-primary max-w-[250px] truncate">{c.title}</td>
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
                      <button 
                        onClick={() => setSelectedComplaint(c)}
                        className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 font-semibold bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors border border-blue-500/20 backdrop-blur-sm"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedComplaint(c);
                          // Optional: we can add a small timeout to let the modal render, then scroll to the assignment section
                          setTimeout(() => {
                            document.getElementById('assignment-section')?.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200 font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/20 backdrop-blur-sm"
                      >
                        <Briefcase className="w-3 h-3" />
                        Assign
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

  return (
    <div className="min-h-screen bg-background text-text-primary flex transition-colors duration-300">
      {/* SIDEBAR */}
      <aside className="w-[260px] glass-panel h-screen rounded-none flex flex-col fixed left-0 top-0 transition-colors duration-300 z-20 shadow-lg border-r border-white/20">
        <div className="p-6 border-b border-white/10 flex items-center gap-3 bg-black/5 dark:bg-white/5">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/50 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="font-bold tracking-wide text-text-primary drop-shadow-sm">System Admin</span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button 
            onClick={() => setActiveTab("Dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === "Dashboard" ? "glass-button shadow-md shadow-emerald-500/20" : "text-text-secondary hover:text-text-primary hover:bg-ui-bg"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          
          {[
            { icon: Users, label: "Users" },
            { icon: FileText, label: "Complaints" },
            { icon: FileSignature, label: "FIR" },
            { icon: FileKey, label: "CSR" },
          ].map((item) => (
            <button 
              key={item.label} 
              onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.label ? "glass-button shadow-md shadow-emerald-500/20" : "text-text-secondary hover:text-text-primary hover:bg-ui-bg"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-white/10">
          <button onClick={handleLogout} className="flex items-center gap-3 text-text-secondary hover:text-text-primary transition-colors w-full px-4 py-2 hover:bg-ui-bg rounded-lg">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 ml-[260px] p-8 md:p-12 min-h-screen">
        
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-text-primary mb-6 drop-shadow-sm">{activeTab}</h1>

          {activeTab === "Dashboard" ? (
            <>
              {/* Type Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="glass-panel p-6 flex flex-col justify-between h-40 shadow-sm">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 backdrop-blur-sm">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-sm">Total Complaints</span>
                  </div>
                  <div className="text-4xl font-bold text-text-primary">{stats.totalComplaints}</div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-40 shadow-sm">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20 backdrop-blur-sm">
                      <FileSignature className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="font-medium text-sm">Total FIRs</span>
                  </div>
                  <div className="text-4xl font-bold text-text-primary">{stats.totalFIRs}</div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-40 shadow-sm">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 backdrop-blur-sm">
                      <FileKey className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="font-medium text-sm">Total CSRs</span>
                  </div>
                  <div className="text-4xl font-bold text-text-primary">{stats.totalCSRs}</div>
                </div>
              </div>

              <h2 className="text-xl font-bold text-text-primary mb-6 drop-shadow-sm">Status Breakdown</h2>

              {/* Status Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-panel p-6 flex flex-col justify-between h-40 shadow-sm">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20 backdrop-blur-sm">
                      <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="font-medium text-sm">Pending</span>
                  </div>
                  <div className="text-4xl font-bold text-text-primary">{stats.pending}</div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-40 shadow-sm">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 backdrop-blur-sm">
                      <RefreshCw className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="font-medium text-sm">In-Progress</span>
                  </div>
                  <div className="text-4xl font-bold text-text-primary">{stats.inProgress}</div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-between h-40 shadow-sm">
                  <div className="flex items-center gap-3 text-text-secondary">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 backdrop-blur-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="font-medium text-sm">Resolved</span>
                  </div>
                  <div className="text-4xl font-bold text-text-primary">{stats.resolved}</div>
                </div>
              </div>
            </>
          ) : activeTab === "Users" ? (
            renderUsersTable()
          ) : activeTab === "Complaints" ? (
            renderComplaintsTable(null)
          ) : activeTab === "FIR" ? (
            renderComplaintsTable("FIR")
          ) : activeTab === "CSR" ? (
            renderComplaintsTable("CSR")
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

                {/* Location */}
                <div className="bg-ui-bg p-4 rounded-xl border border-ui-border backdrop-blur-sm">
                  <span className="block text-[10px] uppercase font-bold text-text-secondary mb-2">Location</span>
                  <div className="flex items-start gap-2 text-sm font-medium text-text-primary">
                    <MapPin className="w-4 h-4 text-text-tertiary mt-0.5 shrink-0" />
                    <span>{selectedComplaint.location}</span>
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

                {/* Image Evidence */}
                <div>
                  <span className="block text-[10px] uppercase font-bold text-text-secondary mb-2">Evidence / Attachments</span>
                  {selectedComplaint.imageUrl ? (
                    <div className="rounded-xl overflow-hidden border border-ui-border shadow-sm">
                      <img 
                        src={selectedComplaint.imageUrl} 
                        alt="Complaint Evidence" 
                        className="w-full h-auto max-h-[300px] object-cover bg-black/5 dark:bg-white/5"
                      />
                    </div>
                  ) : (
                    <div className="bg-ui-bg border border-ui-border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center backdrop-blur-sm">
                      <ImageIcon className="w-6 h-6 text-text-tertiary mb-2" />
                      <p className="text-xs text-text-tertiary">No images or evidence attached.</p>
                    </div>
                  )}
                </div>

                {/* Assignment Section */}
                <div id="assignment-section" className="mt-8 pt-6 border-t border-ui-border">
                  <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 mb-4">
                    <Briefcase className="w-4 h-4 text-emerald-500" />
                    Case Assignment
                  </h3>
                  
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
                        <p className="text-xs text-text-secondary">This case needs an investigating officer.</p>
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

                {/* Management Actions */}
                <div className="flex gap-2 flex-wrap items-center">
                  <div className="hidden lg:block h-6 w-px bg-white/20 mx-1"></div>
                  
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded border border-transparent hover:border-white/20 text-[10px] font-bold uppercase transition-all">
                    <Upload className="w-3 h-3" /> Photo / Docs
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded border border-transparent hover:border-white/20 text-[10px] font-bold uppercase transition-all">
                    <Key className="w-3 h-3" /> Reset Pass
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded border border-transparent hover:border-white/20 text-[10px] font-bold uppercase transition-all">
                    <Power className="w-3 h-3 text-emerald-500" /> Status
                  </button>
                  <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded border border-transparent hover:border-white/20 text-[10px] font-bold uppercase transition-all">
                    <Briefcase className="w-3 h-3" /> Transfer / Rank
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

    </div>
  );
}
