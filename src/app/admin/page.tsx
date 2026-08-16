"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/firebase/client";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getAllComplaints } from "@/lib/police";
import { getAllUsers, assignCaseToOfficer, updatePoliceOfficerProfile, assignUserAsPolice } from "@/lib/admin";
import { logoutUser } from "@/lib/auth";
import { toast } from "sonner";
import { getUserProfile } from "@/lib/profile";
import { getCaseLogs } from "@/lib/police";
import { CaseLog } from "@/lib/types";
import { 
  Shield, LayoutDashboard, Users, Grid, FileText, 
  FileSignature, FileKey, BarChart2, LogOut, Loader2,
  AlertCircle, RefreshCw, CheckCircle2, Clock, MapPin, Eye, EyeOff, X, Image as ImageIcon, User, Phone, Droplet, HeartPulse, Map, Calendar, Briefcase, Globe, Fingerprint, Search, Download, Printer, Save, Edit, Trash2, RotateCcw, Upload, Key, Power, Send, UserPlus, UserCheck, ShieldCheck, Award, Star, GraduationCap, Building2, Copy, Check, Lock, Sparkles, FileSpreadsheet
} from "lucide-react";
import { exportCaseToPDF, printCaseDetails } from "@/lib/export";
import { motion } from "framer-motion";
import { MorphingCard, StatusDonutChart } from "@/components/MorphingStats";

export default function AdminDashboard() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Dashboard");
  
  const [complaintsData, setComplaintsData] = useState<any[]>([]);
  const [usersData, setUsersData] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");

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
          adminUid
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
      const response = await fetch("/api/admin/create-police", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newPolice,
          yearsOfService: calculateYearsOfService(newPolice.doj), // Ensure correct years of service is sent
          adminUid
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
      const response = await fetch("/api/admin/reset-police-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: selectedOfficerForCredentials.uid,
          adminUid
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
                  <td colSpan={6} className="px-6 py-8 text-center text-text-tertiary text-xs">
                    No complaints found.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => (
                  <tr key={c.id} className="border-b border-white/10 hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-text-tertiary">{c.id.substring(0, 8).toUpperCase()}</td>
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

  const citizenCount = usersData.filter(u => u.role !== "police" && u.role !== "admin").length;
  const policeCount = usersData.filter(u => u.role === "police").length;
  const adminCount = usersData.filter(u => u.role === "admin").length;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="min-h-screen bg-background text-text-primary flex transition-colors duration-300"
    >
      {/* SIDEBAR */}
      <aside className="w-[260px] glass-panel h-screen rounded-none flex flex-col fixed left-0 top-0 transition-colors duration-300 z-20 shadow-lg border-r border-white/20">
        <div className="p-6 border-b border-white/10 flex items-center gap-3 bg-black/5 dark:bg-white/5">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/50 flex items-center justify-center bg-emerald-500/20 backdrop-blur-sm">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="font-bold tracking-wide text-text-primary drop-shadow-sm">System Administrator</span>
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

          {/* DEDICATED POLICE OFFICER MANAGEMENT TAB */}
          <button 
            onClick={() => setActiveTab("Police Officer Management")}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-all ${
              activeTab === "Police Officer Management" 
                ? "glass-button shadow-md shadow-purple-500/20 border-purple-500/30 text-purple-600 dark:text-purple-400" 
                : "text-text-secondary hover:text-text-primary hover:bg-ui-bg"
            }`}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-500" />
              <span>Police Management</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 font-mono font-bold">
              {usersData.filter(u => u.role === 'police').length}
            </span>
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
              {item.label === "Users" ? "Citizen Management" : item.label}
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
      <main className="flex-1 ml-[260px] p-8 md:p-12 min-h-screen relative overflow-hidden">
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

        <div className="max-w-6xl mx-auto relative z-10">
          {activeTab === "Dashboard" ? (
            <motion.h1 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              className="text-3xl font-black tracking-tight text-text-primary mb-8 drop-shadow-sm text-center bg-gradient-to-r from-text-primary via-emerald-600 to-teal-600 bg-clip-text text-transparent"
            >
              System Administrator
            </motion.h1>
          ) : (
            <h1 className="text-2xl font-bold text-text-primary mb-6 drop-shadow-sm">
              {activeTab === "Users" ? "Citizen & Users Management" : activeTab}
            </h1>
          )}

          {activeTab === "Dashboard" ? (
            <div className="flex flex-col gap-12 py-6">
              {/* Morphing Stats Cards Section (Futuristic CSS Grid Layout) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 my-6">
                <MorphingCard
                  title="Total Complaints"
                  value={stats.totalComplaints}
                  points={[1, 2.5, 1.2, 3]} // Complaint trends
                  color="blue"
                  type="line"
                  delay={0.05}
                />
                
                <MorphingCard
                  title="Total FIRs"
                  value={stats.totalFIRs}
                  points={[1.2, 2.8, 1.8, 3.2, 2]} // FIR trends
                  color="red"
                  type="bar"
                  delay={0.15}
                />
                
                <MorphingCard
                  title="Total CSRs"
                  value={stats.totalCSRs}
                  points={[1, 1.8, 1.2, 2.5]} // CSR trends
                  color="purple"
                  type="area"
                  delay={0.25}
                />

                <MorphingCard
                  title="Total Users"
                  value={citizenCount}
                  points={[0.5, 1, 1.8, 3.2]} // Growth trends
                  color="emerald"
                  type="line"
                  delay={0.35}
                />

                <MorphingCard
                  title="Total Police Officers"
                  value={policeCount}
                  points={[2, 1, 3, 1.5, 2.8]} // Activity trends
                  color="indigo"
                  type="area"
                  delay={0.45}
                />

                <MorphingCard
                  title="Total Administrators"
                  value={adminCount}
                  points={[1, 1.2, 1.5, 1.8, 2.2]} // Trend trends
                  color="amber"
                  type="line"
                  delay={0.55}
                />
              </div>

              {/* Status Breakdown Section */}
              <div className="flex items-center justify-center w-full mt-6">
                <StatusDonutChart
                  pending={stats.pending}
                  inProgress={stats.inProgress}
                  resolved={stats.resolved}
                />
              </div>
            </div>
          ) : activeTab === "Police Officer Management" || activeTab === "Police Management" ? (
            renderPoliceManagementSection()
          ) : activeTab === "Users" || activeTab === "Citizen Management" ? (
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
                  <User className="w-4 h-4" /> 1. Officer Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                  <Shield className="w-4 h-4" /> 2. Designation & Posting Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">8. Rank / Designation *</label>
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
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">9. Police Station / Department *</label>
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
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">16. Current Posting Location</label>
                    <input
                      type="text"
                      placeholder="e.g. North Zone, Sector 4"
                      value={newPolice.postingLocation}
                      onChange={(e) => setNewPolice({ ...newPolice, postingLocation: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">7. Date of Joining</label>
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
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">10. Years of Service (Auto)</label>
                    <input
                      type="number"
                      min="0"
                      disabled
                      value={newPolice.yearsOfService}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg/50 border border-ui-border text-text-tertiary focus:outline-none cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">11. Previous Service Experience</label>
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
                  <Award className="w-4 h-4" /> 3. Performance & Qualifications
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">12. Cases Handled</label>
                    <input
                      type="number"
                      min="0"
                      value={newPolice.casesHandled}
                      onChange={(e) => setNewPolice({ ...newPolice, casesHandled: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">13. Cases Successfully Solved</label>
                    <input
                      type="number"
                      min="0"
                      value={newPolice.casesSolved}
                      onChange={(e) => setNewPolice({ ...newPolice, casesSolved: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">14. Medals / Awards Received</label>
                    <input
                      type="number"
                      min="0"
                      value={newPolice.medalsAwards}
                      onChange={(e) => setNewPolice({ ...newPolice, medalsAwards: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">15. Training / Special Skills</label>
                    <input
                      type="text"
                      placeholder="e.g. Cyber Forensics, Bomb Disposal, Tactical Driving"
                      value={newPolice.specialSkills}
                      onChange={(e) => setNewPolice({ ...newPolice, specialSkills: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">20. Education Qualification</label>
                    <input
                      type="text"
                      placeholder="e.g. B.A. Criminology, M.Sc Cyber Security"
                      value={newPolice.education}
                      onChange={(e) => setNewPolice({ ...newPolice, education: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">22. Commendations</label>
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
                  <User className="w-4 h-4" /> 4. Personal Info & Service History
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">3. Date of Birth</label>
                    <input
                      type="date"
                      value={newPolice.dob}
                      onChange={(e) => setNewPolice({ ...newPolice, dob: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-amber-500 [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">4. Gender</label>
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
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">19. Blood Group</label>
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
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">18. Emergency Contact</label>
                    <input
                      type="text"
                      placeholder="Contact Name & Phone"
                      value={newPolice.emergencyContact}
                      onChange={(e) => setNewPolice({ ...newPolice, emergencyContact: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">17. Promotion History</label>
                    <input
                      type="text"
                      placeholder="e.g. Constable 2018 -> HC 2021 -> SI 2024"
                      value={newPolice.promotionHistory}
                      onChange={(e) => setNewPolice({ ...newPolice, promotionHistory: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-ui-bg border border-ui-border text-text-primary focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">21. Transfer History</label>
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
                  className="px-4 py-2 text-xs font-bold text-text-secondary hover:text-text-primary bg-ui-bg rounded-xl border border-ui-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPolice}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {submittingPolice ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>Create Police Officer</span>
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
                <button
                  type="submit"
                  disabled={!selectedUserToAssign || submittingPolice}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  {submittingPolice ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Confirm Police Assignment</span>
                </button>
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
                <button
                  type="submit"
                  disabled={submittingPolice}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-blue-600/20 disabled:opacity-50"
                >
                  {submittingPolice ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Profile Updates</span>
                </button>
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

    </motion.div>
  );
}
