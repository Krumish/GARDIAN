import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { FaClockRotateLeft } from "react-icons/fa6";
import { doc, getDoc, collectionGroup, onSnapshot, query, orderBy, limit } from "firebase/firestore";

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

// Icons
import { FaCheckCircle, FaClipboardList } from "react-icons/fa";
import { FaUsers } from "react-icons/fa";
import { TbReportOff } from "react-icons/tb";
import { RiHourglassFill } from "react-icons/ri";
import { MdPending } from "react-icons/md";

export default function App() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState([]);

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/signup";

  // Check Firebase auth & admin role
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().role === "admin") {
            setIsAuthenticated(true);
            setIsAdmin(true);
          } else {
            setIsAuthenticated(false);
            setIsAdmin(false);
            auth.signOut();
          }
        } catch (err) {
          console.error(err);
          setIsAuthenticated(false);
          setIsAdmin(false);
        }
      } else {
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch recent 5 reports
  useEffect(() => {
    const user = auth.currentUser;
    if (!user || !isAdmin) return;

    const uploadsQuery = query(
      collectionGroup(db, "uploads"),
      orderBy("uploadedAt", "desc"),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      uploadsQuery,
      async (snapshot) => {
        const reports = await Promise.all(
          snapshot.docs.map(async (uploadDoc) => {
            const userId = uploadDoc.ref.parent.parent?.id || "unknown";
            
            // Fetch user details
            let userDetails = null;
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                userDetails = userDoc.data();
              }
            } catch (err) {
              console.error("Error fetching user details:", err);
            }

            return {
              id: uploadDoc.id,
              userId,
              userDetails,
              ...uploadDoc.data(),
            };
          })
        );
        setRecentReports(reports);
      },
      (error) => {
        console.error("❌ Error fetching recent reports:", error);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl font-semibold">
        Loading...
      </div>
    );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      {!isAuthPage && <Sidebar />}

      <div className="flex-1 flex flex-col">
        {/* Topbar fixed at the top */}
        {!isAuthPage && (
          <div className="sticky top-0 z-50">
            <Topbar />
          </div>
        )}

        {/* Main scrollable content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            {/* Dashboard */}
            <Route
              path="/"
              element={
                isAuthenticated && isAdmin ? (
                  <Dashboard recentReports={recentReports} />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Auth Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Other Pages */}
            <Route
              path="/analytics"
              element={isAdmin ? <Analytics /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/reports"
              element={isAdmin ? <Reports /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/usermanagement"
              element={isAdmin ? <UserManagement /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/feedback"
              element={isAdmin ? <CitizenFeedback /> : <Navigate to="/login" replace />}
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ---------------- Dashboard Component ----------------
function Dashboard({ recentReports }) {
  // Helper to format date
  const formatDate = (ts) => {
    if (!ts) return "-";
    if (ts.toDate) {
      const date = ts.toDate();
      return date.toLocaleDateString();
    }
    return ts;
  };

  // Helper to format time
  const formatTime = (ts) => {
    if (!ts) return "-";
    if (ts.toDate) {
      const date = ts.toDate();
      return date.toLocaleTimeString();
    }
    return ts;
  };

  // Determine infrastructure type based on yolo data
  const getInfrastructureType = (report) => {
    if (report.yolo?.drainage_count > 0) return "Drainage";
    return "Unknown";
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="Pending" value="24" icon={<RiHourglassFill className="text-orange-500 w-8 h-8" />} />
        <StatCard title="Withdrawn" value="12" icon={<TbReportOff className="text-gray-500 w-8 h-8" />} />
        <StatCard title="Resolved" value="87" icon={<FaClockRotateLeft className="text-green-500 w-8 h-8" />} />
        <StatCard title="Total Reports" value="123" icon={<FaUsers className="text-blue-500 w-8 h-8" />} />
      </div>

      {/* Chart */}
      <div className="p-6 bg-white rounded-xl shadow mb-6">
        <MonthlyReportChart />
      </div>

      {/* Recent Reports Table */}
      <div className="p-6 bg-white rounded-xl shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Reports</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-gray-600 text-sm border-b">
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.length > 0 ? (
                recentReports.map((report) => (
                  <tr key={report.id} className="border-b hover:bg-gray-50 text-sm">
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-gray-700">
                        {report.id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {report.userDetails?.firstName} {report.userDetails?.lastName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-700 text-xs font-medium">
                        {getInfrastructureType(report)}
                      </span>
                    </td>
                    <td className="py-3 px-4">{report.userDetails?.barangay || "-"}</td>
                    <td className="py-3 px-4 text-xs">{formatDate(report.uploadedAt)}</td>
                    <td className="py-3 px-4 text-xs">{formatTime(report.uploadedAt)}</td>
                    <td className="py-3 px-4">
                      {report.status === "Pending" && <StatusBadge type="pending" />}
                      {report.status === "Withdrawn" && <StatusBadge type="withdrawn" />}
                      {report.status === "Resolved" && <StatusBadge type="resolved" />}
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

// ---------------- Helper Components ----------------
function StatCard({ title, value, icon }) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        {icon}
      </div>
      <p className="text-3xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

function StatusBadge({ type }) {
  switch (type) {
    case "pending":
      return (
        <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit">
          <RiHourglassFill className="mr-1" /> Pending
        </span>
      );
    case "withdrawn":
      return (
        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit">
          <MdPending className="mr-1" /> Withdrawn
        </span>
      );
    case "resolved":
      return (
        <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium flex items-center w-fit">
          <FaCheckCircle className="mr-1" /> Resolved
        </span>
      );
    default:
      return null;
  }
}