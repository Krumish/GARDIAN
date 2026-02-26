import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, getDoc, query, orderBy, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { FaUserCircle, FaSearch, FaCommentDots, FaBug, FaLightbulb, FaStar, FaChartLine, FaEllipsisH, FaCalendarAlt, FaMapMarkerAlt, FaChevronDown, FaCheck } from "react-icons/fa";
import { MdCategory } from "react-icons/md";

export default function CitizenFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(null); 
  const [openDropdown, setOpenDropdown] = useState(null); 

  // Fetch feedback from Firebase in real-time
  useEffect(() => {
    const feedbackQuery = query(
      collection(db, "feedback"),
      orderBy("submittedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      feedbackQuery,
      async (snapshot) => {
        const allFeedback = await Promise.all(
          snapshot.docs.map(async (feedbackDoc) => {
            const feedbackData = feedbackDoc.data();
            const userId = feedbackData.userId;

            // Fetch user details
            let userDetails = null;
            if (userId) {
              try {
                const userDoc = await getDoc(doc(db, "users", userId));
                if (userDoc.exists()) {
                  userDetails = userDoc.data();
                }
              } catch (err) {
                console.error("Error fetching user details:", err);
              }
            }

            return {
              id: feedbackDoc.id,
              ...feedbackData,
              userDetails,
            };
          })
        );

        setFeedbacks(allFeedback);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Error fetching feedback:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Close dropdown 
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Update feedback status in Firestore
  const handleStatusChange = async (feedbackId, newStatus) => {
    setUpdatingStatus(feedbackId);
    setOpenDropdown(null);
    try {
      await updateDoc(doc(db, "feedback", feedbackId), {
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Get category icon and color
  const getCategoryIcon = (category) => {
    const icons = {
      "Bug Report": <FaBug className="text-red-600" />,
      "Feature Suggestion": <FaLightbulb className="text-yellow-600" />,
      "App Improvement": <FaStar className="text-blue-600" />,
      "Report Accuracy": <FaChartLine className="text-green-600" />,
      "Other": <FaEllipsisH className="text-gray-600" />,
    };
    return icons[category] || <FaCommentDots className="text-gray-600" />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      "Bug Report": "bg-red-50 text-red-800 border-red-200",
      "Feature Suggestion": "bg-yellow-50 text-yellow-800 border-yellow-200",
      "App Improvement": "bg-blue-50 text-blue-800 border-blue-200",
      "Report Accuracy": "bg-green-50 text-green-800 border-green-200",
      "Other": "bg-gray-50 text-gray-800 border-gray-200",
    };
    return colors[category] || "bg-gray-50 text-gray-800 border-gray-200";
  };

  const getStatusColor = (status) => {
    const colors = {
      "unread": "bg-orange-100 text-orange-700 border-orange-200",
      "read": "bg-blue-100 text-blue-700 border-blue-200",
      "resolved": "bg-green-100 text-green-700 border-green-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Status options for the dropdown
  const statusOptions = [
    { value: "unread", label: "Unread", color: "text-orange-600", dot: "bg-orange-400" },
    { value: "read", label: "Read", color: "text-blue-600", dot: "bg-blue-400" },
    { value: "resolved", label: "Resolved", color: "text-green-600", dot: "bg-green-400" },
  ];

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      if (timestamp.toDate) {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return new Date(timestamp).toLocaleDateString();
    } catch (error) {
      return "N/A";
    }
  };

  // Filtered feedbacks
  const filteredFeedbacks = feedbacks.filter((f) => {
    const searchText = search.toLowerCase();
    const matchesSearch =
      f.userDetails?.firstName?.toLowerCase().includes(searchText) ||
      f.userDetails?.lastName?.toLowerCase().includes(searchText) ||
      f.userDetails?.barangay?.toLowerCase().includes(searchText) ||
      f.category?.toLowerCase().includes(searchText) ||
      f.content?.toLowerCase().includes(searchText);

    const matchesCategory = categoryFilter ? f.category === categoryFilter : true;
    const matchesStatus = statusFilter ? f.status === statusFilter : true;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Category statistics
  const categoryStats = {
    "Bug Report": feedbacks.filter(f => f.category === "Bug Report").length,
    "Feature Suggestion": feedbacks.filter(f => f.category === "Feature Suggestion").length,
    "App Improvement": feedbacks.filter(f => f.category === "App Improvement").length,
    "Report Accuracy": feedbacks.filter(f => f.category === "Report Accuracy").length,
    "Other": feedbacks.filter(f => f.category === "Other").length,
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Citizen Feedback</h1>

   {/* Summary Cards */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

  <StatCard
    title="Bug Report"
    value={categoryStats["Bug Report"]}
    color="text-red-600"
    bgColor="bg-red-50"
    icon={<FaBug className="text-red-600 w-10 h-10" />}
  />

  <StatCard
    title="Feature"
    value={categoryStats["Feature Suggestion"]}
    color="text-yellow-600"
    bgColor="bg-yellow-50"
    icon={<FaLightbulb className="text-yellow-600 w-10 h-10" />}
  />

  <StatCard
    title="Improvement"
    value={categoryStats["App Improvement"]}
    color="text-blue-600"
    bgColor="bg-blue-50"
    icon={<FaStar className="text-blue-600 w-10 h-10" />}
  />

  <StatCard
    title="Accuracy"
    value={categoryStats["Report Accuracy"]}
    color="text-green-600"
    bgColor="bg-green-50"
    icon={<FaChartLine className="text-green-600 w-10 h-10" />}
  />

  <StatCard
    title="Other"
    value={categoryStats["Other"]}
    color="text-gray-600"
    bgColor="bg-gray-100"
    icon={<FaEllipsisH className="text-gray-600 w-10 h-10" />}
  />
</div>

      {/* Filters and Search */}
      <div className="bg-white border border-gray-200 rounded-xl shadow p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Feature Suggestion">Feature Suggestion</option>
              <option value="App Improvement">App Improvement</option>
              <option value="Report Accuracy">Report Accuracy</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search feedback..."
              className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-500 mt-4">Loading feedback...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((f) => (
            <div
              key={f.id}
              className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition p-5"
            >
              <div className="flex gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                    {f.userDetails?.firstName?.charAt(0).toUpperCase() || "U"}
                  </div>
                </div>

                {/* Feedback Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-base">
                        {f.userDetails?.firstName} {f.userDetails?.lastName}
                      </h3>
                      {f.userDetails?.barangay && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <FaMapMarkerAlt className="text-gray-400" />
                          {f.userDetails.barangay}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* ── Status Dropdown ── */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            setOpenDropdown(openDropdown === f.id ? null : f.id)
                          }
                          disabled={updatingStatus === f.id}
                          className={`
                            ${getStatusColor(f.status || "unread")}
                            flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border
                            hover:opacity-80 active:scale-95 transition-all duration-150
                            disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer
                          `}
                          title="Click to change status"
                        >
                          {updatingStatus === f.id ? (
                            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          ) : null}
                          {f.status || "unread"}
                          <FaChevronDown className="text-[10px] opacity-60" />
                        </button>

                        {/* Dropdown Menu */}
                        {openDropdown === f.id && (
                          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-36">
                            {statusOptions.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => handleStatusChange(f.id, option.value)}
                                className={`
                                  w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium
                                  hover:bg-gray-50 transition-colors
                                  ${(f.status || "unread") === option.value ? "bg-gray-50" : ""}
                                `}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${option.dot}`} />
                                  <span className={option.color}>{option.label}</span>
                                </div>
                                {(f.status || "unread") === option.value && (
                                  <FaCheck className="text-gray-400 text-[10px]" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Date */}
                      <span className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                        <FaCalendarAlt className="text-gray-400" />
                        {formatDate(f.submittedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Category Badge */}
                  <div className="mb-3">
                    <span className={`${getCategoryColor(f.category)} inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border`}>
                      {getCategoryIcon(f.category)}
                      {f.category}
                    </span>
                  </div>

                  {/* Feedback Content */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-800 leading-relaxed">
                      {f.content}
                    </p>
                  </div>

                  {/* User ID */}
                  <div className="mt-2 text-xs text-gray-400">
                    User ID: {f.userId?.substring(0, 12)}...
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredFeedbacks.length === 0 && (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-xl">
              <FaCommentDots className="mx-auto text-5xl text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">No feedback found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

  {/* Summary Card */}
const StatCard = ({ title, value, color, bgColor, icon }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 flex items-center justify-between border border-gray-100 min-h-[140px]">
      <div>
        <h3 className="text-xs text-gray-500 font-semibold uppercase tracking-wide">{title}</h3>
        <p className={`text-2xl font-bold mt-1 ${color || "text-gray-800"}`}>{value}</p>
      </div>
      {icon && <div className={`p-4 rounded-xl ${bgColor}`}>{icon}</div>}
    </div>
  );
};