import { CaseLog } from './types';
import { formatCaseId } from '@/shared/utils/caseId';
import { formatPrintDate, formatPrintDateTime } from '@/shared/utils/dateFormatter';

export async function exportCaseToPDF(complaint: any, caseLogs: CaseLog[]) {
  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;
  
  const doc = new jsPDF();

  const formattedDate = formatPrintDate(complaint.createdAt);
  const headerText = `${complaint.type || 'FIR'} Details: ${complaint.title} (${formattedDate})`;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138);
  doc.text(headerText, 14, 22);
  
  // Basic Info Table
  const basicInfo = [
    ['Complaint ID', complaint ? formatCaseId(complaint) : 'N/A'],
    ['Citizen Name', complaint.citizenName || 'Name Not Available'],
    ['Title', complaint.title || 'N/A'],
    ['Status', complaint.status || 'N/A'],
    ['Filed Date', formatPrintDateTime(complaint.createdAt)],
    ['Location', complaint.location || 'N/A'],
    ['Assigned Officer', complaint.assignedOfficerName || 'Unassigned']
  ];

  autoTable(doc, {
    startY: 30,
    head: [['Field', 'Value']],
    body: basicInfo,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] }
  });

  // Description
  const finalY = (doc as any).lastAutoTable.finalY || 30;
  doc.setFontSize(14);
  doc.setTextColor(55, 65, 81);
  doc.text('Description', 14, finalY + 15);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const splitText = doc.splitTextToSize(complaint.description || 'No description provided.', 180);
  doc.text(splitText, 14, finalY + 22);

  // Investigation Timeline Table
  let logsY = finalY + 22 + (splitText.length * 5) + 10;
  
  if (logsY > 250) {
    doc.addPage();
    logsY = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(55, 65, 81);
  doc.text('Investigation Timeline', 14, logsY);

  const logsData = caseLogs.length > 0 
    ? caseLogs.map(log => [
        formatPrintDateTime(log.timestamp),
        `${log.authorName} (${log.authorRole})`,
        log.text
      ])
    : [['-', '-', 'No updates recorded yet.']];

  autoTable(doc, {
    startY: logsY + 5,
    head: [['Date & Time', 'Author', 'Update Details']],
    body: logsData,
    theme: 'striped',
    headStyles: { fillColor: [16, 185, 129] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 40 },
      2: { cellWidth: 'auto' }
    }
  });

  const fileName = `${(complaint.type || 'FIR')}_${complaint.title}_Report.pdf`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(fileName);
}

export function printCaseDetails(complaint: any, caseLogs: CaseLog[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formattedDate = formatPrintDate(complaint.createdAt);
  const headerText = `${complaint.type || 'FIR'} Details: ${complaint.title} (${formattedDate})`;

  const htmlContent = `
    <html>
      <head>
        <title>Print Case Details - ${complaint.title}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #333; line-height: 1.5; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { border-bottom: 2px solid #2563eb; padding-bottom: 10px; color: #1e3a8a; font-size: 24px; }
          h2 { border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px; color: #374151; }
          .grid { display: grid; grid-template-columns: 150px 1fr; margin-bottom: 10px; }
          .label { font-weight: bold; color: #4b5563; }
          .value { color: #111827; }
          .log-entry { margin-bottom: 15px; padding-left: 15px; border-left: 3px solid #10b981; }
          .log-meta { font-size: 0.85em; color: #6b7280; font-weight: bold; margin-bottom: 5px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="float: right; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 20px;">Print Document</button>
        
        <h1>${headerText}</h1>
        
        <h2>General Information</h2>
        <div class="grid"><div class="label">Complaint ID:</div><div class="value">${complaint ? formatCaseId(complaint) : 'N/A'}</div></div>
        <div class="grid"><div class="label">Citizen Name:</div><div class="value">${complaint.citizenName || 'Name Not Available'}</div></div>
        <div class="grid"><div class="label">Title:</div><div class="value">${complaint.title}</div></div>
        <div class="grid"><div class="label">Status:</div><div class="value">${complaint.status}</div></div>
        <div class="grid"><div class="label">Filed Date:</div><div class="value">${formatPrintDateTime(complaint.createdAt)}</div></div>
        <div class="grid"><div class="label">Location:</div><div class="value">${complaint.location}</div></div>
        <div class="grid"><div class="label">Officer:</div><div class="value">${complaint.assignedOfficerName || 'Unassigned'}</div></div>
        
        <h2>Description</h2>
        <p>${complaint.description}</p>
        
        <h2>Investigation Timeline</h2>
        ${caseLogs.length > 0 ? caseLogs.map(log => `
          <div class="log-entry">
            <div class="log-meta">${log.authorName} (${log.authorRole}) &bull; ${formatPrintDateTime(log.timestamp)}</div>
            <div>${log.text}</div>
          </div>
        `).join('') : '<p>No updates recorded yet.</p>'}
        
        <script>
          // Auto trigger print when fully loaded
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function printSOSHistoryRecord(alert: any) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const alertDate = formatPrintDateTime(alert.createdAt || alert.timestamp);
  const resolvedDate = formatPrintDateTime(alert.resolvedAt || new Date());
  const caseId = `SOS-${(alert.id || '2026').substring(0, 8).toUpperCase()}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print SOS Record - ${caseId}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #111827; line-height: 1.5; padding: 30px; max-width: 800px; margin: 0 auto; background: #fff; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #059669; padding-bottom: 12px; margin-bottom: 24px; }
          .title { font-size: 22px; font-weight: 800; color: #065f46; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: 800; font-size: 12px; text-transform: uppercase; background: #d1fae5; color: #065f46; border: 1px solid #34d399; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
          .grid { display: grid; grid-template-columns: 160px 1fr; gap: 8px 16px; font-size: 13px; margin-bottom: 6px; }
          .label { font-weight: 700; color: #4b5563; }
          .value { color: #111827; font-weight: 500; }
          .note-box { background: #f9fafb; border: 1px solid #e5e7eb; border-left: 4px solid #059669; padding: 14px; border-radius: 6px; font-size: 13px; color: #1f2937; margin-top: 8px; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px dashed #d1d5db; font-size: 11px; color: #6b7280; display: flex; justify-content: space-between; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 8px 18px; background: #059669; color: white; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">🖨 Print Record</button>
        </div>
        
        <div class="header">
          <div>
            <h1 class="title">Official Emergency SOS Record</h1>
            <div class="subtitle">Precinct Command Administration &bull; Historical Incident Archive</div>
          </div>
          <div>
            <span class="badge">Resolved</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Incident Identification</div>
          <div class="grid"><div class="label">Reference ID:</div><div class="value">${caseId}</div></div>
          <div class="grid"><div class="label">Status:</div><div class="value">${alert.status || 'Resolved'}</div></div>
          <div class="grid"><div class="label">Trigger Date & Time:</div><div class="value">${alertDate}</div></div>
          <div class="grid"><div class="label">Resolution Date:</div><div class="value">${resolvedDate}</div></div>
        </div>
        
        <div class="section">
          <div class="section-title">Citizen Telemetry & Profile</div>
          <div class="grid"><div class="label">Citizen Name:</div><div class="value">${alert.citizenName || 'N/A'}</div></div>
          <div class="grid"><div class="label">Citizen ID:</div><div class="value">${alert.citizenId ? alert.citizenId.substring(0, 12).toUpperCase() : 'N/A'}</div></div>
          <div class="grid"><div class="label">Contact Phone:</div><div class="value">${alert.citizenPhone || 'N/A'}</div></div>
          <div class="grid"><div class="label">Email Address:</div><div class="value">${alert.citizenEmail || 'N/A'}</div></div>
          <div class="grid"><div class="label">Registered Address:</div><div class="value">${alert.citizenAddress || 'N/A'}</div></div>
        </div>

        <div class="section">
          <div class="section-title">GPS Location Telemetry</div>
          <div class="grid"><div class="label">Latitude:</div><div class="value">${alert.latitude ? alert.latitude.toFixed(6) : 'N/A'}</div></div>
          <div class="grid"><div class="label">Longitude:</div><div class="value">${alert.longitude ? alert.longitude.toFixed(6) : 'N/A'}</div></div>
        </div>

        <div class="section">
          <div class="section-title">Resolution Statement & Notes</div>
          <div class="note-box">
            ${alert.resolutionNote || alert.resolutionNoteImmutable || 'Emergency dispatch successfully completed and verified safe by precinct command.'}
          </div>
        </div>

        <div class="footer">
          <div>Verified Record &bull; Kozhikode Rural Police Command</div>
          <div>Printed: ${formatPrintDateTime(new Date())}</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

