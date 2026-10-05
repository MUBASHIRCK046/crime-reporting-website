"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/firebase/client";
import { getUserProfile } from "@/lib/profile";
import { fileComplaint, uploadLocalEvidence } from "@/lib/complaints";
import { formatCaseId } from "@/shared/utils/caseId";
import { 
  ArrowLeft, Upload, Loader2, CheckCircle2, Check, Copy, 
  Trash2, AlertCircle, FileText, ImageIcon, Video
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function FileCSRPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userUid, setUserUid] = useState<string | null>(null);
  const [citizenName, setCitizenName] = useState<string>("Citizen");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "video" | null>(null);

  // Submission & Validation States
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [csrId, setCsrId] = useState("");
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserUid(user.uid);
        try {
          const { profile } = await getUserProfile(user.uid);
          if (profile?.name) {
            setCitizenName(profile.name);
          }
        } catch (e) {
          // ignore
        }
        setCheckingAuth(false);
      } else {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // File Selection Handler (Images & Videos)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const isImg = file.type.startsWith("image/");
    const isVid = file.type.startsWith("video/");

    if (!isImg && !isVid) {
      toast.error("Please select an image (JPG, PNG, WebP) or video (MP4, WebM, MOV).");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("Evidence file size must be under 100 MB.");
      return;
    }

    setSelectedFile(file);
    setFileType(isImg ? "image" : "video");
    setFilePreview(URL.createObjectURL(file));
  };

  const removeFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Incident title is required.";
    } else if (title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters.";
    }

    if (!location.trim()) {
      newErrors.location = "Location is required.";
    } else if (location.trim().length < 3) {
      newErrors.location = "Location must be at least 3 characters.";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required.";
    } else if (description.trim().length < 10) {
      newErrors.description = "Please provide at least 10 characters in description.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ title: true, location: true, description: true });

    if (!validateForm()) {
      toast.error("Please fill in the required fields.");
      return;
    }

    if (!userUid) return;

    setLoading(true);
    const toastId = toast.loading("Filing CSR complaint and saving evidence...");

    try {
      const generatedCaseId = formatCaseId(new Date(), "CSR");
      let evidenceMetadata: any[] = [];
      let primaryImageUrl: string | null = null;

      // 1. Upload evidence to local disk if a file was selected
      if (selectedFile) {
        const uploadResult = await uploadLocalEvidence([selectedFile], citizenName, generatedCaseId);
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Failed to save evidence to local disk.");
        }
        evidenceMetadata = uploadResult.evidence || [];
        if (evidenceMetadata.length > 0) {
          primaryImageUrl = evidenceMetadata[0].url || `/api/evidence/serve?path=${encodeURIComponent(evidenceMetadata[0].filePath)}`;
        }
      }

      // 2. Save complaint + evidence metadata to Firebase Firestore
      const result = await fileComplaint(
        userUid,
        title.trim(),
        description.trim(),
        location.trim(),
        primaryImageUrl,
        evidenceMetadata
      );

      if (!result.success || result.error) {
        throw new Error(result.error || "Failed to file CSR complaint in database.");
      }

      setCsrId(generatedCaseId);
      setSuccess(true);
      toast.success("CSR Complaint & Local Evidence successfully registered!", { id: toastId });
    } catch (err: any) {
      console.error("Error filing CSR:", err);
      toast.error(err.message || "Failed to file CSR complaint.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const copyCsrId = () => {
    if (csrId) {
      navigator.clipboard.writeText(csrId);
      setCopied(true);
      toast.success("CSR Reference ID copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ui-bg">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-text-primary py-12 px-4 md:px-8 font-sans relative overflow-hidden flex flex-col justify-between">
      
      {/* Soft ambient background gradient blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 dark:bg-purple-900/15 blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 dark:bg-blue-900/15 blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[30%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-900/15 blur-[130px] pointer-events-none -z-10" />

      <div className="max-w-2xl mx-auto w-full">
        
        {/* Back Link */}
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-6"
        >
          <Link 
            href="/citizen" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-text-tertiary group-hover:-translate-x-0.5 transition-transform" /> 
            Back to Dashboard
          </Link>
        </motion.div>

        {/* Page Title & Subtitle */}
        <motion.div 
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">
            File a CSR Complaint
          </h1>
          <p className="text-text-secondary mt-1.5 text-sm">
            Provide details for a non-cognizable incident.
          </p>
        </motion.div>

        {/* Main Centered Glassmorphism Container */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="glass-panel p-6 md:p-10 shadow-xl rounded-3xl border border-white/60 dark:border-white/10 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-2xl"
        >
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            
            {/* Field 1: Incident Title */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Incident Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: "" }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, title: true }))}
                placeholder="e.g. Lost Mobile Phone"
                className={`w-full px-4 py-3.5 glass-input text-sm text-text-primary placeholder:text-text-tertiary/60 transition-all ${
                  touched.title && errors.title ? "border-red-500 ring-2 ring-red-500/20" : ""
                }`}
              />
              {touched.title && errors.title && (
                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.title}
                </p>
              )}
            </div>

            {/* Field 2: Location */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Location
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (errors.location) setErrors((prev) => ({ ...prev, location: "" }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, location: true }))}
                placeholder="Enter exact address"
                className={`w-full px-4 py-3.5 glass-input text-sm text-text-primary placeholder:text-text-tertiary/60 transition-all ${
                  touched.location && errors.location ? "border-red-500 ring-2 ring-red-500/20" : ""
                }`}
              />
              {touched.location && errors.location && (
                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.location}
                </p>
              )}
            </div>

            {/* Field 3: Description */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: "" }));
                }}
                onBlur={() => setTouched((prev) => ({ ...prev, description: true }))}
                placeholder="Describe what happened..."
                className={`w-full px-4 py-3.5 glass-input text-sm text-text-primary placeholder:text-text-tertiary/60 resize-none transition-all ${
                  touched.description && errors.description ? "border-red-500 ring-2 ring-red-500/20" : ""
                }`}
              />
              {touched.description && errors.description && (
                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {errors.description}
                </p>
              )}
            </div>

            {/* Field 4: Evidence Photo or Video (Optional) */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-2">
                Evidence Photo or Video (Saved to Local Disk Storage)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
                id="evidenceFileInput"
              />

              {!selectedFile ? (
                <label
                  htmlFor="evidenceFileInput"
                  className="w-full flex flex-col items-center justify-center p-8 border border-dashed border-ui-border rounded-2xl cursor-pointer hover:border-blue-400/50 hover:bg-ui-bg/60 transition-all bg-ui-bg/30 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                    Click to upload photo or video evidence
                  </span>
                  <span className="text-[10px] text-text-tertiary mt-1">
                    Supports JPG, PNG, WebP, MP4, WebM (up to 100MB)
                  </span>
                </label>
              ) : (
                <div className="p-3.5 rounded-2xl bg-ui-bg border border-ui-border flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3 truncate">
                    {fileType === "image" && filePreview ? (
                      <img 
                        src={filePreview} 
                        alt="Evidence preview" 
                        className="w-10 h-10 rounded-xl object-cover border border-ui-border shrink-0"
                      />
                    ) : fileType === "video" ? (
                      <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20">
                        <Video className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold text-text-primary truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-text-tertiary">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {fileType === "video" ? "Video Evidence" : "Photo Evidence"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-2 rounded-xl text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Remove evidence"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Submit CSR Button */}
            <div className="pt-2">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm font-extrabold transition-all shadow-xl shadow-blue-500/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting CSR...
                  </>
                ) : (
                  <>
                    Submit CSR
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 15 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="glass-panel p-8 md:p-10 max-w-md w-full text-center shadow-2xl rounded-3xl border border-emerald-500/30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-2xl"
            >
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <h2 className="text-2xl font-black text-text-primary mb-1.5">
                CSR Complaint Filed
              </h2>
              <p className="text-xs text-text-secondary mb-6 leading-relaxed">
                Your Community Service Register (non-cognizable) complaint has been docketed with the police command desk.
              </p>

              {/* Reference ID Pill */}
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-6 flex items-center justify-between">
                <div className="text-left">
                  <span className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                    Complaint ID
                  </span>
                  <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 select-all">
                    {csrId}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copyCsrId}
                  className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 transition-colors"
                  title="Copy ID"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Actions */}
              <Link
                href="/citizen"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Citizen Dashboard
              </Link>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
