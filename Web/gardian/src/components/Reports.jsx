import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collectionGroup, doc, getDoc, updateDoc, writeBatch, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";
import ReportDetailsModal     from './ReportDetailsModal';
import ResolutionDetailsModal from './ResolutionDetailsModal';
import ResolveReportModal     from './ResolveReportModal';
import PrintableReport        from "./printablereport";
import { generatePDF, generateCSV, generateDOCX } from './ReportGenerate';
import { useReactToPrint } from "react-to-print";

import { TbReportOff } from "react-icons/tb";
import {
  FaFilePdf, FaCheckCircle, FaSearch,
  FaMapMarkerAlt, FaUser, FaUserCheck, FaShareSquare,
  FaRegSquare, FaCheckSquare, FaChevronDown, FaChevronUp,
  FaFilter, FaSortAmountDown, FaTimes, FaChartBar, FaPrint,
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
      {/* View — always visible */}
      <button
        onClick={onView}
        className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
      >
        View
      </button>

{/* Route — only for pending reports, outside batch mode */}
{isPending && !batchMode && (
  <button
    onClick={onRoute}
    className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition flex items-center gap-1"
  >
    <FaShareSquare className="text-[9px]"/> Route
  </button>
)}

{/* Print — only after routing (Forwarded or Assigned), outside batch mode */}
{!batchMode && (report.status === "Forwarded" || report.status === "Assigned") && (
  <button
    onClick={onPrint}
    title="Print Transmittal Form"
    className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-200 text-slate-700 font-medium transition flex items-center gap-1"
  >
    <FaPrint className="text-[10px]"/> Print
  </button>
)}

      {/* Resolution — only for resolved reports */}
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
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [deptFilter, setDeptFilter]   = useState("All");
  const [sortBy, setSortBy]           = useState("dateDesc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [selectedReport, setSelectedReport]       = useState(null); // ReportDetailsModal
  const [showStatusModal, setShowStatusModal]     = useState(null); // Status update modal
  const [showResolveModal, setShowResolveModal]   = useState(null); // Resolve form modal
  const [showResolutionModal, setShowResolutionModal] = useState(null); // Resolution view modal
  const [showReportModal, setShowReportModal]     = useState(false); // Generate report modal
  const [newStatus, setNewStatus]                 = useState("");

  // ── Route modal state ─────────────────────────────────────────────────────
  const [showRouteModal, setShowRouteModal]     = useState(false);
  const [batchAssignments, setBatchAssignments] = useState({}); // { [reportId]: dept }
  const [routing, setRouting]                   = useState(false);

  // ── Report generation ──────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");
  const [exportDept, setExportDept] = useState("All");

  // ── Batch select ──────────────────────────────────────────────────────────
  const [batchMode, setBatchMode]     = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ── Highlight / scroll ────────────────────────────────────────────────────
  const [highlightedId, setHighlightedId] = useState(null);
  const rowRefs  = useRef({});
  const scrolled = useRef(null);

  // ── Print refs ────────────────────────────────────────────────────────────
  const singlePrintRef = useRef();
  const batchPrintRef  = useRef();
  const [reportToPrint, setReportToPrint] = useState(null);

  const selectedReportsData = reports.filter(r => selectedIds.has(r.id));

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

  const forwardable       = filtered.filter(r => r.status === "Pending");
  const activeFilterCount = [statusFilter, typeFilter, deptFilter !== "All" ? deptFilter : ""].filter(Boolean).length;

  // ── Selection helpers ─────────────────────────────────────────────────────
  const toggleSel   = (id) => setSelectedIds(p => { const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const selectAll   = ()   => setSelectedIds(new Set(forwardable.map(r=>r.id)));
  const clearSel    = ()   => setSelectedIds(new Set());
  const allSelected = forwardable.length > 0 && selectedIds.size === forwardable.length;

  // ── UNIFIED openRouteModal ────────────────────────────────────────────────
  const openRouteModal = (report = null) => {
    const targetIds = report ? new Set([report.id]) : selectedIds;
    const initial   = {};

    reports
      .filter(r => targetIds.has(r.id))
      .forEach(r => {
        initial[r.id] = r.assignedDepartment || (report ? getAssignedDepartment(r.issueType) : "");
      });

    if (report) setSelectedIds(targetIds); // pin selection to just this report
    setBatchAssignments(initial);
    setShowRouteModal(true);
  };

  const closeRouteModal = () => {
    setShowRouteModal(false);
    setBatchAssignments({});
    if (!batchMode) clearSel();
  };

  // ── Route → commit + print ─────────────────────────────────────────────────
  const handleFinalizeBatch = async () => {
    const allAssigned = Object.values(batchAssignments).every(d => d !== "");
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
          const dept = batchAssignments[r.id];
          const ref  = r.docRef?.id ? r.docRef : doc(db,"users",r.userId,"uploads",r.id);
          batch.update(ref, { assignedDepartment:dept, status:"Forwarded", forwardedAt:new Date().toISOString() });
        });
        await batch.commit();
      }

      const updatedItems = items.map(r => ({ ...r, assignedDepartment:batchAssignments[r.id], status:"Forwarded" }));

      closeRouteModal();

      // Single → single transmittal; multiple → batch print
      if (updatedItems.length === 1) {
        setReportToPrint(updatedItems[0]);
      } else {
        setTimeout(() => handleBatchPrint(), 50);
      }

      if (batchMode) { clearSel(); setBatchMode(false); }
    } catch (e) {
      console.error(e);
      alert("Failed to route. Please try again.");
    } finally {
      setRouting(false);
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

  // ── Export ────────────────────────────────────────────────────────────────
  const exportReports = (fn) => {
    const toExport = exportDept === "All" ? reports : reports.filter(r => getDept(r) === exportDept);
    fn(toExport, startDate, endDate);
    setShowReportModal(false);
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          <div className="flex items-center gap-2">
            {batchMode && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold">
                {selectedIds.size} selected
              </span>
            )}
            <button
              onClick={() => { setBatchMode(v=>!v); clearSel(); }}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition ${
                batchMode
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <FaShareSquare className="text-xs"/>
              {batchMode ? "Exit Batch" : "Batch Forward"}
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

            {/* Search */}
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

            {/* Filter toggle */}
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

            {/* Sort */}
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

            {/* Batch controls */}
            {batchMode && (
              <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
                <button
                  onClick={allSelected ? clearSel : selectAll}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {allSelected ? "Deselect all" : "Select all pending"}
                </button>

                <button
                  onClick={() => handleBatchPrint()}
                  disabled={selectedIds.size === 0}
                  className="text-xs px-3 py-1.5 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition flex items-center gap-1.5"
                >
                  <FaPrint/> Print ({selectedIds.size})
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
          </div>

          {/* Collapsible filters */}
          {filtersOpen && (
            <div className="slide-down px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 items-center">
              {[
                { label:"Status", value:statusFilter, set:setStatusFilter, options:["Pending","Assigned","Forwarded","Resolved","Withdrawn"] },
                { label:"Type",   value:typeFilter,   set:setTypeFilter,   options:["Drainage","Pothole","Manhole","Road Markings","Road Blockage","Waste Management"] },
                { label:"Dept",   value:deptFilter === "All" ? "" : deptFilter, set:(v) => setDeptFilter(v||"All"),
                  options:["MENRO / WMO","Mayor / Dispatch","Engineering Office","Unassigned"] },
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
                  const dept      = getDept(r);
                  const isPending = r.status === "Pending";
                  const isChecked = selectedIds.has(r.id);

                  return (
                    <tr
                      key={r.id}
                      ref={el => { if (el) rowRefs.current[r.id] = el; else delete rowRefs.current[r.id]; }}
                      onClick={() => batchMode && isPending && toggleSel(r.id)}
                      className={`transition-colors ${
                        highlightedId === r.id ? "ring-2 ring-inset ring-blue-400 bg-blue-50" :
                        isChecked              ? "bg-indigo-50" :
                        batchMode && isPending ? "hover:bg-indigo-50 cursor-pointer" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Batch checkbox */}
                      {batchMode && (
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          {isPending ? (
                            <button onClick={() => toggleSel(r.id)} className="text-indigo-400 hover:text-indigo-600">
                              {isChecked
                                ? <FaCheckSquare className="text-base text-indigo-600"/>
                                : <FaRegSquare className="text-base"/>
                              }
                            </button>
                          ) : <FaRegSquare className="text-base text-gray-200"/>}
                        </td>
                      )}

                      {/* Reference */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => navigator.clipboard.writeText(genRef(r))}
                          title="Click to copy"
                          className="font-mono text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition"
                        >
                          {genRef(r)}
                        </button>
                      </td>

                      {/* Reporter */}
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

                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold text-gray-700">{r.issueType || "Unknown"}</span>
                      </td>

                      {/* Routed To */}
                      <td className="px-4 py-3.5"><DeptBadge dept={dept}/></td>

                      {/* Location */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-1 max-w-[160px]">
                          <FaMapMarkerAlt className="text-gray-300 text-[10px] mt-0.5 shrink-0"/>
                          <span className="text-xs text-gray-500 leading-snug line-clamp-2">{r.address || "—"}</span>
                        </div>
                      </td>

                      {/* Submitted */}
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-gray-700 font-medium">{fmtDate(r.uploadedAt)}</p>
                        <p className="text-[10px] text-gray-400">{fmtTime(r.uploadedAt)}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <StatusBadge status={r.status} onClick={() => !batchMode && setShowStatusModal(r)}/>
                      </td>

                      {/* Actions — delegated to ActionButtons */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <ActionButtons
                          report={r}
                          batchMode={batchMode}
                          onView={()       => setSelectedReport(r)}
                          onPrint={()      => setReportToPrint(r)}
                          onRoute={()      => openRouteModal(r)}
                          onResolution={()=> setShowResolutionModal(r)}
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
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Generate Report</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Select date range, department, and export format</p>
                </div>
                <button onClick={() => setShowReportModal(false)} className="text-gray-300 hover:text-gray-500"><FaTimes/></button>
              </div>
              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {[["Start Date", startDate, setStartDate], ["End Date", endDate, setEndDate]].map(([label, val, set]) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                      <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={val} onChange={e => set(e.target.value)}/>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by Department</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["All", "MENRO / WMO", "Mayor / Dispatch", "Engineering Office"].map(d => {
                      const meta   = d !== "All" ? DEPT[d] : null;
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
                            <p className="font-semibold text-xs leading-tight">{d === "All" ? "All Departments" : d}</p>
                            {meta && <p className="text-[10px] opacity-60">{meta.desc}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {exportDept !== "All" && (
                    <p className="text-xs text-blue-600 mt-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                      📄 Will include only {exportDept} reports
                    </p>
                  )}
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                <button onClick={() => setShowReportModal(false)} className="text-sm px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition font-medium">Cancel</button>
                <div className="flex gap-2">
                  {[
                    { label:"PDF",  fn:generatePDF,  cls:"bg-red-500 hover:bg-red-600 text-white" },
                    { label:"CSV",  fn:generateCSV,  cls:"bg-emerald-500 hover:bg-emerald-600 text-white" },
                    { label:"DOCX", fn:generateDOCX, cls:"bg-blue-600 hover:bg-blue-700 text-white" },
                  ].map(({ label, fn, cls }) => (
                    <button key={label} onClick={() => exportReports(fn)} className={`text-sm px-4 py-2 rounded-xl font-semibold transition ${cls}`}>
                      {label}
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
{/* ═══════════════ UNIFIED ROUTE MODAL ═══════════════ */}
{showRouteModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden">

      {/* Header */}
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

      {/* Apply-to-all strip */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Apply department to all</p>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(DEPT).map(dept => (
            <button
              key={dept}
              onClick={() => setBatchAssignments(prev =>
                Object.fromEntries(Object.keys(prev).map(id => [id, dept]))
              )}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 font-medium transition"
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Per-report rows */}
      <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
        {reports.filter(r => selectedIds.has(r.id)).map(report => {
          const assigned = batchAssignments[report.id] || "";
          return (
            <div key={report.id} className="px-6 py-4 flex items-center gap-3">

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{report.issueType || "Unknown"}</p>
                <p className="text-xs text-gray-400 truncate">{report.address || "No address"}</p>
                <p className="text-[10px] text-gray-300 font-mono mt-0.5">{genRef(report)}</p>
              </div>

              {/* Select + status icon */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={assigned}
                  onChange={e => setBatchAssignments(prev => ({ ...prev, [report.id]: e.target.value }))}
                  className={`text-xs rounded-lg px-2 py-1.5 border focus:outline-none focus:ring-2 focus:ring-indigo-200 transition ${
                    assigned
                      ? "border-gray-200 bg-white text-gray-800"
                      : "border-red-200 bg-red-50 text-red-500"
                  }`}
                >
                  <option value="">— route to —</option>
                  {Object.keys(DEPT).map(d => <option key={d} value={d}>{d}</option>)}
                </select>

                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  {assigned
                    ? <FaCheckCircle className="text-green-400 text-sm"/>
                    : <FaRegSquare className="text-gray-200 text-sm"/>
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation bar — only shows when something is unassigned */}
      {Object.values(batchAssignments).some(d => !d) && (
        <div className="px-6 py-2.5 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-500 flex items-center gap-1.5">
            <FaTimes className="text-[10px]"/>
            All reports must have a department assigned before routing.
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between gap-3">

        {/* Progress pill */}
        <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-3 py-1 font-medium">
          {Object.values(batchAssignments).filter(Boolean).length} of {Object.keys(batchAssignments).length} assigned
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