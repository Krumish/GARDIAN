import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Generate reference code (same as in Reports.jsx)
const generateRefCode = (report) => {
  if (!report || !report.id) return "REF-00000000-XXXXX";
  const ts = report.uploadedAt;
  const dateObj = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  const dateStr = dateObj && !isNaN(dateObj) ? dateObj.toISOString().slice(0, 10).replace(/-/g, "") : "00000000";
  const shortHash = report.id.slice(-5).toUpperCase();
  return `REF-${dateStr}-${shortHash}`;
};

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
    margin: { top: 56, bottom: 25 }, // Add top margin to prevent overlap
    didDrawPage: (data) => {
      addHeader(doc, start, end);
      addFooter(doc);
    }
  });

  // Detailed reports table
  const tableData = filtered.map((r) => [
    generateRefCode(r), // Use reference code instead of ID
    `${r.userDetails?.firstName || ""} ${r.userDetails?.lastName || ""}`.trim() || "-",
    getInfrastructureType(r),
    r.userDetails?.barangay || "-",
    r.status || "Pending",
    r.uploadedAt?.toDate().toLocaleDateString() || "-",
    r.uploadedAt?.toDate().toLocaleTimeString() || "-",
  ]);

  autoTable(doc, {
    head: [["Reference Number", "Reporter", "Type", "Barangay", "Status", "Date", "Time"]],
    body: tableData,
    startY: doc.lastAutoTable.finalY + 10,
    theme: "grid",
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 8 },
    margin: { top: 56, bottom: 25 }, // Add top margin to prevent overlap
    didDrawPage: (data) => {
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
    "Reference Number",
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
    generateRefCode(r), // Use reference code instead of ID
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

// Convert image to base64
const getBase64Image = async (url) => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error loading image:", error);
    return null;
  }
};

// Export as DOCX (HTML format that looks exactly like PDF)
export const generateDOCX = async (reports, startDate, endDate) => {
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

  // Load images as base64
  const caintaSealBase64 = await getBase64Image("/cainta-seal.png");
  const menroLogoBase64 = await getBase64Image("/menro-logo.png");

  // Build HTML content for Word document (styled exactly like PDF)
  let htmlContent = `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns:m="http://schemas.microsoft.com/office/2004/12/omml"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <meta name="ProgId" content="Word.Document">
  <meta name="Generator" content="Microsoft Word 15">
  <meta name="Originator" content="Microsoft Word 15">
  <title>Infrastructure & Environmental Reports Summary</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 8.5in 11in;
      margin: 0.75in 0.5in 0.75in 0.5in;
      mso-header-margin: 0.5in;
      mso-footer-margin: 0.5in;
      mso-header: h1;
      mso-footer: f1;
    }
    
    div.Section1 { page: Section1; }
    
    body {
      font-family: 'Helvetica', Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    
    .header-table {
      width: 100%;
      border-bottom: 2px solid #000;
      margin-bottom: 20px;
      padding-bottom: 10px;
    }
    
    .header-logo {
      width: 24px;
      height: 24px;
    }
    
    .header-text {
      text-align: center;
      vertical-align: middle;
    }
    
    .header-text h1 {
      margin: 0;
      padding: 0;
      font-size: 9pt;
      font-weight: bold;
    }
    
    .header-text h2 {
      margin: 2px 0;
      padding: 0;
      font-size: 8pt;
      font-weight: normal;
    }
    
    .header-text h3 {
      margin: 2px 0;
      padding: 0;
      font-size: 12pt;
      font-weight: bold;
    }
    
    .header-text .office {
      margin: 2px 0;
      font-size: 9pt;
      color: #1e40af;
      font-weight: bold;
    }
    
    .header-text .address {
      margin: 2px 0;
      font-size: 7pt;
      color: #646464;
    }
    
    .report-title {
      margin: 20px 0 10px 0;
      text-align: center;
      font-size: 11pt;
      font-weight: bold;
    }
    
    .date-range {
      margin: 10px 0;
      font-size: 9pt;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 8pt;
    }
    
    .summary-table th {
      background-color: #3b82f6;
      color: white;
      padding: 10px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #2563eb;
    }
    
    .summary-table td {
      padding: 10px;
      border: 1px solid #ddd;
    }
    
    .summary-table tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    .details-table th {
      background-color: #3b82f6;
      color: white;
      padding: 8px;
      text-align: left;
      font-weight: bold;
      border: 1px solid #2563eb;
    }
    
    .details-table td {
      padding: 6px 8px;
      border: 1px solid #ddd;
    }
    
    .footer-text {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #000;
      font-size: 8pt;
      color: #505050;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="Section1">
    <!-- Header with Logos -->
    <table class="header-table" cellpadding="0" cellspacing="0">
      <tr>
        <td width="70" valign="top">
          ${caintaSealBase64 ? `<img src="${caintaSealBase64}" width="50" height="50" style="width:50px;height:50px;display:block;" alt="Cainta Seal">` : ''}
        </td>
        <td class="header-text">
          <h1>REPUBLIC OF THE PHILIPPINES</h1>
          <h2>Province of Rizal</h2>
          <h3>MUNICIPALITY OF CAINTA</h3>
          <p class="office">OFFICE OF THE MUNICIPAL ENVIRONMENT AND NATURAL RESOURCES (MENRO)</p>
          <p class="address">Cainta Municipal Hall, Bonifacio Ave, Sto. Domingo, Cainta, Rizal</p>
        </td>
        <td width="70" valign="top" align="right">
          ${menroLogoBase64 ? `<img src="${menroLogoBase64}" width="50" height="50" style="width:50px;height:50px;display:block;" alt="MENRO Logo">` : ''}
        </td>
      </tr>
    </table>

    <!-- Report Title -->
    <div class="report-title">
      INFRASTRUCTURE & ENVIRONMENTAL REPORTS SUMMARY
    </div>

    <!-- Date Range -->
    <div class="date-range">
      <strong>Reporting Period:</strong> ${start.toLocaleDateString()} – ${end.toLocaleDateString()}
    </div>

    <!-- Summary Statistics -->
    <table class="summary-table">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Count</th>
        </tr>
      </thead>
      <tbody>
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
      </tbody>
    </table>

    <!-- Detailed Reports -->
    <table class="details-table">
      <thead>
        <tr>
          <th>Reference Number</th>
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
          <td>${generateRefCode(r)}</td>
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

    <!-- Footer -->
    <div class="footer-text">
      <p>MENRO – Municipality of Cainta | Official Report</p>
      <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>
  </div>
</body>
</html>
`;

  // Create blob and download
  const blob = new Blob([htmlContent], { 
    type: "application/msword" 
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