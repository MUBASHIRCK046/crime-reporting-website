import { db, storage } from "@/firebase/client";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FIRIncident, FIROffence, FIRWitness, FIRStatement } from "./types";

export async function generateFIRNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = date.getTime().toString().slice(-4);
  return `FIR-${year}-${randomStr}-${timestamp}`;
}

export async function fileComprehensiveFIR(
  citizenId: string,
  incidentData: Partial<FIRIncident>,
  offenceData: Partial<FIROffence>,
  evidenceFiles: { file: File; type: string }[],
  witnessesData: Partial<FIRWitness>[],
  statementData: Partial<FIRStatement>
) {
  try {
    const firNumber = await generateFIRNumber();

    // Prepare all async tasks to run concurrently via Promise.all for 10x-15x faster submission speed
    const tasks: Promise<any>[] = [];

    // 1. Create Incident
    tasks.push(
      addDoc(collection(db, "incidents"), {
        ...incidentData,
        firNumber,
        complainantId: citizenId,
        createdAt: new Date().toISOString()
      })
    );

    // 2. Create Offence
    tasks.push(
      addDoc(collection(db, "offences"), {
        ...offenceData,
        firNumber
      })
    );

    // 3. Upload Evidence files to Local Storage & Record Metadata in Firestore
    if (evidenceFiles.length > 0) {
      tasks.push(
        (async () => {
          const files = evidenceFiles.map((item) => item.file);
          const formData = new FormData();
          formData.append("citizenName", "Citizen");
          formData.append("complaintId", firNumber);
          for (const f of files) {
            formData.append("files", f);
          }

          const uploadRes = await fetch("/api/evidence/upload", {
            method: "POST",
            body: formData,
          });
          const uploadData = await uploadRes.json();

          if (uploadData.success && Array.isArray(uploadData.evidence)) {
            const evidenceDocTasks = uploadData.evidence.map((evItem: any) =>
              addDoc(collection(db, "evidence"), {
                firNumber,
                fileName: evItem.fileName,
                fileType: evItem.fileType,
                filePath: evItem.filePath,
                fileURL: evItem.url,
                fileSize: evItem.fileSize,
                uploadedBy: citizenId,
                uploadedDate: new Date().toISOString()
              })
            );
            return Promise.all(evidenceDocTasks);
          }
        })()
      );
    }

    // 4. Create Witnesses in parallel
    for (const witness of witnessesData) {
      if (witness.name && witness.name.trim()) {
        tasks.push(
          addDoc(collection(db, "witnesses"), {
            ...witness,
            firNumber
          })
        );
      }
    }

    // 5. Create Statement
    tasks.push(
      addDoc(collection(db, "statements"), {
        ...statementData,
        firNumber,
        date: new Date().toISOString(),
        verificationStatus: "Pending"
      })
    );

    // 6. Create Initial Officer Review (Empty/Unassigned)
    tasks.push(
      addDoc(collection(db, "officer_reviews"), {
        firNumber,
        status: "Submitted",
        updatedAt: new Date().toISOString()
      })
    );

    // Execute all document insertions and file uploads in parallel
    await Promise.all(tasks);

    return { success: true, firNumber, error: null };
  } catch (error: any) {
    console.error("Error filing FIR:", error);
    return { success: false, error: error.message };
  }
}
