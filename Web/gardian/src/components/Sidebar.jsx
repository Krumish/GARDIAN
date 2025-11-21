import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaChartBar, FaChartLine, FaComments, FaSignOutAlt, FaUserCircle, FaUser } from "react-icons/fa";
import { auth } from "../../firebase";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: "/", icon: FaHome, label: "Dashboard" },
    { path: "/reports", icon: FaChartBar, label: "Reports" },
    { path: "/analytics", icon: FaChartLine, label: "Analytics" },
    { path: "/usermanagement", icon: FaUser, label: "User Management" },
    { path: "/feedback", icon: FaComments, label: "Citizen Feedback" },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col shadow-2xl">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          GARDIAN
        </h1>
        <p className="text-xs text-gray-400 mt-1">Infrastructure Management</p>
      </div>

      {/* User Profile Section */}
      <div className="p-6 flex items-center space-x-3 border-b border-gray-700 bg-gray-800/50">
        <div className="relative">
          <FaUserCircle className="w-12 h-12 text-blue-400" />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800"></div>
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-white">Admin User</span>
          <span className="text-xs text-gray-400">Administrator</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/50"
                  : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
              }`}
            >
              <Icon className={`text-lg ${active ? "text-white" : "text-gray-400 group-hover:text-blue-400"} transition-colors`} />
              <span className="font-medium">{item.label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-red-600/20 hover:text-red-400 transition-all duration-200 group"
        >
          <FaSignOutAlt className="text-lg group-hover:text-red-400 transition-colors" />
          <span className="font-medium">Log Out</span>
        </button>
      </div>
    </aside>
  );
}