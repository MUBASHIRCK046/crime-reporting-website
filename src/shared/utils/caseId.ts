// KEYWORD: SHARED-CASE-ID
// PURPOSE: Formats case IDs based on date and complaint type (e.g. 17/09/2026 => 1709FIR or 1709CSR).

export function formatCaseId(complaintOrDate?: any, maybeType?: string): string {
  if (!complaintOrDate) return "N/A";

  let dateObj: Date = new Date();
  let type = "FIR";

  if (typeof complaintOrDate === "object" && !(complaintOrDate instanceof Date)) {
    const rawDate = complaintOrDate.createdAt || complaintOrDate.date || complaintOrDate.timestamp;
    if (rawDate) {
      const parsed = new Date(rawDate);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
    if (complaintOrDate.type) {
      type = complaintOrDate.type.toUpperCase();
    } else if (complaintOrDate.firNumber) {
      type = "FIR";
    }
  } else {
    if (complaintOrDate instanceof Date) {
      dateObj = complaintOrDate;
    } else if (typeof complaintOrDate === "string" || typeof complaintOrDate === "number") {
      const parsed = new Date(complaintOrDate);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }
    if (maybeType) {
      type = maybeType.toUpperCase();
    }
  }

  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const cleanType = type === "CSR" ? "CSR" : "FIR";

  return `${day}${month}${cleanType}`;
}
