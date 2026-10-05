"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, CheckCircle2, Clock, MapPin, ExternalLink, FileText, Lock, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { getSOSRecordByToken } from "@/lib/sos-token";

export default function PublicSOSDetailsPage() {
  const params = useParams();
  const token = params?.token as string;

  const [alert, setAlert] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchRecord() {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      const record = await getSOSRecordByToken(token);
      
      if (record) {
        setAlert(record);
      } else {
        setNotFound(true);
      }
      setLoading(false);
    }

    fetchRecord();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#040815] flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 dark:text-emerald-400 mb-4" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Verifying Public SOS Record Token...</p>
      </div>
    );
  }

  if (notFound || !alert) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#040815] flex items-center justify-center p-4 text-slate-900 dark:text-slate-100">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">SOS Record Not Found</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            The emergency SOS record you are trying to view does not exist or the security verification token is invalid or expired.
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs hover:bg-slate-800 transition-all shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Main Portal</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const caseId = `SOS-${(alert.id || "2026").substring(0, 8).toUpperCase()}`;
  const triggerDate = new Date(alert.createdAt || alert.timestamp).toLocaleString();
  const resolvedDate = alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : triggerDate;
  const mapsUrl = alert.latitude && alert.longitude 
    ? `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#040815] text-slate-900 dark:text-slate-100 transition-colors duration-300 p-4 md:p-8 lg:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    Official Public Record
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">• Read-Only Verification</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-1 flex items-center gap-2">
                  Emergency SOS Details
                </h1>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                Resolved & Archived
              </span>
              <Link
                href={`/sos/print/${token}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all"
              >
                <span>🖨 Print Document</span>
              </Link>
            </div>
          </div>

          {/* Case Ref Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Case Reference</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{caseId}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Triggered Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{triggerDate}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Resolved Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{resolvedDate}</span>
            </div>
          </div>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Citizen Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Citizen Telemetry</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Citizen Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{alert.citizenName || "Unknown Citizen"}</span>
              </div>
              {alert.citizenPhone && alert.citizenPhone !== "N/A" && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Contact Phone</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">📞 {alert.citizenPhone}</span>
                </div>
              )}
              {alert.citizenAddress && alert.citizenAddress !== "N/A" && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Registered Location</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{alert.citizenAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* GPS Coordinates & Map */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <MapPin className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>GPS Telemetry</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Latitude</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{alert.latitude ? alert.latitude.toFixed(6) : "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Longitude</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{alert.longitude ? alert.longitude.toFixed(6) : "N/A"}</span>
                </div>
              </div>

              {mapsUrl && (
                <div className="pt-2">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-bold border border-cyan-500/30 transition-all text-xs"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Open Telemetry Map</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Resolution Statement Box */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Official Resolution Statement</span>
            </h2>
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <Lock className="w-3 h-3" />
              <span>Verified Immutable</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed italic">
            "{alert.resolutionNote || alert.resolutionNoteImmutable || 'Emergency dispatch successfully completed and verified safe by precinct command.'}"
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 pt-4 space-y-1">
          <p className="font-semibold">Kozhikode Rural Precinct Command &bull; Official Digital Verification Portal</p>
          <p className="text-[10px]">This is a read-only document. Unauthorized modification attempts are logged.</p>
        </div>

      </div>
    </div>
  );
}
