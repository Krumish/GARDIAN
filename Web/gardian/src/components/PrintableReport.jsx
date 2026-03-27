import React, { forwardRef } from "react";

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" });
};

const genRef = (id, ts) => {
  if (!id) return "REF-00000000-XXXXX";
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  const ds = d && !isNaN(d) ? d.toISOString().slice(0,10).replace(/-/g,"") : "00000000";
  return `REF-${ds}-${id.slice(-5).toUpperCase()}`;
};

const generateReadableAISummary = (report) => {
  const { issueType, yolo } = report;
  if (!yolo || (!yolo.status && (!yolo.boxes || yolo.boxes.length === 0) && !yolo.obstructions)) {
    return "No AI automated analysis is available for this incident. Manual assessment required.";
  }
  const boxes = yolo.boxes || [];

  if (issueType === "Drainage") {
    const ratio  = report.blockageRatio ?? (yolo.max_blockage_ratio ?? 0);
    const status = ratio >= 0.50 ? "Clogged" : ratio >= 0.10 ? "Partially Blocked" : "Clear";
    const obs    = (yolo.obstructions || []).reduce((a, o) => { a[o.class] = (a[o.class]||0)+1; return a; }, {});
    const obsStr = Object.entries(obs).map(([c,n]) => `${n} ${c.replace(/_/g," ")}`).join(", ");
    return `The AI assessed the drainage as ${status.toUpperCase()} with a severity of ${(ratio*100).toFixed(1)}%. ${obsStr ? `Detected obstructions: ${obsStr}.` : ""}`;
  }
  if (issueType === "Pothole") {
    const n    = boxes.filter(b => b.class === "pothole").length;
    const sev  = n >= 5 ? "High" : n >= 2 ? "Moderate" : n === 1 ? "Low" : "None";
    return `The AI detected ${n} pothole(s). Structural hazard severity: ${sev.toUpperCase()}.`;
  }
  if (issueType === "Road Blockage") {
    const n   = boxes.filter(b => b.class === "vehicle").length;
    const sev = n >= 6 ? "High" : n >= 3 ? "Moderate" : "Low";
    return `The AI detected ${n} vehicle(s) causing obstruction. Blockage severity: ${sev.toUpperCase()}.`;
  }
  if (issueType === "Road Markings") {
    const intact = boxes.filter(b => b.class === "intact_crosswalk").length;
    const faded  = boxes.filter(b => b.class === "faded_crosswalk").length;
    const cond   = faded > 0 && intact === 0 ? "Severely Faded" : faded > 0 && intact > 0 ? "Mixed/Partially Faded" : intact > 0 ? "Intact" : "Unknown";
    return `AI identified ${faded} faded and ${intact} intact segment(s). Visibility condition: ${cond.toUpperCase()}.`;
  }
  if (issueType === "Manhole") {
    const broken = boxes.filter(b => b.class === "broken_manhole").length;
    const intact = boxes.filter(b => b.class === "intact_manhole").length;
    const cond   = broken > 0 ? "Damaged/Hazardous" : intact > 0 ? "Intact" : "Unknown";
    return `AI detected ${broken} broken and ${intact} intact cover(s). Condition: ${cond.toUpperCase()}.`;
  }
  return `The AI detected ${boxes.length} object(s) for ${issueType}. Manual review recommended.`;
};

const PrintableReport = forwardRef(({ reports }, ref) => (
  <div ref={ref} style={{ padding:"20px", fontFamily:"Arial, sans-serif", color:"#000", background:"#fff" }}>
    <style type="text/css" media="print">{`
      @page { size: letter; margin: 0.5in; }
      .page-break { page-break-after: always; }
      .report-container { page-break-inside: avoid; width: 100%; box-sizing: border-box; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `}</style>

    {reports.map((report, idx) => (
      <div key={report.id} className={`report-container${idx !== reports.length - 1 ? " page-break" : ""}`}>

        {/* Header */}
        <div style={{ textAlign:"center", borderBottom:"3px solid #000", paddingBottom:"10px", marginBottom:"15px" }}>
          <h1 style={{ fontSize:"20px", fontWeight:"900", textTransform:"uppercase", margin:"0 0 4px 0" }}>Municipality of Cainta</h1>
          <h2 style={{ fontSize:"15px", fontWeight:"bold", margin:"0 0 4px 0", color:"#333" }}>Municipal Environment & Natural Resources Office (MENRO)</h2>
          <p style={{ fontSize:"12px", fontStyle:"italic", margin:0, color:"#555" }}>GARDIAN System — Official Incident Transmittal Brief</p>
        </div>

        {/* Meta row */}
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"15px", fontSize:"13px", backgroundColor:"#f4f4f4", padding:"12px", border:"1px solid #ccc" }}>
          <div>
            <p style={{ margin:"0 0 5px 0" }}><strong>Reference Code:</strong> <span style={{ fontFamily:"monospace", fontSize:"14px" }}>{genRef(report.id, report.uploadedAt)}</span></p>
            <p style={{ margin:"0 0 5px 0" }}><strong>Date Logged:</strong> {fmtDate(report.uploadedAt)}</p>
            <p style={{ margin:0 }}><strong>Current Status:</strong> <span style={{ fontWeight:"bold", textTransform:"uppercase" }}>{report.status}</span></p>
          </div>
          <div style={{ textAlign:"right" }}>
            <p style={{ margin:"0 0 5px 0" }}><strong>Routed Department:</strong> {report.assignedDepartment || "Pending Routing"}</p>
            <p style={{ margin:0 }}><strong>Issue Category:</strong> <span style={{ fontWeight:"bold", textTransform:"uppercase" }}>{report.issueType}</span></p>
          </div>
        </div>

        {/* Section 1 — Incident & Location */}
        <div style={{ marginBottom:"15px" }}>
          <h3 style={{ fontSize:"13px", fontWeight:"bold", backgroundColor:"#333", color:"#fff", padding:"6px 10px", margin:"0 0 8px 0", textTransform:"uppercase" }}>
            1. Incident & Location
          </h3>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px", border:"1px solid #ccc" }}>
            <tbody>
              {[
                ["Reporter Name:", `${report.userDetails?.firstName || ""} ${report.userDetails?.lastName || ""}`.trim() || "—"],
                ["Location:", `${report.address || "No exact address."} (Brgy: ${report.userDetails?.barangay || "Unspecified"})`],
                ["Citizen's Note:", `"${report.description || report.note || "No description provided."}"`],
              ].map(([label, val], i) => (
                <tr key={i}>
                  <td style={{ padding:"8px", borderBottom: i < 2 ? "1px solid #ccc" : "none", borderRight:"1px solid #ccc", fontWeight:"bold", width:"150px", backgroundColor:"#f9f9f9" }}>{label}</td>
                  <td style={{ padding:"8px", borderBottom: i < 2 ? "1px solid #ccc" : "none", fontStyle: i === 2 ? "italic" : "normal", color: i === 2 ? "#333" : "#000" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2 — AI Assessment */}
        <div style={{ marginBottom:"15px" }}>
          <h3 style={{ fontSize:"13px", fontWeight:"bold", backgroundColor:"#333", color:"#fff", padding:"6px 10px", margin:"0 0 8px 0", textTransform:"uppercase" }}>
            2. AI Automated Assessment
          </h3>
          <div style={{ padding:"12px", backgroundColor:"#f9f9f9", border:"1px solid #ccc" }}>
            <p style={{ margin:0, fontSize:"13px", lineHeight:"1.5" }}>
              <strong>Automated Brief:</strong> {generateReadableAISummary(report)}
            </p>
          </div>
        </div>

        {/* Section 3 — Visual Evidence */}
        {(report.url || report.annotatedUrl) && (
          <div style={{ marginBottom:"20px" }}>
            <h3 style={{ fontSize:"13px", fontWeight:"bold", backgroundColor:"#333", color:"#fff", padding:"6px 10px", margin:"0 0 8px 0", textTransform:"uppercase" }}>
              3. Visual Evidence
            </h3>
            <div style={{ display:"flex", gap:"15px", justifyContent:"center" }}>
              {report.url && (
                <div style={{ flex:1, textAlign:"center", border:"1px solid #999", padding:"4px", backgroundColor:"#fafafa" }}>
                  <p style={{ margin:"0 0 4px 0", fontSize:"11px", fontWeight:"bold", color:"#333", letterSpacing:"1px" }}>ORIGINAL UPLOAD</p>
                  <img src={report.url} alt="Original" style={{ height:"220px", width:"100%", objectFit:"contain", border:"1px solid #eee" }}/>
                </div>
              )}
              {report.annotatedUrl && (
                <div style={{ flex:1, textAlign:"center", border:"1px solid #555", padding:"4px", backgroundColor:"#f0f0f0" }}>
                  <p style={{ margin:"0 0 4px 0", fontSize:"11px", fontWeight:"bold", color:"#000", letterSpacing:"1px" }}>AI DETECTION MAPPING</p>
                  <img src={report.annotatedUrl} alt="AI Annotated" style={{ height:"220px", width:"100%", objectFit:"contain", border:"1px solid #ccc" }}/>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature block */}
        <div style={{ marginTop:"30px", display:"flex", justifyContent:"space-between", paddingTop:"10px" }}>
          {[["Verified By (MENRO Data Hub)","Signature over printed name"], ["Received By Action Team","Signature over printed name & Date"]].map(([title, sub]) => (
            <div key={title} style={{ textAlign:"center", width:"40%" }}>
              <div style={{ borderBottom:"1px solid #000", height:"25px", marginBottom:"5px" }}/>
              <p style={{ fontSize:"12px", fontWeight:"bold", margin:0 }}>{title}</p>
              <p style={{ fontSize:"10px", margin:0, color:"#555" }}>{sub}</p>
            </div>
          ))}
        </div>

      </div>
    ))}
  </div>
));

PrintableReport.displayName = "PrintableReport";
export default PrintableReport;