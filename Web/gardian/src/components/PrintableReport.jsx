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
  <div ref={ref} style={{ padding:"20px", fontFamily:'"Times New Roman", Times, serif', color:"#000", background:"#fff" }}>
    <style type="text/css" media="print">{`
      @page { size: letter; margin: 0.5in; }
      .page-break { page-break-after: always; }
      .report-container { page-break-inside: avoid; width: 100%; box-sizing: border-box; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `}</style>

    {reports.map((report, idx) => (
      <div 
        key={report.id} 
        className={`report-container${idx !== reports.length - 1 ? " page-break" : ""}`} 
        style={{ paddingBottom: "20px" }} // Added buffer to prevent sliced signatures
      >

        {/* LGU Official Header */}
        <div style={{ textAlign:"center", marginBottom:"12px" }}> {/* Reduced margin to fit 1 page */}
          <p style={{ fontSize:"11px", margin:"0" }}>Republic of the Philippines</p>
          <p style={{ fontSize:"11px", margin:"0" }}>Province of Rizal</p>
          <h1 style={{ fontSize:"14px", fontWeight:"bold", margin:"4px 0" }}>MUNICIPALITY OF CAINTA</h1>
          <h2 style={{ fontSize:"12px", fontWeight:"bold", margin:"0 0 6px 0" }}>OFFICE OF THE MUNICIPAL ENVIRONMENT AND NATURAL RESOURCES</h2>
          <div style={{ borderTop:"2px solid #000", margin:"0 auto 8px auto" }} />
          <h3 style={{ fontSize:"14px", fontWeight:"bold", textTransform:"uppercase", margin:0 }}>Official Incident Transmittal Brief</h3>
        </div>

        {/* Meta row */}
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"12px", fontSize:"12px", border:"1px solid #000", padding:"10px 12px" }}>
          <div>
            <p style={{ margin:"0 0 5px 0" }}><strong>Control No.:</strong> <span style={{ fontFamily:"monospace", fontSize:"13px" }}>{genRef(report.id, report.uploadedAt)}</span></p>
            <p style={{ margin:"0 0 5px 0" }}><strong>Date Logged:</strong> {fmtDate(report.uploadedAt)}</p>
            <p style={{ margin:0 }}><strong>Current Status:</strong> <span style={{ fontWeight:"bold", textTransform:"uppercase" }}>{report.status || "PENDING"}</span></p>
          </div>
          <div style={{ textAlign:"right" }}>
            <p style={{ margin:"0 0 5px 0" }}><strong>Routed Department:</strong> {report.assignedDepartment || "Pending Routing"}</p>
            <p style={{ margin:0 }}><strong>Incident Category:</strong> <span style={{ fontWeight:"bold", textTransform:"uppercase" }}>{report.issueType}</span></p>
          </div>
        </div>

        {/* Section 1 — Incident & Location */}
        <div style={{ marginBottom:"12px" }}>
          <h3 style={{ fontSize:"12px", fontWeight:"bold", backgroundColor:"#E6E6E6", border:"1px solid #000", color:"#000", padding:"4px 10px", margin:"0 0 6px 0", textTransform:"uppercase" }}>
            I. Incident & Location Details
          </h3>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px", border:"1px solid #000" }}>
            <tbody>
              {[
                ["Reporter Name:", `${report.userDetails?.firstName || ""} ${report.userDetails?.lastName || ""}`.trim() || "—"],
                ["Location:", `${report.address || "No exact address."} (Brgy: ${report.userDetails?.barangay || "Unspecified"})`],
                ["Citizen's Note:", `"${report.description || report.note || "No description provided."}"`],
              ].map(([label, val], i) => (
                <tr key={i}>
                  <td style={{ padding:"6px", borderBottom: i < 2 ? "1px solid #000" : "none", borderRight:"1px solid #000", fontWeight:"bold", width:"150px", backgroundColor:"#F9F9F9" }}>{label}</td>
                  <td style={{ padding:"6px", borderBottom: i < 2 ? "1px solid #000" : "none", fontStyle: i === 2 ? "italic" : "normal" }}>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2 — AI Assessment */}
        <div style={{ marginBottom:"12px" }}>
          <h3 style={{ fontSize:"12px", fontWeight:"bold", backgroundColor:"#E6E6E6", border:"1px solid #000", color:"#000", padding:"4px 10px", margin:"0 0 6px 0", textTransform:"uppercase" }}>
            II. AI Automated Assessment
          </h3>
          <div style={{ padding:"8px 12px", border:"1px solid #000" }}>
            <p style={{ margin:0, fontSize:"12px", lineHeight:"1.4" }}>
              <strong>Automated Brief:</strong> {generateReadableAISummary(report)}
            </p>
          </div>
        </div>

        {/* Section 3 — Visual Evidence */}
        {(report.url || report.annotatedUrl) && (
          <div style={{ marginBottom:"12px" }}>
            <h3 style={{ fontSize:"12px", fontWeight:"bold", backgroundColor:"#E6E6E6", border:"1px solid #000", color:"#000", padding:"4px 10px", margin:"0 0 6px 0", textTransform:"uppercase" }}>
              III. Visual Evidence Attachment
            </h3>
            <div style={{ display:"flex", gap:"15px", justifyContent:"center" }}>
              {report.url && (
                <div style={{ flex:1, textAlign:"center", border:"1px solid #000", padding:"4px" }}>
                  <p style={{ margin:"0 0 4px 0", fontSize:"10px", fontWeight:"bold", letterSpacing:"1px", textTransform:"uppercase" }}>Original Upload</p>
                  {/* Reduced image height from 220px to 170px to guarantee 1-page fit */}
                  <img crossOrigin="anonymous" src={report.url} alt="Original" style={{ height:"170px", width:"100%", objectFit:"contain", border:"1px solid #ccc" }}/>
                </div>
              )}
              {report.annotatedUrl && (
                <div style={{ flex:1, textAlign:"center", border:"1px solid #000", padding:"4px" }}>
                  <p style={{ margin:"0 0 4px 0", fontSize:"10px", fontWeight:"bold", letterSpacing:"1px", textTransform:"uppercase" }}>AI Detection Mapping</p>
                  <img crossOrigin="anonymous" src={report.annotatedUrl} alt="AI Annotated" style={{ height:"170px", width:"100%", objectFit:"contain", border:"1px solid #ccc" }}/>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Signature block */}
        <div style={{ marginTop:"20px", display:"flex", justifyContent:"space-between", paddingTop:"10px" }}> {/* Reduced marginTop */}
          {[
            ["Prepared by:", "GARDIAN System Administrator", "Signature over printed name"], 
            ["Received by Action Team:", "Department / Office Representative", "Signature over printed name & Date"]
          ].map(([title, role, sub]) => (
            <div key={title} style={{ width:"45%" }}>
              <p style={{ fontSize:"12px", margin:"0 0 20px 0" }}>{title}</p>
              <div style={{ borderBottom:"1px solid #000", height:"1px", marginBottom:"5px" }}/>
              <p style={{ fontSize:"11px", fontWeight:"bold", margin:0, textTransform:"uppercase" }}>{role}</p>
              <p style={{ fontSize:"10px", margin:0 }}>{sub}</p>
            </div>
          ))}
        </div>

      </div>
    ))}
  </div>
));

PrintableReport.displayName = "PrintableReport";
export default PrintableReport;