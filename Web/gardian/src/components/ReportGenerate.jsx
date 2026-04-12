import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Helpers ───────────────────────────────────────────────────────────────────
const genRef = (r) => {
  if (!r?.id) return "REF-00000000-XXXXX";
  const ts = r.uploadedAt;
  const d  = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  const ds = d && !isNaN(d) ? d.toISOString().slice(0,10).replace(/-/g,"") : "00000000";
  return `${ds}-${r.id.slice(-5).toUpperCase()}`;
};

const getType = (r) => r.yolo?.drainage_count > 0 ? "Drainage" : r.issueType || "Unknown";

function getAssignedDepartment(issueType) {
  if (["Waste Management","Solid Waste"].includes(issueType))                        return "MENRO";
  if (["Drainage","Road Blockage"].includes(issueType))                              return "Office of the Mayor";
  if (["Pothole","Manhole","Road Markings","Road Surface"].includes(issueType))      return "Municipal Engineering Office";
  return "Unassigned";
}
const getDept = (r) => r.assignedDepartment || getAssignedDepartment(r.issueType);

const filterByDate = (reports, startDate, endDate) => {
  const start = new Date(startDate);
  const end   = new Date(endDate);
  end.setHours(23,59,59,999);
  return reports
    .filter(r => {
      if (!r.uploadedAt?.toDate) return false;
      const d = r.uploadedAt.toDate();
      return d >= start && d <= end;
    })
    .sort((a,b) => (a.uploadedAt?.toDate?.() || new Date(0)) - (b.uploadedAt?.toDate?.() || new Date(0))); // Sort chronological for logs
};

const validate = (startDate, endDate) => {
  if (!startDate || !endDate) { alert("Please select a start and end date."); return false; }
  if (new Date(startDate) > new Date(endDate)) { alert("Start date cannot be after end date."); return false; }
  return true;
};

const calculateAnalytics = (filtered) => {
  const analytics = {
    total: filtered.length,
    byStatus: { Pending: 0, Assigned: 0, Resolved: 0, Withdrawn: 0 },
    byType: {},
    byBarangay: {}
  };

  filtered.forEach(r => {
    const status = r.status || "Pending";
    if (analytics.byStatus[status] !== undefined) analytics.byStatus[status]++;

    const type = getType(r);
    analytics.byType[type] = (analytics.byType[type] || 0) + 1;

    const brgy = r.userDetails?.barangay || "Unspecified";
    analytics.byBarangay[brgy] = (analytics.byBarangay[brgy] || 0) + 1;
  });

  analytics.topTypes = Object.entries(analytics.byType).sort((a, b) => b[1] - a[1]);
  analytics.topBarangays = Object.entries(analytics.byBarangay).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return analytics;
};

// ── Official LGU Letterhead ──────────────────────────────────────────────────
const addLGUHeader = (doc, title) => {
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("Republic of the Philippines", 105, 15, { align: "center" });
  doc.text("Province of Rizal", 105, 20, { align: "center" });
  
  doc.setFont("times", "bold");
  doc.setFontSize(12);
  doc.text("MUNICIPALITY OF CAINTA", 105, 26, { align: "center" });
  
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text("OFFICE OF THE MUNICIPAL ENVIRONMENT AND NATURAL RESOURCES", 105, 33, { align: "center" });

  // Formal border line
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  doc.setFontSize(12);
  doc.text(title, 105, 48, { align: "center" });
};

// ── Official Signatory Block ─────────────────────────────────────────────────
const addSignatories = (doc, finalY) => {
  let y = finalY + 25;
  
  // If signatories push past the page height, create a new page
  if (y > 250) {
    doc.addPage();
    y = 30;
  }

  doc.setFont("times", "normal");
  doc.setFontSize(10);

  doc.text("Prepared by:", 20, y);
  doc.text("Noted by:", 120, y);

  doc.setLineWidth(0.2);
  doc.line(20, y + 15, 80, y + 15);
  doc.line(120, y + 15, 180, y + 15);

  doc.setFont("times", "bold");
  doc.text("RECORDS OFFICER", 20, y + 20);
  doc.text("HEAD, MENRO", 120, y + 20);

  doc.setFont("times", "normal");
  doc.text("GARDIAN System Admin", 20, y + 24);
  doc.text("Municipality of Cainta", 120, y + 24);
};

// ── PDF Generation (LGU Format) ───────────────────────────────────────────────
export const generatePDF = (reports, startDate, endDate) => {
  if (!validate(startDate, endDate)) return;

  const start    = new Date(startDate);
  const end      = new Date(endDate);
  const filtered = filterByDate(reports, startDate, endDate);

  if (!filtered.length) { alert("No reports found for the selected date range."); return; }

  const data = calculateAnalytics(filtered);
  const doc = new jsPDF();
  
  // ---- PAGE 1: STATISTICAL SUMMARY ----
  addLGUHeader(doc, "STATISTICAL SUMMARY REPORT");

  doc.setFont("times", "normal");
  doc.setFontSize(10);
  doc.text(`For the Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`, 105, 54, { align: "center" });
  
  let startY = 65;

  // LGU Table Style (Black and white, strict borders)
  const tableTheme = {
    theme: 'grid',
    styles: { font: 'times', fontSize: 10, textColor: 0, lineColor: 0, lineWidth: 0.2 },
    headStyles: { fillColor: [230, 230, 230], fontStyle: 'bold', halign: 'center' },
  };

  doc.setFont("times", "bold");
  doc.text("I. OVERALL STATUS", 14, startY - 2);
  
  autoTable(doc, {
    ...tableTheme,
    head: [["Total Incidents Reported", "Pending", "Assigned / Dispatched", "Resolved / Cleared"]],
    body: [[
      data.total.toString(), 
      data.byStatus.Pending.toString(), 
      data.byStatus.Assigned.toString(), 
      data.byStatus.Resolved.toString()
    ]],
    startY: startY,
    bodyStyles: { halign: "center", fontStyle: "bold" },
  });

  let nextY = doc.lastAutoTable.finalY + 15;

  doc.text("II. INCIDENTS BY CATEGORY", 14, nextY - 2);
  autoTable(doc, {
    ...tableTheme,
    head: [["Issue / Category", "Volume of Reports"]],
    body: data.topTypes,
    startY: nextY,
    columnStyles: { 1: { halign: "center" } }
  });

  nextY = doc.lastAutoTable.finalY + 15;

  doc.text("III. HOTSPOT AREAS (TOP 5 BARANGAYS)", 14, nextY - 2);
  autoTable(doc, {
    ...tableTheme,
    head: [["Barangay", "Number of Incidents"]],
    body: data.topBarangays,
    startY: nextY,
    columnStyles: { 1: { halign: "center" } }
  });

  addSignatories(doc, doc.lastAutoTable.finalY);

  // ---- PAGE 2: LOG OF INCIDENTS ----
  doc.addPage();
  addLGUHeader(doc, "OFFICIAL LOG OF INCIDENTS");

  const rows = filtered.map(r => [
    genRef(r),
    r.uploadedAt?.toDate().toLocaleDateString() || "—",
    getType(r),
    r.userDetails?.barangay || "—",
    getDept(r),
    r.status ? r.status.toUpperCase() : "PENDING",
  ]);

  autoTable(doc, {
    ...tableTheme,
    styles: { ...tableTheme.styles, fontSize: 8 },
    headStyles: { ...tableTheme.headStyles, fontSize: 8 },
    head: [["Control No.", "Date", "Incident Type", "Location/Barangay", "Routed Office", "Status"]],
    body: rows,
    startY: 55,
  });

  // Footer for pagination
  const pageCount = doc.internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("times", "italic");
    doc.setFontSize(8);
    doc.text(`Page ${i} of ${pageCount}`, 196, 285, { align: "right" });
    doc.text(`Generated via GARDIAN System - ${new Date().toLocaleString()}`, 14, 285);
  }

  // --- UPDATED EXPORT RETURN LOGIC ---
  const filename = `MENRO_Official_Report_${startDate}_to_${endDate}.pdf`;
  doc.save(filename); // Downloads locally
  
  return { 
    blob: doc.output('blob'), // Returns real data for Firebase
    filename 
  };
};

// ── CSV Generation ────────────────────────────────────────────────────────────
export const generateCSV = (reports, startDate, endDate) => {
  if (!validate(startDate, endDate)) return;
  const filtered = filterByDate(reports, startDate, endDate);
  if (!filtered.length) { alert("No reports found for the selected date range."); return; }

  const depts = [...new Set(filtered.map(r => getDept(r)))];
  const deptLabel = depts.length === 1 ? depts[0] : "All";

  const headers = [
    "Control Number","First Name","Last Name","Incident Type","Routed Office",
    "Barangay","Address","Status","Date Reported","Time Reported",
    "Date Resolved", "Latitude","Longitude",
  ];

  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g,'""')}"` : s;
  };

  const rows = filtered.map(r => {
    let resDate = "—";
    
    if (r.status === "Resolved" && r.resolvedAt) {
      const end = r.resolvedAt.toDate ? r.resolvedAt.toDate() : new Date(r.resolvedAt);
      resDate = end.toLocaleDateString();
    }

    return [
      genRef(r),
      r.userDetails?.firstName || "—",
      r.userDetails?.lastName  || "—",
      getType(r),
      getDept(r),
      r.userDetails?.barangay || "—",
      r.address || "—",
      r.status  || "Pending",
      r.uploadedAt?.toDate().toLocaleDateString()  || "—",
      r.uploadedAt?.toDate().toLocaleTimeString()  || "—",
      resDate,
      r.latitude  || r.location?.latitude  || "—",
      r.longitude || r.location?.longitude || "—",
    ];
  });

  let csv = headers.map(esc).join(",") + "\n";
  rows.forEach(row => { csv += row.map(esc).join(",") + "\n"; });

  // --- UPDATED EXPORT RETURN LOGIC ---
  const slug = deptLabel === "All" ? "All" : deptLabel.replace(/[^a-zA-Z0-9]/g,"_");
  const filename = `MENRO_Official_Data_Export_${slug}_${startDate}_to_${endDate}.csv`;
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: filename,
    style: "visibility:hidden",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { blob, filename };
};

// ── DOCX Generation (LGU Format) ──────────────────────────────────────────────
export const generateDOCX = async (reports, startDate, endDate) => {
  if (!validate(startDate, endDate)) return;

  const start    = new Date(startDate);
  const end      = new Date(endDate);
  const filtered = filterByDate(reports, startDate, endDate);
  if (!filtered.length) { alert("No reports found for the selected date range."); return; }

  const data = calculateAnalytics(filtered);

  // HTML Table styles for LGU look
  const td = `style="padding:6px 8px; border:1px solid black; font-size:10pt;"`;
  const th = `style="padding:8px 8px; border:1px solid black; background:#e5e7eb; font-size:10pt; font-weight:bold; text-align:center;"`;

  const statusRows = `
    <tr>
      <td ${td} style="text-align:center; font-weight:bold;">${data.total}</td>
      <td ${td} style="text-align:center; font-weight:bold;">${data.byStatus.Pending}</td>
      <td ${td} style="text-align:center; font-weight:bold;">${data.byStatus.Assigned}</td>
      <td ${td} style="text-align:center; font-weight:bold;">${data.byStatus.Resolved}</td>
    </tr>`;

  const typeRows = data.topTypes.map(([type, count]) => `
    <tr>
      <td ${td}>${type}</td>
      <td ${td} style="text-align:center;">${count}</td>
    </tr>`).join("");

  const detailRows = filtered.map(r => `
    <tr>
      <td ${td}>${genRef(r)}</td>
      <td ${td}>${r.uploadedAt?.toDate().toLocaleDateString()||"—"}</td>
      <td ${td}>${getType(r)}</td>
      <td ${td}>${r.userDetails?.barangay||"—"}</td>
      <td ${td}>${getDept(r)}</td>
      <td ${td} style="font-weight:bold;">${r.status ? r.status.toUpperCase() : "PENDING"}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>Official Report</title>
<style>
  @page Section1 { size:8.5in 11in; margin:1in; }
  div.Section1 { page:Section1; }
  body { font-family:"Times New Roman", Times, serif; margin:0; padding:0; color:#000; }
</style>
</head>
<body><div class="Section1">

  <div style="text-align:center;margin-bottom:10px;">
    <p style="font-size:11pt; margin:0;">Republic of the Philippines</p>
    <p style="font-size:11pt; margin:0;">Province of Rizal</p>
    <p style="font-size:12pt; font-weight:bold; margin:0;">MUNICIPALITY OF CAINTA</p>
    <p style="font-size:11pt; font-weight:bold; margin:0;">OFFICE OF THE MUNICIPAL ENVIRONMENT AND NATURAL RESOURCES</p>
  </div>

  <div style="border-top:2px solid black; margin-bottom:20px;"></div>

  <p style="text-align:center; font-size:12pt; font-weight:bold; margin:0;">
    STATISTICAL SUMMARY REPORT
  </p>
  <p style="text-align:center; font-size:11pt; margin-top:5px; margin-bottom:25px;">
    For the Period: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}
  </p>

  <p style="font-size:11pt; font-weight:bold;">I. OVERALL STATUS</p>
  <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
    <thead>
      <tr>
        <th ${th}>Total Incidents Reported</th>
        <th ${th}>Pending</th>
        <th ${th}>Assigned / Dispatched</th>
        <th ${th}>Resolved / Cleared</th>
      </tr>
    </thead>
    <tbody>${statusRows}</tbody>
  </table>

  <p style="font-size:11pt; font-weight:bold;">II. INCIDENTS BY CATEGORY</p>
  <table style="width:100%; border-collapse:collapse; margin-bottom:30px;">
    <thead><tr><th ${th}>Issue / Category</th><th ${th}>Volume of Reports</th></tr></thead>
    <tbody>${typeRows}</tbody>
  </table>

  <table style="width:100%; border:none; margin-top:40px;">
    <tr>
      <td style="width:50%; border:none; padding:10px;">
        <p style="margin:0 0 30px 0;">Prepared by:</p>
        <p style="margin:0; font-weight:bold; text-decoration:underline;">RECORDS OFFICER</p>
        <p style="margin:0;">GARDIAN System Admin</p>
      </td>
      <td style="width:50%; border:none; padding:10px;">
        <p style="margin:0 0 30px 0;">Noted by:</p>
        <p style="margin:0; font-weight:bold; text-decoration:underline;">HEAD, MENRO</p>
        <p style="margin:0;">Municipality of Cainta</p>
      </td>
    </tr>
  </table>

  <br clear="all" style="page-break-before:always" />

  <div style="text-align:center;margin-bottom:10px;">
    <p style="font-size:11pt; font-weight:bold; margin:0;">OFFICE OF THE MUNICIPAL ENVIRONMENT AND NATURAL RESOURCES</p>
    <p style="font-size:12pt; font-weight:bold; margin-top:10px;">OFFICIAL LOG OF INCIDENTS</p>
  </div>

  <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:9pt;">
    <thead>
      <tr>
        <th ${th}>Control No.</th>
        <th ${th}>Date</th>
        <th ${th}>Incident Type</th>
        <th ${th}>Location/Barangay</th>
        <th ${th}>Routed Office</th>
        <th ${th}>Status</th>
      </tr>
    </thead>
    <tbody>${detailRows}</tbody>
  </table>

</div></body></html>`;

  // --- UPDATED EXPORT RETURN LOGIC ---
  const filename = `MENRO_Official_Report_${startDate}_to_${endDate}.doc`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: filename,
    style: "visibility:hidden",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  return { blob, filename };
};