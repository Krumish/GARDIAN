import { useState, useRef, useEffect } from "react";
import { FaUserCircle, FaBell, FaSearch } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../../firebase";

export default function Topbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const navigate = useNavigate();

  const notifications = [
    { id: 1, message: "New report filed in San Andres", time: "2 mins ago", unread: true },
    { id: 2, message: "Drainage issue resolved in San Roque", time: "1 hr ago", unread: true },
    { id: 3, message: "Pothole reported in Santo Niño", time: "3 hrs ago", unread: false },
    { id: 4, message: "Surface repair completed in San Juan", time: "5 hrs ago", unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

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
    <header className="h-16 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-between px-6 shadow-lg border-b border-gray-700">

      <div className="flex-1 max-w-xl">
      </div>

      {/* Right Section */}
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
                    className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors cursor-pointer ${n.unread ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      {n.unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      )}
                      <div className="flex-1">
                        <p className={`text-sm ${n.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {n.message}
                        </p>
                        <span className="text-xs text-gray-500 mt-1 inline-block">{n.time}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="p-3 text-center border-t bg-gray-50">
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  View all notifications
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
            <div className="relative">
              <FaUserCircle className="w-10 h-10 text-gray-300 group-hover:text-white transition-colors" />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
            </div>
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
                <li>
                  <a 
                    href="#" 
                    className="flex items-center px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </a>
                </li>
                <li className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600 text-sm font-medium"
                  >
                    <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
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