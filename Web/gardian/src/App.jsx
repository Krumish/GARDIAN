import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

// Components
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MonthlyReportChart from "./components/MonthlyReportChart";
import Analytics from "./components/Analytics";
import Reports from "./components/Reports";
import CitizenFeedback from "./components/CitizenFeedback";
import Login from "./components/Login";
import Signup from "./components/Signup";
import { FaCheckCircle, FaClipboardList } from "react-icons/fa";
import { BsGraphUpArrow } from "react-icons/bs";
import { RiHourglassFill } from "react-icons/ri";
import { MdPending } from "react-icons/md";

export default function App() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen text-xl font-semibold">
        Loading...
      </div>
    );

  // Sample recent reports
  const recentReports = [
    {
      name: "Juan Del Herrera",
      location: "San Roque",
      date: "2025-09-01",
      time: "10:30 AM",
      assigned: "Officer Reyes",
      status: "Pending",
    },
    {
      name: "Maria Mendieta",
      location: "San Juan",
      date: "2025-09-02",
      time: "02:15 PM",
      assigned: "Officer Cruz",
      status: "In Progress",
    },
    {
      name: "Pedro Sy",
      location: "San Andres",
      date: "2025-09-03",
      time: "09:45 AM",
      assigned: "Officer Dizon",
      status: "Resolved",
    },
  ];

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
  return (
    <>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard title="New Reports" value="24" icon={<BsGraphUpArrow className="text-blue-500 w-8 h-8" />} />
        <StatCard title="In Progress" value="12" icon={<RiHourglassFill className="text-yellow-500 w-8 h-8" />} />
        <StatCard title="Total Resolved" value="87" icon={<FaCheckCircle className="text-green-500 w-8 h-8" />} />
        <StatCard title="Total Reports" value="123" icon={<FaClipboardList className="text-purple-500 w-8 h-8" />} />
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
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Assigned to</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((report, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50 text-sm">
                  <td className="py-3 px-4">{report.name}</td>
                  <td className="py-3 px-4">{report.location}</td>
                  <td className="py-3 px-4">{report.date}</td>
                  <td className="py-3 px-4">{report.time}</td>
                  <td className="py-3 px-4">{report.assigned}</td>
                  <td className="py-3 px-4">
                    {report.status === "Pending" && <StatusBadge type="pending" />}
                    {report.status === "In Progress" && <StatusBadge type="inprogress" />}
                    {report.status === "Resolved" && <StatusBadge type="resolved" />}
                  </td>
                </tr>
              ))}
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
        <span className="flex items-center text-red-500">
          <MdPending className="mr-1" /> Pending
        </span>
      );
    case "inprogress":
      return (
        <span className="flex items-center text-yellow-500">
          <RiHourglassFill className="mr-1" /> In Progress
        </span>
      );
    case "resolved":
      return (
        <span className="flex items-center text-green-500">
          <FaCheckCircle className="mr-1" /> Resolved
        </span>
      );
    default:
      return null;
  }
}
