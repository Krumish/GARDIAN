import { useState, useRef, useEffect } from "react";
import { FaUserCircle, FaBell, FaExclamationCircle, FaCheckCircle, FaClock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { collectionGroup, onSnapshot, getDoc, doc } from "firebase/firestore";

export default function Topbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all"); // all, unread, pending, resolved
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch latest reports for notifications
  useEffect(() => {
    const uploadsQuery = collectionGroup(db, "uploads");
    const unsubscribe = onSnapshot(
      uploadsQuery,
      async (snapshot) => {
        const data = await Promise.all(
          snapshot.docs.map(async (uploadDoc) => {
            const userId = uploadDoc.ref.parent.parent?.id || "unknown";
            let userDetails = null;

            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) userDetails = userDoc.data();
            } catch (err) {
              console.error("Error fetching user details:", err);
            }

            const uploadData = uploadDoc.data();
            const yolo = uploadData.yolo || {};

            // Determine issue type and severity
            let issueType = "Unknown";
            let severity = "low";
            
            if (yolo.drainage_count > 0) {
              issueType = "Drainage";
              // High severity if clogged or multiple obstructions
              if (yolo.status === "Clogged" || yolo.obstruction_count > 2) {
                severity = "high";
              } else if (yolo.obstruction_count > 0) {
                severity = "medium";
              }
            } else if (yolo.pothole_count > 0) {
              issueType = "Pothole";
              severity = yolo.pothole_count > 3 ? "high" : "medium";
            } else if (yolo.road_surface_count > 0) {
              issueType = "Road Surface";
              severity = "medium";
            }

            // Extract street from address which
            const fullAddress = uploadData.address || "";
            const street = fullAddress.split(",")[0] || fullAddress;

            // Determine notification message based on status
            let message = "";
            let notifType = "new";
            const currentStatus = uploadData.status || "Pending";

            if (currentStatus === "Pending") {
              message = `New ${issueType} report at ${street}`;
              notifType = "new";
            } else if (currentStatus === "Resolved") {
              message = `${issueType} issue at ${street} has been resolved`;
              notifType = "resolved";
            } else if (currentStatus === "Withdrawn") {
              message = `${issueType} report at ${street} was withdrawn`;
              notifType = "withdrawn";
            }

            return {
              id: uploadDoc.id,
              userId,
              userDetails,
              issueType,
              street,
              status: currentStatus,
              severity,
              uploadedAt: uploadData.uploadedAt,
              message,
              notifType,
              obstructionCount: yolo.obstruction_count || 0,
              drainageStatus: yolo.status || null,
              read: false,
            };
          })
        );

        // Sort by severity and date (high severity first, then newest)
        data.sort((a, b) => {
          const severityOrder = { high: 0, medium: 1, low: 2 };
          if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[a.severity] - severityOrder[b.severity];
          }
          return b.uploadedAt?.seconds - a.uploadedAt?.seconds;
        });

        setNotifications(data);
      },
      (err) => console.error("Error fetching notifications:", err)
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const toggleNotif = () => {
    setIsNotifOpen(!isNotifOpen);
  };

  const markAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setIsNotifOpen(false);
    navigate("/reports");
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "pending") return n.status === "Pending";
    if (filter === "resolved") return n.status === "Resolved";
    return true;
  });

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "high":
        return <FaExclamationCircle className="text-red-500" />;
      case "medium":
        return <FaExclamationCircle className="text-orange-500" />;
      default:
        return <FaClock className="text-blue-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-l-4 border-red-500";
      case "medium":
        return "bg-orange-50 border-l-4 border-orange-500";
      default:
        return "bg-blue-50 border-l-4 border-blue-500";
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return "";
    const now = new Date();
    const uploadDate = timestamp.toDate();
    const diffMs = now - uploadDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-16 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-between px-6 shadow-lg border-b border-gray-700">
      <div className="flex-1 max-w-xl"></div>

      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={toggleNotif}
            className="relative p-2 rounded-lg hover:bg-gray-700/50 transition-all duration-200 group"
          >
            <FaBell
              className={`text-xl transition-colors ${
                isNotifOpen ? "text-blue-400" : "text-gray-300 group-hover:text-white"
              }`}
            />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-gray-900 animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-[420px] bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden animate-fadeIn">
              {/* Header */}
              <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Notifications</h3>
                    <p className="text-xs text-blue-100 mt-0.5">
                      {unreadCount} unread • {notifications.length} total
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-full transition-colors"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mt-3">
                  {["all", "unread", "pending", "resolved"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        filter === f
                          ? "bg-white text-blue-600 font-medium"
                          : "bg-blue-500/30 text-white hover:bg-blue-500/50"
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notifications List */}
              <ul className="max-h-[500px] overflow-y-auto">
                {filteredNotifications.length > 0 ? (
                  filteredNotifications.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors cursor-pointer ${
                        !n.read ? getSeverityColor(n.severity) : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getSeverityIcon(n.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p
                              className={`text-sm ${
                                !n.read ? "font-semibold text-gray-900" : "text-gray-700"
                              }`}
                            >
                              {n.message}
                            </p>
                            {!n.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                          </div>

                          {/* Additional Details */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <FaUserCircle className="text-gray-400" />
                              {n.userDetails?.firstName} {n.userDetails?.lastName}
                            </span>
                            <span>•</span>
                            <span>{getTimeAgo(n.uploadedAt)}</span>
                          </div>

                          {/* Severity Badge & Info */}
                          <div className="flex items-center gap-2 mt-2">
                            {n.severity === "high" && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                High Priority
                              </span>
                            )}
                            {n.drainageStatus === "Clogged" && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                                Clogged
                              </span>
                            )}
                            {n.obstructionCount > 0 && (
                              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                                {n.obstructionCount} obstruction{n.obstructionCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-8 text-center text-gray-500">
                    <FaBell className="mx-auto text-3xl text-gray-300 mb-2" />
                    <p className="text-sm">No notifications found</p>
                  </li>
                )}
              </ul>

              {/* Footer */}
              <div className="p-3 text-center border-t bg-gray-50">
                <Link
                  to="/reports"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  View all reports →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700"></div>

        {/* Profile */}
        <div className="flex items-center space-x-3 relative" ref={profileRef}>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs text-gray-400">Administrator</p>
          </div>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="relative focus:outline-none group"
          >
            <FaUserCircle className="w-10 h-10 text-gray-300 group-hover:text-white transition-colors" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </button>

          {isProfileOpen && (
            <div className="absolute top-14 right-0 w-56 bg-white rounded-lg shadow-2xl text-gray-800 border border-gray-200 overflow-hidden animate-fadeIn z-50">
              <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <p className="font-semibold">Admin User</p>
                <p className="text-xs text-blue-100 mt-0.5">admin@gmail.com</p>
              </div>
              <ul className="py-2">
                <li>
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm"
                  >
                    <FaUserCircle className="mr-3 text-gray-400" />
                    My Profile
                  </Link>
                </li>
                <li className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600 text-sm font-medium"
                  >
                    Log Out
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}