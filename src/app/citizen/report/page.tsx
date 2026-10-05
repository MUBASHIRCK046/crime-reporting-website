"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/firebase/client";
import { getUserProfile } from "@/lib/profile";
import { fileComprehensiveFIR } from "@/lib/fir";
import { 
  ArrowLeft, Upload, Loader2, CheckCircle2, ChevronRight, ChevronLeft, 
  ShieldAlert, User, FileText, AlertCircle, Trash2, Check,
  UserX, Users, Scale, FileCheck, ShieldCheck, Copy, Plus, Sparkles,
  Building2, MapPin, Calendar, Clock, AlertTriangle, FileBadge
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ==================== VALIDATION CONSTANTS & REGEXES ====================
const NAME_REGEX = /^[a-zA-Z\s.]{2,100}$/;
const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const ALLOWED_FILE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "mp4", "mov", "doc", "docx"];
const ALLOWED_FILE_MIME_TYPES = [
  "application/pdf", 
  "image/jpeg", 
  "image/jpg", 
  "image/png", 
  "video/mp4", 
  "video/quicktime",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

const CRIME_CATEGORIES = [
  "Theft / Burglary / Robbery",
  "Cyber Crime & Online Fraud",
  "Physical Assault / Grievous Hurt",
  "Harassment / Stalking / Threat",
  "Financial Fraud / Cheating",
  "Property Damage / Vandalism",
  "Extortion / Blackmail",
  "Missing Person / Kidnapping",
  "Vehicle Theft / Hit & Run",
  "Domestic Incident",
  "Public Nuisance / Trespassing",
  "Other IPC / Special Law Offence"
];

const STATES_LIST = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi NCR", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry"
];

export interface WitnessItem {
  id: string;
  name: string;
  phone: string;
  statementOrAddress: string;
}

export interface UploadedEvidence {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

// Helpers for Local Date and Time Calculations
const getLocalTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getLocalCurrentTimeString = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export default function ReportIncidentPage() {
  const router = useRouter();
  const [userUid, setUserUid] = useState<string | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  // 5-Step Wizard State
  const [step, setStep] = useState<number>(1);
  const [direction, setDirection] = useState<number>(1); // 1 = forward, -1 = backward
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [firId, setFirId] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  // Drag and Drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedEvidence[]>([]);

  // Dynamic Witnesses state
  const [witnesses, setWitnesses] = useState<WitnessItem[]>([
    { id: "w-1", name: "", phone: "", statementOrAddress: "" }
  ]);

  // Form Data State covering all 5 steps
  const [formData, setFormData] = useState({
    // Step 1: Complainant (Verified KYC)
    complainantName: "",
    guardianName: "",
    phoneNumber: "",
    emailAddress: "",
    idProofNumber: "AADHAAR-XXXX-XXXX-8921",
    idProofType: "Aadhaar",
    complainantAddress: "",
    isKycVerified: true,

    // Step 2: Incident Details
    incidentDate: "",
    incidentTime: "",
    policeStation: "",
    incidentPlace: "",
    district: "",
    state: "Delhi NCR",
    description: "",
    knownAccused: "",
    unknownAccused: "",

    // Step 3: Offence Classification
    crimeCategory: "Theft / Burglary / Robbery",
    offenceType: "",
    lossAmount: "",
    propertyDetails: "",
    injuryDetails: "",
    threatsViolence: "",

    // Step 5: Final Statement
    statementText: "",
    statementDate: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }),
  });

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [shakeFields, setShakeFields] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("type=csr")) {
      router.replace("/citizen/csr");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserUid(user.uid);
        const profResult = await getUserProfile(user.uid);
        if (profResult.profile) {
          const p = profResult.profile;
          const phone = p.mobileNumber || p.phone || "";
          const address = p.residentialAddress || p.address || "";
          const idNum = p.idProofNumber || p.aadhaarNumber || (p.idProof ? "VERIFIED-KYC-DOC" : "AADHAAR-XXXX-XXXX-8921");
          const idType = p.idProofType || "Aadhaar";
          
          setFormData((prev) => ({
            ...prev,
            complainantName: p.name || prev.complainantName,
            guardianName: p.guardianName || prev.guardianName,
            phoneNumber: phone || prev.phoneNumber,
            emailAddress: p.email || user.email || prev.emailAddress,
            complainantAddress: address || prev.complainantAddress,
            idProofNumber: idNum,
            idProofType: idType,
            district: p.district || prev.district,
            state: p.state || prev.state,
          }));
        }
        setCheckingProfile(false);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Sync statement text automatically with incident description if empty
  useEffect(() => {
    if (!formData.statementText && formData.description) {
      setFormData((prev) => ({ ...prev, statementText: prev.description }));
    }
  }, [formData.description, formData.statementText]);

  // Max constraints for Date and Time
  const todayStr = useMemo(() => getLocalTodayDateString(), []);
  const isSelectedDateToday = formData.incidentDate === todayStr;
  const maxTimeForSelectedDate = isSelectedDateToday ? getLocalCurrentTimeString() : undefined;

  // ==================== FIELD VALIDATION LOGIC ====================
  const validateField = (name: string, value: string, currentData = formData): string => {
    const val = value ? value.trim() : "";
    const today = getLocalTodayDateString();
    const currentTime = getLocalCurrentTimeString();

    switch (name) {
      // Step 1: Complainant Fields
      case "complainantName":
        if (!val) return "Complainant name is required.";
        if (!NAME_REGEX.test(val)) return "Name must be 2–100 characters (letters, spaces, dots).";
        return "";

      case "phoneNumber": {
        if (!val) return "Mobile number is required.";
        const cleanPhone = val.replace(/\D/g, "");
        if (!INDIAN_PHONE_REGEX.test(cleanPhone)) return "Enter a valid 10-digit Indian mobile number.";
        return "";
      }

      case "complainantAddress":
        if (!val) return "Residential address is required.";
        if (val.length < 5) return "Address must be at least 5 characters.";
        return "";

      case "idProofNumber":
        if (!val) return "ID proof / Aadhaar is required for KYC.";
        return "";

      // Step 2: Incident Fields (Strict Future Date & Time Checks)
      case "incidentDate": {
        if (!val) return "Date of incident is required.";
        if (val > today) {
          return "Date of incident cannot be in the future.";
        }
        // If selected date is today, and time is entered, check if time is in future
        if (val === today && currentData.incidentTime && currentData.incidentTime > currentTime) {
          return "Selected date is today, but time is in the future.";
        }
        return "";
      }

      case "incidentTime": {
        if (!val) return "Time of incident is required.";
        const selectedDate = currentData.incidentDate;
        if (selectedDate && selectedDate > today) {
          return "Incident date is in the future.";
        }
        if (selectedDate === today && val > currentTime) {
          return "Time of incident cannot be in the future.";
        }
        return "";
      }

      case "policeStation":
        if (!val) return "Police station jurisdiction is required.";
        if (val.length < 2) return "Jurisdiction must be at least 2 characters.";
        return "";

      case "incidentPlace":
        if (!val) return "Exact location / landmark is required.";
        if (val.length < 3) return "Location must be at least 3 characters.";
        return "";

      case "district":
        if (!val) return "District is required.";
        return "";

      case "state":
        if (!val) return "State is required.";
        return "";

      case "description":
        if (!val) return "Incident timeline & description is required.";
        if (val.length < 20) return "Provide at least 20 characters describing what happened.";
        return "";

      // Step 3: Offence Classification
      case "crimeCategory":
        if (!val) return "Please select a crime category.";
        return "";

      case "offenceType":
        if (!val) return "Specific offence type is required (e.g. Armed Snatching).";
        return "";

      // Step 5: Statement
      case "statementText":
        if (!val) return "Complainant digital statement is required.";
        if (val.length < 15) return "Statement must be at least 15 characters.";
        return "";

      default:
        return "";
    }
  };

  const triggerShake = (fieldKey: string) => {
    setShakeFields((prev) => ({ ...prev, [fieldKey]: true }));
    setTimeout(() => {
      setShakeFields((prev) => ({ ...prev, [fieldKey]: false }));
    }, 600);
  };

  // Handle standard Input Changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const updatedData = { ...formData, [name]: value };
    setFormData(updatedData);

    // Revalidate modified field and its co-dependent field (e.g., date & time)
    setErrors((prev) => {
      const next = { ...prev };
      
      const errorMsg = validateField(name, value, updatedData);
      if (!errorMsg) delete next[name];
      else next[name] = errorMsg;

      // When incidentDate or incidentTime changes, recheck the other
      if (name === "incidentDate" && updatedData.incidentTime) {
        const timeErr = validateField("incidentTime", updatedData.incidentTime, updatedData);
        if (!timeErr) delete next.incidentTime;
        else next.incidentTime = timeErr;
      } else if (name === "incidentTime" && updatedData.incidentDate) {
        const dateErr = validateField("incidentDate", updatedData.incidentDate, updatedData);
        if (!dateErr) delete next.incidentDate;
        else next.incidentDate = dateErr;
      }

      return next;
    });
  };

  // Handle onBlur Validation
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const errorMsg = validateField(name, value, formData);
    setErrors((prev) => {
      const next = { ...prev };
      if (errorMsg) next[name] = errorMsg;
      else delete next[name];
      return next;
    });
  };

  // Validate Step on "Next" Click
  const validateCurrentStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};
    const stepTouched: Record<string, boolean> = {};

    if (stepNumber === 1) {
      const step1Fields = ["complainantName", "phoneNumber", "complainantAddress", "idProofNumber"];
      step1Fields.forEach((f) => {
        stepTouched[f] = true;
        const err = validateField(f, (formData as any)[f], formData);
        if (err) {
          newErrors[f] = err;
          triggerShake(f);
        }
      });
    } else if (stepNumber === 2) {
      const step2Fields = ["incidentDate", "incidentTime", "policeStation", "incidentPlace", "district", "state", "description"];
      step2Fields.forEach((f) => {
        stepTouched[f] = true;
        const err = validateField(f, (formData as any)[f], formData);
        if (err) {
          newErrors[f] = err;
          triggerShake(f);
        }
      });
    } else if (stepNumber === 3) {
      const step3Fields = ["crimeCategory", "offenceType"];
      step3Fields.forEach((f) => {
        stepTouched[f] = true;
        const err = validateField(f, (formData as any)[f], formData);
        if (err) {
          newErrors[f] = err;
          triggerShake(f);
        }
      });
    } else if (stepNumber === 4) {
      // Validate witnesses phone numbers if entered
      witnesses.forEach((w, idx) => {
        if (w.phone && !INDIAN_PHONE_REGEX.test(w.phone.replace(/\D/g, ""))) {
          newErrors[`witness_phone_${idx}`] = "Enter a valid 10-digit phone number.";
          triggerShake(`witness_phone_${idx}`);
        }
      });
    } else if (stepNumber === 5) {
      const step5Fields = ["statementText"];
      step5Fields.forEach((f) => {
        stepTouched[f] = true;
        const err = validateField(f, (formData as any)[f], formData);
        if (err) {
          newErrors[f] = err;
          triggerShake(f);
        }
      });
    }

    setTouched((prev) => ({ ...prev, ...stepTouched }));
    setErrors((prev) => ({ ...prev, ...newErrors }));

    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.getElementById(firstErrorField);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep(step)) {
      setDirection(1);
      setStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 120, behavior: "smooth" });
    } else {
      toast.error("Please fill in the required fields with valid details.");
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    setStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep < step) {
      setDirection(-1);
      setStep(targetStep);
      window.scrollTo({ top: 120, behavior: "smooth" });
    } else if (targetStep > step) {
      let canProceed = true;
      for (let s = step; s < targetStep; s++) {
        if (!validateCurrentStep(s)) {
          canProceed = false;
          setStep(s);
          break;
        }
      }
      if (canProceed) {
        setDirection(1);
        setStep(targetStep);
        window.scrollTo({ top: 120, behavior: "smooth" });
      }
    }
  };

  // ==================== EVIDENCE UPLOAD HANDLERS ====================
  const processFiles = (files: FileList | File[]) => {
    const newItems: UploadedEvidence[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      
      if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
        toast.error(`Invalid file "${file.name}". Allowed formats: PDF, JPG, PNG, MP4, DOC.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(`File "${file.name}" exceeds 15 MB limit.`);
        continue;
      }

      let previewUrl = "";
      if (file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
      }

      newItems.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type.includes("pdf") ? "document" : file.type.startsWith("video/") ? "video" : "image",
        previewUrl
      });
    }

    if (newItems.length > 0) {
      setUploadedFiles((prev) => [...prev, ...newItems]);
      toast.success(`Attached ${newItems.length} evidence file(s).`);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  // ==================== WITNESS MANAGEMENT ====================
  const addWitness = () => {
    setWitnesses((prev) => [
      ...prev,
      {
        id: `w-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        name: "",
        phone: "",
        statementOrAddress: ""
      }
    ]);
  };

  const updateWitness = (id: string, field: keyof WitnessItem, val: string) => {
    setWitnesses((prev) =>
      prev.map((w) => (w.id === id ? { ...w, [field]: val } : w))
    );
  };

  const removeWitness = (id: string) => {
    if (witnesses.length <= 1) {
      setWitnesses([{ id: "w-1", name: "", phone: "", statementOrAddress: "" }]);
      return;
    }
    setWitnesses((prev) => prev.filter((w) => w.id !== id));
  };

  // ==================== SUBMISSION HANDLER ====================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userUid) return;

    // Validate all 5 steps
    let hasError = false;
    for (let s = 1; s <= 5; s++) {
      if (!validateCurrentStep(s)) {
        setDirection(s > step ? 1 : -1);
        setStep(s);
        hasError = true;
        break;
      }
    }

    if (hasError) {
      toast.error("Please resolve highlighted errors before final submission.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Encrypting and submitting official FIR to Police Command Desk...");

    try {
      const incidentPayload = {
        incidentDate: formData.incidentDate,
        incidentTime: formData.incidentTime,
        location: formData.incidentPlace,
        policeStation: formData.policeStation,
        district: formData.district,
        state: formData.state,
        description: formData.description,
        knownAccused: formData.knownAccused || "None specified",
        unknownAccused: formData.unknownAccused || "None specified",
        accusedDetails: formData.knownAccused 
          ? `Known: ${formData.knownAccused}. Unknown: ${formData.unknownAccused || "N/A"}`
          : formData.unknownAccused ? `Unknown: ${formData.unknownAccused}` : "Unknown suspect(s)",
      };

      const offencePayload = {
        category: formData.crimeCategory,
        offenceType: formData.offenceType,
        lossAmount: formData.lossAmount ? `₹${formData.lossAmount}` : "Not estimated",
        propertyDetails: formData.propertyDetails || "N/A",
        injuryDetails: formData.injuryDetails || "None reported",
        threatsViolence: formData.threatsViolence || "None reported",
        crimeDescription: formData.description,
      };

      const filesPayload = uploadedFiles.map((f) => ({
        file: f.file,
        type: f.type
      }));

      const witnessesPayload = witnesses
        .filter((w) => w.name && w.name.trim())
        .map((w) => ({
          name: w.name.trim(),
          phone: w.phone.trim(),
          statement: w.statementOrAddress.trim(),
          address: w.statementOrAddress.trim(),
        }));

      const statementPayload = {
        statementText: formData.statementText || formData.description,
        statementDate: new Date().toISOString(),
        complainantName: formData.complainantName,
        kycStatus: "Verified Citizen KYC",
        declarationAgreed: true,
      };

      const result = await fileComprehensiveFIR(
        userUid,
        incidentPayload,
        offencePayload,
        filesPayload,
        witnessesPayload,
        statementPayload
      );

      if (result.error) throw new Error(result.error);

      setFirId(result.firNumber || "");
      setSuccess(true);
      toast.success("Official FIR Successfully Registered & Docketed!", { id: toastId });
    } catch (err: any) {
      console.error("FIR submission error:", err);
      toast.error(err.message || "Failed to submit FIR.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const copyFirNumber = () => {
    if (firId) {
      navigator.clipboard.writeText(firId);
      setCopied(true);
      toast.success("FIR number copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-ui-bg">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-blue-600" />
        </motion.div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-text-tertiary">
          Verifying Citizen KYC Credentials...
        </p>
      </div>
    );
  }

  const stepsMeta = [
    { id: 1, title: "Complainant", subtitle: "KYC Details", icon: User },
    { id: 2, title: "Incident", subtitle: "Time & Location", icon: ShieldAlert },
    { id: 3, title: "Offence", subtitle: "Classification", icon: Scale },
    { id: 4, title: "Evidence", subtitle: "& Witnesses", icon: FileText },
    { id: 5, title: "Statement", subtitle: "Final Declaration", icon: FileCheck },
  ];

  // Motion Variants
  const pageVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 30 : -30,
      opacity: 0,
      filter: "blur(4px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] as const },
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -30 : 30,
      opacity: 0,
      filter: "blur(4px)",
      transition: { duration: 0.25, ease: [0.25, 1, 0.5, 1] as const },
    }),
  };

  return (
    <div className="min-h-screen text-text-primary py-8 px-4 md:px-8 transition-colors duration-300 font-sans relative overflow-hidden">
      
      {/* Background soft ambient gradient blobs */}
      <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto">
        
        {/* ==================== TOP NAVIGATION & HEADER ==================== */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-6"
        >
          <Link 
            href="/citizen" 
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary bg-ui-bg/60 hover:bg-ui-bg border border-ui-border shadow-sm transition-all group"
          >
            <ArrowLeft className="w-4 h-4 text-blue-500 group-hover:-translate-x-0.5 transition-transform" /> 
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Legal Registration
          </div>
        </motion.div>

        {/* Header Titles */}
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">
            Official FIR Registration
          </h1>
          <p className="text-text-secondary mt-1.5 text-sm md:text-base max-w-xl mx-auto">
            Please provide accurate information for legal processing.
          </p>
        </motion.div>

        {/* ==================== 5-STEP PROGRESS STEPPER ==================== */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-panel p-4 md:p-6 rounded-2xl mb-8 shadow-sm border border-ui-border bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl"
        >
          <div className="grid grid-cols-5 gap-2 relative">
            {stepsMeta.map((s) => {
              const isCompleted = step > s.id;
              const isCurrent = step === s.id;
              const Icon = s.icon;

              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => handleStepClick(s.id)}
                  className="flex flex-col items-center group cursor-pointer focus:outline-none transition-all"
                >
                  {/* Step Circle */}
                  <motion.div 
                    animate={{
                      scale: isCurrent ? 1.08 : 1,
                      boxShadow: isCurrent 
                        ? "0 0 20px rgba(59, 130, 246, 0.4), 0 0 0 4px rgba(59, 130, 246, 0.15)"
                        : "none"
                    }}
                    transition={{ duration: 0.3 }}
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 relative ${
                      isCompleted 
                        ? "bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20" 
                        : isCurrent 
                        ? "bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg" 
                        : "bg-ui-bg text-text-tertiary border border-ui-border group-hover:border-blue-400/50"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </motion.div>

                  {/* Step Title */}
                  <div className="mt-2 text-center">
                    <span className={`block text-xs font-extrabold tracking-tight transition-colors ${
                      isCurrent 
                        ? "text-blue-600 dark:text-blue-400" 
                        : isCompleted 
                        ? "text-text-primary" 
                        : "text-text-tertiary group-hover:text-text-secondary"
                    }`}>
                      {s.title}
                    </span>
                    <span className="text-[10px] text-text-tertiary hidden md:block font-medium">
                      {s.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stepper Continuous Progress Track Bar */}
          <div className="w-full bg-ui-border/50 h-2 rounded-full overflow-hidden mt-4 relative">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"
              initial={{ width: "20%" }}
              animate={{ 
                width: `${((step - 1) / 4) * 100}%` 
              }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
            />
          </div>
        </motion.div>

        {/* ==================== MAIN GLASS CONTAINER ==================== */}
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          className="glass-panel p-6 md:p-10 shadow-2xl rounded-3xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl relative overflow-hidden"
        >
          <form onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait" custom={direction}>
              
              {/* ==================== STEP 1: COMPLAINANT DETAILS (VERIFIED KYC) ==================== */}
              {step === 1 && (
                <motion.div 
                  key="step-1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="border-b border-ui-border pb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center gap-2.5">
                        <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        Complainant Details (Verified KYC)
                      </h2>
                      <p className="text-xs md:text-sm text-text-secondary mt-1">
                        Official verified complainant identity attached to the police docket.
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      <ShieldCheck className="w-4 h-4" /> KYC Active
                    </div>
                  </div>

                  {/* Row 1: 3 Columns */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Full Name */}
                    <motion.div 
                      animate={shakeFields.complainantName ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="complainantName"
                          name="complainantName"
                          type="text"
                          value={formData.complainantName}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="e.g. Rahul Sharma"
                          className={`w-full px-4 py-3 glass-input text-sm font-medium ${
                            errors.complainantName ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                          }`}
                        />
                        <div className="absolute right-3 top-3.5 text-emerald-500 pointer-events-none">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                      {errors.complainantName && (
                        <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.complainantName}
                        </p>
                      )}
                    </motion.div>

                    {/* Mobile Number */}
                    <motion.div 
                      animate={shakeFields.phoneNumber ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          maxLength={10}
                          value={formData.phoneNumber}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="10-digit mobile number"
                          className={`w-full px-4 py-3 glass-input text-sm font-medium ${
                            errors.phoneNumber ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                          }`}
                        />
                        <div className="absolute right-3 top-3.5 text-emerald-500 pointer-events-none">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      </div>
                      {errors.phoneNumber && (
                        <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.phoneNumber}
                        </p>
                      )}
                    </motion.div>

                    {/* ID Proof (Aadhaar / KYC ID) */}
                    <motion.div 
                      animate={shakeFields.idProofNumber ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        ID Proof ({formData.idProofType}) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="idProofNumber"
                          name="idProofNumber"
                          type="text"
                          value={formData.idProofNumber}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="Aadhaar / ID Proof"
                          className={`w-full px-4 py-3 glass-input text-sm font-mono tracking-wide ${
                            errors.idProofNumber ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                          }`}
                        />
                        <div className="absolute right-3 top-3.5 text-blue-500 pointer-events-none">
                          <FileBadge className="w-4 h-4" />
                        </div>
                      </div>
                      {errors.idProofNumber && (
                        <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.idProofNumber}
                        </p>
                      )}
                    </motion.div>
                  </div>

                  {/* Row 2: Residential Address (Full Width) */}
                  <motion.div 
                    animate={shakeFields.complainantAddress ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                      Residential Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="complainantAddress"
                      name="complainantAddress"
                      rows={3}
                      value={formData.complainantAddress}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="Enter full permanent / residential address..."
                      className={`w-full px-4 py-3 glass-input text-sm resize-none ${
                        errors.complainantAddress ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                      }`}
                    />
                    {errors.complainantAddress && (
                      <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.complainantAddress}
                      </p>
                    )}
                  </motion.div>

                  {/* Below Fields: Verified Information Notification Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">Verified Citizen Profile Attached</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                        This information is securely pulled from your verified Citizen Profile and attached to the FIR.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ==================== STEP 2: INCIDENT DETAILS ==================== */}
              {step === 2 && (
                <motion.div 
                  key="step-2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="border-b border-ui-border pb-4">
                    <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center gap-2.5">
                      <ShieldAlert className="w-6 h-6 text-amber-500" />
                      Incident Details
                    </h2>
                    <p className="text-xs md:text-sm text-text-secondary mt-1">
                      Chronological timing, exact jurisdiction, and comprehensive narrative of the crime.
                    </p>
                  </div>

                  {/* Row 1: 3 Columns (Date, Time, Police Station) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Date of Incident */}
                    <motion.div 
                      animate={shakeFields.incidentDate ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Date of Incident <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="incidentDate"
                          name="incidentDate"
                          type="date"
                          max={todayStr}
                          value={formData.incidentDate}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full px-4 py-3 glass-input text-sm ${
                            errors.incidentDate ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                          }`}
                        />
                      </div>
                      {errors.incidentDate ? (
                        <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.incidentDate}
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-tertiary mt-1">
                          Must not be in the future (max: Today)
                        </p>
                      )}
                    </motion.div>

                    {/* Time of Incident */}
                    <motion.div 
                      animate={shakeFields.incidentTime ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Time of Incident <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="incidentTime"
                          name="incidentTime"
                          type="time"
                          max={maxTimeForSelectedDate}
                          value={formData.incidentTime}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          className={`w-full px-4 py-3 glass-input text-sm ${
                            errors.incidentTime ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                          }`}
                        />
                      </div>
                      {errors.incidentTime ? (
                        <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.incidentTime}
                        </p>
                      ) : (
                        <p className="text-[11px] text-text-tertiary mt-1">
                          {isSelectedDateToday ? "Cannot exceed current time" : "Time of incident occurrence"}
                        </p>
                      )}
                    </motion.div>

                    {/* Police Station Jurisdiction */}
                    <motion.div 
                      animate={shakeFields.policeStation ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Police Station Jurisdiction <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="policeStation"
                          name="policeStation"
                          type="text"
                          value={formData.policeStation}
                          onChange={handleInputChange}
                          onBlur={handleBlur}
                          placeholder="e.g. Central Police Station"
                          className={`w-full px-4 py-3 glass-input text-sm ${
                            errors.policeStation ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                          }`}
                        />
                        <div className="absolute right-3 top-3.5 text-text-tertiary pointer-events-none">
                          <Building2 className="w-4 h-4" />
                        </div>
                      </div>
                      {errors.policeStation && (
                        <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.policeStation}
                        </p>
                      )}
                    </motion.div>
                  </div>

                  {/* Row 2: Exact Location (Full Width) */}
                  <motion.div 
                    animate={shakeFields.incidentPlace ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                      Exact Location (Full Address / Landmark) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        id="incidentPlace"
                        name="incidentPlace"
                        type="text"
                        value={formData.incidentPlace}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Near Metro Gate 3, Connaught Place, Block B"
                        className={`w-full px-4 py-3 glass-input text-sm ${
                          errors.incidentPlace ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                        }`}
                      />
                      <div className="absolute right-3 top-3.5 text-text-tertiary pointer-events-none">
                        <MapPin className="w-4 h-4" />
                      </div>
                    </div>
                    {errors.incidentPlace && (
                      <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.incidentPlace}
                      </p>
                    )}
                  </motion.div>

                  {/* Row 3: 2 Columns (District, State) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <motion.div 
                      animate={shakeFields.district ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        District <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="district"
                        name="district"
                        type="text"
                        value={formData.district}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="e.g. New Delhi"
                        className={`w-full px-4 py-3 glass-input text-sm ${
                          errors.district ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                        }`}
                      />
                      {errors.district && (
                        <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.district}
                        </p>
                      )}
                    </motion.div>

                    <motion.div 
                      animate={shakeFields.state ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        State / UT <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className={`w-full px-4 py-3 glass-input text-sm [&>option]:bg-white dark:[&>option]:bg-neutral-900 ${
                          errors.state ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                        }`}
                      >
                        {STATES_LIST.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </motion.div>
                  </div>

                  {/* Row 4: Incident Timeline & Description (Full Width Textarea) */}
                  <motion.div 
                    animate={shakeFields.description ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                      Incident Timeline & Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={5}
                      maxLength={2500}
                      value={formData.description}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="Detail the sequence of events chronologically (minimum 20 characters)..."
                      className={`w-full px-4 py-3 glass-input text-sm resize-none ${
                        errors.description ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                      }`}
                    />
                    <div className="flex justify-between items-center text-[11px] text-text-tertiary mt-1">
                      {errors.description ? (
                        <p className="text-xs text-red-500 font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.description}
                        </p>
                      ) : (
                        <span>Provide clear chronological facts</span>
                      )}
                      <span>{formData.description.length}/2500</span>
                    </div>
                  </motion.div>

                  {/* Row 5: 2 Columns (Known Accused Details, Unknown Accused Description) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Known Accused Details <span className="text-text-tertiary font-normal">(If Known)</span>
                      </label>
                      <input
                        id="knownAccused"
                        name="knownAccused"
                        type="text"
                        value={formData.knownAccused}
                        onChange={handleInputChange}
                        placeholder="Name, alias, phone, vehicle or address"
                        className="w-full px-4 py-3 glass-input text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Unknown Accused Description <span className="text-text-tertiary font-normal">(Physical Traits)</span>
                      </label>
                      <input
                        id="unknownAccused"
                        name="unknownAccused"
                        type="text"
                        value={formData.unknownAccused}
                        onChange={handleInputChange}
                        placeholder="Approximate age, height, clothing, marks, accents"
                        className="w-full px-4 py-3 glass-input text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ==================== STEP 3: OFFENCE CLASSIFICATION ==================== */}
              {step === 3 && (
                <motion.div 
                  key="step-3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="border-b border-ui-border pb-4">
                    <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center gap-2.5">
                      <Scale className="w-6 h-6 text-indigo-500" />
                      Offence Classification
                    </h2>
                    <p className="text-xs md:text-sm text-text-secondary mt-1">
                      Legal categorisation, property loss evaluation, and violence indicators for penal IPC charges.
                    </p>
                  </div>

                  {/* Row 1: 3 Columns (Category, Specific Offence Type, Estimated Loss Amount) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Crime Category */}
                    <motion.div 
                      animate={shakeFields.crimeCategory ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Crime Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="crimeCategory"
                        name="crimeCategory"
                        value={formData.crimeCategory}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        className="w-full px-4 py-3 glass-input text-sm [&>option]:bg-white dark:[&>option]:bg-neutral-900"
                      >
                        {CRIME_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </motion.div>

                    {/* Specific Offence Type */}
                    <motion.div 
                      animate={shakeFields.offenceType ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Specific Offence Type <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="offenceType"
                        name="offenceType"
                        type="text"
                        value={formData.offenceType}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Armed Snatching, Cyber Phishing"
                        className={`w-full px-4 py-3 glass-input text-sm ${
                          errors.offenceType ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                        }`}
                      />
                      {errors.offenceType && (
                        <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.offenceType}
                        </p>
                      )}
                    </motion.div>

                    {/* Estimated Loss Amount */}
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Estimated Loss Amount (₹) <span className="text-text-tertiary font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-text-tertiary font-bold text-sm">₹</span>
                        <input
                          id="lossAmount"
                          name="lossAmount"
                          type="number"
                          value={formData.lossAmount}
                          onChange={handleInputChange}
                          placeholder="e.g. 50000"
                          className="w-full pl-8 pr-4 py-3 glass-input text-sm font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Property Details (Lost/Damaged) – Full Width */}
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                      Property Details (Lost / Stolen / Damaged)
                    </label>
                    <textarea
                      id="propertyDetails"
                      name="propertyDetails"
                      rows={3}
                      value={formData.propertyDetails}
                      onChange={handleInputChange}
                      placeholder="Itemise make, model, IMEI numbers, serial numbers, jewellery markings, vehicle registration, or digital transaction IDs..."
                      className="w-full px-4 py-3 glass-input text-sm resize-none"
                    />
                  </div>

                  {/* Row 3: 2 Columns (Injury Details, Threats / Violence Used) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Injury Details (If Any)
                      </label>
                      <input
                        id="injuryDetails"
                        name="injuryDetails"
                        type="text"
                        value={formData.injuryDetails}
                        onChange={handleInputChange}
                        placeholder="e.g. Minor blunt trauma to left arm, medical memo issued"
                        className="w-full px-4 py-3 glass-input text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Threats / Violence Used
                      </label>
                      <input
                        id="threatsViolence"
                        name="threatsViolence"
                        type="text"
                        value={formData.threatsViolence}
                        onChange={handleInputChange}
                        placeholder="e.g. Sharp weapon displayed, verbal intimidation, blackmail"
                        className="w-full px-4 py-3 glass-input text-sm"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ==================== STEP 4: EVIDENCE & WITNESS ==================== */}
              {step === 4 && (
                <motion.div 
                  key="step-4"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-8"
                >
                  <div className="border-b border-ui-border pb-4">
                    <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center gap-2.5">
                      <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      Evidence & Witness
                    </h2>
                    <p className="text-xs md:text-sm text-text-secondary mt-1">
                      Upload supporting digital evidence documents and add eyewitness testimonies.
                    </p>
                  </div>

                  {/* TOP SECTION: Drag-and-Drop Upload Area */}
                  <div>
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                      Upload Evidence (Images / Documents / Videos)
                    </label>

                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 ${
                        isDragging 
                          ? "border-blue-500 bg-blue-500/10 scale-[1.01] shadow-xl shadow-blue-500/10" 
                          : "border-ui-border hover:border-blue-400/50 bg-ui-bg/40 hover:bg-ui-bg/70"
                      }`}
                    >
                      <input
                        id="fileUploadInput"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png,.mp4,.mov,.doc,.docx"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />

                      <motion.div 
                        animate={{ y: isDragging ? -4 : 0 }}
                        className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-sm"
                      >
                        <Upload className="w-8 h-8" />
                      </motion.div>

                      <p className="text-base font-bold text-text-primary">
                        Drag & drop files or click to browse
                      </p>
                      <p className="text-xs text-text-tertiary mt-1.5 max-w-md mx-auto">
                        Supports PDF, JPG, PNG, MP4, and DOC files up to 15 MB each. All uploads are hashed and encrypted for forensic validity.
                      </p>

                      <div className="mt-5">
                        <label
                          htmlFor="fileUploadInput"
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                          <Plus className="w-4 h-4" /> Browse Files
                        </label>
                      </div>
                    </div>

                    {/* Uploaded File Chips / List */}
                    {uploadedFiles.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                        <AnimatePresence>
                          {uploadedFiles.map((fileItem) => (
                            <motion.div
                              key={fileItem.id}
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="p-3.5 rounded-2xl bg-ui-bg border border-ui-border flex items-center justify-between gap-3 shadow-sm group hover:border-blue-500/30"
                            >
                              <div className="flex items-center gap-3 truncate">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="truncate">
                                  <p className="text-xs font-bold text-text-primary truncate">{fileItem.name}</p>
                                  <p className="text-[10px] text-text-tertiary">
                                    {(fileItem.size / (1024 * 1024)).toFixed(2)} MB • {fileItem.type}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFile(fileItem.id)}
                                className="p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                                title="Remove file"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM SECTION: Witness Details */}
                  <div className="pt-4 border-t border-ui-border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-black text-text-primary flex items-center gap-2">
                          <Users className="w-5 h-5 text-emerald-500" />
                          Witness Details
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Add multiple witnesses with statements and contact phone numbers.
                        </p>
                      </div>

                      <motion.button
                        type="button"
                        onClick={addWitness}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Witness
                      </motion.button>
                    </div>

                    {/* Dynamic Witnesses Forms */}
                    <div className="space-y-4">
                      <AnimatePresence>
                        {witnesses.map((w, index) => (
                          <motion.div
                            key={w.id}
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: "auto", y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="p-5 rounded-2xl bg-ui-bg/60 border border-ui-border space-y-4 relative"
                          >
                            <div className="flex items-center justify-between border-b border-ui-border/50 pb-2">
                              <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                                Witness #{index + 1}
                              </span>
                              {witnesses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeWitness(w.id)}
                                  className="text-xs font-semibold text-red-500 hover:text-red-600 inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remove
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold text-text-secondary mb-1">
                                  Witness Full Name
                                </label>
                                <input
                                  type="text"
                                  value={w.name}
                                  onChange={(e) => updateWitness(w.id, "name", e.target.value)}
                                  placeholder="e.g. Ramesh Chandra"
                                  className="w-full px-3.5 py-2.5 glass-input text-sm"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-text-secondary mb-1">
                                  Phone Number
                                </label>
                                <input
                                  type="tel"
                                  maxLength={10}
                                  value={w.phone}
                                  onChange={(e) => updateWitness(w.id, "phone", e.target.value)}
                                  placeholder="10-digit mobile number"
                                  className="w-full px-3.5 py-2.5 glass-input text-sm"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-text-secondary mb-1">
                                  Witness Statement / Address
                                </label>
                                <input
                                  type="text"
                                  value={w.statementOrAddress}
                                  onChange={(e) => updateWitness(w.id, "statementOrAddress", e.target.value)}
                                  placeholder="Witness testimony summary or address details..."
                                  className="w-full px-3.5 py-2.5 glass-input text-sm"
                                />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ==================== STEP 5: FINAL COMPLAINANT STATEMENT ==================== */}
              {step === 5 && (
                <motion.div 
                  key="step-5"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="border-b border-ui-border pb-4">
                    <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center gap-2.5">
                      <FileCheck className="w-6 h-6 text-emerald-500" />
                      Final Complainant Statement
                    </h2>
                    <p className="text-xs md:text-sm text-text-secondary mt-1">
                      Formal legal oath declaration and verified sign-off before police docket generation.
                    </p>
                  </div>

                  {/* Highlighted Glass Information Box Declaration */}
                  <div className="p-6 rounded-3xl bg-gradient-to-tr from-amber-500/10 via-orange-500/10 to-yellow-500/10 border border-amber-500/30 shadow-lg shadow-amber-500/5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-text-primary uppercase tracking-wide">
                          Legal Undertaking & Oath
                        </h4>
                        <p className="text-sm text-text-secondary mt-1.5 leading-relaxed italic font-serif">
                          "I hereby declare that the information provided in this First Information Report is true and correct to the best of my knowledge and belief. I understand that providing false information is a punishable offence."
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Written Complaint Statement (Digital) Textarea */}
                  <motion.div 
                    animate={shakeFields.statementText ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                      Written Complaint Statement (Digital) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="statementText"
                      name="statementText"
                      rows={5}
                      value={formData.statementText}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      placeholder="Review or write your finalized legal statement..."
                      className={`w-full px-4 py-3.5 glass-input text-sm resize-none ${
                        errors.statementText ? "border-red-500 ring-2 ring-red-500/20 bg-red-500/5" : ""
                      }`}
                    />
                    {errors.statementText && (
                      <p className="text-xs text-red-500 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.statementText}
                      </p>
                    )}
                  </motion.div>

                  {/* Date of Statement */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Date of Statement
                      </label>
                      <div className="relative">
                        <input
                          id="statementDate"
                          name="statementDate"
                          type="text"
                          readOnly
                          value={formData.statementDate}
                          className="w-full px-4 py-3 glass-input text-sm font-mono bg-ui-bg/70 cursor-not-allowed text-text-secondary"
                        />
                        <div className="absolute right-3 top-3.5 text-text-tertiary">
                          <Calendar className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                        Complainant Signature / Seal
                      </label>
                      <div className="px-4 py-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                          Digitally Authenticated ({formData.complainantName || "Citizen KYC"})
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ==================== BOTTOM BUTTON NAVIGATION ==================== */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-ui-border gap-4">
              {step > 1 ? (
                <motion.button
                  type="button"
                  onClick={handlePrev}
                  disabled={loading}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl border border-ui-border bg-ui-bg hover:bg-white/60 dark:hover:bg-neutral-800 text-text-primary text-sm font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </motion.button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <motion.button
                  type="button"
                  onClick={handleNext}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-extrabold transition-all shadow-xl shadow-blue-500/25 cursor-pointer ml-auto"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ y: -2, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-black transition-all shadow-xl shadow-indigo-500/30 cursor-pointer disabled:opacity-50 ml-auto"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Registering FIR...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> Submit Legal FIR
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </form>
        </motion.div>
      </div>

      {/* ==================== SUCCESS SUBMISSION OVERLAY MODAL ==================== */}
      <AnimatePresence>
        {success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              className="glass-panel p-8 md:p-10 max-w-lg w-full text-center shadow-2xl rounded-3xl border border-emerald-500/40 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl"
            >
              {/* Animated Checkmark SVG */}
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
                >
                  <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
                </motion.div>
              </div>

              <h2 className="text-2xl md:text-3xl font-black text-text-primary mb-2">
                FIR Successfully Registered
              </h2>
              <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                Your FIR has been successfully submitted for legal processing and assigned to the police command desk.
              </p>

              {/* Generated FIR Number Pill */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl mb-8 flex items-center justify-between">
                <div className="text-left">
                  <span className="block text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">
                    Official Reference Number
                  </span>
                  <span className="font-mono text-lg font-black text-emerald-600 dark:text-emerald-400 select-all">
                    {firId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyFirNumber}
                  className="p-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 transition-colors"
                  title="Copy FIR Number"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/citizen"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-extrabold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </Link>

                <Link
                  href="/citizen"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-2xl text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-ui-bg/80 border border-ui-border transition-all"
                >
                  View FIR Status
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
