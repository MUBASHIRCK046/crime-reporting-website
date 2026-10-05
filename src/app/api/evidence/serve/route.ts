// KEYWORD: SHARED-EVIDENCE-SERVE-API
// PURPOSE: Streams and serves evidence photos/videos securely with HTTP Range support for video playback.

import { NextRequest, NextResponse } from "next/server";
import { resolveSafeEvidencePath } from "@/lib/evidenceConfig";
import fs from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";

// Helper to determine MIME type from extension
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".mkv":
      return "video/x-matroska";
    case ".pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const relativePath = searchParams.get("path");

    if (!relativePath) {
      return NextResponse.json(
        { error: "Missing required 'path' query parameter." },
        { status: 400 }
      );
    }

    // 1. Security Check: Path Traversal Prevention
    const { safePath, isValid } = resolveSafeEvidencePath(relativePath);
    if (!isValid) {
      return NextResponse.json(
        { error: "Access denied. Invalid evidence path." },
        { status: 403 }
      );
    }

    // 2. Check File Existence
    if (!fs.existsSync(safePath)) {
      return NextResponse.json(
        { error: "Evidence file not found on local disk." },
        { status: 404 }
      );
    }

    const fileStat = await stat(safePath);
    if (!fileStat.isFile()) {
      return NextResponse.json(
        { error: "Requested resource is not a file." },
        { status: 400 }
      );
    }

    const fileSize = fileStat.size;
    const contentType = getMimeType(safePath);
    const rangeHeader = req.headers.get("range");

    // 3. HTTP Range Requests (Crucial for Video Streaming & Scrubbing without UI Lag)
    if (rangeHeader && contentType.startsWith("video/")) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const nodeStream = fs.createReadStream(safePath, { start, end });
      const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600, immutable",
        },
      });
    }

    // 4. Standard Full Stream (Images & Full File Downloads)
    const nodeStream = fs.createReadStream(safePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });

  } catch (error: any) {
    console.error("Error serving evidence file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to serve evidence file." },
      { status: 500 }
    );
  }
}
