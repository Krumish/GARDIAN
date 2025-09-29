import { FaCheckCircle, FaSearch } from "react-icons/fa";
import { RiHourglassFill } from "react-icons/ri";
import { MdPending } from "react-icons/md";
import { useState } from "react";

export default function Reports() {
  // Sample reports data (added images)
  const [reports] = useState([
    {
      id: 1,
      name: "Juan Del Herrera",
      location: "San Roque",
      date: "2025-09-01",
      time: "10:30 AM",
      assigned: "Officer Reyes",
      status: "Pending",
      type: "Pothole",
      image: "https://via.placeholder.com/400x250.png?text=Pothole+Report",
    },
    {
      id: 2,
      name: "Maria Mendieta",
      location: "San Juan",
      date: "2025-09-02",
      time: "02:15 PM",
      assigned: "Officer Cruz",
      status: "In Progress",
      type: "Drainage",
      image: "https://via.placeholder.com/400x250.png?text=Drainage+Report",
    },
    {
      id: 3,
      name: "Pedro Sy",
      location: "San Andres",
      date: "2025-09-03",
      time: "09:45 AM",
      assigned: "Officer Dizon",
      status: "Resolved",
      type: "Streetlight",
      image: "https://via.placeholder.com/400x250.png?text=Streetlight+Report",
    },
  ]);

  // Search filter
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null); // for modal

  const filteredReports = reports.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
          <h3 className="text-sm text-gray-500">Total Reports</h3>
          <p className="text-3xl font-bold mt-2">{reports.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
          <h3 className="text-sm text-gray-500">Pending</h3>
          <div className="flex items-center mt-2 text-red-500">
            <MdPending className="mr-2" />
            <p className="text-2xl font-bold">
              {reports.filter((r) => r.status === "Pending").length}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
          <h3 className="text-sm text-gray-500">In Progress</h3>
          <div className="flex items-center mt-2 text-yellow-500">
            <RiHourglassFill className="mr-2" />
            <p className="text-2xl font-bold">
              {reports.filter((r) => r.status === "In Progress").length}
            </p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
          <h3 className="text-sm text-gray-500">Resolved</h3>
          <div className="flex items-center mt-2 text-green-500">
            <FaCheckCircle className="mr-2" />
            <p className="text-2xl font-bold">
              {reports.filter((r) => r.status === "Resolved").length}
            </p>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">All Reports</h2>

          {/* Search with icon */}
          <div className="relative w-full sm:w-1/3">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Reports Table */}
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
                <th className="py-3 px-4">Assigned Officer</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b hover:bg-gray-50 text-sm cursor-pointer"
                  onClick={() => setSelectedReport(report)} // open modal
                >
                  <td className="py-3 px-4">{report.id}</td>
                  <td className="py-3 px-4">{report.name}</td>
                  <td className="py-3 px-4">{report.type}</td>
                  <td className="py-3 px-4">{report.location}</td>
                  <td className="py-3 px-4">{report.date}</td>
                  <td className="py-3 px-4">{report.time}</td>
                  <td className="py-3 px-4">{report.assigned}</td>
                  <td className="py-3 px-4">
                    {report.status === "Pending" && (
                      <span className="text-red-500 flex items-center">
                        <MdPending className="mr-1" /> Pending
                      </span>
                    )}
                    {report.status === "In Progress" && (
                      <span className="text-yellow-500 flex items-center">
                        <RiHourglassFill className="mr-1" /> In Progress
                      </span>
                    )}
                    {report.status === "Resolved" && (
                      <span className="text-green-500 flex items-center">
                        <FaCheckCircle className="mr-1" /> Resolved
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="text-center py-4 text-gray-500 italic"
                  >
                    No reports found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for report preview */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedReport(null)}
            >
              ✕
            </button>
            <h3 className="text-xl font-bold mb-2">
              Report #{selectedReport.id} - {selectedReport.type}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Reported by {selectedReport.name} from{" "}
              {selectedReport.location} on {selectedReport.date} at{" "}
              {selectedReport.time}
            </p>
            <img
              src={selectedReport.image}
              alt={selectedReport.type}
              className="rounded-lg border border-gray-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}
