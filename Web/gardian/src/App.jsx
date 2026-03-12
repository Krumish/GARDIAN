import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collectionGroup, onSnapshot, getDoc, doc } from "firebase/firestore";
import { useUser } from "./context/UserContext.jsx";

// Components
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MonthlyReportChart from "./components/MonthlyReportChart";
import Analytics from "./components/Analytics";
import Reports from "./components/Reports";
import CitizenFeedback from "./components/CitizenFeedback";
import Login from "./components/Login";
import Signup from "./components/Signup";
import UserManagement from "./components/UserManagement";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Icons
import { FaHistory, FaUsers, FaCheckCircle, FaMapMarkerAlt, FaUser } from "react-icons/fa"; // Added FaUser, FaMapMarkerAlt
import { TbReportOff } from "react-icons/tb";
import { RiHourglassFill } from "react-icons/ri";
import { MdPending } from "react-icons/md";

export default function App() {
  const location = useLocation();
  const { user, role, loading } = useUser();
  const [reports, setReports] = useState([]);
  const [recentReports, setRecentReports] = useState([]);

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  // --- Helper: Generate REF number ---
  const generateRefCode = (report) => {
    if (!report || !report.id) return "REF-00000000-XXXXX";
    const ts = report.uploadedAt;
    const dateObj = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    const dateStr = dateObj && !isNaN(dateObj) ? dateObj.toISOString().slice(0, 10).replace(/-/g, "") : "00000000";
    const shortHash = report.id.slice(-5).toUpperCase();
    return `REF-${dateStr}-${shortHash}`;
  };

  // Fetch ALL reports
  useEffect(() => {
    if (!user || !role) return;

    const q = collectionGroup(db, "uploads");
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => {
          const userId = doc.ref.parent.parent?.id || "unknown";
          return {
            id: doc.id,
            userId: userId,
            ...doc.data(),
          };
        });
        setReports(data);
      },
      (err) => console.error("Error fetching reports:", err)
    );

    return () => unsubscribe();
  }, [user, role]);

  // Process 5 Recent Reports 
  useEffect(() => {
    if (reports.length === 0) {
      setRecentReports([]);
      return;
    }

    const processRecent = async () => {
      // Sort by date (Newest first)
      const sorted = [...reports].sort((a, b) => {
        const dateA = a.uploadedAt?.seconds || 0;
        const dateB = b.uploadedAt?.seconds || 0;
        return dateB - dateA;
      });

      // Get recent 5
      const top5 = sorted.slice(0, 5);

      // Fetch User Details
      const detailed = await Promise.all(
        top5.map(async (report) => {
          let userDetails = null;
          if (report.userId && report.userId !== "unknown") {
            try {
              const userDoc = await getDoc(doc(db, "users", report.userId));
              if (userDoc.exists()) {
                userDetails = userDoc.data();
              }
            } catch (err) {
              console.error("Error fetching user:", err);
            }
          }

          return {
            ...report,
            userDetails,
            refCode: generateRefCode(report),
          };
        })
      );

      setRecentReports(detailed);
    };

    processRecent();
  }, [reports]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-xl font-semibold">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {!isAuthPage && user && <Sidebar />}

      <div className="flex-1 flex flex-col">
        {!isAuthPage && user && (
          <div className="sticky top-0 z-50">
            <Topbar />
          </div>
        )}

        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute
                  component={() => <Dashboard reports={reports} recentReports={recentReports} />}
                  allowedRoles={["super_admin", "personnel_admin"]}
                />
              }
            />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute
                  component={Analytics}
                  allowedRoles={["super_admin", "personnel_admin"]}
                />
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute
                  component={Reports}
                  allowedRoles={["super_admin", "personnel_admin", "staff_admin"]}
                />
              }
            />
            <Route
              path="/usermanagement"
              element={
                <ProtectedRoute component={UserManagement} allowedRoles={["super_admin"]} />
              }
            />
            <Route
              path="/feedback"
              element={
                <ProtectedRoute
                  component={CitizenFeedback}
                  allowedRoles={["super_admin", "personnel_admin"]}
                />
              }
            />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ---------------- Dashboard Component ----------------
function Dashboard({ reports, recentReports }) {
  const pendingCount = reports.filter((r) => r.status === "Pending").length;
  const withdrawnCount = reports.filter((r) => r.status === "Withdrawn").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;
  const totalCount = reports.length;

  const formatDate = (ts) => {
    if (!ts) return "-";
    if (ts.toDate) return ts.toDate().toLocaleDateString();
    return new Date(ts).toLocaleDateString();
  };

  const formatTime = (ts) => {
    if (!ts) return "-";
    if (ts.toDate) return ts.toDate().toLocaleTimeString();
    return new Date(ts).toLocaleTimeString();
  };

  // Helper
  const getInfrastructureType = (report) => {
    if (report.yolo?.drainage_count > 0) return "Drainage";
    return report.issueType || "Unknown";
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

{/* Stats Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

  <StatCard
    title="Pending"
    value={pendingCount}
    color="text-orange-500"
    bgColor="bg-orange-50"
    icon={<RiHourglassFill className="text-orange-500 w-10 h-10" />}
  />

  <StatCard
    title="Withdrawn"
    value={withdrawnCount}
    color="text-gray-500"
    bgColor="bg-gray-100"
    icon={<TbReportOff className="text-gray-500 w-10 h-10" />}
  />

  <StatCard
    title="Resolved"
    value={resolvedCount}
    color="text-green-500"
    bgColor="bg-green-50"
    icon={<FaHistory className="text-green-500 w-10 h-10" />}
  />

  <StatCard
    title="Total Reports"
    value={totalCount}
    color="text-blue-500"
    bgColor="bg-blue-50"
    icon={<FaUsers className="text-blue-500 w-10 h-10" />}
  />
</div>

      {/* Chart */}
      <div className="p-6 bg-white rounded-xl shadow mb-6">
        <MonthlyReportChart reports={reports} />
      </div>

      {/* Recent Reports Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Reports</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 sticky top-0 z-10 bg-white shadow">
                <th className="px-4 py-2 font-bold text-left">Reference Number</th>
                <th className="px-4 py-2 font-bold text-left">Name</th>
                <th className="px-4 py-2 font-bold text-left">Type</th>
                <th className="px-4 py-2 font-bold text-left">Address</th>
                <th className="px-4 py-2 font-bold text-left">Date</th>
                <th className="px-4 py-2 font-bold text-left">Time</th>
                <th className="px-4 py-2 font-bold text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <tr key={report.id} className="border-b hover:bg-gray-50 text-sm">
                    {/* Reference Number Column */}
                    <td className="py-3 px-4">
                      <div
                        className="inline-flex items-center bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden"
                        title="Click REF to copy"
                      >
                        <span className="px-2 py-1 bg-gray-100 text-[10px] font-bold text-gray-500 border-r border-gray-300">
                          REF
                        </span>
                        <button
                          onClick={() => navigator.clipboard.writeText(report.refCode)}
                          className="px-2 py-1 font-mono text-xs text-gray-800 hover:bg-blue-50 hover:text-blue-700 active:bg-blue-100 transition-colors"
                        >
                          {report.refCode}
                        </button>
                      </div>
                    </td>

                    {/* Name Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <FaUser className="text-gray-400 mr-2 text-xs" />
                        <div>
                          <div className="font-medium">
                            {report.userDetails?.firstName} {report.userDetails?.lastName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type Column */}
                    <td className="py-3 px-4 text-gray-700 font-medium">
                      {getInfrastructureType(report)}
                    </td>

                    {/* Address Column */}
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <FaMapMarkerAlt className="text-gray-400 mr-1 text-xs" />
                        <span className="text-gray-700 text-xs font-medium">
                          {report.address || "-"}
                        </span>
                      </div>
                    </td>

                    {/* Date Column */}
                    <td className="py-3 px-4 text-xs">
                      {formatDate(report.uploadedAt)}
                    </td>

                    {/* Time Column */}
                    <td className="py-3 px-4 text-xs">
                      {formatTime(report.uploadedAt)}
                    </td>

                    {/* Status Column */}
                    <td className="py-3 px-4">
                      {/* Using div instead of button since dashboard is view-only, but keeping style */}
                      <div className="flex items-center">
                        {report.status === "Pending" && (
                          <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <RiHourglassFill className="mr-1" /> Pending
                          </span>
                        )}
                        {report.status === "Withdrawn" && (
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <MdPending className="mr-1" /> Withdrawn
                          </span>
                        )}
                        {report.status === "Resolved" && (
                          <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                            <FaCheckCircle className="mr-1" /> Resolved
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-gray-500 italic">
                    No recent reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const StatCard = ({ title, value, bgColor, color, icon }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 min-h-[140px] flex items-center justify-between border border-gray-100">
      
      {/* Left Content */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {title}
        </h3>

        <p className={`text-3xl font-bold mt-2 ${color}`}>
          {value}
        </p>
      </div>

      {/* Icon */}
      <div className={`p-4 rounded-xl ${bgColor}`}>
        {icon}
      </div>
    </div>
  );
}