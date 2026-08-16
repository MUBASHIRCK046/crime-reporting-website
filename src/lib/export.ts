import { CaseLog } from './types';

export async function exportCaseToPDF(complaint: any, caseLogs: CaseLog[]) {
  const jsPDFModule = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const jsPDF = jsPDFModule.default;
  const autoTable = autoTableModule.default;
  
  const doc = new jsPDF();

  const formattedDate = new Date(complaint.createdAt).toLocaleDateString();
  const headerText = `${complaint.type || 'FIR'} Details: ${complaint.title} (${formattedDate})`;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138);
  doc.text(headerText, 14, 22);
  
  // Basic Info Table
  const basicInfo = [
    ['Complaint ID', complaint.id?.toUpperCase() || 'N/A'],
    ['Citizen Name', complaint.citizenName || 'Name Not Available'],
    ['Title', complaint.title || 'N/A'],
    ['Status', complaint.status || 'N/A'],
    ['Filed Date', new Date(complaint.createdAt).toLocaleString()],
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
        new Date(log.timestamp).toLocaleString(),
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

  const formattedDate = new Date(complaint.createdAt).toLocaleDateString();
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
        <div class="grid"><div class="label">Complaint ID:</div><div class="value">${complaint.id?.toUpperCase()}</div></div>
        <div class="grid"><div class="label">Citizen Name:</div><div class="value">${complaint.citizenName || 'Name Not Available'}</div></div>
        <div class="grid"><div class="label">Title:</div><div class="value">${complaint.title}</div></div>
        <div class="grid"><div class="label">Status:</div><div class="value">${complaint.status}</div></div>
        <div class="grid"><div class="label">Filed Date:</div><div class="value">${new Date(complaint.createdAt).toLocaleString()}</div></div>
        <div class="grid"><div class="label">Location:</div><div class="value">${complaint.location}</div></div>
        <div class="grid"><div class="label">Officer:</div><div class="value">${complaint.assignedOfficerName || 'Unassigned'}</div></div>
        
        <h2>Description</h2>
        <p>${complaint.description}</p>
        
        <h2>Investigation Timeline</h2>
        ${caseLogs.length > 0 ? caseLogs.map(log => `
          <div class="log-entry">
            <div class="log-meta">${log.authorName} (${log.authorRole}) &bull; ${new Date(log.timestamp).toLocaleString()}</div>
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
