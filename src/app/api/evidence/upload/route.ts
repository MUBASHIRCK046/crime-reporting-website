// KEYWORD: SHARED-EVIDENCE-UPLOAD-API
// PURPOSE: Handles multipart file uploads and saves photos/videos to the local evidence storage directory.

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { 
  ensureEvidenceRootExists, 
  getComplaintFolderName, 
  sanitizeName, 
  EVIDENCE_ROOT 
} from "@/lib/evidenceConfig";

// Allowed MIME types for case evidence
const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  // Videos
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  // Documents
  "application/pdf"
]);

// Maximum allowed size per file: 100MB
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await ensureEvidenceRootExists();

    const formData = await req.formData();
    const citizenName = (formData.get("citizenName") as string) || "Citizen";
    const complaintId = (formData.get("complaintId") as string) || Date.now().toString();

    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      // Check if a single file was sent under field "file"
      const singleFile = formData.get("file") as File | null;
      if (singleFile) {
        files.push(singleFile);
      } else {
        return NextResponse.json(
          { success: false, error: "No files provided for upload." },
          { status: 400 }
        );
      }
    }

    // 1. Validate all files before writing
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { success: false, error: `File "${file.name}" exceeds maximum allowed size of 100MB.` },
          { status: 400 }
        );
      }

      if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { success: false, error: `File type "${file.type}" is not supported.` },
          { status: 400 }
        );
      }
    }

    // 2. Prepare destination directory: evidence/<CitizenName>_<ComplaintId>/
    const folderName = getComplaintFolderName(citizenName, complaintId);
    const targetDir = path.join(EVIDENCE_ROOT, folderName);
    await fs.mkdir(targetDir, { recursive: true });

    const savedEvidence: Array<{
      fileName: string;
      fileType: string;
      filePath: string;
      fileSize: number;
      url: string;
    }> = [];

    // 3. Save files to local disk
    for (const file of files) {
      const sanitizedBaseName = sanitizeName(file.name);
      const uniqueFileName = `${Date.now()}_${sanitizedBaseName}`;
      const destinationPath = path.join(targetDir, uniqueFileName);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(destinationPath, buffer);

      const relativeFilePath = `evidence/${folderName}/${uniqueFileName}`;
      const serveUrl = `/api/evidence/serve?path=${encodeURIComponent(relativeFilePath)}`;

      savedEvidence.push({
        fileName: sanitizedBaseName,
        fileType: file.type || "application/octet-stream",
        filePath: relativeFilePath,
        fileSize: file.size,
        url: serveUrl
      });
    }

    return NextResponse.json({
      success: true,
      folderName,
      evidence: savedEvidence,
      message: `${savedEvidence.length} evidence file(s) saved to local disk successfully.`
    });

  } catch (error: any) {
    console.error("Error in evidence upload route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save evidence to local disk." },
      { status: 500 }
    );
  }
}
