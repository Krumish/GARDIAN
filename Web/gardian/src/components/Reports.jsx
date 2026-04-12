import { useState, useEffect, useRef } from "react";
  import { useLocation, useNavigate } from "react-router-dom";
  import { collectionGroup, doc, getDoc, updateDoc, writeBatch, onSnapshot } from "firebase/firestore";
  import { db, auth } from "../../firebase";
  import ReportDetailsModal     from './ReportDetailsModal';
  import ResolutionDetailsModal from './ResolutionDetailsModal';
  import ResolveReportModal     from './ResolveReportModal';
  import PrintableReport        from "./PrintableReport";
  import { generatePDF, generateCSV, generateDOCX } from './ReportGenerate';
  import { useReactToPrint } from "react-to-print";
  

  // ── Email service ─────────────────────────────────────────────────────────────
  import {
  loadDepartmentEmails  as loadDeptEmails,
  saveDepartmentEmails  as saveDeptEmails,
  sendGroupedDepartmentEmails as sendGroupedDeptEmails,
  uploadAndSendReportEmail    as sendExportEmail, } from "./EmailService";
    
  import { TbReportOff } from "react-icons/tb";
  import {
    FaFilePdf, FaCheckCircle, FaSearch,
    FaMapMarkerAlt, FaUser, FaUserCheck, FaShareSquare,
    FaRegSquare, FaCheckSquare, FaChevronDown, FaChevronUp,
    FaFilter, FaSortAmountDown, FaTimes, FaChartBar, FaPrint,
    FaEnvelope, FaPlus, FaTrash, FaSave, FaToggleOn, FaToggleOff,
  } from "react-icons/fa";
  import { FaClockRotateLeft } from "react-icons/fa6";
  import { RiHourglassFill }  from "react-icons/ri";
  import { MdEngineering, MdLocalShipping } from "react-icons/md";
  import { GiRecycle }        from "react-icons/gi";

  // ── Styles ────────────────────────────────────────────────────────────────────
  const STYLES = `
    @keyframes rowFlash {
      0%   { background-color: #dbeafe; }
      40%  { background-color: #bfdbfe; }
      100% { background-color: transparent; }
    }
    .row-flash { animation: rowFlash 2s ease forwards; }

    @keyframes slideDown {
      from { opacity:0; transform:translateY(-6px); }
      to   { opacity:1; transform:translateY(0); }
    }
    .slide-down { animation: slideDown 0.18s ease both; }
  `;

  // ── Department config ─────────────────────────────────────────────────────────
  function getAssignedDepartment(issueType) {
    if (["Waste Management", "Solid Waste"].includes(issueType))                      return "MENRO / WMO";
    if (["Drainage", "Road Blockage"].includes(issueType))                            return "Mayor / Dispatch";
    if (["Pothole", "Manhole", "Road Markings", "Road Surface"].includes(issueType)) return "Engineering Office";
    return "Unassigned";
  }
  const getDept = (r) => r.assignedDepartment || getAssignedDepartment(r.issueType);

  const DEPT = {
    "MENRO / WMO":        { color:"teal",   icon:<GiRecycle className="shrink-0"/>,       desc:"Waste & environmental" },
    "Mayor / Dispatch":   { color:"indigo", icon:<MdLocalShipping className="shrink-0"/>,  desc:"Drainage, road blockages" },
    "Engineering Office": { color:"orange", icon:<MdEngineering className="shrink-0"/>,    desc:"Potholes, manholes, markings" },
  };

  const DEPT_COLORS = {
    teal:   { badge:"bg-teal-50 text-teal-700 border-teal-200",       dot:"bg-teal-500"   },
    indigo: { badge:"bg-indigo-50 text-indigo-700 border-indigo-200", dot:"bg-indigo-500" },
    orange: { badge:"bg-orange-50 text-orange-700 border-orange-200", dot:"bg-orange-500" },
    gray:   { badge:"bg-gray-50 text-gray-500 border-gray-200",       dot:"bg-gray-400"   },
  };

  const STATUS_CONFIG = {
    Pending:   { cls:"bg-amber-50 text-amber-700 border border-amber-200",  icon:<RiHourglassFill className="text-amber-500 shrink-0"/> },
    Assigned:  { cls:"bg-cyan-50 text-cyan-700 border border-cyan-200",     icon:<FaUserCheck className="text-cyan-500 shrink-0"/> },
    Forwarded: { cls:"bg-blue-50 text-blue-700 border border-blue-200",     icon:<FaShareSquare className="text-blue-500 shrink-0"/> },
    Resolved:  { cls:"bg-green-50 text-green-700 border border-green-200",  icon:<FaCheckCircle className="text-green-500 shrink-0"/> },
    Withdrawn: { cls:"bg-gray-50 text-gray-600 border border-gray-200",     icon:<TbReportOff className="text-gray-400 shrink-0"/> },
  };

  // ── Shared helpers ────────────────────────────────────────────────────────────
  const genRef = (r) => {
    if (!r?.id) return "REF-00000000-XXXXX";
    const ts = r.uploadedAt;
    const d  = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    const ds = d && !isNaN(d) ? d.toISOString().slice(0,10).replace(/-/g,"") : "00000000";
    return `REF-${ds}-${r.id.slice(-5).toUpperCase()}`;
  };
  const fmtDate = (ts) => { if (!ts) return "-"; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); };
  const fmtTime = (ts) => { if (!ts) return "-"; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}); };
  const getType = (r) => r.yolo?.drainage_count > 0 ? "Drainage" : r.issueType || "Unknown";

  // ── Small display components ──────────────────────────────────────────────────
  function DeptBadge({ dept }) {
    const d = DEPT[dept] || DEPT["Unassigned"];
    const c = DEPT_COLORS[d?.color] || DEPT_COLORS.gray;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium border ${c.badge}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`}/>
        {dept}
      </span>
    );
  }

  function StatusBadge({ status, onClick }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
    return (
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition ${cfg.cls}`}
      >
        {cfg.icon}{status}
      </button>
    );
  }

  // ── ActionButtons ─────────────
  function ActionButtons({ report, batchMode, onView, onPrint, onRoute, onResolution }) {
    const isPending  = report.status === "Pending";
    const isResolved = report.status === "Resolved";

    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={onView}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
        >
          View
        </button>

        {isPending && !batchMode && (
          <button
            onClick={onRoute}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition flex items-center gap-1"
          >
            <FaShareSquare className="text-[9px]"/> Route
          </button>
        )}

        {!batchMode && (report.status === "Forwarded" || report.status === "Assigned") && (
          <button
            onClick={onPrint}
            title="Print Transmittal Form"
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-700 font-medium transition flex items-center gap-1"
          >
            <FaPrint className="text-[10px]"/> Print
          </button>
        )}

        {isResolved && (
          <button
            onClick={onResolution}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-medium transition"
          >
            Resolution
          </button>
        )}
      </div>
    );
  }

  // ── Main ──────────────────────────────────────────────────────────────────────
  export default function Reports() {
    const location = useLocation();
    const navigate = useNavigate();

    // ── Data ──────────────────────────────────────────────────────────────────
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Table UI state ────────────────────────────────────────────────────────
    const [search, setSearch]             = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [typeFilter, setTypeFilter]     = useState("");
    const [deptFilter, setDeptFilter]     = useState("All");
    const [sortBy, setSortBy]             = useState("dateDesc");
    const [filtersOpen, setFiltersOpen]   = useState(false);

    // ── Modals ────────────────────────────────────────────────────────────────
    const [selectedReport, setSelectedReport]           = useState(null);
    const [showStatusModal, setShowStatusModal]         = useState(null);
    const [showResolveModal, setShowResolveModal]       = useState(null);
    const [showResolutionModal, setShowResolutionModal] = useState(null);
    const [showReportModal, setShowReportModal]         = useState(false);
    const [newStatus, setNewStatus]                     = useState("");

    // ── Route modal state ─────────────────────────────────────────────────────
    const [showRouteModal, setShowRouteModal]     = useState(false);
    const [batchAssignments, setBatchAssignments] = useState({});
    const [routing, setRouting]                   = useState(false);

    // ── Report generation ──────────────────────────────────────────────────────
    const [startDate, setStartDate]   = useState("");
    const [endDate, setEndDate]       = useState("");
    // NOTE: "All" removed — only specific departments allowed per the plan
    const [exportDept, setExportDept] = useState("MENRO / WMO");

    // ── Batch modes ───────────────────────────────────────────────────────────
    const [batchMode, setBatchMode]               = useState(null);
    const [selectedIds, setSelectedIds]           = useState(new Set());
    const [printSelectedIds, setPrintSelectedIds] = useState(new Set());

    // ── Highlight / scroll ────────────────────────────────────────────────────
    const [highlightedId, setHighlightedId] = useState(null);
    const rowRefs  = useRef({});
    const scrolled = useRef(null);

    // ── Print refs ────────────────────────────────────────────────────────────
    const singlePrintRef = useRef();
    const batchPrintRef  = useRef();
    const [reportToPrint, setReportToPrint]     = useState(null);
    const [directPrintItems, setDirectPrintItems] = useState([]);
    const [batchPrintSource, setBatchPrintSource] = useState("forward");

    // ── Email state ───────────────────────────────────────────────────────────
    const DEFAULT_DEPT_EMAILS = {
     "MENRO / WMO":        [],
     "Mayor / Dispatch":   [],
    "Engineering Office": [], };
    const [deptEmails, setDeptEmails]           = useState({ ...DEFAULT_DEPT_EMAILS });
    const [emailSettingsOpen, setEmailSettingsOpen] = useState(false);
    const [sendEmailOnExport, setSendEmailOnExport] = useState(true);
    const [newEmailInputs, setNewEmailInputs]   = useState({
      "MENRO / WMO": "", "Mayor / Dispatch": "", "Engineering Office": "",
    });
    const [savingEmails, setSavingEmails]       = useState(false);
    const [sendingEmail, setSendingEmail]       = useState(false);

    // ── Derived ───────────────────────────────────────────────────────────────
    const selectedReportsData = directPrintItems.length > 0
      ? directPrintItems
      : batchPrintSource === "print"
      ? reports.filter(r => printSelectedIds.has(r.id))
      : reports.filter(r => selectedIds.has(r.id));

    const handleSinglePrint = useReactToPrint({
      contentRef: singlePrintRef,
      documentTitle: `GARDIAN_Report_${reportToPrint?.id || "Single"}`,
      onAfterPrint: () => setReportToPrint(null),
    });

    const handleBatchPrint = useReactToPrint({
      contentRef: batchPrintRef,
      documentTitle: `GARDIAN_Batch_Report_${new Date().toISOString().slice(0,10)}`,
    });

    // ── Counts ────────────────────────────────────────────────────────────────
    const counts = {
      pending:   reports.filter(r => r.status === "Pending").length,
      assigned:  reports.filter(r => r.status === "Assigned").length,
      forwarded: reports.filter(r => r.status === "Forwarded").length,
      resolved:  reports.filter(r => r.status === "Resolved").length,
      withdrawn: reports.filter(r => r.status === "Withdrawn").length,
      total:     reports.length,
    };

    const deptPending = Object.fromEntries(
      Object.keys(DEPT).map(d => [d, reports.filter(r => r.status === "Pending" && getDept(r) === d).length])
    );

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
      const id = new URLSearchParams(location.search).get("highlight");
      if (id) { setHighlightedId(id); navigate("/reports", { replace: true }); }
    }, [location.search, navigate]);

    // Load department emails on mount
    useEffect(() => {
      loadDeptEmails().then(data => setDeptEmails(data));
    }, []);

    useEffect(() => {
      if (directPrintItems.length > 0) {
        const t = setTimeout(() => {
          handleBatchPrint();
          setDirectPrintItems([]);
        }, 80);
        return () => clearTimeout(t);
      }
    }, [directPrintItems]);

    useEffect(() => {
      if (reportToPrint) {
        const t = setTimeout(() => handleSinglePrint(), 50);
        return () => clearTimeout(t);
      }
    }, [reportToPrint]);

    useEffect(() => {
      if (!highlightedId || scrolled.current === highlightedId) return;
      const el = rowRefs.current[highlightedId];
      if (el) {
        scrolled.current = highlightedId;
        el.scrollIntoView({ behavior:"smooth", block:"center" });
        el.classList.add("row-flash");
        const t = setTimeout(() => { el.classList.remove("row-flash"); setHighlightedId(null); scrolled.current = null; }, 2200);
        return () => clearTimeout(t);
      }
    }, [highlightedId, reports]);

    useEffect(() => {
      const user = auth.currentUser;
      if (!user) return;
      return onSnapshot(
        collectionGroup(db, "uploads"),
        async (snap) => {
          const all = await Promise.all(snap.docs.map(async (d) => {
            const userId = d.ref.parent.parent?.id || "unknown";
            let userDetails = null;
            try { const u = await getDoc(doc(db,"users",userId)); if (u.exists()) userDetails = u.data(); } catch(_){}
            return { id:d.id, userId, userDetails, docRef:d.ref, ...d.data() };
          }));
          all.sort((a,b) => (b.uploadedAt?.toDate?.() || new Date(0)) - (a.uploadedAt?.toDate?.() || new Date(0)));
          setReports(all);
          setLoading(false);
        },
        (e) => { console.error(e); setLoading(false); }
      );
    }, []);

    // ── Filter / sort ─────────────────────────────────────────────────────────
    const filtered = reports
      .filter(r => {
        const s = search.toLowerCase();
        return !s || [r.id, genRef(r), r.userDetails?.firstName, r.userDetails?.lastName,
          r.userDetails?.barangay, r.status, getType(r), getDept(r)]
          .some(v => (v||"").toLowerCase().includes(s));
      })
      .filter(r => !statusFilter || r.status === statusFilter)
      .filter(r => !typeFilter   || getType(r).trim() === typeFilter)
      .filter(r => deptFilter === "All" || getDept(r) === deptFilter)
      .sort((a,b) => {
        if (sortBy==="dateDesc") return (b.uploadedAt?.toDate?.() || 0) - (a.uploadedAt?.toDate?.() || 0);
        if (sortBy==="dateAsc")  return (a.uploadedAt?.toDate?.() || 0) - (b.uploadedAt?.toDate?.() || 0);
        if (sortBy==="nameAsc")  return (a.userDetails?.firstName||"").localeCompare(b.userDetails?.firstName||"");
        if (sortBy==="nameDesc") return (b.userDetails?.firstName||"").localeCompare(a.userDetails?.firstName||"");
        return 0;
      });

    const forwardableFiltered = filtered.filter(r => r.status === "Pending");
    const printableFiltered   = filtered.filter(r => r.status === "Forwarded" || r.status === "Assigned");

    const activeFilterCount = [statusFilter, typeFilter, deptFilter !== "All" ? deptFilter : ""].filter(Boolean).length;

    // ── Selection helpers — forward batch ─────────────────────────────────────
    const toggleSel          = (id) => setSelectedIds(p => { const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
    const selectAllForward   = ()   => setSelectedIds(new Set(forwardableFiltered.map(r=>r.id)));
    const clearSel           = ()   => setSelectedIds(new Set());
    const allForwardSelected = forwardableFiltered.length > 0 && forwardableFiltered.every(r => selectedIds.has(r.id));

    // ── Selection helpers — print batch ──────────────────────────────────────
    const togglePrintSel   = (id) => setPrintSelectedIds(p => { const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
    const selectAllPrint   = ()   => setPrintSelectedIds(new Set(printableFiltered.map(r=>r.id)));
    const clearPrintSel    = ()   => setPrintSelectedIds(new Set());
    const allPrintSelected = printableFiltered.length > 0 && printableFiltered.every(r => printSelectedIds.has(r.id));

    // ── Batch mode toggle helpers ─────────────────────────────────────────────
    const enterForwardMode = () => { setBatchMode("forward"); clearSel(); clearPrintSel(); };
    const enterPrintMode   = () => { setBatchMode("print");   clearSel(); clearPrintSel(); };
    const exitBatchMode    = () => { setBatchMode(null);      clearSel(); clearPrintSel(); };

    // ── Email helpers ─────────────────────────────────────────────────────────
    const adminName = () => auth.currentUser?.displayName || auth.currentUser?.email || "GARDIAN Administrator";

    const handleSaveDeptEmails = async () => {
      setSavingEmails(true);
      try {
        await saveDeptEmails(deptEmails);
        alert("✅ Department emails saved!");
      } catch {
        alert("Failed to save emails. Please try again.");
      } finally {
        setSavingEmails(false);
      }
    };

    const addEmailForDept = (dept) => {
      const val = newEmailInputs[dept]?.trim();
      if (!val || !val.includes("@")) return;
      setDeptEmails(prev => ({
        ...prev,
        [dept]: [...(prev[dept] || []), val],
      }));
      setNewEmailInputs(prev => ({ ...prev, [dept]: "" }));
    };

    const removeEmailForDept = (dept, idx) => {
      setDeptEmails(prev => ({
        ...prev,
        [dept]: (prev[dept] || []).filter((_, i) => i !== idx),
      }));
    };

    // ── UNIFIED openRouteModal ────────────────────────────────────────────────
    const openRouteModal = (report = null) => {
      const targetIds = report ? new Set([report.id]) : selectedIds;
      const initial   = {};
      reports
        .filter(r => targetIds.has(r.id))
        .forEach(r => {
          initial[r.id] = {
            dept:   r.assignedDepartment || (report ? getAssignedDepartment(r.issueType) : ""),
            status: "Forwarded",
          };
        });
      if (report) setSelectedIds(targetIds);
      setBatchAssignments(initial);
      setShowRouteModal(true);
    };

    const closeRouteModal = () => {
      setShowRouteModal(false);
      setBatchAssignments({});
      if (batchMode !== "forward") clearSel();
    };

    // ── TRIGGER 1 — Batch forward: route + email ──────────────────────────────
    const handleFinalizeBatch = async () => {
      const allAssigned = Object.values(batchAssignments).every(a => a.dept !== "");
      if (!allAssigned) return alert("Please assign a department to every report before routing.");

      const count = Object.keys(batchAssignments).length;
      if (!window.confirm(`Route ${count} report(s)?`)) return;

      setRouting(true);
      try {
        const items = reports.filter(r => selectedIds.has(r.id));
        const CHUNK = 499;
        for (let i = 0; i < items.length; i += CHUNK) {
          const batch = writeBatch(db);
          items.slice(i, i+CHUNK).forEach(r => {
            const { dept, status } = batchAssignments[r.id];
            const ref = r.docRef?.id ? r.docRef : doc(db,"users",r.userId,"uploads",r.id);
            batch.update(ref, {
              assignedDepartment: dept,
              status,
              forwardedAt: new Date().toISOString(),
            });
          });
          await batch.commit();
        }

        const updatedItems = items.map(r => ({
          ...r,
          assignedDepartment: batchAssignments[r.id].dept,
          status: batchAssignments[r.id].status,
        }));

        closeRouteModal();

        // ── TRIGGER 1: Send dispatch emails grouped by department ──
        try {
          await sendGroupedDeptEmails({
            reports:      updatedItems,
            triggerType:  "dispatch",
            deptEmailsMap: deptEmails,
            generatedBy:  adminName(),
          });
        } catch (emailErr) {
          console.warn("[Reports] Email dispatch failed (non-fatal):", emailErr);
          // Non-fatal — routing already succeeded
        }

        if (updatedItems.length === 1) {
          setReportToPrint(updatedItems[0]);
        } else {
          setBatchPrintSource("forward");
          setDirectPrintItems(updatedItems);
        }

        clearSel();
        if (batchMode === "forward") setBatchMode(null);
      } catch (e) {
        console.error(e);
        alert("Failed to route. Please try again.");
      } finally {
        setRouting(false);
      }
    };

    // ── TRIGGER 2 — Batch print: print + email ────────────────────────────────
    const handleExecuteBatchPrint = async () => {
      if (printSelectedIds.size === 0) return;
      setBatchPrintSource("print");

      // Trigger print
      setTimeout(() => handleBatchPrint(), 50);

      // Send email notification (non-fatal)
      try {
        const printedReports = reports.filter(r => printSelectedIds.has(r.id));
        await sendGroupedDeptEmails({
          reports:       printedReports,
          triggerType:   "print",
          deptEmailsMap: deptEmails,
          generatedBy:   adminName(),
        });
      } catch (emailErr) {
        console.warn("[Reports] Email after batch print failed (non-fatal):", emailErr);
      }
    };

    // ── TRIGGER 3 — Generate Report: export + email ───────────────────────────
    const exportReports = async (generatorFn, triggerType) => {
      const toExport = reports.filter(r => getDept(r) === exportDept);
      if (toExport.length === 0) {
        alert("No reports found for the selected department and date range.");
        return;
      }

      // Call the generator
let fileData;
try {
  fileData = await generatorFn(toExport, startDate, endDate);
} catch (genErr) {
  console.error("[Reports] Export generation failed:", genErr);
  alert("Failed to generate the report file.");
  return;
}

setShowReportModal(false);

if (!sendEmailOnExport) return;

setSendingEmail(true);
try {
  await sendExportEmail({
    blob: fileData.blob,
    filename: fileData.filename,
    department: exportDept,
    reports: toExport,
    triggerType,
    deptEmailsMap: deptEmails,
    generatedBy: adminName(),
  });

  alert(`✅ Report emailed to ${exportDept}.`);
} catch (emailErr) {
  console.error("[Reports] Export email failed:", emailErr);
  alert("Report was generated but the email failed. Check the console for details.");
} finally {
  setSendingEmail(false);
}
    };

    // ── Status update ─────────────────────────────────────────────────────────
    const handleUpdateStatus = async () => {
      if (!showStatusModal || !newStatus) return;
      if (newStatus === "Resolved") {
        setShowResolveModal(showStatusModal);
        setShowStatusModal(null);
        setNewStatus("");
        return;
      }
      try {
        const ref = showStatusModal.docRef?.id
          ? showStatusModal.docRef
          : doc(db,"users",showStatusModal.userId,"uploads",showStatusModal.id);
        await updateDoc(ref, { status:newStatus });
        alert("✅ Status updated!");
        setShowStatusModal(null);
        setNewStatus("");
      } catch(e) { console.error(e); alert("Failed to update."); }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
      <>
        <style>{STYLES}</style>

        {/* Hidden print targets */}
        <div style={{ position:"absolute", top:"-9999px", left:"-9999px", visibility:"hidden" }}>
          <PrintableReport ref={batchPrintRef} reports={selectedReportsData}/>
        </div>
        <div style={{ position:"absolute", top:"-9999px", left:"-9999px", visibility:"hidden" }}>
          {reportToPrint && <PrintableReport ref={singlePrintRef} reports={[reportToPrint]}/>}
        </div>

        <div className="p-6 bg-gray-50 min-h-screen space-y-5">

          {/* ── Page header ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
            <div className="flex items-center gap-2 flex-wrap">

              {batchMode === "forward" && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold">
                  {selectedIds.size} selected to forward
                </span>
              )}
              {batchMode === "print" && (
                <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-semibold">
                  {printSelectedIds.size} selected to print
                </span>
              )}

              <button
                onClick={batchMode === "forward" ? exitBatchMode : enterForwardMode}
                className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition ${
                  batchMode === "forward"
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <FaShareSquare className="text-xs"/>
                {batchMode === "forward" ? "Exit Forward" : "Batch Forward"}
              </button>

              <button
                onClick={batchMode === "print" ? exitBatchMode : enterPrintMode}
                className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition ${
                  batchMode === "print"
                    ? "bg-slate-700 text-white hover:bg-slate-800"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <FaPrint className="text-xs"/>
                {batchMode === "print" ? "Exit Print" : "Batch Print"}
              </button>

              <button
                onClick={() => setShowReportModal(true)}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium bg-red-700 text-white hover:bg-red-800 transition"
              >
                <FaFilePdf className="text-xs"/> Generate Report
              </button>
            </div>
          </div>

          {/* ── Summary strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label:"Pending",    val:counts.pending,   color:"text-amber-700", bg:"bg-amber-50",  border:"border-amber-200",  icon:<FaClockRotateLeft /> },
              { label:"Assigned",   val:counts.assigned,  color:"text-cyan-700",  bg:"bg-cyan-50",   border:"border-cyan-200",   icon:<FaUserCheck /> },
              { label:"Forwarded",  val:counts.forwarded, color:"text-blue-700",  bg:"bg-blue-50",   border:"border-blue-200",   icon:<FaShareSquare /> },
              { label:"Resolved",   val:counts.resolved,  color:"text-green-700", bg:"bg-green-50",  border:"border-green-200",  icon:<FaCheckCircle /> },
              { label:"Withdrawn",  val:counts.withdrawn, color:"text-gray-600",  bg:"bg-gray-50",   border:"border-gray-200",   icon:<TbReportOff /> },
              { label:"Total Logs", val:counts.total,     color:"text-slate-800", bg:"bg-white",     border:"border-slate-200",  icon:<FaChartBar /> },
            ].map(({ label, val, color, bg, border, icon }) => (
              <div key={label} className={`${bg} border ${border} rounded-xl px-5 py-4 shadow-sm flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-md`}>
                <div className="flex items-start justify-between mb-3">
                  <p className={`text-[11px] font-bold uppercase tracking-wider ${color} opacity-80`}>{label}</p>
                  <span className={`text-[20px] ${color}`}>{icon}</span>
                </div>
                {loading
                  ? <div className="h-9 w-16 bg-black/10 rounded animate-pulse"/>
                  : <p className={`text-3xl font-extrabold ${color} tracking-tight`}>{val}</p>
                }
              </div>
            ))}
          </div>

          {/* ── Dept pending tiles ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(DEPT).map(([dept, d]) => {
              const c      = DEPT_COLORS[d.color];
              const active = deptFilter === dept;
              return (
                <button
                  key={dept}
                  onClick={() => setDeptFilter(active ? "All" : dept)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                    active ? `${c.badge} border-current shadow-sm` : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm"
                  }`}
                >
                  <span className={`text-xl ${active ? "" : "opacity-60"}`}>{d.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-700 truncate">{dept}</p>
                    <p className="text-xs text-gray-400">{deptPending[dept]} pending</p>
                  </div>
                  <span className={`ml-auto text-xl font-black ${active ? "" : "text-gray-400"}`}>
                    {deptPending[dept]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Table card ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Toolbar */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"/>
                <input
                  type="text"
                  placeholder="Search name, type, status…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:bg-white transition placeholder-gray-300"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <FaTimes className="text-xs"/>
                  </button>
                )}
              </div>

              <button
                onClick={() => setFiltersOpen(v=>!v)}
                className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border transition font-medium ${
                  filtersOpen || activeFilterCount > 0
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <FaFilter className="text-xs"/>
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
                {filtersOpen ? <FaChevronUp className="text-[10px]"/> : <FaChevronDown className="text-[10px]"/>}
              </button>

              <div className="flex items-center gap-1.5 text-sm">
                <FaSortAmountDown className="text-gray-300 text-xs"/>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="text-sm bg-white border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-600"
                >
                  <option value="dateDesc">Newest first</option>
                  <option value="dateAsc">Oldest first</option>
                  <option value="nameAsc">Name A–Z</option>
                  <option value="nameDesc">Name Z–A</option>
                </select>
              </div>

              <span className="ml-auto text-xs text-gray-400">{filtered.length} result{filtered.length !== 1?"s":""}</span>

              {/* ── Batch Forward controls ── */}
              {batchMode === "forward" && (
                <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
                  <button
                    onClick={allForwardSelected ? clearSel : selectAllForward}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {allForwardSelected ? "Deselect all" : "Select all pending"}
                  </button>
                  <button
                    onClick={() => openRouteModal()}
                    disabled={selectedIds.size === 0}
                    className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition flex items-center gap-1.5"
                  >
                    <FaShareSquare/> Route ({selectedIds.size})
                  </button>
                </div>
              )}

              {/* ── Batch Print controls ── */}
              {batchMode === "print" && (
                <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
                  <button
                    onClick={allPrintSelected ? clearPrintSel : selectAllPrint}
                    className="text-xs text-slate-600 hover:text-slate-800 font-medium"
                  >
                    {allPrintSelected ? "Deselect all" : "Select all"}
                  </button>
                  <button
                    onClick={handleExecuteBatchPrint}
                    disabled={printSelectedIds.size === 0}
                    className="text-xs px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition flex items-center gap-1.5"
                  >
                    <FaPrint/> Print ({printSelectedIds.size})
                  </button>
                </div>
              )}
            </div>

            {/* Collapsible filters */}
            {filtersOpen && (
              <div className="slide-down px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 items-center">
                {[
                  { label:"Status", value:statusFilter, set:setStatusFilter, options:["Pending","Assigned","Forwarded","Resolved","Withdrawn"] },
                  { label:"Type",   value:typeFilter,   set:setTypeFilter,   options:["Drainage","Pothole","Manhole","Road Markings","Road Blockage","Waste Management"] },
                  { label:"Dept",   value:deptFilter === "All" ? "" : deptFilter, set:(v) => setDeptFilter(v||"All"),
                    options:["MENRO / WMO","Mayor / Dispatch","Engineering Office"] },
                ].map(({ label, value, set, options }) => (
                  <div key={label} className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
                    <select
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">All</option>
                      {options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => { setStatusFilter(""); setTypeFilter(""); setDeptFilter("All"); }}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 ml-auto"
                  >
                    <FaTimes/> Clear filters
                  </button>
                )}
              </div>
            )}

            {/* Batch Print mode banner */}
            {batchMode === "print" && (
              <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <FaPrint className="text-slate-400 text-xs shrink-0"/>
                <p className="text-xs text-slate-500">
                  Select <span className="font-semibold">Forwarded</span> or <span className="font-semibold">Assigned</span> reports to print transmittals.
                  Other statuses cannot be selected.
                </p>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {batchMode && <th className="px-4 py-3 w-10"/>}
                    {["Reference","Reporter","Type","Routed To","Location","Submitted","Status","Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({length:5}).map((_,i) => (
                      <tr key={i} className="animate-pulse">
                        {batchMode && <td className="px-4 py-4"><div className="w-4 h-4 bg-gray-100 rounded"/></td>}
                        {Array.from({length:8}).map((_,j) => (
                          <td key={j} className="px-4 py-4"><div className="h-3 bg-gray-100 rounded w-3/4"/></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={batchMode?9:8} className="text-center py-16 text-gray-300">
                        <FaSearch className="mx-auto text-3xl mb-2"/>
                        <p className="text-sm font-medium text-gray-400">No reports match your filters</p>
                      </td>
                    </tr>
                  ) : filtered.map((r) => {
                    const dept = getDept(r);

                    const isForwardEligible = r.status === "Pending";
                    const isForwardChecked  = selectedIds.has(r.id);
                    const isPrintEligible   = r.status === "Forwarded" || r.status === "Assigned";
                    const isPrintChecked    = printSelectedIds.has(r.id);

                    const handleRowClick = () => {
                      if (batchMode === "forward" && isForwardEligible) toggleSel(r.id);
                      if (batchMode === "print"   && isPrintEligible)   togglePrintSel(r.id);
                    };

                    const rowHighlighted = highlightedId === r.id;
                    const rowChecked     = batchMode === "forward" ? isForwardChecked : batchMode === "print" ? isPrintChecked : false;

                    return (
                      <tr
                        key={r.id}
                        ref={el => { if (el) rowRefs.current[r.id] = el; else delete rowRefs.current[r.id]; }}
                        onClick={handleRowClick}
                        className={`transition-colors ${
                          rowHighlighted
                            ? "ring-2 ring-inset ring-blue-400 bg-blue-50"
                            : rowChecked && batchMode === "forward"
                              ? "bg-indigo-50"
                              : rowChecked && batchMode === "print"
                                ? "bg-slate-100"
                                : batchMode === "forward" && isForwardEligible
                                  ? "hover:bg-indigo-50 cursor-pointer"
                                  : batchMode === "print" && isPrintEligible
                                    ? "hover:bg-slate-50 cursor-pointer"
                                    : "hover:bg-gray-50"
                        }`}
                      >
                        {batchMode && (
                          <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                            {batchMode === "forward" ? (
                              isForwardEligible ? (
                                <button onClick={() => toggleSel(r.id)} className="text-indigo-400 hover:text-indigo-600">
                                  {isForwardChecked ? <FaCheckSquare className="text-base text-indigo-600"/> : <FaRegSquare className="text-base"/>}
                                </button>
                              ) : <FaRegSquare className="text-base text-gray-200"/>
                            ) : (
                              isPrintEligible ? (
                                <button onClick={() => togglePrintSel(r.id)} className="text-slate-400 hover:text-slate-600">
                                  {isPrintChecked ? <FaCheckSquare className="text-base text-slate-600"/> : <FaRegSquare className="text-base"/>}
                                </button>
                              ) : <FaRegSquare className="text-base text-gray-200"/>
                            )}
                          </td>
                        )}

                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => navigator.clipboard.writeText(genRef(r))}
                            title="Click to copy"
                            className="font-mono text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition"
                          >
                            {genRef(r)}
                          </button>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                              <FaUser className="text-gray-400 text-[10px]"/>
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-xs leading-tight">
                                {r.userDetails?.firstName} {r.userDetails?.lastName}
                              </p>
                              {r.userDetails?.barangay && (
                                <p className="text-[10px] text-gray-400">{r.userDetails.barangay}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className="text-xs font-semibold text-gray-700">{r.issueType || "Unknown"}</span>
                        </td>

                        <td className="px-4 py-3.5"><DeptBadge dept={dept}/></td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-start gap-1 max-w-[160px]">
                            <FaMapMarkerAlt className="text-gray-300 text-[10px] mt-0.5 shrink-0"/>
                            <span className="text-xs text-gray-500 leading-snug line-clamp-2">{r.address || "—"}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <p className="text-xs text-gray-700 font-medium">{fmtDate(r.uploadedAt)}</p>
                          <p className="text-[10px] text-gray-400">{fmtTime(r.uploadedAt)}</p>
                        </td>

                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <StatusBadge status={r.status} onClick={() => !batchMode && setShowStatusModal(r)}/>
                        </td>

                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          <ActionButtons
                            report={r}
                            batchMode={!!batchMode}
                            onView={()       => setSelectedReport(r)}
                            onPrint={()      => setReportToPrint(r)}
                            onRoute={()      => openRouteModal(r)}
                            onResolution={()  => setShowResolutionModal(r)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══════════════ GENERATE REPORT MODAL ═══════════════ */}
          {showReportModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Generate Report</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Select date range, department, and export format</p>
                  </div>
                  <button onClick={() => setShowReportModal(false)} className="text-gray-300 hover:text-gray-500"><FaTimes/></button>
                </div>

                <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-4">
                    {[["Start Date", startDate, setStartDate], ["End Date", endDate, setEndDate]].map(([label, val, set]) => (
                      <div key={label}>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                        <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={val} onChange={e => set(e.target.value)}/>
                      </div>
                    ))}
                  </div>

                  {/* Department selector — "All" removed per plan */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by Department</label>
                    <div className="grid grid-cols-1 gap-2">
                      {["MENRO / WMO", "Mayor / Dispatch", "Engineering Office"].map(d => {
                        const meta   = DEPT[d];
                        const col    = meta ? DEPT_COLORS[meta.color] : null;
                        const active = exportDept === d;
                        return (
                          <button
                            key={d}
                            onClick={() => setExportDept(d)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition text-sm ${
                              active
                                ? (col ? col.badge + " border-current" : "bg-gray-900 text-white border-gray-900")
                                : "bg-white border-gray-100 hover:border-gray-200 text-gray-700"
                            }`}
                          >
                            {meta && <span className="text-base">{meta.icon}</span>}
                            <div>
                              <p className="font-semibold text-xs leading-tight">{d}</p>
                              {meta && <p className="text-[10px] opacity-60">{meta.desc}</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                      📄 Will include only <strong>{exportDept}</strong> reports
                    </p>
                  </div>

                  {/* ── Email & Notification Settings ── */}
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setEmailSettingsOpen(v => !v)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
                    >
                      <div className="flex items-center gap-2">
                        <FaEnvelope className="text-gray-400 text-xs"/>
                        <span className="text-xs font-semibold text-gray-600">Email & Notification Settings</span>
                        {/* Show a green dot if emails are configured for this dept */}
                        {(deptEmails[exportDept]?.length > 0) && (
                          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" title="Emails configured"/>
                        )}
                      </div>
                      {emailSettingsOpen ? <FaChevronUp className="text-gray-300 text-[10px]"/> : <FaChevronDown className="text-gray-300 text-[10px]"/>}
                    </button>

                    {emailSettingsOpen && (
                      <div className="px-4 py-4 space-y-4 slide-down">

                        {/* Send toggle */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-700">Send email notification after export</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Emails the file download link to the department</p>
                          </div>
                          <button
                            onClick={() => setSendEmailOnExport(v => !v)}
                            className={`text-xl transition ${sendEmailOnExport ? "text-green-500" : "text-gray-300"}`}
                          >
                            {sendEmailOnExport ? <FaToggleOn/> : <FaToggleOff/>}
                          </button>
                        </div>

                        {/* Email list for the selected dept only */}
                        <div>
                          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">
                            Recipients — {exportDept}
                          </p>
                          <div className="space-y-1.5">
                            {(deptEmails[exportDept] || []).length === 0 && (
                              <p className="text-xs text-gray-300 italic">No emails configured yet.</p>
                            )}
                            {(deptEmails[exportDept] || []).map((email, idx) => (
                              <div key={idx} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                                <FaEnvelope className="text-gray-300 text-[10px] shrink-0"/>
                                <span className="text-xs text-gray-600 flex-1 truncate">{email}</span>
                                <button
                                  onClick={() => removeEmailForDept(exportDept, idx)}
                                  className="text-gray-300 hover:text-red-400 transition"
                                >
                                  <FaTrash className="text-[10px]"/>
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add email input */}
                          <div className="flex gap-2 mt-2">
                            <input
                              type="email"
                              placeholder="add@email.com"
                              value={newEmailInputs[exportDept] || ""}
                              onChange={e => setNewEmailInputs(prev => ({ ...prev, [exportDept]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && addEmailForDept(exportDept)}
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-gray-300"
                            />
                            <button
                              onClick={() => addEmailForDept(exportDept)}
                              className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                            >
                              <FaPlus className="text-[9px]"/> Add
                            </button>
                          </div>
                        </div>

                        {/* Save emails */}
                        <div className="flex justify-end">
                          <button
                            onClick={handleSaveDeptEmails}
                            disabled={savingEmails}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-40 transition font-medium"
                          >
                            {savingEmails
                              ? <><span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"/>Saving…</>
                              : <><FaSave className="text-[9px]"/> Save emails</>
                            }
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                  <button onClick={() => setShowReportModal(false)} className="text-sm px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition font-medium">Cancel</button>
                  <div className="flex gap-2">
                    {[
                      { label:"PDF",  triggerType:"pdf",  cls:"bg-red-500 hover:bg-red-600 text-white",        generatorFn: generatePDF  },
                      { label:"CSV",  triggerType:"csv",  cls:"bg-emerald-500 hover:bg-emerald-600 text-white", generatorFn: generateCSV  },
                      { label:"DOCX", triggerType:"docx", cls:"bg-blue-600 hover:bg-blue-700 text-white",       generatorFn: generateDOCX },
                    ].map(({ label, triggerType, cls, generatorFn }) => (
                      <button
                        key={label}
                        onClick={() => exportReports(generatorFn, triggerType)}
                        disabled={sendingEmail}
                        className={`text-sm px-4 py-2 rounded-xl font-semibold transition disabled:opacity-40 ${cls}`}
                      >
                        {sendingEmail ? "Sending…" : label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ STATUS MODAL ═══════════════ */}
          {showStatusModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">Update Status</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{genRef(showStatusModal)}</p>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Current:</span>
                    <StatusBadge status={showStatusModal.status} onClick={()=>{}}/>
                  </div>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select new status…</option>
                    <option value="Pending">Pending</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Forwarded">Forwarded</option>
                    <option value="Withdrawn">Withdrawn</option>
                    <option value="Resolved">Resolved (opens resolution form)</option>
                  </select>
                  {newStatus === "Resolved" && (
                    <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      ℹ️ A resolution form will open next.
                    </p>
                  )}
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
                  <button onClick={() => { setShowStatusModal(null); setNewStatus(""); }} className="text-sm px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition font-medium">Cancel</button>
                  <button onClick={handleUpdateStatus} className="text-sm px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition font-semibold">Update</button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════ UNIFIED ROUTE MODAL ═══════════════ */}
          {showRouteModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">

                <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <FaShareSquare className="text-blue-500 text-sm"/>
                    </div>
                    <div>
                      <h3 className="text-[15px] font-medium text-gray-900">Route & transmit reports</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Assign departments, then generate official transmittals</p>
                    </div>
                  </div>
                  <button onClick={closeRouteModal} className="text-gray-300 hover:text-gray-500 mt-0.5">
                    <FaTimes/>
                  </button>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Apply department to all</p>
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(DEPT).map(dept => (
                      <button
                        key={dept}
                        onClick={() => setBatchAssignments(prev =>
                          Object.fromEntries(Object.keys(prev).map(id => [id, { ...prev[id], dept }]))
                        )}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 font-medium transition"
                      >
                        {dept}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2 items-center">
                    <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest">Set status for all:</span>
                    {["Forwarded", "Assigned"].map(s => (
                      <button
                        key={s}
                        onClick={() => setBatchAssignments(prev =>
                          Object.fromEntries(Object.keys(prev).map(id => [id, { ...prev[id], status: s }]))
                        )}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 font-medium transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
                  {reports.filter(r => selectedIds.has(r.id)).map(report => {
                    const assignment = batchAssignments[report.id] || {};
                    return (
                      <div key={report.id} className="px-6 py-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{report.issueType || "Unknown"}</p>
                          <p className="text-xs text-gray-400 truncate">{report.address || "No address"}</p>
                          <p className="text-[10px] text-gray-300 font-mono mt-0.5">{genRef(report)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={batchAssignments[report.id]?.dept || ""}
                            onChange={e => setBatchAssignments(prev => ({
                              ...prev,
                              [report.id]: { ...prev[report.id], dept: e.target.value }
                            }))}
                            className={`text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-indigo-200 transition ${
                              batchAssignments[report.id]?.dept
                                ? "border-gray-200 bg-white text-gray-800"
                                : "border-red-200 bg-red-50 text-red-500"
                            }`}
                          >
                            <option value="">— route to —</option>
                            {Object.keys(DEPT).map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <select
                            value={batchAssignments[report.id]?.status || "Forwarded"}
                            onChange={e => setBatchAssignments(prev => ({
                              ...prev,
                              [report.id]: { ...prev[report.id], status: e.target.value }
                            }))}
                            className="text-xs rounded-lg px-2 py-1.5 border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"
                          >
                            <option value="Forwarded">Forwarded</option>
                            <option value="Assigned">Assigned</option>
                          </select>
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {assignment.dept
                              ? <FaCheckCircle className="text-green-400 text-sm"/>
                              : <FaRegSquare className="text-gray-200 text-sm"/>
                            }
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {Object.values(batchAssignments).some(a => !a.dept) && (
                  <div className="px-6 py-2.5 bg-red-50 border-t border-red-100">
                    <p className="text-xs text-red-500 flex items-center gap-1.5">
                      <FaTimes className="text-[10px]"/>
                      All reports must have a department assigned before routing.
                    </p>
                  </div>
                )}

                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 font-medium">
                    {Object.values(batchAssignments).filter(a => a.dept).length} of {Object.keys(batchAssignments).length} assigned
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={closeRouteModal}
                      disabled={routing}
                      className="text-sm px-4 py-2 rounded-xl text-gray-500 hover:bg-gray-100 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFinalizeBatch}
                      disabled={routing || Object.values(batchAssignments).some(d => !d)}
                      className="text-sm px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium flex items-center gap-2"
                    >
                      {routing
                        ? <><span className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin"/>Routing…</>
                        : <><FaShareSquare className="text-xs"/> Generate transmittals</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Other modals ── */}
          {showResolveModal && (
            <ResolveReportModal report={showResolveModal} onClose={() => setShowResolveModal(null)} onSuccess={() => setShowResolveModal(null)}/>
          )}
          {selectedReport && (
            <ReportDetailsModal
              selectedReport={selectedReport}
              onClose={() => setSelectedReport(null)}
              formatDate={ts => ts.toDate().toLocaleDateString()}
              formatTime={ts => ts.toDate().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
            />
          )}
          {showResolutionModal && (
            <ResolutionDetailsModal selectedReport={showResolutionModal} onClose={() => setShowResolutionModal(null)}/>
          )}
        </div>
      </>
    );
  }