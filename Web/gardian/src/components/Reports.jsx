import { useState, useEffect } from "react";
import { collectionGroup, collection, onSnapshot, doc, getDoc, updateDoc, query, where } from "firebase/firestore";
import { db, auth, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable"; 

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
  const [newStatus, setNewStatus] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [resolvedImage, setResolvedImage] = useState(null)

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

  // PDF generation function
  const handleGeneratePDF = () => {
    if (!selectedMonth || !selectedYear) {
      alert("Please select a month and year before generating the report.");
      return;
    }

    const doc = new jsPDF();
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];

    // filtered reports
    const filtered = reports.filter((r) => {
      if (!r.uploadedAt?.toDate) return false;
      const date = r.uploadedAt.toDate();
      return (
        date.getMonth() + 1 === parseInt(selectedMonth) &&
        date.getFullYear() === parseInt(selectedYear)
      );
    });

    if (filtered.length === 0) {
      alert("No reports found for the selected month/year.");
      return;
    }

    filtered.sort((a, b) => {
    const dateA = a.uploadedAt?.toDate ? a.uploadedAt.toDate() : new Date(0);
    const dateB = b.uploadedAt?.toDate ? b.uploadedAt.toDate() : new Date(0);
    return dateB - dateA; // newest first
    });


    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(`Monthly Report - ${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`, 14, 20);
    
    // Generation date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    // Summary table
    const summary = [
      ["Total Reports", filtered.length],
      ["Pending", filtered.filter((r) => r.status === "Pending").length],
      ["Withdrawn", filtered.filter((r) => r.status === "Withdrawn").length],
      ["Resolved", filtered.filter((r) => r.status === "Resolved").length],
      ["Drainage Reports", filtered.filter((r) => r.yolo?.drainage_count > 0).length],
    ];

    autoTable(doc, {
      head: [["Metric", "Count"]],
      body: summary,
      startY: 35,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] }
    });

    // Detailed reports table
    const tableData = filtered.map((r) => [
      r.id.substring(0, 8) + "...",
      `${r.userDetails?.firstName || ""} ${r.userDetails?.lastName || ""}`.trim() || "-",
      getInfrastructureType(r),
      r.userDetails?.barangay || "-",
      r.status || "Pending",
      r.uploadedAt?.toDate().toLocaleDateString() || "-",
      r.uploadedAt?.toDate().toLocaleTimeString() || "-",
    ]);

    autoTable(doc, {
      head: [["ID", "Reporter", "Type", "Barangay", "Status", "Date", "Time"]],
      body: tableData,
      startY: doc.lastAutoTable.finalY + 10,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 }
    });

    // Save PDF
    doc.save(`Report_${monthNames[parseInt(selectedMonth) - 1]}_${selectedYear}.pdf`);
  };

  // Update report status
  const handleUpdateStatus = async () => {
  if (!showStatusModal || !newStatus) return;

  try {
    // If marking as Resolved, require image upload
    let resolvedImageUrl = null;

    if (newStatus === "Resolved") {
      if (!resolvedImage) {
        alert("Please upload a resolved image before marking as resolved.");
        return;
      }

      // Upload image to Firebase Storage
      const storageRef = ref(
        storage,
        `resolved_images/${showStatusModal.id}_${Date.now()}.jpg`
      );
      await uploadBytes(storageRef, resolvedImage);
      resolvedImageUrl = await getDownloadURL(storageRef);
    }

    // Get a valid doc reference (sometimes modal stores plain data)
    const reportDoc =
      showStatusModal.docRef?.id
        ? showStatusModal.docRef
        : doc(db, "users", showStatusModal.userId, "uploads", showStatusModal.id);

    // Update Firestore
    const updateData = {
      status: newStatus,
    };

    if (resolvedImageUrl) {
      updateData.resolvedImage = resolvedImageUrl;
      updateData.resolvedAt = new Date();
    }

    await updateDoc(reportDoc, updateData);

    alert("✅ Report status updated successfully!");
    setShowStatusModal(null);
    setNewStatus("");
    setResolvedImage(null);
  } catch (err) {
    console.error("Error updating status:", err);
    alert("Failed to update status. Check console for details.");
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

          <div className="flex items-center gap-3">
            {/* Generate PDF Button */}
            <button
              className="flex items-center bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              onClick={() => setShowReportModal(true)}
            >
              <FaFilePdf className="mr-2" /> Generate Report
            </button>

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
                <th className="py-3 px-4">Address</th>
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

                  <td className="py-3 px-4 text-gray-700">
                    {report.yolo?.drainage_count > 0
                    ? "Drainage" 
                    : report.yolo?.pothole_count > 0
                    ? "Pothole"
                    : report.yolo?.road_surface_count > 0
                    ? "Road Surface"
                    : "Unkown" }
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

      {/* 📄 Generate Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Generate Monthly Report</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Month</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  <option value="">Select Month</option>
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December",
                  ].map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Year</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {[2024, 2025, 2026].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="bg-gray-300 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
                onClick={() => setShowReportModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                onClick={() => {
                  handleGeneratePDF();
                  setShowReportModal(false);
                }}
              >
                Generate PDF
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
            
            {newStatus === "Resolved" && (
  <div className="mb-4">
    <label className="block text-sm text-gray-600 mb-2">
      Upload updated image (required)
    </label>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => setResolvedImage(e.target.files[0])}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
    />
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
                      <span className="text-gray-500">Address:</span>
                      <span className="ml-2 font-medium">
                       {selectedReport.address || "-"}
                     </span>
                    </div>
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

              {/* Original Image */}
              {selectedReport.url ? (
               <div>
                 <p p className="text-sm text-gray-600 mb-2 font-medium">Original Image</p>
                <img
                src={selectedReport.url}
                 alt="Original"
                 className="rounded-lg border border-gray-200 w-full"
              />
             </div>
             ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-400">
               No original image available
            </div>
             )}
             {/* Annotated Image */}
              <div className="space-y-4">
              {selectedReport.annotatedUrl ? (
               <div>
                  <p className="text-sm text-gray-600 mb-2 font-medium">Annotated Image</p>
                  <img
                  src={selectedReport.annotatedUrl}
                  alt="Annotated"
                  className="rounded-lg border border-gray-200 w-full"
                />
                </div>
                ) : (
              <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-400">
                No annotated image available
              </div>
              )}
            {/* Resolved Image */}
              {selectedReport.resolvedImage ? (
              <div className="mt-4">
               <p className="text-sm text-gray-600 mb-2 font-medium">Resolved Image</p>
              <img
              src={selectedReport.resolvedImage}
             alt="Resolved"
             className="rounded-lg border border-gray-200 w-full"
            />
            </div>
            ) : null} 
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}