import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Add header to PDF
export const addHeader = (doc, start, end) => {
  // === LOAD IMAGES ===
  const caintaSeal = "/cainta-seal.png";
  const menroLogo = "/menro-logo.png";

  // === LEFT SEAL ===
  doc.addImage(
    caintaSeal,
    "PNG",
    18,  // x
    10,  // y
    24,  // width
    24   // height
  );

  // === RIGHT LOGO ===
  doc.addImage(
    menroLogo,
    "PNG",
    168,
    10,
    24,
    24
  );

  // === CENTER HEADER TEXT ===
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("REPUBLIC OF THE PHILIPPINES", 105, 12, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.text("Province of Rizal", 105, 16, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("MUNICIPALITY OF CAINTA", 105, 21, { align: "center" });

  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text(
    "OFFICE OF THE MUNICIPAL ENVIRONMENT AND NATURAL RESOURCES (MENRO)",
    105,
    26,
    { align: "center" }
  );

  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text(
    "Cainta Municipal Hall, Bonifacio Ave, Sto. Domingo, Cainta, Rizal",
    105,
    30,
    { align: "center" }
  );

  // === DIVIDER LINE ===
  doc.setDrawColor(0);
  doc.setLineWidth(0.8);
  doc.line(14, 36, 196, 36);

  // === REPORT TITLE ===
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(
    "INFRASTRUCTURE & ENVIRONMENTAL REPORTS SUMMARY",
    105,
    44,
    { align: "center" }
  );

  // === DATE RANGE ===
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Reporting Period: ${start.toLocaleDateString()} – ${end.toLocaleDateString()}`,
    14,
    50
  );
};

// Add footer to PDF
export const addFooter = (doc) => {
  const pageSize = doc.internal.pageSize;
  const pageHeight = pageSize.height || pageSize.getHeight();

  // Footer line
  doc.setLineWidth(0.5);
  doc.line(14, pageHeight - 20, 196, pageHeight - 20);

  doc.setFontSize(8);
  doc.setTextColor(80);

  // Left footer
  doc.text(
    "MENRO – Municipality of Cainta | Official Report",
    14,
    pageHeight - 12
  );

  // Right footer (page number)
  doc.text(
    `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
    196,
    pageHeight - 12,
    { align: "right" }
  );
};

// Get infrastructure type
const getInfrastructureType = (report) => {
  if (report.yolo?.drainage_count > 0) return "Drainage";
  return report.issueType || "Unknown";
};

// Filter and sort reports by date range
const filterReportsByDate = (reports, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const filtered = reports.filter((r) => {
    if (!r.uploadedAt?.toDate) return false;
    const date = r.uploadedAt.toDate();
    return date >= start && date <= end;
  });

  // Sort (newest first)
  filtered.sort((a, b) => {
    const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(0);
    const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(0);
    return dateB - dateA;
  });

  return filtered;
};

// Main PDF generation function
export const generatePDF = (reports, startDate, endDate) => {
  // Validation
  if (!startDate || !endDate) {
    alert("Please select a start date and end date before generating the report.");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert("Start date cannot be later than end date.");
    return;
  }

  const doc = new jsPDF();

  // Convert to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Filter reports by date range
  const filtered = filterReportsByDate(reports, startDate, endDate);

  if (filtered.length === 0) {
    alert("No reports found for the selected date range.");
    return;
  }

  // Summary table
  const summary = [
    ["Total Reports", filtered.length],
    ["Pending", filtered.filter((r) => r.status === "Pending").length],
    ["Withdrawn", filtered.filter((r) => r.status === "Withdrawn").length],
    ["Resolved", filtered.filter((r) => r.status === "Resolved").length],
    ["Drainage Reports", filtered.filter((r) => r.yolo?.drainage_count > 0).length],
  ];

  autoTable(doc, {
    head: [["Metric", "Count"]],
    body: summary,
    startY: 58,
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246] },
    didDrawPage: () => {
      addHeader(doc, start, end);
      addFooter(doc);
    }
  });

  // Detailed reports table
  const tableData = filtered.map((r) => [
    r.id.substring(0, 8) + "...",
    `${r.userDetails?.firstName || ""} ${r.userDetails?.lastName || ""}`.trim() || "-",
    getInfrastructureType(r),
    r.userDetails?.barangay || "-",
    r.status || "Pending",
    r.uploadedAt?.toDate().toLocaleDateString() || "-",
    r.uploadedAt?.toDate().toLocaleTimeString() || "-",
  ]);

  autoTable(doc, {
    head: [["ID", "Reporter", "Type", "Barangay", "Status", "Date", "Time"]],
    body: tableData,
    startY: doc.lastAutoTable.finalY + 10,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
    didDrawPage: () => {
      addHeader(doc, start, end);
      addFooter(doc);
    },
  });

  // Save file
  doc.save(`Report_${startDate}_${endDate}.pdf`);
};

// Export as CSV
export const generateCSV = (reports, startDate, endDate) => {
  // Validation
  if (!startDate || !endDate) {
    alert("Please select a start date and end date before generating the report.");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert("Start date cannot be later than end date.");
    return;
  }

  // Filter reports by date range
  const filtered = filterReportsByDate(reports, startDate, endDate);

  if (filtered.length === 0) {
    alert("No reports found for the selected date range.");
    return;
  }

  // CSV Header
  const headers = [
    "Report ID",
    "First Name",
    "Last Name",
    "Type",
    "Barangay",
    "Address",
    "Status",
    "Date",
    "Time",
    "Latitude",
    "Longitude"
  ];

  // CSV Rows
  const rows = filtered.map((r) => [
    r.id,
    r.userDetails?.firstName || "-",
    r.userDetails?.lastName || "-",
    getInfrastructureType(r),
    r.userDetails?.barangay || "-",
    r.address || "-",
    r.status || "Pending",
    r.uploadedAt?.toDate().toLocaleDateString() || "-",
    r.uploadedAt?.toDate().toLocaleTimeString() || "-",
    r.location?.latitude || "-",
    r.location?.longitude || "-"
  ]);

  // Escape CSV values (handle commas and quotes)
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  // Build CSV content
  let csvContent = headers.map(escapeCSV).join(",") + "\n";
  rows.forEach((row) => {
    csvContent += row.map(escapeCSV).join(",") + "\n";
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `Report_${startDate}_${endDate}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export as DOCX
export const generateDOCX = (reports, startDate, endDate) => {
  // Validation
  if (!startDate || !endDate) {
    alert("Please select a start date and end date before generating the report.");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    alert("Start date cannot be later than end date.");
    return;
  }

  // Convert to Date objects
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Filter reports by date range
  const filtered = filterReportsByDate(reports, startDate, endDate);

  if (filtered.length === 0) {
    alert("No reports found for the selected date range.");
    return;
  }

  // Build HTML content for Word document
  let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Infrastructure & Environmental Reports Summary</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      line-height: 1.6;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #1e40af;
      margin: 10px 0;
    }
    .header p {
      margin: 5px 0;
      font-size: 12px;
    }
    .date-range {
      text-align: left;
      margin: 20px 0;
      font-weight: bold;
    }
    .summary {
      margin: 30px 0;
    }
    .summary h2 {
      color: #1e40af;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 10px;
      text-align: left;
      font-size: 11px;
    }
    th {
      background-color: #3b82f6;
      color: white;
      font-weight: bold;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <p><strong>REPUBLIC OF THE PHILIPPINES</strong></p>
    <p>Province of Rizal</p>
    <h1>MUNICIPALITY OF CAINTA</h1>
    <p style="color: #1e40af;">OFFICE OF THE MUNICIPAL ENVIRONMENT AND NATURAL RESOURCES (MENRO)</p>
    <p>Cainta Municipal Hall, Bonifacio Ave, Sto. Domingo, Cainta, Rizal</p>
  </div>

  <h2 style="text-align: center; color: #1e40af;">INFRASTRUCTURE & ENVIRONMENTAL REPORTS SUMMARY</h2>
  
  <div class="date-range">
    Reporting Period: ${start.toLocaleDateString()} – ${end.toLocaleDateString()}
  </div>

  <div class="summary">
    <h2>Summary Statistics</h2>
    <table>
      <tr>
        <th>Metric</th>
        <th>Count</th>
      </tr>
      <tr>
        <td>Total Reports</td>
        <td>${filtered.length}</td>
      </tr>
      <tr>
        <td>Pending</td>
        <td>${filtered.filter((r) => r.status === "Pending").length}</td>
      </tr>
      <tr>
        <td>Withdrawn</td>
        <td>${filtered.filter((r) => r.status === "Withdrawn").length}</td>
      </tr>
      <tr>
        <td>Resolved</td>
        <td>${filtered.filter((r) => r.status === "Resolved").length}</td>
      </tr>
      <tr>
        <td>Drainage Reports</td>
        <td>${filtered.filter((r) => r.yolo?.drainage_count > 0).length}</td>
      </tr>
    </table>
  </div>

  <div class="summary">
    <h2>Detailed Reports</h2>
    <table>
      <thead>
        <tr>
          <th>Report ID</th>
          <th>Reporter</th>
          <th>Type</th>
          <th>Barangay</th>
          <th>Status</th>
          <th>Date</th>
          <th>Time</th>
        </tr>
      </thead>
      <tbody>
`;

  // Add report rows
  filtered.forEach((r) => {
    htmlContent += `
        <tr>
          <td>${r.id.substring(0, 12)}...</td>
          <td>${r.userDetails?.firstName || ""} ${r.userDetails?.lastName || ""}</td>
          <td>${getInfrastructureType(r)}</td>
          <td>${r.userDetails?.barangay || "-"}</td>
          <td>${r.status || "Pending"}</td>
          <td>${r.uploadedAt?.toDate().toLocaleDateString() || "-"}</td>
          <td>${r.uploadedAt?.toDate().toLocaleTimeString() || "-"}</td>
        </tr>
`;
  });

  htmlContent += `
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>MENRO – Municipality of Cainta | Official Report</p>
    <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
  </div>
</body>
</html>
`;

  // Create blob and download
  const blob = new Blob([htmlContent], { 
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
  });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `Report_${startDate}_${endDate}.doc`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};