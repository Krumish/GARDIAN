import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collectionGroup, doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db, auth, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ReportDetailsModal from './ReportDetailsModal';
import ResolutionDetailsModal from './ResolutionDetailsModal';
import ResolveReportModal from './ResolveReportModal';
import { generatePDF, generateCSV, generateDOCX } from './ReportGenerate';

// Icons
import { TbReportOff } from "react-icons/tb";
import { FaFilePdf, FaUsers, FaCheckCircle, FaSearch, FaMapMarkerAlt, FaUser, FaUserCheck } from "react-icons/fa";
import { FaClockRotateLeft } from "react-icons/fa6";
import { RiHourglassFill } from "react-icons/ri";
import { MdAssignment } from "react-icons/md";

// ── Flash highlight keyframe injected once ────────────────────────────────────
const HIGHLIGHT_STYLE = `
  @keyframes rowFlash {
    0%   { background-color: #dbeafe; }
    30%  { background-color: #93c5fd; }
    70%  { background-color: #dbeafe; }
    100% { background-color: transparent; }
  }
  .row-highlight {
    animation: rowFlash 2s ease forwards;
  }
`;

export default function Reports() {
  const location = useLocation();
  const navigate  = useNavigate();

  const [reports, setReports]                           = useState([]);
  const [search, setSearch]                             = useState("");
  const [selectedReport, setSelectedReport]             = useState(null);
  const [showStatusModal, setShowStatusModal]           = useState(null);
  const [showResolveModal, setShowResolveModal]         = useState(null);
  const [showResolutionDetailsModal, setShowResolutionDetailsModal] = useState(null);
  const [newStatus, setNewStatus]                       = useState("");
  const [showReportModal, setShowReportModal]           = useState(false);
  const [startDate, setStartDate]                       = useState("");
  const [endDate, setEndDate]                           = useState("");
  const [statusFilter, setStatusFilter]                 = useState("");
  const [typeFilter, setTypeFilter]                     = useState("");
  const [sortBy, setSortBy]                             = useState("dateDesc");
  const [highlightedId, setHighlightedId]               = useState(null);

  // Map of reportId → DOM row element for scrolling
  const rowRefs  = useRef({});
  // Track which id we already processed so we don't re-scroll on re-renders
  const scrolled = useRef(null);

  const pendingCount   = reports.filter(r => r.status === "Pending").length;
  const withdrawnCount = reports.filter(r => r.status === "Withdrawn").length;
  const resolvedCount  = reports.filter(r => r.status === "Resolved").length;
  const assignedCount  = reports.filter(r => r.status === "Assigned").length;
  const totalCount     = reports.length;

  // ── Read highlight=docId
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("highlight");
    if (id) {
      setHighlightedId(id);
      // Clear the query param from the URL without triggering a navigation
      navigate("/reports", { replace: true });
    }
  }, [location.search, navigate]);

  // ── Scroll + flash once the highlighted row is rendered ───────────────────
  useEffect(() => {
    if (!highlightedId || scrolled.current === highlightedId) return;
    const el = rowRefs.current[highlightedId];
    if (el) {
      scrolled.current = highlightedId;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("row-highlight");
      // Remove class after animation so it can re-trigger if needed
      const timer = setTimeout(() => {
        el.classList.remove("row-highlight");
        setHighlightedId(null);
        scrolled.current = null;
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [highlightedId, reports]); 

  // ── Helpers ───────────────────────────────────────────────────────────────
  const generateRefCode = (report) => {
    if (!report?.id) return "REF-00000000-XXXXX";
    const ts = report.uploadedAt;
    const dateObj = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    const dateStr = dateObj && !isNaN(dateObj)
      ? dateObj.toISOString().slice(0, 10).replace(/-/g, "")
      : "00000000";
    return `REF-${dateStr}-${report.id.slice(-5).toUpperCase()}`;
  };

  const getInfrastructureType = (report) => {
    if (report.yolo?.drainage_count > 0) return "Drainage";
    return report.issueType || "Unknown";
  };

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString();
  };

  const formatTime = (ts) => {
    if (!ts) return "-";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString();
  };

  // ── Fetch all uploads ─────────────────────────────────────────────────────
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(
      collectionGroup(db, "uploads"),
      async (snapshot) => {
        const allReports = await Promise.all(
          snapshot.docs.map(async (uploadDoc) => {
            const userId = uploadDoc.ref.parent.parent?.id || "unknown";
            let userDetails = null;
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) userDetails = userDoc.data();
            } catch (err) { console.error(err); }
            return { id: uploadDoc.id, userId, userDetails, docRef: uploadDoc.ref, ...uploadDoc.data() };
          })
        );
        allReports.sort((a, b) => {
          const dA = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(0);
          const dB = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(0);
          return dB - dA;
        });
        setReports(allReports);
      },
      (error) => console.error("❌ Error fetching uploads:", error)
    );
    return () => unsubscribe();
  }, []);

  // ── Filtered + sorted reports ─────────────────────────────────────────────
  const filteredReports = reports
    .filter((r) => {
      const s = search.toLowerCase();
      return (
        (r.id || "").toLowerCase().includes(s) ||
        (r.userDetails?.firstName || "").toLowerCase().includes(s) ||
        (r.userDetails?.lastName  || "").toLowerCase().includes(s) ||
        (r.userDetails?.barangay  || "").toLowerCase().includes(s) ||
        (r.status || "").toLowerCase().includes(s) ||
        getInfrastructureType(r).toLowerCase().includes(s)
      );
    })
    .filter((r) => statusFilter ? r.status === statusFilter : true)
    .filter((r) => typeFilter   ? getInfrastructureType(r)?.trim() === typeFilter : true)
    .sort((a, b) => {
      if (sortBy === "dateDesc") return (b.uploadedAt?.toDate?.() || 0) - (a.uploadedAt?.toDate?.() || 0);
      if (sortBy === "dateAsc")  return (a.uploadedAt?.toDate?.() || 0) - (b.uploadedAt?.toDate?.() || 0);
      if (sortBy === "nameAsc")  return (a.userDetails?.firstName || "").localeCompare(b.userDetails?.firstName || "");
      if (sortBy === "nameDesc") return (b.userDetails?.firstName || "").localeCompare(a.userDetails?.firstName || "");
      return 0;
    });

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
      const reportDoc = showStatusModal.docRef?.id
        ? showStatusModal.docRef
        : doc(db, "users", showStatusModal.userId, "uploads", showStatusModal.id);
      await updateDoc(reportDoc, { status: newStatus });
      alert("✅ Report status updated successfully!");
      setShowStatusModal(null);
      setNewStatus("");
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const handleResolutionSuccess = () => setShowResolveModal(null);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{HIGHLIGHT_STYLE}</style>

      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard title="Pending"       value={pendingCount}   color="text-orange-500" bgColor="bg-orange-50"  icon={<RiHourglassFill    className="text-orange-500 w-10 h-10" />} />
          <StatCard title="Assigned"      value={assignedCount}  color="text-blue-600"   bgColor="bg-blue-50"    icon={<FaUserCheck        className="text-blue-600 w-10 h-10" />} />
          <StatCard title="Withdrawn"     value={withdrawnCount} color="text-gray-500"   bgColor="bg-gray-100"   icon={<TbReportOff        className="text-gray-500 w-10 h-10" />} />
          <StatCard title="Resolved"      value={resolvedCount}  color="text-green-500"  bgColor="bg-green-50"   icon={<FaClockRotateLeft  className="text-green-500 w-10 h-10" />} />
          <StatCard title="Total Reports" value={totalCount}     color="text-indigo-600" bgColor="bg-indigo-50"  icon={<FaUsers            className="text-indigo-600 w-10 h-10" />} />
        </div>

        {/* Reports Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">All Reports</h2>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Status Filter */}
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="Resolved">Resolved</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>

              {/* Type Filter */}
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">All Types</option>
                <option value="Drainage">Drainage</option>
                <option value="Pothole">Pothole</option>
                <option value="Manhole">Manhole</option>
                <option value="Road Markings">Road Markings</option>
                <option value="Road Blockage">Road Blockage</option>
                <option value="Waste Management">Waste Management</option>
              </select>

              {/* Sort */}
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="dateDesc">Date ↓</option>
                <option value="dateAsc">Date ↑</option>
                <option value="nameAsc">Name A-Z</option>
                <option value="nameDesc">Name Z-A</option>
              </select>

              {/* Search */}
              <div className="relative w-48 sm:w-64">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Generate Report */}
              <button
                className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm"
                onClick={() => setShowReportModal(true)}
              >
                <FaFilePdf className="mr-2" /> Generate Report
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(100vh-4rem)]">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                  <th className="px-4 py-3 font-bold text-left text-xs text-gray-600 uppercase tracking-wide">Reference Number</th>
                  <th className="px-4 py-3 font-bold text-left text-xs text-gray-600 uppercase tracking-wide">Name</th>
                  <th className="px-4 py-3 font-bold text-left text-xs text-gray-600 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 font-bold text-left text-xs text-gray-600 uppercase tracking-wide">Address</th>
                  <th className="px-4 py-3 font-bold text-left text-xs text-gray-600 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 font-bold text-left text-xs text-gray-600 uppercase tracking-wide">Time</th>
                  <th className="px-4 py-3 font-bold text-left text-xs text-gray-600 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 font-bold text-left text-xs text-gray-600 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    // ── Attach ref for scroll targeting ──
                    ref={(el) => {
                      if (el) rowRefs.current[report.id] = el;
                      else delete rowRefs.current[report.id];
                    }}
                    className={`border-b hover:bg-gray-50 text-sm transition-colors ${
                      highlightedId === report.id ? "ring-2 ring-blue-500 ring-inset" : ""
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden" title="Click to copy">
                        <span className="px-2 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 border-r border-gray-300">REF</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(generateRefCode(report))}
                          className="px-2 py-1 font-mono text-xs text-gray-800 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 transition-colors"
                        >
                          {generateRefCode(report)}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <FaUser className="text-gray-400 mr-2 text-xs" />
                        <span className="font-medium">{report.userDetails?.firstName} {report.userDetails?.lastName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-gray-700 font-medium text-sm">
                      {report.issueType || "Unknown"}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="text-gray-400 mr-1 text-xs shrink-0" />
                        <span className="text-gray-700 text-xs font-medium">{report.address || "-"}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-xs">{formatDate(report.uploadedAt)}</td>
                    <td className="py-3 px-4 text-xs">{formatTime(report.uploadedAt)}</td>

                    <td className="py-3 px-4">
                      <button className="flex items-center cursor-pointer" onClick={() => setShowStatusModal(report)}>
                        {report.status === "Pending" && (
                          <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <RiHourglassFill /> Pending
                          </span>
                        )}
                        {report.status === "Assigned" && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <FaUserCheck /> Assigned
                          </span>
                        )}
                        {report.status === "Withdrawn" && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <MdAssignment /> Withdrawn
                          </span>
                        )}
                        {report.status === "Resolved" && (
                          <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                            <FaCheckCircle /> Resolved
                          </span>
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition"
                          onClick={() => setSelectedReport(report)}
                        >
                          View
                        </button>
                        {report.status === "Resolved" && (
                          <button
                            className="bg-emerald-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-emerald-600 transition"
                            onClick={() => setShowResolutionDetailsModal(report)}
                          >
                            Resolution
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredReports.length === 0 && (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-400 italic">No reports found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Generate Report Modal ── */}
        {showReportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold mb-4">Generate Monthly Report</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Start Date</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">End Date</label>
                  <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 transition" onClick={() => setShowReportModal(false)}>Cancel</button>
                <div className="relative inline-block">
                  <button className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">Export As</button>
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => { generatePDF(reports, startDate, endDate); setShowReportModal(false); }}>PDF</button>
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => { generateCSV(reports, startDate, endDate); setShowReportModal(false); }}>CSV</button>
                    <button className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm" onClick={() => { generateDOCX(reports, startDate, endDate); setShowReportModal(false); }}>DOCX</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Update Status Modal ── */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
              <h3 className="text-xl font-bold mb-4">Update Status</h3>
              <p className="text-sm text-gray-600 mb-2">Report ID: {showStatusModal.id.substring(0, 12)}...</p>
              <p className="text-sm text-gray-600 mb-4">Current Status: <span className="font-semibold">{showStatusModal.status}</span></p>
              <select className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-4" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="">Select new status</option>
                <option value="Pending">Pending</option>
                <option value="Assigned">Assigned</option>
                <option value="Withdrawn">Withdrawn</option>
                <option value="Resolved">Resolved (Opens Resolution Form)</option>
              </select>
              {newStatus === "Resolved" && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">ℹ️ Clicking "Update" will open a systematic resolution form</p>
                </div>
              )}
              <div className="flex gap-2">
                <button className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition" onClick={() => { setShowStatusModal(null); setNewStatus(""); }}>Cancel</button>
                <button className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition" onClick={handleUpdateStatus}>Update</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modals ── */}
        {showResolveModal && (
          <ResolveReportModal report={showResolveModal} onClose={() => setShowResolveModal(null)} onSuccess={handleResolutionSuccess} />
        )}
        {selectedReport && (
          <ReportDetailsModal
            selectedReport={selectedReport}
            onClose={() => setSelectedReport(null)}
            formatDate={(ts) => ts.toDate().toLocaleDateString()}
            formatTime={(ts) => ts.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          />
        )}
        {showResolutionDetailsModal && (
          <ResolutionDetailsModal selectedReport={showResolutionDetailsModal} onClose={() => setShowResolutionDetailsModal(null)} />
        )}
      </div>
    </>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, color, bgColor, icon }) => (
  <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 min-h-[140px] flex items-center justify-between border border-gray-100">
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</h3>
      <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
    </div>
    <div className={`p-4 rounded-xl ${bgColor}`}>{icon}</div>
  </div>
);