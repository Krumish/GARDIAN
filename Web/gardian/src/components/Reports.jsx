import { useState, useEffect } from "react";
import { FaCheckCircle, FaSearch, FaMapMarkerAlt, FaUser } from "react-icons/fa";
import { RiHourglassFill } from "react-icons/ri";
import { MdAssignment } from "react-icons/md";
import { FaClockRotateLeft } from "react-icons/fa6";
import { collectionGroup, onSnapshot, doc, getDoc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { TbReportOff } from "react-icons/tb";
import { FaUsers } from "react-icons/fa";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(null);
  const [officerName, setOfficerName] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // Fetch all uploads across all users in real-time
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.error("❌ Cannot query - no authenticated user");
      return;
    }

    const uploadsQuery = collectionGroup(db, "uploads");

    const unsubscribe = onSnapshot(
      uploadsQuery,
      async (snapshot) => {
        const allReports = await Promise.all(
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
              docRef: uploadDoc.ref,
              ...uploadDoc.data(),
            };
          })
        );
        setReports(allReports);
      },
      (error) => {
        console.error("❌ Error fetching uploads:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Determine infrastructure type based on yolo data
  const getInfrastructureType = (report) => {
    if (report.yolo?.drainage_count > 0) return "Drainage";
    // Add more logic here for other types when available
    return "Invalid";
  };

  // Filtered reports based on search
  const filteredReports = reports.filter(
    (r) =>
      (r.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.userDetails?.firstName || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.userDetails?.lastName || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.userDetails?.barangay || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.status || "").toLowerCase().includes(search.toLowerCase()) ||
      getInfrastructureType(r).toLowerCase().includes(search.toLowerCase())
  );

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

  // Update report status
  const handleUpdateStatus = async () => {
    if (!showStatusModal || !newStatus) return;
    
    try {
      await updateDoc(showStatusModal.docRef, {
        status: newStatus
      });
      setShowStatusModal(null);
      setNewStatus("");
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

  {/* Summary Cards */}
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  {/* Pending */}
  <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
    <h3 className="text-sm text-gray-500">Pending</h3>
    <div className="flex items-center mt-2 text-orange-500">
      <RiHourglassFill className="mr-2" />
      <p className="text-2xl font-bold">
        {reports.filter((r) => r.status === "Pending").length}
      </p>
    </div>
  </div>

  {/* Withdrawn */}
  <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
    <h3 className="text-sm text-gray-500">Withdrawn</h3>
    <div className="flex items-center mt-2 text-gray-500">
      <TbReportOff className="mr-2" />
      <p className="text-2xl font-bold">
        {reports.filter((r) => r.status === "Withdrawn").length}
      </p>
    </div>
  </div>

  {/* Resolved */}
  <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
    <h3 className="text-sm text-gray-500">Resolved</h3>
    <div className="flex items-center mt-2 text-green-500">
      <FaClockRotateLeft className="mr-2" />
      <p className="text-2xl font-bold">
        {reports.filter((r) => r.status === "Resolved").length}
      </p>
    </div>
  </div>

  {/* Total Reports */}
  <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
    <h3 className="text-sm text-gray-500">Total Reports</h3>
    <div className="flex items-center mt-2 text-blue-500">
      <FaUsers className="mr-2 w-6 h-6" />
      <p className="text-3xl font-bold">{reports.length}</p>
    </div>
  </div>
</div>

      {/* Reports Section */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">All Reports</h2>

          {/* Search */}
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
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b hover:bg-gray-50 text-sm"
                >
                  <td className="py-3 px-4">
                    <button
                      className="font-mono text-xs text-gray-700 hover:text-blue-600 underline"
                      onClick={() => alert(`Full Report ID:\n${report.id}`)}
                    >
                      {report.id.substring(0, 8)}...
                    </button>
                  </td>
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
                  <td className="py-3 px-4">
                    <span className="text-gray-700 text-xs font-medium">
                      {getInfrastructureType(report)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="text-gray-400 mr-1 text-xs" />
                      {report.userDetails?.barangay || "-"}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {formatDate(report.uploadedAt)}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {formatTime(report.uploadedAt)}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      className="flex items-center cursor-pointer"
                      onClick={() => setShowStatusModal(report)}
                    >
                      {report.status === "Pending" && (
                        <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                          <RiHourglassFill className="mr-1" /> Pending
                        </span>
                      )}
                      {report.status === "Withdrawn" && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                          <MdAssignment className="mr-1" /> Withdrawn
                        </span>
                      )}
                      {report.status === "Resolved" && (
                        <span className="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                          <FaCheckCircle className="mr-1" /> Resolved
                        </span>
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 transition"
                      onClick={() => setSelectedReport(report)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filteredReports.length === 0 && (
                <tr>
                  <td
                    colSpan="9"
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

      {/* Assign Officer Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Assign Officer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Report ID: {showAssignModal.id.substring(0, 12)}...
            </p>
            <input
              type="text"
              placeholder="Enter officer name"
              className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-4"
              value={officerName}
              onChange={(e) => setOfficerName(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                onClick={() => {
                  setShowAssignModal(null);
                  setOfficerName("");
                }}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                onClick={handleAssignOfficer}
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Update Status</h3>
            <p className="text-sm text-gray-600 mb-4">
              Report ID: {showStatusModal.id.substring(0, 12)}...
            </p>
            <p className="text-sm text-gray-600 mb-4">
              Current Status: <span className="font-semibold">{showStatusModal.status}</span>
            </p>
            <select
              className="border border-gray-300 rounded-lg px-4 py-2 w-full mb-4"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <option value="">Select new status</option>
              <option value="Pending">Pending</option>
              <option value="Withdrawn">Withdrawn</option>
              <option value="Resolved">Resolved</option>
            </select>
            <div className="flex gap-2">
              <button
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                onClick={() => {
                  setShowStatusModal(null);
                  setNewStatus("");
                }}
              >
                Cancel
              </button>
              <button
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                onClick={handleUpdateStatus}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-2xl"
              onClick={() => setSelectedReport(null)}
            >
              ✕
            </button>
            
            <h3 className="text-2xl font-bold mb-4">Report Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Info */}
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                    <FaUser className="mr-2" /> Reporter Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-2 font-medium">
                        {selectedReport.userDetails?.firstName} {selectedReport.userDetails?.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Phone:</span>
                      <span className="ml-2 font-medium">
                        {selectedReport.userDetails?.phone}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2 font-medium">
                        {selectedReport.userDetails?.email || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Barangay:</span>
                      <span className="ml-2 font-medium">
                        {selectedReport.userDetails?.barangay}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    📍 Location
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Latitude:</span>
                      <span className="ml-2 font-mono text-xs">
                        {selectedReport.latitude?.toFixed(6)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Longitude:</span>
                      <span className="ml-2 font-mono text-xs">
                        {selectedReport.longitude?.toFixed(6)}
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                    >
                      View on Map
                    </a>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    🔍 Detection Results
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-medium">
                        {getInfrastructureType(selectedReport)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Drainage Status:</span>
                      <span className={`ml-2 font-bold ${selectedReport.yolo?.status === "Clogged" ? "text-red-600" : "text-green-600"}`}>
                        {selectedReport.yolo?.status || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Drainages Detected:</span>
                      <span className="ml-2 font-medium">
                        {selectedReport.yolo?.drainage_count || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Obstructions Found:</span>
                      <span className="ml-2 font-medium text-orange-600">
                        {selectedReport.yolo?.obstruction_count || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-3">
                    📋 Report Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <span className="ml-2 font-medium">
                        {selectedReport.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-2 text-xs">
                        {formatDate(selectedReport.uploadedAt)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Time:</span>
                      <span className="ml-2 text-xs">
                        {formatTime(selectedReport.uploadedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Images */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">
                    📷 Report Image
                  </h4>
                  
                  {selectedReport.url ? (
                    <img
                      src={selectedReport.url}
                      alt="Report"  
                      className="rounded-lg border border-gray-200 w-full"
                    />
                  ) : (
                    <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-400">
                      No image available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}