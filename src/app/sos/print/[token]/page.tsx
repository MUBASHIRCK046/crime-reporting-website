"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, ShieldAlert, CheckCircle2, MapPin, 
  ExternalLink, FileText, Lock, Printer, ArrowLeft, Loader2, AlertCircle 
} from "lucide-react";
import { getSOSRecordByToken } from "@/lib/sos-token";
import { formatPrintDateTime } from "@/shared/utils/dateFormatter";

export default function PrintableSOSDocumentPage() {
  const params = useParams();
  const token = params?.token as string;

  const [alert, setAlert] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [printed, setPrinted] = useState(false);

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

  // Auto-trigger browser print dialog when document is loaded
  useEffect(() => {
    if (alert && !printed) {
      const timer = setTimeout(() => {
        try {
          window.print();
          setPrinted(true);
        } catch (e) {
          console.warn("Auto-print prevented by browser policy:", e);
        }
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [alert, printed]);

  const handleManualPrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 mb-4" />
        <p className="text-sm font-bold text-slate-700">Loading Printable SOS Document...</p>
      </div>
    );
  }

  if (notFound || !alert) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 font-sans">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">SOS Record Not Found</h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            The emergency SOS printable record you requested does not exist or the security verification token is invalid.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all shadow-sm"
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
  const triggerDate = formatPrintDateTime(alert.createdAt || alert.timestamp);
  const resolvedDate = formatPrintDateTime(alert.resolvedAt || alert.createdAt || alert.timestamp);
  const mapsUrl = alert.latitude && alert.longitude 
    ? `https://www.google.com/maps/search/?api=1&query=${alert.latitude},${alert.longitude}`
    : null;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 flex flex-col items-center justify-start font-sans print:p-0 print:bg-white text-slate-900">
      
      {/* Top Action Bar (Hidden during printing via .no-print) */}
      <div className="no-print w-full max-w-[210mm] mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase">Printable SOS Document</h2>
            <p className="text-[11px] text-slate-500">Official Precinct Archive &bull; A4 Printable Format</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleManualPrint}
            className="flex-1 sm:flex-initial py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print SOS Document</span>
          </button>
        </div>
      </div>

      {/* DEDICATED A4 PRINTABLE SOS DOCUMENT */}
      <div className="printable-document w-full max-w-[210mm] bg-white border-2 border-slate-900 rounded-none sm:rounded-xl p-8 sm:p-12 shadow-2xl print:shadow-none print:border-2 print:border-black print:rounded-none print:p-0 print:w-full space-y-6">
        
        {/* Document Header */}
        <div className="flex items-start justify-between border-b-4 border-emerald-700 pb-6 mb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded border border-emerald-300">
                Official Precinct Document
              </span>
              <span className="text-xs text-slate-500 font-bold">&bull; Confidential Archive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 uppercase tracking-tight">
              Emergency SOS Incident Record
            </h1>
            <p className="text-xs text-slate-600 font-bold uppercase tracking-wider">
              Kozhikode Rural Precinct Command &bull; Central Control Grid
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-900 border-2 border-emerald-600 rounded-full text-xs font-black uppercase tracking-wider">
              STATUS: RESOLVED
            </span>
          </div>
        </div>

        {/* 1. Incident Reference */}
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1">
            1. Incident Identification
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">SOS Case ID</span>
              <span className="font-mono font-black text-emerald-800 text-sm">{caseId}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Current Status</span>
              <span className="font-bold text-emerald-800 uppercase">Resolved</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Triggered Date/Time</span>
              <span className="font-semibold text-slate-900">{triggerDate}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Resolved Date/Time</span>
              <span className="font-semibold text-slate-900">{resolvedDate}</span>
            </div>
          </div>
        </div>

        {/* 2. Citizen Details */}
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1">
            2. Citizen Telemetry & Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <div className="grid grid-cols-3">
                <span className="font-bold text-slate-600">Citizen Name:</span>
                <span className="col-span-2 font-bold text-slate-950">{alert.citizenName || "Unknown Citizen"}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-bold text-slate-600">Citizen ID:</span>
                <span className="col-span-2 font-mono text-slate-900">{alert.citizenId ? alert.citizenId.substring(0, 12).toUpperCase() : "N/A"}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-bold text-slate-600">Phone Number:</span>
                <span className="col-span-2 font-semibold text-slate-900">{alert.citizenPhone || "N/A"}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-3">
                <span className="font-bold text-slate-600">Email Address:</span>
                <span className="col-span-2 font-semibold text-slate-900">{alert.citizenEmail || "N/A"}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-bold text-slate-600">Registered Address:</span>
                <span className="col-span-2 font-medium text-slate-900">{alert.citizenAddress || "N/A"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Location Telemetry */}
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1">
            3. Location & Coordinates Telemetry
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Latitude</span>
              <span className="font-mono font-bold text-slate-900">{alert.latitude ? alert.latitude.toFixed(6) : "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Longitude</span>
              <span className="font-mono font-bold text-slate-900">{alert.longitude ? alert.longitude.toFixed(6) : "N/A"}</span>
            </div>
          </div>
          {mapsUrl && (
            <div className="text-xs text-slate-600">
              <span className="font-bold">Google Maps Telemetry Link:</span>{" "}
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-mono text-[11px]">
                {mapsUrl}
              </a>
            </div>
          )}
        </div>

        {/* 4. Resolution Notes & Statement */}
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 border-b border-slate-300 pb-1">
            4. Resolution Statement & Precinct Notes
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 border-l-4 border-emerald-600 border-t border-r border-b border-slate-200 text-xs font-medium text-slate-900 leading-relaxed italic">
            "{alert.resolutionNote || alert.resolutionNoteImmutable || 'Emergency dispatch successfully completed and verified safe by precinct command.'}"
          </div>
        </div>

        {/* Footer & Verification Stamp */}
        <div className="pt-8 border-t-2 border-slate-300 flex flex-col sm:flex-row items-center justify-between text-[10px] text-slate-600 gap-4">
          <div>
            <p className="font-extrabold text-slate-800 uppercase">Kozhikode Rural Police Command &bull; Verification Seal</p>
            <p>Security Token: <span className="font-mono font-bold">{token}</span></p>
          </div>
          <div className="text-right">
            <p>Document Generated: {formatPrintDateTime(new Date())}</p>
            <p className="font-bold text-emerald-800 uppercase">Status: Official Immutable Record</p>
          </div>
        </div>

      </div>

      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-document {
            box-shadow: none !important;
            border: 2px solid #000000 !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

    </div>
  );
}
