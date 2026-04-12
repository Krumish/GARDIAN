import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaChartBar, FaChartLine, FaComments, FaSignOutAlt, FaUserCircle, FaUser, FaShieldAlt } from "react-icons/fa";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

// ── Import your logo assets ─────────────────────────────────────────────────
import gardianLogo from "../assets/gardianlogo.png";
import gardianTitle from "../assets/gardiantitle.png";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user data
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (!user) { setLoading(false); return; }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) setUserData(userDoc.data());
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) fetchUserData();
      else { setUserData(null); setLoading(false); }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try { await auth.signOut(); navigate("/login"); }
    catch (err) { console.error("Logout failed:", err); }
  };

  const isActive = (path) => location.pathname === path;

  const formatRoleName = (role) => ({
    super_admin:     "System Administrator",
    personnel_admin: "Authorized Personnel",
    staff_admin:     "Department Staff",
  }[role] || "Authorized Personnel");

  const getDisplayName = () => {
    if (!userData) return "Admin User";
    return `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Admin User";
  };

  const navItems = [
    { path: "/",               icon: FaHome,      label: "Dashboard Overview" },
    { path: "/reports",        icon: FaChartBar,  label: "Incident Reports" },
    { path: "/analytics",      icon: FaChartLine, label: "Data Analytics" },
    { path: "/usermanagement", icon: FaUser,      label: "User Management" },
    { path: "/feedback",       icon: FaComments,  label: "Citizen Feedback" },
  ];

  return (
    <aside className="w-64 bg-[#0B1121] text-slate-300 flex flex-col h-screen shadow-xl">

      {/* ── Official Brand / Logo Section ── */}
      <div className="px-6 py-6 border-b border-slate-800/40 flex items-center gap-4 bg-[#0B1121]">
        {/* LGU/System Seal */}
        <img
          src={gardianLogo}
          alt="GARDIAN logo"
          className="h-10 w-10 object-contain shrink-0 drop-shadow-md"
        />
        
        {/* Title & Department Stack */}
        <div className="flex flex-col justify-center border-l border-slate-700/50 pl-4 py-1">
          <img
            src={gardianTitle}
            alt="GARDIAN"
            className="h-3.5 object-contain object-left mb-1.5 opacity-90"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          <p className="text-[8.5px] leading-tight tracking-[0.15em] uppercase text-slate-400 font-semibold">
            Infrastructure
            <span className="block text-slate-500 font-medium mt-0.5 tracking-[0.2em]">Management</span>
          </p>
        </div>
      </div>

      {/* ── Official User Profile Section ── */}
      <div className="px-6 py-5 flex items-center space-x-3 border-b border-slate-800/80 bg-[#0f172a]">
        <div className="relative shrink-0">
          <FaUserCircle className="w-9 h-9 text-slate-500" />
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500/90 rounded-full border-2 border-[#0f172a]" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          {loading ? (
            <>
              <div className="h-3 bg-slate-800 rounded w-20 mb-1.5 animate-pulse" />
              <div className="h-2.5 bg-slate-800 rounded w-14 animate-pulse" />
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-100 truncate text-[13px] tracking-wide" title={getDisplayName()}>
                {getDisplayName()}
              </span>
              <span className="text-[10px] text-blue-400/90 mt-0.5 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <FaShieldAlt className="text-[9px]" />
                {formatRoleName(userData?.role)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Navigation (With Invisible Scrollbar) ── */}
      <nav className="flex-1 py-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="px-6 pb-2.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">System Menu</span>
        </div>
        
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon   = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-2.5 transition-all duration-200 group border-l-[3px] ${
                  active
                    ? "border-blue-500 bg-slate-800/40 text-white"
                    : "border-transparent text-slate-400 hover:bg-slate-800/20 hover:text-slate-200"
                }`}
              >
                <Icon className={`text-[15px] shrink-0 ${active ? "text-blue-400" : "text-slate-500 group-hover:text-slate-400"} transition-colors`} />
                <span className={`text-[13px] tracking-wide ${active ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Logout & Version Footer ── */}
      <div className="mt-auto bg-[#0B1121]">
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 group"
          >
            <FaSignOutAlt className="text-sm shrink-0" />
            <span className="font-medium text-[13px] tracking-wide">Logout</span>
          </button>
        </div>
      </div>

    </aside>
  );
}