import { Link } from "react-router-dom";
import {
  FaHome,
  FaChartBar,
  FaChartLine,
  FaComments,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gardian text-white flex flex-col">
      <div className="p-6 text-2xl font-bold">GARDIAN</div>

      <div className="p-6 flex items-center space-x-3 border-b border-gray-700">
        {/* Profile Icon */}
        <FaUserCircle className="w-10 h-10 text-gray-300" />

        {/* User */}
        <div className="flex flex-col">
          <span className="font-medium">Mich Bur</span>
          <span className="text-sm text-gray-400">Administrator</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-3">
        <Link
          to="/"
          className="flex items-center gap-3 p-2 rounded hover:bg-gray-700"
        >
          <FaHome /> Home
        </Link>

        <Link
          to="/reports"
          className="flex items-center gap-3 p-2 rounded hover:bg-gray-700"
        >
          <FaChartBar /> Reports
        </Link>

        <Link
          to="/analytics"
          className="flex items-center gap-3 p-2 rounded hover:bg-gray-700"
        >
          <FaChartLine /> Analytics
        </Link>

        <Link 
        to="/feedback" 
        className="flex items-center gap-3 p-2 rounded hover:bg-gray-700"
        >
        <FaComments /> Citizen Feedback
        </Link>

        <a
          href="#"
          className="flex items-center gap-3 p-2 rounded hover:bg-gray-700"
        >
          <FaSignOutAlt /> Log Out
        </a>
      </nav>
    </aside>
  );
}
