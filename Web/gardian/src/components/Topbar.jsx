import { useState, useRef, useEffect } from "react";
import { FaUserCircle, FaBell } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { collectionGroup, onSnapshot, getDoc, doc } from "firebase/firestore";

export default function Topbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
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

            // Determine issue type from YOLO
            const yolo = uploadDoc.data().yolo || {};
            let issueType = "Unknown";
            if (yolo.drainage_count > 0) issueType = "Drainage";
            // Add pothole, road surface later

            // Extract street from address
            const fullAddress = uploadDoc.data().address || "";
            const street = fullAddress.split(",")[0] || fullAddress;

            return {
              id: uploadDoc.id,
              userId,
              userDetails,
              issueType,
              street,
              status: uploadDoc.data().status || "Pending",
              uploadedAt: uploadDoc.data().uploadedAt,
              read: false, // you can implement read/unread logic later
            };
          })
        );

        // Sort newest first
        data.sort((a, b) => b.uploadedAt?.seconds - a.uploadedAt?.seconds);
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
    if (!isNotifOpen) {
      // Mark all as read
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
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
            <FaBell className={`text-xl transition-colors ${isNotifOpen ? "text-blue-400" : "text-gray-300 group-hover:text-white"}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-gray-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-96 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden animate-fadeIn">
              <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <h3 className="font-semibold text-lg">Notifications</h3>
                <p className="text-xs text-blue-100 mt-0.5">{unreadCount} unread notifications</p>
              </div>
              <ul className="max-h-96 overflow-y-auto">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors cursor-pointer ${!n.read ? "bg-blue-50" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      {!n.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      )}
                      <div className="flex-1">
                        <p className={`text-sm ${!n.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                          New {n.issueType} report at {n.street}
                        </p>
                        <span className="text-xs text-gray-500 mt-1 inline-block">
                          {n.uploadedAt?.toDate ? n.uploadedAt.toDate().toLocaleString() : ""}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-3 text-center border-t bg-gray-50">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
  
                </button>
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
