import { db, storage } from "@/firebase/client";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FIRIncident, FIROffence, FIREvidence, FIRWitness, FIRStatement, FIROfficerReview } from "./types";

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

    // 1. Create Incident
    const incidentRef = await addDoc(collection(db, "incidents"), {
      ...incidentData,
      firNumber,
      complainantId: citizenId,
      createdAt: new Date().toISOString()
    });

    // 2. Create Offence
    await addDoc(collection(db, "offences"), {
      ...offenceData,
      firNumber
    });

    // 3. Upload Evidence
    for (const item of evidenceFiles) {
      const uniqueFileName = `${Date.now()}_${item.file.name}`;
      const storageRef = ref(storage, `fir_evidence/${firNumber}/${uniqueFileName}`);
      await uploadBytes(storageRef, item.file);
      const fileURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "evidence"), {
        firNumber,
        fileName: item.file.name,
        fileType: item.type,
        fileURL,
        uploadedBy: citizenId,
        uploadedDate: new Date().toISOString()
      });
    }

    // 4. Create Witnesses
    for (const witness of witnessesData) {
      if (witness.name) {
        await addDoc(collection(db, "witnesses"), {
          ...witness,
          firNumber
        });
      }
    }

    // 5. Create Statement
    await addDoc(collection(db, "statements"), {
      ...statementData,
      firNumber,
      date: new Date().toISOString(),
      verificationStatus: "Pending"
    });

    // 6. Create Initial Officer Review (Empty/Unassigned)
    await addDoc(collection(db, "officer_reviews"), {
      firNumber,
      status: "Submitted",
      updatedAt: new Date().toISOString()
    });

    return { success: true, firNumber, error: null };
  } catch (error: any) {
    console.error("Error filing FIR:", error);
    return { success: false, error: error.message };
  }
}
