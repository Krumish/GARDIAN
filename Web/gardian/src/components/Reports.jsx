import { useState, useEffect } from "react";
import { collectionGroup, collection, onSnapshot, doc, getDoc, updateDoc, query, where } from "firebase/firestore";
import { db, auth, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import ReportDetailsModal from './ReportDetailsModal';
import ResolveReportModal from './ResolveReportModal';
import { generatePDF, generateCSV, generateDOCX } from './ReportGenerate';

// Icons
import { TbReportOff } from "react-icons/tb";
import { FaFilePdf } from "react-icons/fa";
import { FaUsers } from "react-icons/fa";
import { FaClockRotateLeft } from "react-icons/fa6";
import { RiHourglassFill } from "react-icons/ri";
import { MdAssignment } from "react-icons/md";
import { FaCheckCircle, FaSearch, FaMapMarkerAlt, FaUser } from "react-icons/fa";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [resolvedImage, setResolvedImage] = useState(null)
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("dataDesc");
  const handleViewReport = (report) => setSelectedReport(report);

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
        allReports.sort((a, b) => {
        const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(0);
        const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(0);
        return dateB - dateA;
      });
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
  return report.issueType || "Unknown";
};

  // Filtered reports based on search
  const filteredReports = reports
  .filter((r) => {
    // Search filter
    const searchText = search.toLowerCase();
    return (
      (r.id || "").toLowerCase().includes(searchText) ||
      (r.userDetails?.firstName || "").toLowerCase().includes(searchText) ||
      (r.userDetails?.lastName || "").toLowerCase().includes(searchText) ||
      (r.userDetails?.barangay || "").toLowerCase().includes(searchText) ||
      (r.status || "").toLowerCase().includes(searchText) ||
      getInfrastructureType(r).toLowerCase().includes(searchText)
    );
    })
    .filter((r) => {
      // Status filter
      return statusFilter ? r.status === statusFilter: true
    })
      
    .filter((r) => {
      // Type filter
       return typeFilter ? getInfrastructureType(r)?.trim() === typeFilter: true;
      })

    .sort((a, b) => {
      if (sortBy === "dateDesc") {
        return (b.uploadedAt?.toDate?.() || 0) - (a.uploadedAt?.toDate?.() || 0);
      } else if (sortBy === "dateAsc") {
        return (a.uploadedAt?.toDate?.() || 0) - (b.uploadedAt?.toDate?.() || 0);
      } else if (sortBy === "nameAsc") {
        return (a.userDetails?.firstName || "").localeCompare(b.userDetails?.firstName || "");
      } else if (sortBy === "nameDesc") {
        return (b.userDetails?.firstName || "").localeCompare(a.userDetails?.firstName || "");
    }
    return 0;
    });


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


 // Generate function

 // PDF
const handleGeneratePDF = () => {
  generatePDF(reports, startDate, endDate);
};

 // CSV
const handleExportCSV = () => {
  generateCSV(reports, startDate, endDate);
};

 // DOC
const handleExportDOC = () => {
  generateDOCX(reports, startDate, endDate);
};

  // Update report status
  const handleUpdateStatus = async () => {
    if (!showStatusModal || !newStatus) return;

    // If trying to resolve, open the systematic modal instead
    if (newStatus === "Resolved") {
      setShowResolveModal(showStatusModal);
      setShowStatusModal(null);
      setNewStatus("");
      return;
    }

    // For Pending and Withdrawn, update directly
    try {
      const reportDoc = showStatusModal.docRef?.id
        ? showStatusModal.docRef
        : doc(db, "users", showStatusModal.userId, "uploads", showStatusModal.id);

      await updateDoc(reportDoc, {
        status: newStatus,
      });

      alert("✅ Report status updated successfully!");
      setShowStatusModal(null);
      setNewStatus("");
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Failed to update status. Check console for details.");
    }
  };

    // Handle successful resolution
  const handleResolutionSuccess = () => {
    setShowResolveModal(null);
    console.log("✅ Report resolved successfully!");
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending */}
        <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
          <h3 className="text-sm text-gray-500">Pending</h3>
          <div className="flex items-center mt-2 text-orange-500">
            <RiHourglassFill className="mr-2" />
            <p className="text-2xl font-bold">
              {reports.filter((r) => r.status === "Pending").length}
            </p>
          </div>
        </div>

        {/* Withdrawn */}
        <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
          <h3 className="text-sm text-gray-500">Withdrawn</h3>
          <div className="flex items-center mt-2 text-gray-500">
            <TbReportOff className="mr-2" />
            <p className="text-2xl font-bold">
              {reports.filter((r) => r.status === "Withdrawn").length}
            </p>
          </div>
        </div>

        {/* Resolved */}
        <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
          <h3 className="text-sm text-gray-500">Resolved</h3>
          <div className="flex items-center mt-2 text-green-500">
            <FaClockRotateLeft className="mr-2" />
            <p className="text-2xl font-bold">
              {reports.filter((r) => r.status === "Resolved").length}
            </p>
          </div>
        </div>

        {/* Total Reports */}
        <div className="bg-white border rounded-xl p-6 shadow hover:shadow-lg transition">
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

          <div className="flex items-center gap-3">

            <div className="flex items-center gap-3">

      {/* Status Filter */}
       <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2"
       >
          <option value="">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Resolved">Resolved</option>
          <option value="Withdrawn">Withdrawn</option>
        </select>

        {/* Type Filter */}
          <select
            value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="">All Types</option>
            <option value="Drainage">Drainage</option>
            <option value="Road Markings">Road Markings</option>
            <option value="Road Surface">Road Surface</option>
            <option value="Waste Management">Waste Management</option>
        </select>

        {/* Sort */}
          <select
           value={sortBy}
           onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="dateDesc">Date ↓</option>
            <option value="dateAsc">Date ↑</option>
            <option value="nameAsc">Name A-Z</option>
            <option value="nameDesc">Name Z-A</option>
         </select>
        </div>

        {/* Search Bar */}
            <div className="relative w-48 sm:w-64">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports..."
                className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

        {/* Generate PDF Button */}
            <button
              className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              onClick={() => setShowReportModal(true)}
            >
              <FaFilePdf className="mr-2" /> Generate Report
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-y-auto max-h-[calc(100vh-4rem)]">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 sticky top-0 z-10 bg-white shadow">
                <th className="px-4 py-2 font-bold">Report ID</th>
                <th className="px-4 py-2 font-bold">Name</th>
                <th className="px-4 py-2 font-bold">Type</th>
                <th className="px-4 py-2 font-bold">Address</th>
                <th className="px-4 py-2 font-bold">Date</th>
                <th className="px-4 py-2 font-bold">Time</th>
                <th className="px-4 py-2 font-bold">Status</th>
                <th className="px-4 py-2 font-bold">Actions</th>
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

                  <td className="py-3 px-4 text-gray-700 font-medium">
                     {report.issueType || "Unknown"}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="text-gray-400 mr-1 text-xs" />
                        <span className="text-gray-700 text-xs font-medium">
                        {report.address || "-"}
                        </span>
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
                      onClick={() => handleViewReport(report)}
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

         {/* Generate Report Modal */}
{showReportModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
      <h3 className="text-xl font-bold mb-4">Generate Monthly Report</h3>

      <div className="space-y-4">
        {/* Start Date */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Start Date</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">End Date</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        {/* Cancel */}
        <button
          className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
          onClick={() => setShowReportModal(false)}
        >
          Cancel
        </button>

        {/* Export Dropdown */}
        <div className="relative inline-block text-left">
          <button className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">
            Export As
          </button>

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                handleGeneratePDF();
                setShowReportModal(false);
              }}
            >
              PDF
            </button>

            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                handleExportCSV();
                setShowReportModal(false);
              }}
            >
              CSV
            </button>

            <button
              className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              onClick={() => {
                handleExportDOC();
                setShowReportModal(false);
              }}
            >
              DOCX
            </button>
          </div>
        </div>
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
              <option value="Resolved">Resolved (Opens Resolution Form)</option>
            </select>
            
            {newStatus === "Resolved" && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ℹ️ Clicking "Update" will open a systematic resolution form
                </p>
              </div>
            )}

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

      {/* NEW: Systematic Resolve Report Modal */}
      {showResolveModal && (
        <ResolveReportModal
          report={showResolveModal}
          onClose={() => setShowResolveModal(null)}
          onSuccess={handleResolutionSuccess}
        />
      )}

      {/* View Details Modal */}
      {selectedReport && (
        <ReportDetailsModal
          selectedReport={selectedReport}
          onClose={() => setSelectedReport(null)}
          formatDate={(ts) => ts.toDate().toLocaleDateString()}
          formatTime={(ts) => ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        />
      )}
    </div>
  );
}
