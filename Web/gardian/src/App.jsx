import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import { collectionGroup, onSnapshot, getDoc, doc } from "firebase/firestore";
import { useUser } from "./context/UserContext.jsx";

// Components
import Sidebar         from "./components/Sidebar";
import Topbar          from "./components/Topbar";
import MonthlyReportChart from "./components/MonthlyReportChart";
import Analytics       from "./components/Analytics";
import Reports         from "./components/Reports";
import CitizenFeedback from "./components/CitizenFeedback";
import Login           from "./components/Login";
import Signup          from "./components/Signup";
import UserManagement  from "./components/UserManagement";
import ProtectedRoute  from "./components/ProtectedRoute.jsx";

// Icons
import {
  FaCheckCircle, FaMapMarkerAlt, FaUser, FaUsers,
  FaArrowRight, FaChartBar,
} from "react-icons/fa";
import { TbReportOff }    from "react-icons/tb";
import { RiHourglassFill } from "react-icons/ri";
import { MdPending, MdEngineering, MdLocalShipping } from "react-icons/md";
import { GiRecycle }      from "react-icons/gi";
import { FaUserCheck, FaShareSquare }    from "react-icons/fa";
import { FaClockRotateLeft } from "react-icons/fa6";
import { Link } from "react-router-dom";

// ── Department routing (mirrors Reports.jsx) ──────────────────────────────────
function getAssignedDepartment(issueType) {
  if (["Waste Management", "Solid Waste"].includes(issueType))                         return "MENRO / WMO";
  if (["Drainage", "Road Blockage"].includes(issueType))                               return "Mayor / Dispatch";
  if (["Pothole", "Manhole", "Road Markings", "Road Surface"].includes(issueType))     return "Engineering Office";
  return "Unassigned";
}
const getDept = (r) => r.assignedDepartment || getAssignedDepartment(r.issueType);

// Status badge config — matches Reports.jsx
const STATUS_CONFIG = {
  Pending:   { cls:"bg-amber-50 text-amber-700 border border-amber-200",  icon:<FaClockRotateLeft className="text-amber-500 shrink-0"/> },
  Assigned:  { cls:"bg-cyan-50 text-cyan-700 border border-cyan-200",     icon:<FaUserCheck className="text-cyan-500 shrink-0"/> },
  Withdrawn: { cls:"bg-gray-50 text-gray-600 border border-gray-200",     icon:<TbReportOff className="text-gray-400 shrink-0"/> },
  Resolved:  { cls:"bg-green-50 text-green-700 border border-green-200",  icon:<FaCheckCircle className="text-green-500 shrink-0"/> },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${cfg.cls}`}>
      {cfg.icon}{status}
    </span>
  );
}

// Dept badge — matches Reports.jsx palette
const DEPT_BADGE = {
  "MENRO / WMO":        "bg-teal-50 text-teal-700 border-teal-200",
  "Mayor / Dispatch":   "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Engineering Office": "bg-orange-50 text-orange-700 border-orange-200",
  "Unassigned":         "bg-gray-50 text-gray-500 border-gray-200",
};

const genRef = (r) => {
  if (!r?.id) return "REF-00000000-XXXXX";
  const ts = r.uploadedAt;
  const d  = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  const ds = d && !isNaN(d) ? d.toISOString().slice(0,10).replace(/-/g,"") : "00000000";
  return `REF-${ds}-${r.id.slice(-5).toUpperCase()}`;
};

const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
};

const fmtTime = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("en-US", { hour:"2-digit", minute:"2-digit" });
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const location = useLocation();
  const { user, role, loading } = useUser();
  const [reports, setReports]       = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);

  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  // ── Real-time fetch all reports — with user details (for barangay grouping) ──
  useEffect(() => {
    if (!user || !role) return;

    // Cache user docs in memory to avoid fetching the same user repeatedly
    const userCache = {};

    return onSnapshot(
      collectionGroup(db, "uploads"),
      async (snapshot) => {
        // Collect unique userIds from this snapshot
        const userIds = [...new Set(
          snapshot.docs
            .map(d => d.ref.parent.parent?.id)
            .filter(Boolean)
        )];

        // Fetch any uncached users in parallel
        await Promise.all(
          userIds
            .filter(uid => !userCache[uid])
            .map(async (uid) => {
              try {
                const snap = await getDoc(doc(db, "users", uid));
                userCache[uid] = snap.exists() ? snap.data() : null;
              } catch (_) {
                userCache[uid] = null;
              }
            })
        );

        // Build enriched reports using cached user data
        const data = snapshot.docs.map((d) => {
          const userId = d.ref.parent.parent?.id || "unknown";
          return {
            id: d.id,
            userId,
            userDetails: userCache[userId] || null,
            ...d.data(),
          };
        });

        setReports(data);
        setLoadingReports(false);
      },
      (err) => { console.error(err); setLoadingReports(false); }
    );
  }, [user, role]);

  // ── Top 5 recent reports (already have userDetails, just add refCode) ────
  useEffect(() => {
    if (!reports.length) { setRecentReports([]); return; }
    const sorted = [...reports]
      .sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0))
      .slice(0, 5)
      .map(r => ({ ...r, refCode: genRef(r) }));
    setRecentReports(sorted);
  }, [reports]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto mb-3"/>
          <p className="text-sm text-gray-400 font-medium">Loading GARDIAN…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {!isAuthPage && user && <Sidebar />}

      <div className="flex-1 flex flex-col overflow-hidden">
        {!isAuthPage && user && (
          <div className="sticky top-0 z-50">
            <Topbar />
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute
                  component={() => (
                    <Dashboard
                      reports={reports}
                      recentReports={recentReports}
                      loading={loadingReports}
                    />
                  )}
                  allowedRoles={["super_admin", "personnel_admin"]}
                />
              }
            />
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/analytics"
              element={<ProtectedRoute component={Analytics} allowedRoles={["super_admin","personnel_admin"]}/>}
            />
            <Route
              path="/reports"
              element={<ProtectedRoute component={Reports} allowedRoles={["super_admin","personnel_admin","staff_admin"]}/>}
            />
            <Route
              path="/usermanagement"
              element={<ProtectedRoute component={UserManagement} allowedRoles={["super_admin"]}/>}
            />
            <Route
              path="/feedback"
              element={<ProtectedRoute component={CitizenFeedback} allowedRoles={["super_admin","personnel_admin"]}/>}
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ reports, recentReports, loading }) {
  const pending   = reports.filter(r => r.status === "Pending").length;
  const assigned  = reports.filter(r => r.status === "Assigned").length;
  const forwarded = reports.filter(r => r.status === "Forwarded").length;
  const resolved  = reports.filter(r => r.status === "Resolved").length;
  const withdrawn = reports.filter(r => r.status === "Withdrawn").length;
  const total     = reports.length;

  // Department pending breakdown
  const deptCounts = {
    "MENRO / WMO":        reports.filter(r => r.status === "Pending" && getDept(r) === "MENRO / WMO").length,
    "Mayor / Dispatch":   reports.filter(r => r.status === "Pending" && getDept(r) === "Mayor / Dispatch").length,
    "Engineering Office": reports.filter(r => r.status === "Pending" && getDept(r) === "Engineering Office").length,
  };

  const resolutionRate = total ? Math.round((resolved / total) * 100) : 0;
  const getType = (r) => r.yolo?.drainage_count > 0 ? "Drainage" : r.issueType || "Unknown";

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-full">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label:"Pending",   val:pending,   color:"text-amber-700", bg:"bg-amber-50", border:"border-amber-200", icon: <FaClockRotateLeft /> },
          { label:"Assigned",  val:assigned,  color:"text-cyan-700",  bg:"bg-cyan-50",  border:"border-cyan-200",  icon: <FaUserCheck /> },
          { label:"Forwarded", val:forwarded, color:"text-blue-700",  bg:"bg-blue-50",  border:"border-blue-200",  icon: <FaShareSquare /> },
          { label:"Resolved",  val:resolved,  color:"text-green-700", bg:"bg-green-50", border:"border-green-200", icon: <FaCheckCircle /> },
          { label:"Withdrawn", val:withdrawn, color:"text-gray-600",  bg:"bg-gray-50",  border:"border-gray-200",  icon: <TbReportOff /> },
          { label:"Total Logs",val:total,     color:"text-slate-800", bg:"bg-white",    border:"border-slate-200", icon: <FaChartBar /> },
        ].map(({ label, val, color, bg, border, icon }) => (
          <div 
            key={label} 
            className={`${bg} border ${border} rounded-xl px-5 py-4 shadow-sm flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-md`}
          >
            <div className="flex items-start justify-between mb-3">
              {/* Monochromatic Label: Matches the card color but slightly faded */}
              <p className={`text-[11px] font-bold uppercase tracking-wider ${color} opacity-80`}>
                {label}
              </p>
              {/* Full opacity icon: Removed the 'opacity-50' so the icon is crisp and sharp */}
              <span className={`text-[20px] ${color}`}>{icon}</span>
            </div>
            {loading
              ? <div className="h-9 w-16 bg-black/10 rounded animate-pulse"/>
              : <p className={`text-3xl font-extrabold ${color} tracking-tight`}>{val}</p>
            }
          </div>
        ))}
      </div>

      {/* ── Monthly chart ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <MonthlyReportChart reports={reports} />
      </div>

      {/* ── Recent Reports table ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Recent Incident Logs</h2>
            <p className="text-xs text-gray-500 mt-0.5">The 5 most recent submissions from citizens</p>
          </div>
          <Link
            to="/reports"
            className="text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
          >
            Manage All <FaArrowRight className="text-[10px]"/>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Reporter</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Issue Type</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Routed To</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({length:5}).map((_,i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="7" className="px-6 py-5">
                      <div className="h-4 bg-gray-200 rounded w-full"/>
                    </td>
                  </tr>
                ))
              ) : recentReports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-16 text-gray-400">
                    <FaCheckCircle className="mx-auto text-4xl mb-3 text-gray-300"/>
                    <p className="text-base font-bold text-gray-500">All caught up!</p>
                    <p className="text-xs mt-1">No recent reports to display.</p>
                  </td>
                </tr>
              ) : recentReports.map((r) => {
                const dept = getDept(r);
                return (
                  <tr key={r.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                        {r.refCode}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <FaUser className="text-xs"/>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-xs">
                            {r.userDetails?.firstName} {r.userDetails?.lastName}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate max-w-[120px]">
                            {r.userDetails?.barangay || r.address || "Location unknown"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-800 text-xs">
                      {getType(r)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-bold border ${DEPT_BADGE[dept] || DEPT_BADGE["Unassigned"]}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0"/>
                        {dept}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-gray-800">{fmtDate(r.uploadedAt)}</p>
                      <p className="text-[10px] font-medium text-gray-400 mt-0.5">{fmtTime(r.uploadedAt)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={r.status}/>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/reports"
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}