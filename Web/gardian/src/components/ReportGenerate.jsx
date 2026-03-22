import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Helpers ───────────────────────────────────────────────────────────────────
const genRef = (r) => {
  if (!r?.id) return "REF-00000000-XXXXX";
  const ts = r.uploadedAt;
  const d  = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  const ds = d && !isNaN(d) ? d.toISOString().slice(0,10).replace(/-/g,"") : "00000000";
  return `REF-${ds}-${r.id.slice(-5).toUpperCase()}`;
};

const getType = (r) => r.yolo?.drainage_count > 0 ? "Drainage" : r.issueType || "Unknown";

function getAssignedDepartment(issueType) {
  if (["Waste Management","Solid Waste"].includes(issueType))                        return "MENRO / WMO";
  if (["Drainage","Road Blockage"].includes(issueType))                              return "Mayor / Dispatch";
  if (["Pothole","Manhole","Road Markings","Road Surface"].includes(issueType))      return "Engineering Office";
  return "Unassigned";
}
const getDept = (r) => r.assignedDepartment || getAssignedDepartment(r.issueType);

// Department colors — categorical, distinct from status traffic-light colors
// Teal = MENRO, Indigo = Dispatch, Orange = Engineering
const DEPT_FILL = {
  "MENRO / WMO":       [204, 251, 241],  // teal-100
  "Mayor / Dispatch":  [224, 231, 255],  // indigo-100
  "Engineering Office":[255, 237, 213],  // orange-100
  "Unassigned":        [243, 244, 246],  // gray-100
};

// Status colors — semantic / traffic-light (never overlap with dept colors)
const STATUS_FILL = {
  Pending:   [254, 243, 199],  // amber-100  🟡 Waiting
  Assigned:  [207, 250, 254],  // cyan-100   🔵 In progress
  Resolved:  [220, 252, 231],  // green-100  🟢 Done
  Withdrawn: [243, 244, 246],  // gray-100   ⚪ Cancelled
};

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
    .sort((a,b) => (b.uploadedAt?.toDate?.() || new Date(0)) - (a.uploadedAt?.toDate?.() || new Date(0)));
};

const validate = (startDate, endDate) => {
  if (!startDate || !endDate) { alert("Please select a start and end date."); return false; }
  if (new Date(startDate) > new Date(endDate)) { alert("Start date cannot be after end date."); return false; }
  return true;
};

// ── PDF header (no logos) ─────────────────────────────────────────────────────
const addHeader = (doc, start, end, deptLabel) => {
  // Accent bar
  doc.setFillColor(30, 64, 175);
  doc.rect(14, 8, 182, 2, "F");

  doc.setFont("helvetica","bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text("REPUBLIC OF THE PHILIPPINES · Province of Rizal", 105, 16, { align:"center" });

  doc.setFont("helvetica","bold");
  doc.setFontSize(13);
  doc.setTextColor(0);
  doc.text("MUNICIPALITY OF CAINTA", 105, 22, { align:"center" });

  doc.setFontSize(8);
  doc.setTextColor(30, 64, 175);
  doc.text("OFFICE OF THE MUNICIPAL ENVIRONMENT AND NATURAL RESOURCES (MENRO)", 105, 27, { align:"center" });

  doc.setFontSize(7);
  doc.setTextColor(140);
  doc.text("Cainta Municipal Hall, Bonifacio Ave, Sto. Domingo, Cainta, Rizal", 105, 31, { align:"center" });

  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.4);
  doc.line(14, 34, 196, 34);

  doc.setFont("helvetica","bold");
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text("INFRASTRUCTURE & ENVIRONMENTAL REPORTS SUMMARY", 105, 40, { align:"center" });

  doc.setFont("helvetica","normal");
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(`Reporting Period: ${start.toLocaleDateString()} – ${end.toLocaleDateString()}`, 14, 46);
  if (deptLabel !== "All") {
    doc.setTextColor(30, 64, 175);
    doc.text(`Department: ${deptLabel}`, 14, 51);
  }
};

const addFooter = (doc) => {
  const h = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(14, h-16, 196, h-16);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text("MENRO – Municipality of Cainta | Official Report", 14, h-10);
  doc.text(`Page ${doc.internal.getCurrentPageInfo().pageNumber}`, 196, h-10, { align:"right" });
};

// ── PDF ───────────────────────────────────────────────────────────────────────
// NOTE: Reports are pre-filtered by department in Reports.jsx before being
// passed here. startDate/endDate filtering is done inside.
export const generatePDF = (reports, startDate, endDate) => {
  if (!validate(startDate, endDate)) return;

  const start    = new Date(startDate);
  const end      = new Date(endDate);
  const filtered = filterByDate(reports, startDate, endDate);

  if (!filtered.length) { alert("No reports found for the selected date range."); return; }

  // Determine department label from the data
  const depts = [...new Set(filtered.map(r => getDept(r)))];
  const deptLabel = depts.length === 1 ? depts[0] : "All Departments";

  const doc = new jsPDF();
  const startY = deptLabel !== "All Departments" ? 58 : 54;

  // ── Summary ──────────────────────────────────────────────────────────────
  const pendingByDept = (d) => filtered.filter(r => r.status === "Pending" && getDept(r) === d).length;

  const summary = [
    ["Total Reports",                  filtered.length,                                               ""],
    ["Pending",                        filtered.filter(r => r.status === "Pending").length,           "amber"],
    ["Assigned",                       filtered.filter(r => r.status === "Assigned").length,          "blue"],
    ["Resolved",                       filtered.filter(r => r.status === "Resolved").length,          "green"],
    ["Withdrawn",                      filtered.filter(r => r.status === "Withdrawn").length,         "gray"],
  ];

  autoTable(doc, {
    head: [["Metric", "Count"]],
    body: summary.map(r => [r[0], r[1]]),
    startY,
    theme: "striped",
    headStyles:   { fillColor:[30,64,175], fontSize:8, fontStyle:"bold" },
    bodyStyles:   { fontSize:8 },
    columnStyles: { 1:{ halign:"center", cellWidth:25 } },
    margin: { top: startY - 2, bottom: 22, left:14, right:14 },
    didDrawPage: () => { addHeader(doc, start, end, deptLabel); addFooter(doc); },
  });

  // ── Detail table ──────────────────────────────────────────────────────────
  const rows = filtered.map(r => [
    genRef(r),
    `${r.userDetails?.firstName||""} ${r.userDetails?.lastName||""}`.trim() || "—",
    getType(r),
    getDept(r),
    r.userDetails?.barangay || "—",
    r.status || "Pending",
    r.uploadedAt?.toDate().toLocaleDateString()  || "—",
    r.uploadedAt?.toDate().toLocaleTimeString()  || "—",
  ]);

  autoTable(doc, {
    head: [["Reference No.","Reporter","Type","Routed To","Barangay","Status","Date","Time"]],
    body: rows,
    startY: doc.lastAutoTable.finalY + 10,
    theme: "grid",
    headStyles:   { fillColor:[30,64,175], fontSize:7, fontStyle:"bold" },
    bodyStyles:   { fontSize:7 },
    columnStyles: { 0:{cellWidth:32}, 3:{cellWidth:30} },
    margin: { top:52, bottom:22, left:14, right:14 },
    // Color-code dept and status cells
    didParseCell: (data) => {
      if (data.section === "body") {
        const col = data.column.index;
        const row = rows[data.row.index];
        if (col === 3) { const f = DEPT_FILL[row[3]]; if (f) data.cell.styles.fillColor = f; }
        if (col === 5) { const f = STATUS_FILL[row[5]]; if (f) data.cell.styles.fillColor = f; }
      }
    },
    didDrawPage: () => { addHeader(doc, start, end, deptLabel); addFooter(doc); },
  });

  const slug = deptLabel === "All Departments" ? "All" : deptLabel.replace(/[^a-zA-Z0-9]/g,"_");
  doc.save(`MENRO_Report_${slug}_${startDate}_to_${endDate}.pdf`);
};

// ── CSV ───────────────────────────────────────────────────────────────────────
export const generateCSV = (reports, startDate, endDate) => {
  if (!validate(startDate, endDate)) return;
  const filtered = filterByDate(reports, startDate, endDate);
  if (!filtered.length) { alert("No reports found for the selected date range."); return; }

  const depts = [...new Set(filtered.map(r => getDept(r)))];
  const deptLabel = depts.length === 1 ? depts[0] : "All";

  const headers = [
    "Reference Number","First Name","Last Name","Type","Routed To",
    "Barangay","Address","Status","Date","Time","Latitude","Longitude",
  ];

  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    return (s.includes(",") || s.includes('"') || s.includes("\n")) ? `"${s.replace(/"/g,'""')}"` : s;
  };

  const rows = filtered.map(r => [
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
    r.latitude  || r.location?.latitude  || "—",
    r.longitude || r.location?.longitude || "—",
  ]);

  let csv = headers.map(esc).join(",") + "\n";
  rows.forEach(row => { csv += row.map(esc).join(",") + "\n"; });

  const slug = deptLabel === "All" ? "All" : deptLabel.replace(/[^a-zA-Z0-9]/g,"_");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `MENRO_Report_${slug}_${startDate}_to_${endDate}.csv`,
    style: "visibility:hidden",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ── DOCX ──────────────────────────────────────────────────────────────────────
export const generateDOCX = async (reports, startDate, endDate) => {
  if (!validate(startDate, endDate)) return;

  const start    = new Date(startDate);
  const end      = new Date(endDate);
  const filtered = filterByDate(reports, startDate, endDate);
  if (!filtered.length) { alert("No reports found for the selected date range."); return; }

  const depts = [...new Set(filtered.map(r => getDept(r)))];
  const deptLabel = depts.length === 1 ? depts[0] : "All Departments";

  const pendingByDept = (d) => filtered.filter(r => r.status === "Pending" && getDept(r) === d).length;

  const DEPT_BG = {
    "MENRO / WMO":       "#ccfbf1",  // teal-100
    "Mayor / Dispatch":  "#e0e7ff",  // indigo-100
    "Engineering Office":"#ffedd5",  // orange-100
    "Unassigned":        "#f3f4f6",  // gray-100
  };
  const STATUS_BG = {
    Pending:   "#fef3c7",  // amber-100
    Assigned:  "#cffafe",  // cyan-100
    Resolved:  "#dcfce7",  // green-100
    Withdrawn: "#f3f4f6",  // gray-100
  };

  const summaryRows = [
    ["Total Reports", filtered.length,                                               "#f8fafc"],
    ["Pending",       filtered.filter(r=>r.status==="Pending").length,               "#fef3c7"],
    ["Assigned",      filtered.filter(r=>r.status==="Assigned").length,              "#cffafe"],
    ["Resolved",      filtered.filter(r=>r.status==="Resolved").length,              "#dcfce7"],
    ["Withdrawn",     filtered.filter(r=>r.status==="Withdrawn").length,             "#f3f4f6"],
    ["Pending — MENRO / WMO",        pendingByDept("MENRO / WMO"),                   "#ccfbf1"],
    ["Pending — Mayor / Dispatch",   pendingByDept("Mayor / Dispatch"),              "#e0e7ff"],
    ["Pending — Engineering Office", pendingByDept("Engineering Office"),            "#ffedd5"],
  ].map(([label, val, bg], i) => `
    <tr style="background:${i%2===0?"#f9fafb":bg}">
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-size:8.5pt;">${label}</td>
      <td style="padding:7px 12px;border:1px solid #e5e7eb;text-align:center;font-weight:700;font-size:9pt;">${val}</td>
    </tr>`).join("");

  const detailRows = filtered.map((r,i) => `
    <tr style="background:${i%2===0?"#f9fafb":"#fff"}">
      <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:7.5pt;font-family:monospace;">${genRef(r)}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:7.5pt;">${r.userDetails?.firstName||""} ${r.userDetails?.lastName||""}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:7.5pt;">${getType(r)}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:7.5pt;background:${DEPT_BG[getDept(r)]||"#f3f4f6"};">${getDept(r)}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:7.5pt;">${r.userDetails?.barangay||"—"}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:7.5pt;background:${STATUS_BG[r.status]||"#f3f4f6"};">${r.status||"Pending"}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:7.5pt;">${r.uploadedAt?.toDate().toLocaleDateString()||"—"}</td>
      <td style="padding:5px 8px;border:1px solid #e5e7eb;font-size:7.5pt;">${r.uploadedAt?.toDate().toLocaleTimeString()||"—"}</td>
    </tr>`).join("");

  const th = `style="padding:8px 10px;background:#1e40af;color:#fff;text-align:left;font-size:8pt;border:1px solid #1e3a8a;white-space:nowrap;"`;

  const html = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml"
      xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<title>MENRO Infrastructure Report</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
<style>
  @page Section1 { size:8.5in 11in; margin:0.7in 0.6in; }
  div.Section1 { page:Section1; }
  body { font-family:Arial,sans-serif; margin:0; padding:0; color:#111; }
</style>
</head>
<body><div class="Section1">

  <div style="height:4px;background:#1e40af;margin-bottom:14px;"></div>

  <div style="text-align:center;margin-bottom:14px;">
    <p style="font-size:8pt;color:#666;margin:0;">REPUBLIC OF THE PHILIPPINES · Province of Rizal</p>
    <p style="font-size:14pt;font-weight:bold;margin:4px 0 2px;">MUNICIPALITY OF CAINTA</p>
    <p style="font-size:8.5pt;color:#1e40af;font-weight:bold;margin:0;">OFFICE OF THE MUNICIPAL ENVIRONMENT AND NATURAL RESOURCES (MENRO)</p>
    <p style="font-size:7pt;color:#999;margin:2px 0 0;">Cainta Municipal Hall, Bonifacio Ave, Sto. Domingo, Cainta, Rizal</p>
  </div>

  <div style="border-top:1.5px solid #1e40af;margin-bottom:12px;"></div>

  <p style="text-align:center;font-size:11pt;font-weight:bold;margin:0 0 10px;">
    INFRASTRUCTURE &amp; ENVIRONMENTAL REPORTS SUMMARY
  </p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <tr>
      <td style="font-size:9pt;padding:2px 0;"><strong>Reporting Period:</strong> ${start.toLocaleDateString()} – ${end.toLocaleDateString()}</td>
      ${deptLabel !== "All Departments" ? `<td style="font-size:9pt;padding:2px 0;text-align:right;color:#1e40af;"><strong>Department:</strong> ${deptLabel}</td>` : ""}
    </tr>
  </table>

  <table style="width:45%;border-collapse:collapse;margin-bottom:18px;">
    <thead><tr><th ${th}>Metric</th><th ${th}>Count</th></tr></thead>
    <tbody>${summaryRows}</tbody>
  </table>

  <p style="font-size:9pt;font-weight:bold;margin:0 0 6px;">Detailed Report List</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <thead>
      <tr>
        <th ${th}>Reference No.</th>
        <th ${th}>Reporter</th>
        <th ${th}>Type</th>
        <th ${th}>Routed To</th>
        <th ${th}>Barangay</th>
        <th ${th}>Status</th>
        <th ${th}>Date</th>
        <th ${th}>Time</th>
      </tr>
    </thead>
    <tbody>${detailRows}</tbody>
  </table>

  <div style="border-top:1px solid #ddd;padding-top:8px;text-align:center;">
    <p style="font-size:7.5pt;color:#888;margin:2px 0;">MENRO – Municipality of Cainta | Official Report</p>
    <p style="font-size:7pt;color:#bbb;margin:2px 0;">Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
  </div>

</div></body></html>`;

  const slug = deptLabel === "All Departments" ? "All" : deptLabel.replace(/[^a-zA-Z0-9]/g,"_");
  const blob = new Blob([html], { type:"application/msword" });
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: `MENRO_Report_${slug}_${startDate}_to_${endDate}.doc`,
    style: "visibility:hidden",
  });
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};