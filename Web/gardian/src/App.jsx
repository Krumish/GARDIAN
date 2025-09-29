import { Routes, Route } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import ReportChart from "./components/ReportChart";
import Analytics from "./components/Analytics";
import Reports from "./components/Reports";
import CitizenFeedback from "./components/CitizenFeedback";
import { FaCheckCircle, FaClipboardList } from "react-icons/fa";
import { BsGraphUpArrow } from "react-icons/bs";
import { RiHourglassFill } from "react-icons/ri";
import { MdPending } from "react-icons/md";

export default function App() {
  // Sample recent reports for dashboard
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
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <Topbar />

        <main className="flex-1 p-6 overflow-y-auto">
          <Routes>
            {/* Dashboard */}
            <Route
              path="/"
              element={
                <>
                  <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

                  {/* Stats Cards Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {/* New Reports */}
                    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-medium text-gray-500">
                          New Reports
                        </h3>
                        <BsGraphUpArrow className="text-blue-500 w-8 h-8" />
                      </div>
                      <p className="text-3xl font-bold text-gray-800">24</p>
                    </div>

                    {/* In Progress */}
                    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-medium text-gray-500">
                          In Progress
                        </h3>
                        <RiHourglassFill className="text-yellow-500 w-8 h-8" />
                      </div>
                      <p className="text-3xl font-bold text-gray-800">12</p>
                    </div>

                    {/* Total Resolved */}
                    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-medium text-gray-500">
                          Total Resolved
                        </h3>
                        <FaCheckCircle className="text-green-500 w-8 h-8" />
                      </div>
                      <p className="text-3xl font-bold text-gray-800">87</p>
                    </div>

                    {/* Total Reports */}
                    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-medium text-gray-500">
                          Total Reports
                        </h3>
                        <FaClipboardList className="text-purple-500 w-8 h-8" />
                      </div>
                      <p className="text-3xl font-bold text-gray-800">123</p>
                    </div>
                  </div>

                  {/* Chart Section */}
                  <div className="p-6 bg-white rounded-xl shadow mb-6">
                    <ReportChart />
                  </div>

                  {/* Recent Reports Table */}
                  <div className="p-6 bg-white rounded-xl shadow">
                    <h2 className="text-xl font-semibold mb-4">
                      Recent Reports
                    </h2>
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
                            <tr
                              key={idx}
                              className="border-b hover:bg-gray-50 text-sm"
                            >
                              <td className="py-3 px-4">{report.name}</td>
                              <td className="py-3 px-4">{report.location}</td>
                              <td className="py-3 px-4">{report.date}</td>
                              <td className="py-3 px-4">{report.time}</td>
                              <td className="py-3 px-4">{report.assigned}</td>
                              <td className="py-3 px-4">
                                {report.status === "Pending" && (
                                  <span className="flex items-center text-red-500">
                                    <MdPending className="mr-1" /> Pending
                                  </span>
                                )}
                                {report.status === "In Progress" && (
                                  <span className="flex items-center text-yellow-500">
                                    <RiHourglassFill className="mr-1" /> In
                                    Progress
                                  </span>
                                )}
                                {report.status === "Resolved" && (
                                  <span className="flex items-center text-green-500">
                                    <FaCheckCircle className="mr-1" /> Resolved
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              }
            />

            {/* Analytics Page */}
            <Route path="/analytics" element={<Analytics />} />

            {/* Reports Page */}
            <Route path="/reports" element={<Reports />} />

            {/* Feedback Page */}
            <Route path="/feedback" element={<CitizenFeedback />} />

          </Routes>
        </main>
      </div>
    </div>
  );
}
