import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collectionGroup, doc, getDoc, updateDoc, writeBatch, onSnapshot } from "firebase/firestore";
import { db, auth } from "../../firebase";
import ReportDetailsModal      from './ReportDetailsModal';
import ResolutionDetailsModal  from './ResolutionDetailsModal';
import ResolveReportModal      from './ResolveReportModal';
import { generatePDF, generateCSV, generateDOCX } from './ReportGenerate';

import { TbReportOff } from "react-icons/tb";
import {
  FaFilePdf, FaUsers, FaCheckCircle, FaSearch,
  FaMapMarkerAlt, FaUser, FaUserCheck, FaShareSquare,
  FaRegSquare, FaCheckSquare, FaChevronDown, FaChevronUp,
  FaFilter, FaSortAmountDown, FaTimes, FaChartBar,
} from "react-icons/fa";
import { FaClockRotateLeft } from "react-icons/fa6";
import { RiHourglassFill }   from "react-icons/ri";
import { MdAssignment, MdEngineering, MdLocalShipping } from "react-icons/md";
import { GiRecycle }         from "react-icons/gi";

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
  if (["Waste Management", "Solid Waste"].includes(issueType))           return "MENRO / WMO";
  if (["Drainage", "Road Blockage"].includes(issueType))                 return "Mayor / Dispatch";
  if (["Pothole", "Manhole", "Road Markings", "Road Surface"].includes(issueType)) return "Engineering Office";
  return "Unassigned";
}
const getDept = (r) => r.assignedDepartment || getAssignedDepartment(r.issueType);

const DEPT = {
  // Teal 
  "MENRO / WMO":       { color:"teal",   icon:<GiRecycle className="shrink-0"/>,      desc:"Waste & environmental" },
  // Indigo
  "Mayor / Dispatch":  { color:"indigo", icon:<MdLocalShipping className="shrink-0"/>, desc:"Drainage, road blockages" },
  // Orange
  "Engineering Office":{ color:"orange", icon:<MdEngineering className="shrink-0"/>,   desc:"Potholes, manholes, markings" },
  // Gray
  "Unassigned":        { color:"gray",   icon:<MdAssignment className="shrink-0"/>,    desc:"Needs routing" },
};

const DEPT_COLORS = {
  teal:   { badge:"bg-teal-50 text-teal-700 border-teal-200",     dot:"bg-teal-500",   ring:"ring-teal-400"   },
  indigo: { badge:"bg-indigo-50 text-indigo-700 border-indigo-200", dot:"bg-indigo-500", ring:"ring-indigo-400" },
  orange: { badge:"bg-orange-50 text-orange-700 border-orange-200", dot:"bg-orange-500", ring:"ring-orange-400" },
  gray:   { badge:"bg-gray-50 text-gray-500 border-gray-200",      dot:"bg-gray-400",   ring:"ring-gray-300"   },
};

// Status colors remain semantic (traffic-light logic — do NOT change these)
const STATUS_CONFIG = {
  Pending:   { cls:"bg-amber-50 text-amber-700 border border-amber-200",   icon:<RiHourglassFill className="text-amber-500 shrink-0"/> },
  Assigned:  { cls:"bg-cyan-50 text-cyan-700 border border-cyan-200",      icon:<FaUserCheck className="text-cyan-500 shrink-0"/> },
  Withdrawn: { cls:"bg-gray-50 text-gray-600 border border-gray-200",      icon:<TbReportOff className="text-gray-400 shrink-0"/> },
  Resolved:  { cls:"bg-green-50 text-green-700 border border-green-200",   icon:<FaCheckCircle className="text-green-500 shrink-0"/> },
};

function DeptBadge({ dept }) {
  const d = DEPT[dept] || DEPT["Unassigned"];
  const c = DEPT_COLORS[d.color];
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
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition ${cfg.cls}`}>
      {cfg.icon}{status}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Reports() {
  const location = useLocation();
  const navigate = useNavigate();

  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [deptFilter, setDeptFilter]   = useState("All");
  const [sortBy, setSortBy]           = useState("dateDesc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Modals
  const [selectedReport, setSelectedReport]   = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [showResolutionModal, setShowResolutionModal] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [newStatus, setNewStatus]     = useState("");

  // Report generation
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [exportDept, setExportDept] = useState("All");

  // Batch
  const [batchMode, setBatchMode]   = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchDept, setBatchDept]   = useState("");
  const [forwarding, setForwarding] = useState(false);

  // Highlight
  const [highlightedId, setHighlightedId] = useState(null);
  const rowRefs  = useRef({});
  const scrolled = useRef(null);

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = {
    pending:   reports.filter(r => r.status === "Pending").length,
    assigned:  reports.filter(r => r.status === "Assigned").length,
    resolved:  reports.filter(r => r.status === "Resolved").length,
    withdrawn: reports.filter(r => r.status === "Withdrawn").length,
    total:     reports.length,
  };

  const deptPending = Object.fromEntries(
    Object.keys(DEPT).map(d => [d, reports.filter(r => r.status === "Pending" && getDept(r) === d).length])
  );

  // ── URL highlight ──────────────────────────────────────────────────────────
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("highlight");
    if (id) { setHighlightedId(id); navigate("/reports", { replace: true }); }
  }, [location.search, navigate]);

  useEffect(() => {
    if (!highlightedId || scrolled.current === highlightedId) return;
    const el = rowRefs.current[highlightedId];
    if (el) {
      scrolled.current = highlightedId;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("row-flash");
      const t = setTimeout(() => { el.classList.remove("row-flash"); setHighlightedId(null); scrolled.current = null; }, 2200);
      return () => clearTimeout(t);
    }
  }, [highlightedId, reports]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const genRef = (r) => {
    if (!r?.id) return "REF-00000000-XXXXX";
    const ts = r.uploadedAt;
    const d  = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    const ds = d && !isNaN(d) ? d.toISOString().slice(0,10).replace(/-/g,"") : "00000000";
    return `REF-${ds}-${r.id.slice(-5).toUpperCase()}`;
  };

  const getType = (r) => r.yolo?.drainage_count > 0 ? "Drainage" : r.issueType || "Unknown";
  const fmtDate = (ts) => { if (!ts) return "-"; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); };
  const fmtTime = (ts) => { if (!ts) return "-"; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}); };

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
          return { id: d.id, userId, userDetails, docRef: d.ref, ...d.data() };
        }));
        all.sort((a,b) => (b.uploadedAt?.toDate?.() || new Date(0)) - (a.uploadedAt?.toDate?.() || new Date(0)));
        setReports(all);
        setLoading(false);
      },
      (e) => { console.error(e); setLoading(false); }
    );
  }, []);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = reports
    .filter(r => {
      const s = search.toLowerCase();
      return !s || [r.id, r.userDetails?.firstName, r.userDetails?.lastName,
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

  const forwardable = filtered.filter(r => r.status === "Pending");
  const activeFilterCount = [statusFilter, typeFilter, deptFilter !== "All" ? deptFilter : ""].filter(Boolean).length;

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSel    = (id) => setSelectedIds(p => { const n = new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const selectAll    = ()   => setSelectedIds(new Set(forwardable.map(r=>r.id)));
  const clearSel     = ()   => setSelectedIds(new Set());
  const allSelected  = forwardable.length > 0 && selectedIds.size === forwardable.length;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleUpdateStatus = async () => {
    if (!showStatusModal || !newStatus) return;
    if (newStatus === "Resolved") { setShowResolveModal(showStatusModal); setShowStatusModal(null); setNewStatus(""); return; }
    try {
      const ref = showStatusModal.docRef?.id ? showStatusModal.docRef : doc(db,"users",showStatusModal.userId,"uploads",showStatusModal.id);
      await updateDoc(ref, { status: newStatus });
      alert("✅ Status updated!"); setShowStatusModal(null); setNewStatus("");
    } catch(e) { console.error(e); alert("Failed to update."); }
  };

  const handleBatchForward = async () => {
    if (!batchDept || selectedIds.size === 0) return;
    if (!window.confirm(`Forward ${selectedIds.size} report(s) to ${batchDept}?`)) return;
    setForwarding(true);
    try {
      const items = reports.filter(r => selectedIds.has(r.id));
      const CHUNK = 499;
      for (let i = 0; i < items.length; i += CHUNK) {
        const batch = writeBatch(db);
        items.slice(i, i+CHUNK).forEach(r => {
          const ref = r.docRef?.id ? r.docRef : doc(db,"users",r.userId,"uploads",r.id);
          batch.update(ref, { assignedDepartment: batchDept, status: "Assigned", forwardedAt: new Date().toISOString() });
        });
        await batch.commit();
      }
      alert(`✅ ${selectedIds.size} report(s) forwarded to ${batchDept}.`);
      clearSel(); setShowForwardModal(false); setBatchDept(""); setBatchMode(false);
    } catch(e) { console.error(e); alert("Failed."); }
    finally { setForwarding(false); }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportReports = (fn) => {
    // filter reports by dept if selected
    const toExport = exportDept === "All"
      ? reports
      : reports.filter(r => getDept(r) === exportDept);
    fn(toExport, startDate, endDate);
    setShowReportModal(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div className="p-6 bg-gray-50 min-h-screen space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reports</h1>
          </div>
          <div className="flex items-center gap-2">
            {batchMode && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold">
                {selectedIds.size} selected
              </span>
            )}
            <button
              onClick={() => { setBatchMode(v=>!v); clearSel(); }}
              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition ${
                batchMode ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label:"Pending",    val:counts.pending,   color:"text-amber-700", bg:"bg-amber-50",  border:"border-amber-200",  icon:<FaClockRotateLeft/>    },
            { label:"Assigned",   val:counts.assigned,  color:"text-cyan-700",  bg:"bg-cyan-50",   border:"border-cyan-200",   icon:<FaUserCheck />        },
            { label:"Resolved",   val:counts.resolved,  color:"text-green-700", bg:"bg-green-50",  border:"border-green-200",  icon:<FaCheckCircle />      },
            { label:"Withdrawn",  val:counts.withdrawn, color:"text-gray-500",  bg:"bg-gray-50",   border:"border-gray-200",   icon:<TbReportOff />        },
            { label:"Total Logs", val:counts.total,     color:"text-slate-700", bg:"bg-white",     border:"border-slate-200",  icon:<FaChartBar />         },
          ].map(({ label, val, color, bg, border, icon }) => (
            <div key={label} className={`${bg} border ${border} rounded-xl px-5 py-4 shadow-sm flex flex-col justify-between`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</p>
                <span className={`text-lg opacity-50 ${color}`}>{icon}</span>
              </div>
              <p className={`text-3xl font-black ${color}`}>{val}</p>
            </div>
          ))}
        </div>

        {/* ── Dept pending tiles ── */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {Object.entries(DEPT).map(([dept, d]) => {
            const c = DEPT_COLORS[d.color];
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

          {/* Table toolbar */}
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

            <span className="ml-auto text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>

            {/* Batch controls */}
            {batchMode && (
              <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
                <button onClick={allSelected ? clearSel : selectAll} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                  {allSelected ? "Deselect all" : "Select all pending"}
                </button>
                <select
                  value={batchDept}
                  onChange={e => setBatchDept(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                >
                  <option value="">Route to…</option>
                  <option value="MENRO / WMO">MENRO / WMO</option>
                  <option value="Mayor / Dispatch">Mayor / Dispatch</option>
                  <option value="Engineering Office">Engineering Office</option>
                </select>
                <button
                  onClick={() => setShowForwardModal(true)}
                  disabled={selectedIds.size === 0 || !batchDept}
                  className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed font-semibold transition"
                >
                  Forward ({selectedIds.size})
                </button>
              </div>
            )}
          </div>

          {/* Collapsible filters */}
          {filtersOpen && (
            <div className="slide-down px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">All</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</label>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">All</option>
                  <option value="Drainage">Drainage</option>
                  <option value="Pothole">Pothole</option>
                  <option value="Manhole">Manhole</option>
                  <option value="Road Markings">Road Markings</option>
                  <option value="Road Blockage">Road Blockage</option>
                  <option value="Waste Management">Waste Management</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</label>
                <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="All">All</option>
                  <option value="MENRO / WMO">MENRO / WMO</option>
                  <option value="Mayor / Dispatch">Mayor / Dispatch</option>
                  <option value="Engineering Office">Engineering Office</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Reporter</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Routed To</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
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
                  <tr><td colSpan={batchMode?9:8} className="text-center py-16 text-gray-300">
                    <FaSearch className="mx-auto text-3xl mb-2"/>
                    <p className="text-sm font-medium text-gray-400">No reports match your filters</p>
                  </td></tr>
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
                        isChecked ? "bg-indigo-50" :
                        batchMode && isPending ? "hover:bg-indigo-50 cursor-pointer" : "hover:bg-gray-50"
                      }`}
                    >
                      {/* Checkbox */}
                      {batchMode && (
                        <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                          {isPending ? (
                            <button onClick={() => toggleSel(r.id)} className="text-indigo-400 hover:text-indigo-600">
                              {isChecked ? <FaCheckSquare className="text-base text-indigo-600"/> : <FaRegSquare className="text-base"/>}
                            </button>
                          ) : <FaRegSquare className="text-base text-gray-200"/>}
                        </td>
                      )}

                      {/* Reference */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => navigator.clipboard.writeText(genRef(r))}
                          title="Click to copy"
                          className="font-mono text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition"
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

                      {/* Actions */}
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedReport(r)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
                          >
                            View
                          </button>
                          {isPending && !batchMode && (
                            <button
                              onClick={() => { setSelectedIds(new Set([r.id])); setBatchDept(getAssignedDepartment(r.issueType)); setShowForwardModal(true); }}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium transition flex items-center gap-1"
                            >
                              <FaShareSquare className="text-[9px]"/> Route
                            </button>
                          )}
                          {r.status === "Resolved" && (
                            <button
                              onClick={() => setShowResolutionModal(r)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 font-medium transition"
                            >
                              Resolution
                            </button>
                          )}
                        </div>
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
                <button onClick={() => setShowReportModal(false)} className="text-gray-300 hover:text-gray-500 transition"><FaTimes/></button>
              </div>

              <div className="px-6 py-5 space-y-5">

                {/* Date range */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Start Date</label>
                    <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={startDate} onChange={e => setStartDate(e.target.value)}/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">End Date</label>
                    <input type="date" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" value={endDate} onChange={e => setEndDate(e.target.value)}/>
                  </div>
                </div>

                {/* Department filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Filter by Department</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["All", "MENRO / WMO", "Mayor / Dispatch", "Engineering Office"].map(d => {
                      const meta = d !== "All" ? DEPT[d] : null;
                      const col  = meta ? DEPT_COLORS[meta.color] : null;
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
                    <button
                      key={label}
                      onClick={() => exportReports(fn)}
                      className={`text-sm px-4 py-2 rounded-xl font-semibold transition ${cls}`}
                    >
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

        {/* ═══════════════ FORWARD / BATCH MODAL ═══════════════ */}
        {showForwardModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FaShareSquare className="text-indigo-500 text-base"/> Route Report{selectedIds.size > 1 ? "s" : ""}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedIds.size} report{selectedIds.size > 1 ? "s" : ""} will be marked <strong>Assigned</strong>
                </p>
              </div>
              <div className="px-6 py-5 space-y-2">
                {["MENRO / WMO","Mayor / Dispatch","Engineering Office"].map(dept => {
                  const d = DEPT[dept];
                  const c = DEPT_COLORS[d.color];
                  const active = batchDept === dept;
                  return (
                    <button
                      key={dept}
                      onClick={() => setBatchDept(dept)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition text-left ${
                        active ? `${c.badge} border-current shadow-sm` : "bg-white border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <span className="text-xl">{d.icon}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{dept}</p>
                        <p className="text-xs text-gray-400">{d.desc}</p>
                      </div>
                      {active && <FaCheckCircle className="text-green-500 shrink-0"/>}
                    </button>
                  );
                })}
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-2 justify-end">
                <button
                  onClick={() => { setShowForwardModal(false); if (!batchMode) { clearSel(); setBatchDept(""); } }}
                  disabled={forwarding}
                  className="text-sm px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition font-medium"
                >Cancel</button>
                <button
                  onClick={handleBatchForward}
                  disabled={!batchDept || forwarding}
                  className="text-sm px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-30 transition font-semibold flex items-center gap-2"
                >
                  {forwarding
                    ? <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/>Routing…</>
                    : <><FaShareSquare/> Confirm Route</>}
                </button>
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