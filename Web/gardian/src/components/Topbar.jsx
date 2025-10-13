import { useState, useRef, useEffect } from "react";
import { FaUserCircle, FaBell } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../../firebase"; // adjust path

export default function Topbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  const notifications = [
    { id: 1, message: "New report filed in San Andres", time: "2 mins ago" },
    { id: 2, message: "Drainage issue resolved in San Roque", time: "1 hr ago" },
    { id: 3, message: "Pothole reported in Sto. Niño", time: "3 hrs ago" },
  ];

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
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

  const toggleNotif = () => {
    setIsNotifOpen(!isNotifOpen);
    if (!isNotifOpen) setHasUnread(false);
  };

  return (
    <header className="h-16 bg-gardian text-white flex items-center justify-end px-6 shadow-sm relative">
      <div className="flex items-center space-x-6">
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={toggleNotif} className="relative p-2 rounded-full hover:bg-gray-100 hover:text-gray-800">
            <FaBell className={`text-xl ${isNotifOpen ? "text-gray-800" : "text-gray-200"}`} />
            {hasUnread && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
          </button>
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
              <div className="p-3 border-b font-semibold text-gray-700">Notifications</div>
              <ul className="max-h-60 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3 hover:bg-gray-50 border-b text-sm text-gray-700">
                    <p>{n.message}</p>
                    <span className="text-xs text-gray-500">{n.time}</span>
                  </li>
                ))}
              </ul>
              <div className="p-2 text-center text-sm text-blue-600 hover:underline cursor-pointer">
                View all
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="flex items-center space-x-2 relative" ref={profileRef}>
          <span className="text-gray-200">Hello, Admin</span>
          <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="focus:outline-none">
            <FaUserCircle className="w-10 h-10 text-gray-300 hover:text-white" />
          </button>

          {isProfileOpen && (
            <div className="absolute top-14 right-0 w-48 bg-white rounded-lg shadow-lg text-gray-800">
              <ul className="py-2">
                <li>
                  <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">
                    Profile
                  </Link>
                </li>
                <li>
                  <a href="#" className="block px-4 py-2 hover:bg-gray-100">
                    Settings
                  </a>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-500"
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
