import emailjs from "@emailjs/browser";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../../firebase";

// ── EmailJS init ──────────────────────────────────────────────────────────────
emailjs.init("rZmpEpHC52apiPhDX");

// ── Constants ─────────────────────────────────────────────────────────────────
const SERVICE_ID  = "service_rk48v4o";
const TEMPLATE_ID = "template_6tp7vsf";
const EMAILS_DOC  = "settings/departmentEmails";

const DEFAULT_EMAILS = {
  "MENRO / WMO":        [],
  "Mayor / Dispatch":   [],
  "Engineering Office": [],
};

// ── Firestore helpers ─────────────────────────────────────────────────────────

/** Load department emails from Firestore → { "MENRO / WMO": ["email@..."], ... } */
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



/** Save department emails to Firestore. */
export async function saveDepartmentEmails(emailMap) {
  await setDoc(doc(db, EMAILS_DOC), emailMap, { merge: true });
}

// ── Firebase Storage upload ───────────────────────────────────────────────────

/** Upload a Blob to /report-exports/ and return a public download URL. */
export async function uploadReportFile(blob, filename) {
  const storageRef = ref(storage, `report-exports/${Date.now()}-${filename}`);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

// ── Template builders ─────────────────────────────────────────────────────────

function phTimestamp() {
  return new Date().toLocaleString("en-PH", {
    timeZone:  "Asia/Manila",
    dateStyle: "long",
    timeStyle: "short",
  });
}

function buildReportsTable(reports) {
  const genRef = (r) => {
    if (!r?.id) return "REF-00000000-XXXXX";
    const ts = r.uploadedAt;
    const d  = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    const ds = d && !isNaN(d)
      ? d.toISOString().slice(0, 10).replace(/-/g, "")
      : "00000000";
    return `REF-${ds}-${r.id.slice(-5).toUpperCase()}`;
  };

  const fmtDate = (ts) => {
    if (!ts) return "-";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  };

  const statusStyle = (status) => {
    if (status === "Resolved")  return "background:#d1fae5;color:#065f46;";
    if (status === "Forwarded") return "background:#dbeafe;color:#1e40af;";
    if (status === "Assigned")  return "background:#e0f2fe;color:#075985;";
    return "background:#fef3c7;color:#92400e;";
  };

  const rows = reports.map((r) => {
    const name = [r.userDetails?.firstName, r.userDetails?.lastName]
      .filter(Boolean).join(" ") || "Unknown";
    return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 10px;font-family:monospace;font-size:11px;color:#6b7280;">${genRef(r)}</td>
        <td style="padding:8px 10px;font-size:12px;color:#111827;">${name}</td>
        <td style="padding:8px 10px;font-size:12px;color:#374151;">${r.issueType || "Unknown"}</td>
        <td style="padding:8px 10px;font-size:12px;color:#374151;">${r.address || "—"}</td>
        <td style="padding:8px 10px;font-size:12px;color:#374151;">${fmtDate(r.uploadedAt)}</td>
        <td style="padding:8px 10px;">
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;${statusStyle(r.status)}">${r.status}</span>
        </td>
      </tr>`;
  }).join("");

  return `
    <table width="100%" cellpadding="0" cellspacing="0"
      style="border-collapse:collapse;font-family:sans-serif;font-size:12px;border:1px solid #e5e7eb;overflow:hidden;">
      <thead>
        <tr style="background:#f9fafb;">
          ${["Reference","Reporter","Type","Location","Submitted","Status"].map(h =>
            `<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;">${h}</th>`
          ).join("")}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildTemplateParams({ toEmail, department, reports, exportType, actionNote, downloadUrl = "" }) {
  const user = auth.currentUser;
  const generatedBy = user?.displayName || user?.email || "GARDIAN Admin";
  return {
    to_email:      toEmail,
    name:          "GARDIAN System",        
    email:         "noreply@gardian.app",
    department,
    report_count:  String(reports.length),
    reports_table: buildReportsTable(reports),
    download_url:  downloadUrl,
    export_type:   exportType,
    generated_by:  generatedBy,
    timestamp:     phTimestamp(),
    action_note:   actionNote,
  };
}

// ── Core send ─────────────────────────────────────────────────────────────────

/**
 * Send one email to a department.
 * Silently skips if no emails are configured.
 */
export async function sendDepartmentEmail(opts, recipientEmails) {
  if (!recipientEmails || recipientEmails.length === 0) {
    console.warn(`[EmailService] No emails for ${opts.department} — skipping.`);
    return;
  }
  const params = buildTemplateParams({ ...opts, toEmail: recipientEmails.join(", ") });
  await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
}

// ── High-level grouped senders ────────────────────────────────────────────────

/**
 * Group reports by assignedDepartment and fire one email per department.
 * Used by Trigger 1 (batch forward) and Trigger 2 (batch print).
 *
 * @param {Object[]} reports    — report objects, each with .assignedDepartment
 * @param {Object}   emailMap   — { "MENRO / WMO": ["a@b.com"], ... }
 * @param {"Dispatch Notice"|"Print Transmittal"} exportType
 */
export async function sendGroupedDepartmentEmails({ reports, triggerType, deptEmailsMap, generatedBy }) {
  const groups = {};
  for (const r of reports) {
    const dept = r.assignedDepartment || "Unassigned";
    if (!groups[dept]) groups[dept] = [];
    groups[dept].push(r);
  }

  const exportType = triggerType === "dispatch" ? "Dispatch Notice" : "Print Transmittal";
  const actionNote = triggerType === "dispatch"
    ? "These reports have been routed to your department. Please review and take appropriate action."
    : "Transmittal forms have been printed for the reports listed below. Please acknowledge receipt.";

  const sends = Object.entries(groups).map(([dept, deptReports]) =>
    sendDepartmentEmail(
      { department: dept, reports: deptReports, exportType, actionNote },
      deptEmailsMap?.[dept] || []
    )
  );

await Promise.allSettled(sends);
}

export async function uploadAndSendReportEmail({ blob, filename, department, reports, triggerType, deptEmailsMap, generatedBy }) {
  const downloadUrl = await uploadReportFile(blob, filename);
  const exportType  = triggerType?.toUpperCase() || "Report";
  const actionNote  = `A ${exportType} report has been generated for your department. Click the download button below to access the file.`;
  const emails      = deptEmailsMap?.[department] || [];

  await sendDepartmentEmail(
    { department, reports, exportType, actionNote, downloadUrl },
    emails
  );
  return downloadUrl;
}