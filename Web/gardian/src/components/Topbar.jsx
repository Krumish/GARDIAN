import { useState, useRef, useEffect, useCallback } from "react";
import {
  FaUserCircle, FaBell, FaExclamationCircle, FaCheckCircle,
  FaClock, FaArrowRight, FaInbox,
} from "react-icons/fa";
import { RiHourglassFill } from "react-icons/ri";
import { TbReportOff } from "react-icons/tb";
import { Link, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collectionGroup, collection, onSnapshot,
  getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp,
} from "firebase/firestore";

// ── Import logo assets ──────────────────────────────────────────────────────
import gardianLogo from "../assets/gardianlogo.png";
import gardianTitle from "../assets/gardiantitle.png";

// ── Status meta ────────────────────────────────────────────────────────────────
const STATUS_META = {
  Pending: {
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-400",
    badge: "bg-amber-100 text-amber-700",
    icon: <RiHourglassFill className="text-amber-500" />,
  },
  Resolved: {
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-500",
    badge: "bg-emerald-100 text-emerald-800",
    icon: <FaCheckCircle className="text-emerald-500" />,
  },
  Withdrawn: {
    color: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-400",
    badge: "bg-slate-100 text-slate-600",
    icon: <TbReportOff className="text-slate-500" />,
  },
};

const getStatusMeta = (status) => STATUS_META[status] || {
  color: "text-blue-500",
  bg: "bg-blue-50",
  border: "border-blue-500",
  badge: "bg-blue-100 text-blue-800",
  icon: <FaExclamationCircle className="text-blue-500" />,
};

const getTimeAgo = (timestamp) => {
  if (!timestamp?.toDate) return "";
  const diff  = Date.now() - timestamp.toDate().getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "Just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// ── Notification item ─────────────────────────────────────────────────────────
function NotifItem({ notif, onClick, onDismiss }) {
  const meta     = getStatusMeta(notif.currentStatus);
  const isChange = notif.type === "status_change";

  return (
    <li
      className={`px-4 py-3 border-b border-slate-100 transition-colors group hover:bg-slate-50
        ${!notif.read ? `border-l-[3px] ${meta.border} ${meta.bg}` : "border-l-[3px] border-transparent bg-white"}`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5 text-base cursor-pointer" onClick={() => onClick(notif)}>{meta.icon}</div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick(notif)}>
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm leading-snug tracking-wide ${!notif.read ? "font-semibold text-slate-900" : "text-slate-600"}`}>
              {notif.message}
            </p>
            {!notif.read && <span className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />}
          </div>

          {isChange && notif.prevStatus && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold ${getStatusMeta(notif.prevStatus).badge}`}>
                {notif.prevStatus}
              </span>
              <FaArrowRight className="text-slate-400 text-[9px]" />
              <span className={`text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold ${meta.badge}`}>
                {notif.currentStatus}
              </span>
            </div>
          )}

          {!isChange && (
            <span className={`inline-block mt-2 text-[10px] px-2 py-0.5 rounded-sm uppercase tracking-wider font-bold ${meta.badge}`}>
              New Report
            </span>
          )}

          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <FaUserCircle className="text-slate-400 text-sm" />
              {notif.reporterName}
            </span>
            <span>·</span>
            <span className="text-slate-600">{notif.issueType}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <FaClock className="text-slate-400" />
              {getTimeAgo(notif.timestamp)}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(notif); }}
          className="shrink-0 mt-0.5 p-1.5 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-200 transition-colors opacity-0 group-hover:opacity-100"
          title="Dismiss"
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 4.586L10.293.293l1.414 1.414L7.414 6l4.293 4.293-1.414 1.414L6 7.414l-4.293 4.293-1.414-1.414L4.586 6 .293 1.707 1.707.293z"/>
          </svg>
        </button>
      </div>
    </li>
  );
}

// ── Main Topbar ───────────────────────────────────────────────────────────────
export default function Topbar() {
  const [isNotifOpen,   setIsNotifOpen]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter]               = useState("all");

  const prevStatusMap = useRef({});
  const notifCounter  = useRef(0);
  const notifRef      = useRef(null);
  const navigate      = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Load persisted notifications ───────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "notifications"),
      (snapshot) => {
        const persisted = snapshot.docs
          .filter((d) => !d.data().read)
          .map((d) => ({
            id:           d.id,
            firestoreRef: d.ref,
            docId:        d.data().docId,
            type:         "status_change",
            message:      d.data().message,
            currentStatus: d.data().currentStatus,
            prevStatus:   d.data().prevStatus,
            issueType:    d.data().issueType,
            reporterName: d.data().reporterName,
            timestamp:    d.data().createdAt,
            read:         false,
            persisted:    true,
          }));

        setNotifications((prev) => {
          const inMemory = prev.filter((n) => !n.persisted);
          const combined = [...persisted, ...inMemory];
          combined.sort((a, b) =>
            (b.timestamp?.seconds || b.timestamp?.toDate?.()?.getTime?.() / 1000 || 0) -
            (a.timestamp?.seconds || a.timestamp?.toDate?.()?.getTime?.() / 1000 || 0)
          );
          return combined;
        });
      },
      (err) => console.error("notifications collection error:", err)
    );
    return () => unsub();
  }, []);

  // ── Uploads listener ───────────────────────────────────────────────────────
  useEffect(() => {
    const isFirstLoad = { current: true };

    const unsub = onSnapshot(
      collectionGroup(db, "uploads"),
      async (snapshot) => {
        const newNotifs = [];

        await Promise.all(
          snapshot.docs.map(async (d) => {
            const data      = d.data();
            const docId     = d.id;
            const status    = data.status || "Pending";
            const issueType = data.issueType || "Unknown";
            const address   = (data.address || "").split(",")[0];
            const userId    = d.ref.parent.parent?.id || "unknown";

            let reporterName = "Unknown User";
            try {
              const uSnap = await getDoc(doc(db, "users", userId));
              if (uSnap.exists()) {
                const u = uSnap.data();
                reporterName = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unknown User";
              }
            } catch (_) {}

            const prev = prevStatusMap.current[docId];

            if (isFirstLoad.current) {
              prevStatusMap.current[docId] = status;
              if (!data.read) {
                newNotifs.push({
                  id: `init_${docId}`, docId, docRef: d.ref,
                  type: "new_report",
                  message: `New ${issueType} report at ${address}`,
                  currentStatus: status, prevStatus: null,
                  issueType, reporterName,
                  timestamp: data.uploadedAt, read: false, persisted: false,
                });
              }
            } else if (prev !== undefined && prev !== status) {
              prevStatusMap.current[docId] = status;
              const notifPayload = {
                docId, type: "status_change",
                message: `${issueType} report at ${address} changed status`,
                currentStatus: status, prevStatus: prev,
                issueType, reporterName,
                createdAt: Timestamp.now(), read: false,
              };
              try { await addDoc(collection(db, "notifications"), notifPayload); }
              catch (e) { console.error("Failed to save notification:", e); }
            } else if (prev === undefined) {
              prevStatusMap.current[docId] = status;
              notifCounter.current += 1;
              newNotifs.push({
                id: `new_${docId}_${notifCounter.current}`, docId, docRef: d.ref,
                type: "new_report",
                message: `New ${issueType} report at ${address}`,
                currentStatus: status, prevStatus: null,
                issueType, reporterName,
                timestamp: data.uploadedAt, read: false, persisted: false,
              });
            }
          })
        );

        if (isFirstLoad.current) {
          isFirstLoad.current = false;
          newNotifs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
          setNotifications((prev) => {
            const persisted = prev.filter((n) => n.persisted);
            const combined  = [...newNotifs, ...persisted];
            combined.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            return combined;
          });
        } else if (newNotifs.length > 0) {
          setNotifications((prev) => {
            const combined = [...newNotifs, ...prev];
            combined.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            return combined;
          });
        }
      },
      (err) => console.error("Uploads listener error:", err)
    );
    return () => unsub();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const dismissNotif = useCallback(async (notif) => {
    try {
      if (notif.persisted && notif.firestoreRef) await deleteDoc(notif.firestoreRef);
      else if (notif.type === "new_report" && notif.docRef) await updateDoc(notif.docRef, { read: true });
    } catch (_) {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    const promises = notifications.map((n) => {
      if (n.persisted && n.firestoreRef) return deleteDoc(n.firestoreRef).catch(() => {});
      if (n.type === "new_report" && n.docRef) return updateDoc(n.docRef, { read: true }).catch(() => {});
      return Promise.resolve();
    });
    await Promise.all(promises);
    setNotifications([]);
  }, [notifications]);

  const handleNotifClick = useCallback(async (notif) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setIsNotifOpen(false);
    await dismissNotif(notif);
    navigate(`/reports?highlight=${notif.docId}`);
  }, [dismissNotif, navigate]);

  // ── Click outside ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = notifications.filter((n) => {
    if (filter === "unread")  return !n.read;
    if (filter === "changes") return n.type === "status_change";
    if (filter === "new")     return n.type === "new_report";
    return true;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <header className="h-[73px] bg-[#0B1121] flex items-center justify-between px-6 border-b border-slate-800/30 z-10">

      {/* ── Left: Mobile Logo Lockup ── */}
      <div className="flex items-center gap-3 lg:hidden">
        <img src={gardianLogo} alt="GARDIAN" className="h-9 w-9 object-contain drop-shadow-md" />
        <div className="flex flex-col justify-center border-l border-slate-700/50 pl-3 py-1">
          <img
            src={gardianTitle}
            alt="GARDIAN"
            className="h-3.5 object-contain object-left mb-1 opacity-90"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1 hidden lg:block" />

      {/* ── Right: Tool Action Area ── */}
      <div className="flex items-center">

        {/* ── Notifications ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((v) => !v)}
            className={`relative p-2.5 rounded-md transition-all group border ${
              isNotifOpen 
              ? "bg-slate-800 border-slate-700 shadow-inner" 
              : "bg-transparent border-transparent hover:bg-slate-800/50 hover:border-slate-700/50"
            }`}
          >
            <FaBell className={`text-lg transition-colors ${isNotifOpen ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"}`} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full border border-[#0B1121] shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-[420px] bg-white border border-slate-200 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden flex flex-col">
              
              {/* Notification Header */}
              <div className="p-4 bg-slate-800 text-white border-b border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-sm tracking-wide">System Notifications</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5 tracking-wide">
                      {unreadCount} unread · {notifications.length} total
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white transition"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                  {[
                    { key: "all",     label: "All" },
                    { key: "unread",  label: "Unread" },
                    { key: "changes", label: "Status Changes" },
                    { key: "new",     label: "New Reports" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`text-[11px] px-3 py-1 rounded-sm transition-colors font-semibold tracking-wide whitespace-nowrap border ${
                        filter === key
                          ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                          : "bg-slate-700/50 text-slate-300 border-slate-600/50 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notification List */}
              <ul className="max-h-[400px] overflow-y-auto bg-white">
                {filtered.length > 0 ? (
                  filtered.map((n) => (
                    <NotifItem
                      key={n.id}
                      notif={n}
                      onClick={handleNotifClick}
                      onDismiss={async (notif) => {
                        setNotifications((prev) => prev.filter((x) => x.id !== notif.id));
                        await dismissNotif(notif);
                      }}
                    />
                  ))
                ) : (
                  <li className="px-4 py-12 text-center text-slate-400">
                    <FaInbox className="mx-auto text-3xl text-slate-200 mb-3" />
                    <p className="text-sm font-medium">No notifications found</p>
                    <p className="text-xs text-slate-400 mt-1">You're all caught up!</p>
                  </li>
                )}
              </ul>

              {/* Footer Link */}
              <div className="p-3 text-center border-t border-slate-100 bg-slate-50">
                <Link
                  to="/reports"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition tracking-wide flex items-center justify-center gap-1.5"
                >
                  View all reports <FaArrowRight className="text-[10px]" />
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}