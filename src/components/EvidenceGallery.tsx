// KEYWORD: SHARED-EVIDENCE-GALLERY
// PURPOSE: Lazy-loaded evidence gallery with video streaming, image lightbox, and metadata display.

"use client";

import React, { useState } from "react";
import { 
  Image as ImageIcon, Video, FileText, Download, Eye, 
  Play, Maximize2, X, AlertCircle, Film, Sparkles 
} from "lucide-react";

export interface EvidenceItem {
  fileName?: string;
  fileType?: string;
  filePath?: string;
  fileSize?: number;
  url?: string;
}

interface EvidenceGalleryProps {
  complaint: any;
  className?: string;
}

// Format bytes to human readable (KB, MB)
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Generate URL for an evidence item
function getEvidenceUrl(item: EvidenceItem): string {
  if (item.url) return item.url;
  if (item.filePath) return `/api/evidence/serve?path=${encodeURIComponent(item.filePath)}`;
  return "";
}

export default function EvidenceGallery({ complaint, className = "" }: EvidenceGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeVideoPath, setActiveVideoPath] = useState<string | null>(null);

  // Extract all evidence items (supporting new evidence array, legacy evidenceFiles, or legacy imageUrl)
  const items: EvidenceItem[] = React.useMemo(() => {
    if (!complaint) return [];

    const list: EvidenceItem[] = [];

    // 1. New evidence array
    if (Array.isArray(complaint.evidence)) {
      list.push(...complaint.evidence);
    }

    // 2. Legacy evidenceFiles array
    if (Array.isArray(complaint.evidenceFiles)) {
      for (const item of complaint.evidenceFiles) {
        if (!list.some(e => e.filePath === item.filePath || e.fileName === item.fileName)) {
          list.push(item);
        }
      }
    }

    // 3. Single legacy imageUrl if not already in list
    if (complaint.imageUrl && list.length === 0) {
      list.push({
        fileName: "Evidence Image",
        fileType: "image/jpeg",
        url: complaint.imageUrl,
        filePath: complaint.imageUrl.startsWith("evidence/") ? complaint.imageUrl : undefined
      });
    }

    return list;
  }, [complaint]);

  if (items.length === 0) {
    return (
      <div className={`bg-ui-bg border border-ui-border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center backdrop-blur-sm ${className}`}>
        <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center mb-2 text-text-tertiary">
          <ImageIcon className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-text-secondary">No evidence or attachments uploaded.</p>
        <p className="text-[11px] text-text-tertiary mt-0.5">Physical and digital evidence docket is empty.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase font-bold text-text-secondary tracking-wider flex items-center gap-2">
          <Film className="w-4 h-4 text-blue-500" />
          Case Evidence & Attachments
        </span>
        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          {items.length} {items.length === 1 ? "File" : "Files"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, index) => {
          const fileUrl = getEvidenceUrl(item);
          const isVideo = item.fileType?.startsWith("video/") || /\.(mp4|webm|mov|mkv)$/i.test(item.fileName || "");
          const isPdf = item.fileType === "application/pdf" || /\.pdf$/i.test(item.fileName || "");

          if (isVideo) {
            const isPlaying = activeVideoPath === (item.filePath || item.fileName || index.toString());

            return (
              <div 
                key={index}
                className="group relative rounded-2xl overflow-hidden border border-ui-border bg-slate-900/40 backdrop-blur-md p-3 flex flex-col justify-between hover:border-blue-500/40 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
                      <Video className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary truncate max-w-[140px]" title={item.fileName}>
                        {item.fileName || `Video_${index + 1}`}
                      </p>
                      <p className="text-[10px] text-text-tertiary font-mono">
                        {formatFileSize(item.fileSize) || "Video Stream"}
                      </p>
                    </div>
                  </div>

                  <a 
                    href={fileUrl} 
                    download={item.fileName || "evidence_video.mp4"}
                    className="p-1.5 rounded-lg bg-black/10 dark:bg-white/10 hover:bg-blue-500 hover:text-white text-text-secondary transition-all"
                    title="Download Video"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Video Player (Lazy-Loaded on Demand) */}
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  {isPlaying ? (
                    <video
                      src={fileUrl}
                      controls
                      autoPlay
                      preload="metadata"
                      className="w-full h-full object-contain"
                    >
                      Your browser does not support HTML5 video streaming.
                    </video>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveVideoPath(item.filePath || item.fileName || index.toString())}
                      className="w-full h-full flex flex-col items-center justify-center gap-2 group-hover:bg-blue-500/10 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 ml-0.5 fill-white" />
                      </div>
                      <span className="text-[11px] font-bold text-white/80 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-md">
                        Click to Stream Video
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          }

          if (isPdf) {
            return (
              <div 
                key={index}
                className="rounded-2xl border border-ui-border bg-ui-bg p-3 flex items-center justify-between hover:border-blue-500/30 transition-all shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500 border border-orange-500/20">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-primary truncate max-w-[130px]" title={item.fileName}>
                      {item.fileName || `Document_${index + 1}`}
                    </p>
                    <p className="text-[10px] text-text-tertiary">
                      {formatFileSize(item.fileSize) || "PDF Document"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                    title="View Document"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={fileUrl}
                    download={item.fileName || "evidence_doc.pdf"}
                    className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-colors"
                    title="Download Document"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          }

          // Image item
          return (
            <div 
              key={index}
              className="group relative rounded-2xl overflow-hidden border border-ui-border bg-ui-bg p-2 hover:border-blue-500/40 transition-all shadow-sm"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden bg-black/5 dark:bg-white/5">
                <img
                  src={fileUrl}
                  alt={item.fileName || "Evidence thumbnail"}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                  <button
                    type="button"
                    onClick={() => setSelectedImage(fileUrl)}
                    className="p-2 rounded-xl bg-white/90 text-slate-900 hover:scale-110 transition-transform shadow-lg"
                    title="Enlarge Image"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <a
                    href={fileUrl}
                    download={item.fileName || "evidence_photo.jpg"}
                    className="p-2 rounded-xl bg-white/90 text-slate-900 hover:scale-110 transition-transform shadow-lg"
                    title="Download Image"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </div>

              <div className="mt-2 px-1 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-text-primary truncate max-w-[140px]" title={item.fileName}>
                  {item.fileName || `Photo_${index + 1}`}
                </span>
                <span className="text-text-tertiary font-mono text-[10px]">
                  {formatFileSize(item.fileSize)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-12 right-0 flex items-center gap-3">
              <a
                href={selectedImage}
                download="evidence_full.jpg"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Download Full Resolution
              </a>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={selectedImage}
              alt="Evidence Full View"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-white/20 shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
