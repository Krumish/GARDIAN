import { useState, useRef, useEffect } from "react";
import { FaUserCircle, FaBell, FaExclamationCircle, FaCheckCircle, FaClock } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { collectionGroup, onSnapshot, getDoc, doc, updateDoc } from "firebase/firestore";

export default function Topbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [userData, setUserData] = useState(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Fetch current user data
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchUserData();
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // Format role display name
  const formatRoleName = (role) => {
    const roleNames = {
      super_admin: "Super Admin",
      personnel_admin: "Personnel Admin",
      staff_admin: "Staff Admin"
    };
    return roleNames[role] || "Administrator";
  };

  // Get full name
  const getDisplayName = () => {
    if (!userData) return "Admin User";
    return `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Admin User";
  };

  // Real-time notifications listener
  useEffect(() => {
    const uploadsQuery = collectionGroup(db, "uploads");

    const unsubscribe = onSnapshot(
      uploadsQuery,
      async (snapshot) => {
        const rawData = await Promise.all(
          snapshot.docs.map(async (uploadDoc) => {
            const uploadData = uploadDoc.data();

            if (uploadData.read === true) return null;

            const userId = uploadDoc.ref.parent.parent?.id || "unknown";
            let userDetails = null;

            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) userDetails = userDoc.data();
            } catch (err) {
              console.error("Error fetching user details:", err);
            }

            const issueType = uploadData.issueType || "Unknown";
            const yolo = uploadData.yolo || {};

            let severity = "low";
            let drainageStatus = null;
            let obstructionCount = 0;

            if (issueType === "Drainage" && yolo.status) {
              drainageStatus = yolo.status;
              obstructionCount = yolo.obstructions?.length || 0;

              if (drainageStatus === "Clogged" || obstructionCount > 2) {
                severity = "high";
              } else if (obstructionCount > 0) {
                severity = "medium";
              }
            } else {
              severity = "medium";
            }

            const fullAddress = uploadData.address || "";
            const street = fullAddress.split(",")[0] || fullAddress;

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
            } else if (currentStatus === "Under Review") {
              message = `${issueType} report at ${street} is under review`;
              notifType = "review";
            } else if (currentStatus === "In Progress") {
              message = `${issueType} repair at ${street} is in progress`;
              notifType = "progress";
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
              obstructionCount,
              drainageStatus,
              read: false,
              docRef: uploadDoc.ref,
            };
          })
        );

        const cleanData = rawData.filter((n) => n !== null);

        cleanData.sort((a, b) => {
          const timeA = a.uploadedAt?.seconds || 0;
          const timeB = b.uploadedAt?.seconds || 0;

          if (timeB !== timeA) {
            return timeB - timeA;
          }

          const severityOrder = { high: 0, medium: 1, low: 2 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        });

        setNotifications(cleanData);
      },
      (err) => {
        console.error("Error fetching notifications:", err);
      }
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

  const markAsRead = async (notification) => {
    try {
      await updateDoc(notification.docRef, {
        read: true
      });
      
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const updatePromises = notifications
        .filter(n => !n.read)
        .map(n => updateDoc(n.docRef, { read: true }));
      
      await Promise.all(updatePromises);
      
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      await updateDoc(notification.docRef, { read: true });
      setIsNotifOpen(false);
      navigate("/reports");
    } catch (err) {
      console.error("Error handling notification click:", err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "pending") return n.status === "Pending";
    if (filter === "resolved") return n.status === "Resolved";
    return true;
  });

  const getSeverityIcon = (severity, status) => {
    if (status === "Resolved") {
      return <FaCheckCircle className="text-green-500" />;
    }

    switch (severity) {
      case "high":
        return <FaExclamationCircle className="text-red-500" />;
      case "medium":
        return <FaExclamationCircle className="text-orange-500" />;
      default:
        return <FaClock className="text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "high":
        return "bg-red-50 border-l-4 border-red-500";
      case "medium":
        return "bg-orange-50 border-l-4 border-orange-500";
      default:
        return "bg-gray-50 border-l-4 border-gray-300";
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
                isNotifOpen ? "text-white" : "text-gray-300 group-hover:text-white"
              }`}
              style={isNotifOpen ? {color: '#111827'} : {}}
            />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-gray-900 animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-[420px] bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden animate-fadeIn">
              <div className="p-4 border-b text-white" style={{background: 'linear-gradient(to right, #111827, #1f2937)'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Notifications</h3>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {unreadCount} unread • {notifications.length} total
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs px-3 py-1 rounded-full transition-colors text-white"
                      style={{backgroundColor: '#374151'}}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  {["all", "unread", "pending", "resolved"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors ${
                        filter === f
                          ? "bg-white font-medium"
                          : "hover:bg-gray-700"
                      }`}
                      style={filter === f ? {color: '#111827'} : {backgroundColor: 'rgba(55, 65, 81, 0.3)', color: 'white'}}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

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
                          {getSeverityIcon(n.severity, n.status)}
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
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor: '#111827'}}></div>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <span className="flex items-center gap-1">
                              <FaUserCircle className="text-gray-400" />
                              {n.userDetails?.firstName} {n.userDetails?.lastName}
                            </span>
                            <span>•</span>
                            <span>{getTimeAgo(n.uploadedAt)}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            {n.severity === "high" && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                                High Priority
                              </span>
                            )}
                            {n.issueType === "Drainage" && n.drainageStatus === "Clogged" && (
                              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                                Clogged
                              </span>
                            )}
                            {n.issueType === "Drainage" && n.drainageStatus === "Clear" && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                                Clear
                              </span>
                            )}
                            {n.issueType === "Drainage" && n.obstructionCount > 0 && (
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

              <div className="p-3 text-center border-t bg-gray-50">
                <Link
                  to="/reports"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-sm font-medium hover:underline"
                  style={{color: '#111827'}}
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
            <p className="text-sm font-medium text-white">{getDisplayName()}</p>
            <p className="text-xs text-gray-400">{formatRoleName(userData?.role)}</p>
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
              <div className="p-4 text-white" style={{background: 'linear-gradient(to right, #111827, #1f2937)'}}>
                <p className="font-semibold">{getDisplayName()}</p>
                <p className="text-xs text-gray-300 mt-0.5">{userData?.email || "admin@gmail.com"}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRoleName(userData?.role)}</p>
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