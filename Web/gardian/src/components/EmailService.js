import emailjs from "@emailjs/browser";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../../firebase";

// ── EmailJS init ──────────────────────────────────────────────────────────────
emailjs.init("rZmpEpHC52apiPhDX");

const SERVICE_ID  = "service_rk48v4o";
const TEMPLATE_ID = "template_6tp7vsf";
const EMAILS_DOC  = "settings/departmentEmails";
const LOGO_URL    = "https://firebasestorage.googleapis.com/v0/b/gardian-2d7e5.firebasestorage.app/o/gardianlogo.png?alt=media&token=4074eebe-f9bd-4f5f-8691-074f2b7faa25";

const DEFAULT_EMAILS = {
  "MENRO / WMO":        [],
  "Mayor / Dispatch":   [],
  "Engineering Office": [],
};

// ── Firestore helpers ─────────────────────────────────────────────────────────
export async function loadDepartmentEmails() {
  try {
    const snap = await getDoc(doc(db, EMAILS_DOC));
    if (snap.exists()) return { ...DEFAULT_EMAILS, ...snap.data() };
    return { ...DEFAULT_EMAILS };
  } catch (e) {
    console.error("[EmailService] loadDepartmentEmails:", e);
    return { ...DEFAULT_EMAILS };
  }
}

export async function saveDepartmentEmails(emailMap) {
  await setDoc(doc(db, EMAILS_DOC), emailMap, { merge: true });
}

// ── Firebase Storage upload ───────────────────────────────────────────────────
export async function uploadReportFile(blob, filename) {
  const storageRef = ref(storage, `report-exports/${Date.now()}-${filename}`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function phTimestamp() {
  return new Date().toLocaleString("en-PH", {
    timeZone:  "Asia/Manila",
    dateStyle: "long",
    timeStyle: "short",
  });
}

const genRef = (r) => {
  if (!r?.id) return "REF-00000000-XXXXX";
  const ts = r.uploadedAt;
  const d  = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  const ds = d && !isNaN(d) ? d.toISOString().slice(0, 10).replace(/-/g, "") : "00000000";
  return `REF-${ds}-${r.id.slice(-5).toUpperCase()}`;
};

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
};

const statusBadge = (status) => {
  const styles = {
    Resolved:  "background:#d1fae5;color:#065f46;",
    Forwarded: "background:#dbeafe;color:#1e40af;",
    Assigned:  "background:#e0f2fe;color:#075985;",
    Pending:   "background:#fef3c7;color:#92400e;",
    Withdrawn: "background:#f3f4f6;color:#374151;",
  };
  const s = styles[status] || styles.Pending;
  return `<span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;${s}">${status}</span>`;
};

const cleanText = (str) => {
  if (!str) return "";
  return str
    .replace(/&#x2F;/gi, "/")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
};

// ── Reports table ─────────────────────────────────────────────────────────────
function buildReportsTable(reports) {
  const rows = reports.map((r, i) => {
    const name = [r.userDetails?.firstName, r.userDetails?.lastName].filter(Boolean).join(" ") || "Unknown";
    return `
      <tr style="border-top:1px solid #e5e7eb;background:${i % 2 === 0 ? "#fff" : "#fafafa"};">
        <td style="padding:8px 10px;font-family:monospace;font-size:11px;color:#6b7280;">${genRef(r)}</td>
        <td style="padding:8px 10px;font-size:12px;color:#111827;">${name}</td>
        <td style="padding:8px 10px;font-size:12px;color:#374151;">${r.issueType || "Unknown"}</td>
        <td style="padding:8px 10px;font-size:12px;color:#374151;">${r.address || "—"}</td>
        <td style="padding:8px 10px;font-size:12px;color:#374151;">${fmtDate(r.uploadedAt)}</td>
        <td style="padding:8px 10px;">${statusBadge(r.status)}</td>
      </tr>`;
  }).join("");

  const headers = ["Reference", "Reporter", "Type", "Location", "Submitted", "Status"];
  return `
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border-collapse:collapse;font-family:sans-serif;font-size:12px;border:1px solid #e5e7eb;">
      <thead>
        <tr style="background:#f9fafb;">
          ${headers.map(h => `<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;
            text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── KPI strip ─────────────────────────────────────────────────────────────────
function buildKpiStrip(count, typeLabel, typeColor, typeBg, typeBorder, timestamp) {
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="33%" style="padding:0 5px 0 0;">
          <div style="padding:12px 14px;border-radius:8px;text-align:center;background:#f0f9ff;border:1px solid #bae6fd;">
            <div style="font-size:26px;font-weight:800;color:#1d4ed8;line-height:1;">${count}</div>
            <div style="font-size:10px;color:#0369a1;text-transform:uppercase;letter-spacing:0.06em;margin-top:3px;">Report(s)</div>
          </div>
        </td>
        <td width="33%" style="padding:0 2.5px;">
          <div style="padding:12px 14px;border-radius:8px;text-align:center;background:${typeBg};border:1px solid ${typeBorder};">
            <div style="font-size:15px;font-weight:700;color:${typeColor};line-height:1;">${typeLabel}</div>
            <div style="font-size:10px;color:${typeColor};text-transform:uppercase;letter-spacing:0.06em;margin-top:3px;opacity:0.75;">Action Type</div>
          </div>
        </td>
        <td width="33%" style="padding:0 0 0 5px;">
          <div style="padding:12px 14px;border-radius:8px;text-align:center;background:#f0fdf4;border:1px solid #bbf7d0;">
            <div style="font-size:12px;font-weight:700;color:#14532d;line-height:1.2;">${timestamp}</div>
            <div style="font-size:10px;color:#15803d;text-transform:uppercase;letter-spacing:0.06em;margin-top:3px;">Timestamp</div>
          </div>
        </td>
      </tr>
    </table>`;
}

// ── Shared header builder (logo + no accent line) ─────────────────────────────
function buildHeader(bgColor, subtitleColor, subtitle) {
  return `
    <div style="background:${bgColor};padding:24px 28px 18px;border-radius:12px 12px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="52" valign="middle">
            <img src="${LOGO_URL}" width="38" height="38"
              style="border-radius:8px;display:block;" alt="GARDIAN Logo" />
          </td>
          <td valign="middle">
            <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.04em;">GARDIAN</div>
            <div style="color:${subtitleColor};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;">${subtitle}</div>
          </td>
        </tr>
      </table>
    </div>`;
}

// ── Email footer ──────────────────────────────────────────────────────────────
function buildFooter(generatedBy) {
  const ts = phTimestamp();
  return `
    <div style="border-top:1px dashed #e5e7eb;margin:20px 0;"></div>
    <p style="font-size:11px;color:#6b7280;margin:0;">
      This notification was generated by <strong>${generatedBy}</strong> via the GARDIAN Admin Dashboard.
      Do not reply to this email — contact your system administrator for concerns.
    </p>`;
}

// ── Subject line builder ──────────────────────────────────────────────────────
function buildSubject(triggerType, { department, reports, exportType }) {
  const count = reports.length;
  const ts    = new Date().toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila",
    month:    "short",
    day:      "numeric",
    year:     "numeric",
  });
  const dept = cleanText(department);

  switch (triggerType) {
    case "dispatch":
      return `[GARDIAN] Dispatch Order — ${count} Report(s) Routed to ${dept}`;
    case "print":
      return `[GARDIAN] Transmittal Printed — ${count} Report(s) for ${dept}`;
    case "pdf":
    case "csv":
    case "docx":
      return `[GARDIAN] ${(exportType || triggerType).toUpperCase()} Report Ready — ${dept} · ${ts}`;
    default:
      return `[GARDIAN] Notification — ${dept}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 1 — Batch Forward / Dispatch Notice
// ═══════════════════════════════════════════════════════════════════════════════
function buildDispatchTemplate({ department, reports, generatedBy }) {
  const ts   = phTimestamp();
  const dept = cleanText(department);
  return `
<div style="font-family:system-ui,Arial,sans-serif;font-size:13px;color:#1f2937;max-width:680px;margin:0 auto;">

  ${buildHeader("#1e3a5f", "#93c5fd", "Dispatch Order · Municipality of Cainta")}

  <div style="background:#ffffff;padding:26px 28px;border:1px solid #e5e7eb;border-top:none;">

    <div style="padding:10px 14px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);
      border-radius:6px;margin-bottom:18px;">
      <span style="color:#92400e;font-size:11px;font-weight:600;">Action Required — Reports have been routed to your department</span>
    </div>

    <p style="font-size:15px;color:#111827;margin:0 0 6px;font-weight:600;">
      Dear <strong>${dept}</strong> Team,
    </p>
    <p style="font-size:13px;color:#6b7280;margin:0 0 22px;line-height:1.6;">
      The following incident reports have been officially routed to your department by the GARDIAN Admin.
      Please review, assign field teams, and update report statuses within the DILG compliance window.
    </p>

    ${buildKpiStrip(reports.length, "Dispatch Notice", "#92400e", "#fef3c7", "#fde68a", ts)}

    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin:0 0 8px;">
      Routed Reports
    </p>
    ${buildReportsTable(reports)}

    <div style="margin-top:18px;padding:12px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;">
      <p style="margin:0;font-size:11px;color:#7c2d12;line-height:1.5;">
        <strong>Compliance reminder:</strong> DILG mandates field response within <strong>72 hours</strong> of dispatch.
        Please update report statuses in the GARDIAN dashboard once action has been taken.
      </p>
    </div>

    ${buildFooter(generatedBy)}
  </div>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;
    padding:13px 28px;text-align:center;">
    <p style="font-size:10px;color:#9ca3af;margin:0;">
      GARDIAN System &nbsp;·&nbsp; Municipality of Cainta &nbsp;·&nbsp; Dispatch Notification &nbsp;·&nbsp; ${ts}
    </p>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 2 — Batch Print / Transmittal Confirmation
// ═══════════════════════════════════════════════════════════════════════════════
function buildPrintTemplate({ department, reports, generatedBy }) {
  const ts   = phTimestamp();
  const dept = cleanText(department);
  return `
<div style="font-family:system-ui,Arial,sans-serif;font-size:13px;color:#1f2937;max-width:680px;margin:0 auto;">

  ${buildHeader("#1e293b", "#a5b4fc", "Transmittal Confirmation · Municipality of Cainta")}

  <div style="background:#ffffff;padding:26px 28px;border:1px solid #e5e7eb;border-top:none;">
    <p style="font-size:15px;color:#111827;margin:0 0 6px;font-weight:600;">
      Dear <strong>${dept}</strong> Team,
    </p>
    <p style="font-size:13px;color:#6b7280;margin:0 0 22px;line-height:1.6;">
      Transmittal forms have been printed for the reports listed below. Physical copies are being forwarded
      to your office. Please acknowledge receipt, sign the transmittal, and file accordingly.
    </p>

    ${buildKpiStrip(reports.length, "Print Transmittal", "#3730a3", "#f5f3ff", "#ddd6fe", ts)}

    <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin:0 0 8px;">
      Transmittal Details
    </p>
    ${buildReportsTable(reports)}

    <div style="margin-top:18px;padding:12px 14px;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;">
      <p style="margin:0;font-size:11px;color:#3730a3;line-height:1.5;">
        <strong>Please acknowledge:</strong> Sign and return the physical transmittal form upon receipt of field assignment.
        Update the report status in GARDIAN once action has been completed.
      </p>
    </div>

    ${buildFooter(generatedBy)}
  </div>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;
    padding:13px 28px;text-align:center;">
    <p style="font-size:10px;color:#9ca3af;margin:0;">
      GARDIAN System &nbsp;·&nbsp; Municipality of Cainta &nbsp;·&nbsp; Transmittal Notification &nbsp;·&nbsp; ${ts}
    </p>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE 3 — Generate Report Export
// ═══════════════════════════════════════════════════════════════════════════════
function buildExportTemplate({ department, reports, exportType, downloadUrl, filename, generatedBy }) {
  const ts        = phTimestamp();
  const dept      = cleanText(department);
  const typeUpper = exportType.toUpperCase();
  const validDays = 7;

  return `
<div style="font-family:system-ui,Arial,sans-serif;font-size:13px;color:#1f2937;max-width:680px;margin:0 auto;">

  ${buildHeader("#0f172a", "#6ee7b7", "Generated Report · Municipality of Cainta")}

  <div style="background:#ffffff;padding:26px 28px;border:1px solid #e5e7eb;border-top:none;">
    <p style="font-size:15px;color:#111827;margin:0 0 6px;font-weight:600;">
      Dear <strong>${dept}</strong> Team,
    </p>
    <p style="font-size:13px;color:#6b7280;margin:0 0 22px;line-height:1.6;">
      Your department's incident report has been generated and is ready for download. The file contains all
      reports within the selected date range along with an analytics summary.
    </p>

    ${buildKpiStrip(reports.length, typeUpper + " File", "#065f46", "#f0fdf4", "#bbf7d0", ts)}

    ${downloadUrl ? `
    <div style="padding:14px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:10px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="middle">
            <p style="margin:0;font-size:12px;font-weight:600;color:#14532d;">${filename || `MENRO_Report.${exportType}`}</p>
            <p style="margin:3px 0 0;font-size:11px;color:#059669;">Ready for download · Link valid for ${validDays} days</p>
          </td>
          <td valign="middle" align="right">
            <a href="${downloadUrl}"
              style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;
                     font-size:12px;font-weight:600;padding:9px 20px;border-radius:6px;white-space:nowrap;">
              Download ${typeUpper}
            </a>
          </td>
        </tr>
      </table>
    </div>
    <p style="font-size:11px;color:#9ca3af;text-align:center;margin:0 0 16px;">
      Link expires in ${validDays} days. Do not share this link publicly.
    </p>` : ""}

    ${buildFooter(generatedBy)}
  </div>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;
    padding:13px 28px;text-align:center;">
    <p style="font-size:10px;color:#9ca3af;margin:0;">
      GARDIAN System &nbsp;·&nbsp; Municipality of Cainta &nbsp;·&nbsp; Report Export Notification &nbsp;·&nbsp; ${ts}
    </p>
  </div>
</div>`;
}

// ── Core send — cleans subject entities before sending ────────────────────────
async function sendEmail({ toEmail, subject, htmlBody }) {
  if (!toEmail) return;

  // Decode ALL possible encodings of / before EmailJS touches it
  const cleanSubject = subject
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/gi, "/")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"');

  await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
    to_email:     toEmail,
    name:         "GARDIAN — Municipality of Cainta",
    email:        "noreply@gardian.app",
    subject:      cleanSubject,
    message_html: htmlBody,
  });
}

// ── High-level senders ────────────────────────────────────────────────────────
export async function sendGroupedDepartmentEmails({ reports, triggerType, deptEmailsMap, generatedBy }) {
  const user      = auth.currentUser;
  const adminName = generatedBy || user?.displayName || user?.email || "GARDIAN Admin";

  const groups = {};
  for (const r of reports) {
    const dept = r.assignedDepartment || "Unassigned";
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(r);
  }

  const sends = Object.entries(groups).map(async ([dept, deptReports]) => {
    const rawEmails   = deptEmailsMap?.[dept] || [];
    const validEmails = rawEmails
      .map(e => (typeof e === "string" ? e.trim() : ""))
      .filter(e => e.includes("@"));

    if (validEmails.length === 0) {
      console.warn(`[EmailService] No valid emails for ${dept} — skipping.`);
      return;
    }

    const htmlBody = triggerType === "dispatch"
      ? buildDispatchTemplate({ department: dept, reports: deptReports, generatedBy: adminName })
      : buildPrintTemplate({ department: dept, reports: deptReports, generatedBy: adminName });

    const subject = buildSubject(triggerType, { department: dept, reports: deptReports });

    await sendEmail({ toEmail: validEmails.join(","), subject, htmlBody });
  });

  await Promise.allSettled(sends);
}

export async function uploadAndSendReportEmail({ blob, filename, department, reports, triggerType, deptEmailsMap, generatedBy }) {
  const user      = auth.currentUser;
  const adminName = generatedBy || user?.displayName || user?.email || "GARDIAN Admin";

  const downloadUrl = await uploadReportFile(blob, filename);

  const rawEmails   = deptEmailsMap?.[department] || [];
  const validEmails = rawEmails
    .map(e => (typeof e === "string" ? e.trim() : ""))
    .filter(e => e.includes("@"));

  if (validEmails.length === 0) {
    console.warn(`[EmailService] No valid emails for ${department} — skipping email.`);
    return downloadUrl;
  }

  const htmlBody = buildExportTemplate({
    department,
    reports,
    exportType:  triggerType,
    downloadUrl,
    filename,
    generatedBy: adminName,
  });

  const subject = buildSubject(triggerType, {
    department,
    reports,
    exportType: triggerType,
  });

  await sendEmail({ toEmail: validEmails.join(","), subject, htmlBody });
  return downloadUrl;
}