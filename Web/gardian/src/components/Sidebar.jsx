import { Link, useNavigate } from "react-router-dom";
import { FaHome, FaChartBar, FaChartLine, FaComments, FaSignOutAlt, FaUserCircle } from "react-icons/fa";
import { auth } from "../../firebase";
import { FaUser } from "react-icons/fa";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <aside className="w-64 bg-gardian text-white flex flex-col">
      <div className="p-6 text-2xl font-bold">GARDIAN</div>
      <div className="p-6 flex items-center space-x-3 border-b border-gray-700">
        <FaUserCircle className="w-10 h-10 text-gray-300" />
        <div className="flex flex-col">
          <span className="font-medium">Admin</span>
          <span className="text-sm text-gray-400">Administrator</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-3">
        <Link to="/" className="flex items-center gap-3 p-2 rounded hover:bg-gray-700">
          <FaHome /> Dashboard
        </Link>
        <Link to="/reports" className="flex items-center gap-3 p-2 rounded hover:bg-gray-700">
          <FaChartBar /> Reports
        </Link>
        <Link to="/analytics" className="flex items-center gap-3 p-2 rounded hover:bg-gray-700">
          <FaChartLine /> Analytics
        </Link>
         <Link to="/usermanagement" className="flex items-center gap-3 p-2 rounded hover:bg-gray-700">
          <FaUser /> User Management
        </Link>
        <Link to="/feedback" className="flex items-center gap-3 p-2 rounded hover:bg-gray-700">
          <FaComments /> Citizen Feedback
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-2 rounded hover:bg-gray-700 text-left"
        >
          <FaSignOutAlt /> Log Out
        </button>
      </nav>
    </aside>
  );
}
