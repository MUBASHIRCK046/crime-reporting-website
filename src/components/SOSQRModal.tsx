"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Printer, ShieldCheck, Copy, Check, ExternalLink } from "lucide-react";
import { generateSOSToken, getPublicAppUrl } from "@/lib/sos-token";
import { formatPrintDate } from "@/shared/utils/dateFormatter";
import { toast } from "sonner";

interface SOSQRModalProps {
  alert: any | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function SOSQRModal({ alert, isOpen, onClose }: SOSQRModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !alert) return null;

  const secureToken = alert.publicToken || generateSOSToken(alert.id);
  const baseUrl = getPublicAppUrl();
  const publicUrl = `${baseUrl}/sos/print/${secureToken}`;
  const caseId = `SOS-${(alert.id || "2026").substring(0, 8).toUpperCase()}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Public verification URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    try {
      const svg = document.getElementById("sos-qr-code-svg");
      if (!svg) {
        toast.error("QR Code element not found");
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width + 40;
        canvas.height = img.height + 40;
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 20, 20);
          const pngUrl = canvas.toDataURL("image/png");
          const downloadLink = document.createElement("a");
          downloadLink.href = pngUrl;
          downloadLink.download = `SOS_QR_${caseId}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          toast.success("QR Code downloaded successfully");
        }
      };

      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err: any) {
      console.error("QR Download Error:", err);
      toast.error("Failed to download QR Code");
    }
  };

  const handlePrintQR = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svg = document.getElementById("sos-qr-code-svg");
    const svgHtml = svg ? svg.outerHTML : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR - ${caseId}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 40px; background: #f8fafc; }
            .card { background: #ffffff; border: 2px solid #059669; padding: 32px; border-radius: 20px; display: inline-block; max-width: 360px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
            h2 { margin: 0 0 6px 0; color: #065f46; font-size: 18px; text-transform: uppercase; }
            p { margin: 4px 0; color: #4b5563; font-size: 12px; }
            .qr-box { margin: 24px 0; padding: 16px; background: #ffffff; border-radius: 12px; display: flex; justify-content: center; }
            .badge { display: inline-block; padding: 4px 12px; background: #d1fae5; color: #065f46; font-weight: 800; border-radius: 9999px; font-size: 10px; text-transform: uppercase; margin-bottom: 12px; }
            .footer { margin-top: 16px; font-size: 10px; color: #9ca3af; }
            @media print { button { display: none; } body { padding: 0; background: #fff; } .card { border: 2px solid #000; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div style="margin-bottom: 20px;" class="no-print">
            <button onclick="window.print()" style="padding: 8px 18px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">🖨 Print QR Pass</button>
          </div>
          <div class="card">
            <div class="badge">Official Police Archive</div>
            <h2>🚨 SOS History QR Pass</h2>
            <p><strong>Case ID:</strong> ${caseId}</p>
            <p><strong>Citizen:</strong> ${alert.citizenName || "Unknown"}</p>
            <p><strong>Date:</strong> ${formatPrintDate(alert.createdAt || alert.timestamp)}</p>
            <div class="qr-box">${svgHtml}</div>
            <p style="font-size: 11px; font-weight: 600; color: #065f46;">Scan with smartphone camera to view public verification record</p>
            <div class="footer">Precinct Command &bull; Verification Token</div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wide leading-tight">
                  SOS QR Verification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Scan to view public read-only history record
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Reference Info */}
          <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3.5 mb-6 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Case Reference</span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">{caseId}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">Citizen</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">{alert.citizenName || "Unknown"}</span>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border-2 border-dashed border-emerald-500/40 shadow-inner mb-6 relative">
            <QRCodeSVG
              id="sos-qr-code-svg"
              value={publicUrl}
              size={220}
              level="H"
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#042f2e"
            />
            <p className="text-[11px] font-bold text-emerald-700 mt-3 text-center">
              Scan with phone camera to view SOS Details
            </p>
          </div>

          {/* Public Link Box */}
          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-6">
            <input
              type="text"
              readOnly
              value={publicUrl}
              className="flex-1 bg-transparent px-2 text-[11px] font-mono text-slate-700 dark:text-slate-300 outline-none truncate"
            />
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-emerald-600 transition-colors shadow-sm cursor-pointer shrink-0"
              title="Copy Public Link"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors cursor-pointer shrink-0"
              title="Open Page in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleDownloadQR}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download QR</span>
            </button>

            <button
              onClick={handlePrintQR}
              className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print QR</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
