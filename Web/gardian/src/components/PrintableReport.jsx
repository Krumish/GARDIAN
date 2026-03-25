import React, { forwardRef } from "react";


// Helper for formatting dates
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const genRef = (id, ts) => {
  if (!id) return "REF-00000000-XXXXX";
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  const ds = d && !isNaN(d) ? d.toISOString().slice(0, 10).replace(/-/g, "") : "00000000";
  return `REF-${ds}-${id.slice(-5).toUpperCase()}`;
};

// ── AI Summary Generator ──────────────────────────────────────────────────────
const generateReadableAISummary = (report) => {
  const { issueType, yolo } = report;
  if (!yolo || (!yolo.status && (!yolo.boxes || yolo.boxes.length === 0) && !yolo.obstructions)) {
    return "No AI automated analysis is available for this incident. Manual assessment required.";
  }

  const boxes = yolo.boxes || [];

  if (issueType === 'Drainage') {
    const ratio = report.blockageRatio ?? (yolo.max_blockage_ratio ?? 0);
    const status = ratio >= 0.50 ? "Clogged" : ratio >= 0.10 ? "Partially Blocked" : "Clear";
    
    const obsCounts = (yolo.obstructions || []).reduce((acc, o) => {
      acc[o.class] = (acc[o.class] || 0) + 1;
      return acc;
    }, {});
    const obsString = Object.entries(obsCounts).map(([cls, count]) => `${count} ${cls.replace(/_/g, ' ')}`).join(", ");

    return `The AI assessed the drainage as ${status.toUpperCase()} with a severity of ${(ratio * 100).toFixed(1)}%. ${obsString ? `Detected obstructions: ${obsString}.` : ""}`;
  }

  if (issueType === 'Pothole') {
    const potholes = boxes.filter(b => b.class === "pothole");
    const severity = potholes.length >= 5 ? "High" : potholes.length >= 2 ? "Moderate" : potholes.length === 1 ? "Low" : "None";
    return `The AI detected ${potholes.length} pothole(s). The structural hazard severity is classified as ${severity.toUpperCase()} based on cluster density.`;
  }

  if (issueType === 'Road Blockage') {
    const vehicles = boxes.filter(b => b.class === "vehicle");
    const severity = vehicles.length >= 6 ? "High" : vehicles.length >= 3 ? "Moderate" : "Low";
    return `The AI detected ${vehicles.length} vehicle(s) causing a potential obstruction. The blockage severity is assessed as ${severity.toUpperCase()}.`;
  }

  if (issueType === 'Road Markings') {
    const intact = boxes.filter(b => b.class === "intact_crosswalk").length;
    const faded = boxes.filter(b => b.class === "faded_crosswalk").length;
    const condition = faded > 0 && intact === 0 ? "Severely Faded" : faded > 0 && intact > 0 ? "Mixed/Partially Faded" : intact > 0 ? "Intact" : "Unknown";
    return `The AI identified ${faded} faded segment(s) and ${intact} intact segment(s). Overall visibility condition: ${condition.toUpperCase()}.`;
  }

  if (issueType === 'Manhole') {
    const broken = boxes.filter(b => b.class === "broken_manhole").length;
    const intact = boxes.filter(b => b.class === "intact_manhole").length;
    const condition = broken > 0 ? "Damaged/Hazardous" : intact > 0 ? "Intact" : "Unknown";
    return `The AI detected ${broken} broken cover(s) and ${intact} intact cover(s). Infrastructure condition: ${condition.toUpperCase()}.`;
  }

  return `The AI detected ${boxes.length} object(s) associated with ${issueType}. Manual review of the imagery is recommended.`;
};

// ── Main Printable Component ──────────────────────────────────────────────────
const PrintableReport = forwardRef(({ reports }, ref) => {
  return (
    <div ref={ref} className="bg-white text-black" style={{ padding: "20px", fontFamily: "Arial, sans-serif", color: "#000" }}>
      <style type="text/css" media="print">
        {`
          /* Set standard Letter size with 0.5 inch margins to guarantee a 1-page fit */
          @page { size: letter; margin: 0.5in; }
          .page-break { page-break-after: always; }
          /* Prevent the report container from splitting across pages */
          .report-container { page-break-inside: avoid; width: 100%; box-sizing: border-box; }
          .no-print { display: none; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `}
      </style>

      {reports.map((report, index) => (
        <div key={report.id} className={`report-container ${index !== reports.length - 1 ? "page-break" : ""}`}>
          
          {/* ── Official LGU Header ── */}
          <div style={{ textAlign: "center", borderBottom: "3px solid #000", paddingBottom: "10px", marginBottom: "15px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "900", textTransform: "uppercase", margin: "0 0 4px 0", color: "#000" }}>Municipality of Cainta</h1>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", margin: "0 0 4px 0", color: "#333" }}>Municipal Environment & Natural Resources Office (MENRO)</h2>
            <p style={{ fontSize: "12px", fontStyle: "italic", margin: 0, color: "#555" }}>GARDIAN System - Official Incident Transmittal Brief</p>
          </div>

          {/* ── Meta Information ── */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", fontSize: "13px", backgroundColor: "#f4f4f4", padding: "12px", border: "1px solid #ccc" }}>
            <div>
              <p style={{ margin: "0 0 5px 0", color: "#000" }}><strong>Reference Code:</strong> <span style={{ fontFamily: "monospace", fontSize: "14px" }}>{genRef(report.id, report.uploadedAt)}</span></p>
              <p style={{ margin: "0 0 5px 0", color: "#000" }}><strong>Date Logged:</strong> {fmtDate(report.uploadedAt)}</p>
              <p style={{ margin: "0", color: "#000" }}><strong>Current Status:</strong> <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{report.status}</span></p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "0 0 5px 0", color: "#000" }}><strong>Routed Department:</strong> {report.assignedDepartment || "Pending Routing"}</p>
              <p style={{ margin: "0", color: "#000" }}><strong>Issue Category:</strong> <span style={{ fontWeight: "bold", textTransform: "uppercase" }}>{report.issueType}</span></p>
            </div>
          </div>

          {/* ── Report Details Body ── */}
          <div style={{ marginBottom: "15px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "bold", backgroundColor: "#333", color: "#fff", padding: "6px 10px", margin: "0 0 8px 0", textTransform: "uppercase" }}>
              1. Incident & Location
            </h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "1px solid #ccc" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "8px", borderBottom: "1px solid #ccc", borderRight: "1px solid #ccc", fontWeight: "bold", width: "150px", backgroundColor: "#f9f9f9", color: "#000" }}>Reporter Name:</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #ccc", color: "#000" }}>{report.userDetails?.firstName} {report.userDetails?.lastName}</td>
                </tr>
                <tr>
                  <td style={{ padding: "8px", borderBottom: "1px solid #ccc", borderRight: "1px solid #ccc", fontWeight: "bold", backgroundColor: "#f9f9f9", color: "#000" }}>Location:</td>
                  <td style={{ padding: "8px", borderBottom: "1px solid #ccc", color: "#000" }}>
                    {report.address || "No exact address pinned."} (<strong>Brgy:</strong> {report.userDetails?.barangay || "Unspecified"})
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "8px", borderRight: "1px solid #ccc", fontWeight: "bold", backgroundColor: "#f9f9f9", color: "#000" }}>Citizen's Note:</td>
                  <td style={{ padding: "8px", fontStyle: "italic", color: "#333" }}>"{report.description || report.note || "No description provided."}"</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── AI Assessment Summary ── */}
          <div style={{ marginBottom: "15px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "bold", backgroundColor: "#333", color: "#fff", padding: "6px 10px", margin: "0 0 8px 0", textTransform: "uppercase" }}>
              2. AI Automated Assessment
            </h3>
            <div style={{ padding: "12px", backgroundColor: "#f9f9f9", border: "1px solid #ccc" }}>
              <p style={{ margin: 0, fontSize: "13px", lineHeight: "1.5", color: "#000" }}>
                <strong>Automated Brief:</strong> {generateReadableAISummary(report)}
              </p>
            </div>
          </div>

          {/* ── Photo Evidence ── */}
          {(report.url || report.annotatedUrl) && (
             <div style={{ marginBottom: "20px" }}>
               <h3 style={{ fontSize: "13px", fontWeight: "bold", backgroundColor: "#333", color: "#fff", padding: "6px 10px", margin: "0 0 8px 0", textTransform: "uppercase" }}>
                 3. Visual Evidence
               </h3>
               
               <div style={{ display: "flex", gap: "15px", justifyContent: "center" }}>
                 {report.url && (
                   <div style={{ flex: 1, textAlign: "center", border: "1px solid #999", padding: "4px", backgroundColor: "#fafafa" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "bold", color: "#333", letterSpacing: "1px" }}>ORIGINAL UPLOAD</p>
                      {/* Image height optimized to fit perfectly on page while remaining large */}
                      <img src={report.url} alt="Original Evidence" style={{ height: "220px", width: "100%", objectFit: "contain", border: "1px solid #eee" }} />
                   </div>
                 )}

                 {report.annotatedUrl && (
                   <div style={{ flex: 1, textAlign: "center", border: "1px solid #555", padding: "4px", backgroundColor: "#f0f0f0" }}>
                      <p style={{ margin: "0 0 4px 0", fontSize: "11px", fontWeight: "bold", color: "#000", letterSpacing: "1px" }}>AI DETECTION MAPPING</p>
                      <img src={report.annotatedUrl} alt="AI Annotated" style={{ height: "220px", width: "100%", objectFit: "contain", border: "1px solid #ccc" }} />
                   </div>
                 )}
               </div>
             </div>
          )}

          {/* ── Official Signatures / Footer ── */}
          <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", paddingTop: "10px" }}>
            <div style={{ textAlign: "center", width: "40%" }}>
              <div style={{ borderBottom: "1px solid #000", height: "25px", marginBottom: "5px" }}></div>
              <p style={{ fontSize: "12px", fontWeight: "bold", margin: 0, color: "#000" }}>Verified By (MENRO Data Hub)</p>
              <p style={{ fontSize: "10px", margin: 0, color: "#555" }}>Signature over printed name</p>
            </div>
            <div style={{ textAlign: "center", width: "40%" }}>
              <div style={{ borderBottom: "1px solid #000", height: "25px", marginBottom: "5px" }}></div>
              <p style={{ fontSize: "12px", fontWeight: "bold", margin: 0, color: "#000" }}>Received By Action Team</p>
              <p style={{ fontSize: "10px", margin: 0, color: "#555" }}>Signature over printed name & Date</p>
            </div>
          </div>

        </div>
      ))}
    </div>
  );
});

export default PrintableReport;