// KEYWORD: SHARED-DATE-FORMATTER
// PURPOSE: Formats dates into day/month/year (DD/MM/YYYY) format for all print, export, and report documents.

/**
 * Formats a date string, timestamp, or Date object into DD/MM/YYYY format.
 * Example: 2026-09-17 => "17/09/2026"
 */
export function formatPrintDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Formats a date string, timestamp, or Date object into DD/MM/YYYY, HH:MM:SS AM/PM format.
 * Example: 2026-09-17T14:30:00 => "17/09/2026, 02:30:00 PM"
 */
export function formatPrintDateTime(dateInput?: string | number | Date | null): string {
  if (!dateInput) return "N/A";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "N/A";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, "0");

  return `${day}/${month}/${year}, ${strHours}:${minutes}:${seconds} ${ampm}`;
}
