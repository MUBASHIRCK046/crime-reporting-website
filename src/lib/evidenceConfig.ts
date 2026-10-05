// KEYWORD: SHARED-EVIDENCE-CONFIG
// PURPOSE: Manages local evidence storage paths, folder generation, and security checks.

import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

// Configurable local evidence storage root directory
export const EVIDENCE_ROOT = 
  process.env.EVIDENCE_ROOT || path.join(process.cwd(), "evidence");

/**
 * Ensures that the root evidence directory exists on disk.
 */
export async function ensureEvidenceRootExists(): Promise<string> {
  if (!existsSync(EVIDENCE_ROOT)) {
    await fs.mkdir(EVIDENCE_ROOT, { recursive: true });
  }
  return EVIDENCE_ROOT;
}

/**
 * Sanitizes a string for safe filesystem folder or file naming.
 * Removes path traversal characters, slashes, and illegal symbols.
 */
export function sanitizeName(name: string): string {
  if (!name) return "unnamed";
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\.{2,}/g, "_")
    .trim()
    .slice(0, 80);
}

/**
 * Computes the complaint-specific folder name, e.g. "Rahul_1709CSR"
 */
export function getComplaintFolderName(citizenName: string, complaintId: string): string {
  const safeName = sanitizeName(citizenName || "Citizen");
  const safeId = sanitizeName(complaintId || Date.now().toString());
  return `${safeName}_${safeId}`;
}

/**
 * Resolves and validates a relative path inside the EVIDENCE_ROOT.
 * Prevents directory traversal attacks (e.g. "../../etc/passwd").
 */
export function resolveSafeEvidencePath(relativePath: string): { safePath: string; isValid: boolean } {
  // Normalize and strip leading evidence prefix if present
  let cleanRel = relativePath.replace(/^evidence[/\\]/, "");
  cleanRel = path.normalize(cleanRel).replace(/^(\.\.[/\\])+/, "");

  const fullPath = path.resolve(EVIDENCE_ROOT, cleanRel);
  const normalizedRoot = path.resolve(EVIDENCE_ROOT);

  // Check that the resolved full path is strictly inside EVIDENCE_ROOT
  const isValid = fullPath.startsWith(normalizedRoot);
  return { safePath: fullPath, isValid };
}
