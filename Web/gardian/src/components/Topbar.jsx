import { useState, useRef, useEffect, useCallback } from "react";
import {
  FaUserCircle, FaBell, FaExclamationCircle, FaCheckCircle,
  FaClock, FaArrowRight, FaInbox,
} from "react-icons/fa";
import { RiHourglassFill } from "react-icons/ri";
import { TbReportOff } from "react-icons/tb";
import { Link, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import {
  collectionGroup, collection, onSnapshot,
  getDoc, doc, addDoc, updateDoc, deleteDoc, Timestamp,
} from "firebase/firestore";

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
    border: "border-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    icon: <FaCheckCircle className="text-emerald-500" />,
  },
  Withdrawn: {
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-400",
    badge: "bg-gray-100 text-gray-600",
    icon: <TbReportOff className="text-gray-500" />,
  },
};

const getStatusMeta = (status) => STATUS_META[status] || {
  color: "text-blue-500",
  bg: "bg-blue-50",
  border: "border-blue-400",
  badge: "bg-blue-100 text-blue-700",
  icon: <FaExclamationCircle className="text-blue-500" />,
};

const getTimeAgo = (timestamp) => {
  if (!timestamp?.toDate) return "";
  const diff = Date.now() - timestamp.toDate().getTime();
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
  const meta = getStatusMeta(notif.currentStatus);
  const isChange = notif.type === "status_change";

  return (
    <li
      className={`px-4 py-3 border-b border-gray-100 transition-colors group
        ${!notif.read ? `border-l-4 ${meta.border} ${meta.bg}` : "border-l-4 border-transparent"}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="shrink-0 mt-0.5 text-base cursor-pointer" onClick={() => onClick(notif)}>{meta.icon}</div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick(notif)}>
          {/* Message */}
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm leading-snug ${!notif.read ? "font-semibold text-gray-900" : "text-gray-600"}`}>
              {notif.message}
            </p>
            {!notif.read && (
              <span className="shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500" />
            )}
          </div>

          {/* Status transition pill */}
          {isChange && notif.prevStatus && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusMeta(notif.prevStatus).badge}`}>
                {notif.prevStatus}
              </span>
              <FaArrowRight className="text-gray-400 text-[10px]" />
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>
                {notif.currentStatus}
              </span>
            </div>
          )}

          {/* New report pill */}
          {!isChange && (
            <span className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${meta.badge}`}>
              New Report
            </span>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <FaUserCircle className="text-gray-300" />
              {notif.reporterName}
            </span>
            <span>·</span>
            <span className="font-medium text-gray-500">{notif.issueType}</span>
            <span>·</span>
            <span>{getTimeAgo(notif.timestamp)}</span>
          </div>
        </div>

        {/* Dismiss × button — visible on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(notif); }}
          className="shrink-0 mt-0.5 p-1 rounded-full text-gray-300 hover:text-gray-600 hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
          title="Dismiss"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 4.586L10.293.293l1.414 1.414L7.414 6l4.293 4.293-1.414 1.414L6 7.414l-4.293 4.293-1.414-1.414L4.586 6 .293 1.707 1.707.293z"/>
          </svg>
        </button>
      </div>
    </li>
  );
}

// ── Main Topbar ───────────────────────────────────────────────────────────────
export default function Topbar() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen,   setIsNotifOpen]   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [userData, setUserData] = useState(null);

  // previousStatuses: { [docId]: status } — tracked in memory to detect changes
  const prevStatusMap = useRef({});
  // notifIdCounter to generate unique ids for in-session change notifications
  const notifCounter = useRef(0);

  const profileRef = useRef(null);
  const notifRef   = useRef(null);
  const navigate   = useNavigate();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ── Fetch current user ─────────────────────────────────────────────────────
  useEffect(() => {
    const load = async (user) => {
      if (!user) { setUserData(null); return; }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setUserData(snap.data());
      } catch (e) { console.error(e); }
    };
    load(auth.currentUser);
    const unsub = auth.onAuthStateChanged(load);
    return () => unsub();
  }, []);

  const formatRoleName = (role) => ({
    super_admin:      "Super Admin",
    personnel_admin:  "Personnel Admin",
    staff_admin:      "Staff Admin",
  }[role] || "Administrator");

  const getDisplayName = () => {
    if (!userData) return "Admin User";
    return `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Admin User";
  };

  // ── 1. Load persisted status-change notifications from Firestore ────────────
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "notifications"),
      (snapshot) => {
        // Only show unread persisted notifications — read ones are already dismissed
        const persisted = snapshot.docs
          .filter((d) => !d.data().read)
          .map((d) => ({
            id:            d.id,
            firestoreRef:  d.ref,
            docId:         d.data().docId,
            type:          "status_change",
            message:       d.data().message,
            currentStatus: d.data().currentStatus,
            prevStatus:    d.data().prevStatus,
            issueType:     d.data().issueType,
            reporterName:  d.data().reporterName,
            timestamp:     d.data().createdAt,
            read:          false,
            persisted:     true,
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

  // ── 2. Uploads listener — new reports + detect status changes ─────────────
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

            // Fetch reporter name
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
              // First load — seed prevStatusMap, show unread as in-memory new_report notifs
              prevStatusMap.current[docId] = status;
              if (!data.read) {
                newNotifs.push({
                  id:            `init_${docId}`,
                  docId,
                  docRef:        d.ref,
                  type:          "new_report",
                  message:       `New ${issueType} report at ${address}`,
                  currentStatus: status,
                  prevStatus:    null,
                  issueType,
                  reporterName,
                  timestamp:     data.uploadedAt,
                  read:          false,
                  persisted:     false,
                });
              }

            } else if (prev !== undefined && prev !== status) {
              // ── Status changed → save permanently to Firestore ──────────────
              prevStatusMap.current[docId] = status;

              const notifPayload = {
                docId,
                type:          "status_change",
                message:       `${issueType} report at ${address} changed status`,
                currentStatus: status,
                prevStatus:    prev,
                issueType,
                reporterName,
                createdAt:     Timestamp.now(),
                read:          false,
              };

              try {
                // addDoc writes to root `notifications` collection —
                // the onSnapshot above will pick it up automatically
                await addDoc(collection(db, "notifications"), notifPayload);
              } catch (e) {
                console.error("Failed to save notification:", e);
              }

            } else if (prev === undefined) {
              // New doc after first load
              prevStatusMap.current[docId] = status;
              notifCounter.current += 1;
              newNotifs.push({
                id:            `new_${docId}_${notifCounter.current}`,
                docId,
                docRef:        d.ref,
                type:          "new_report",
                message:       `New ${issueType} report at ${address}`,
                currentStatus: status,
                prevStatus:    null,
                issueType,
                reporterName,
                timestamp:     data.uploadedAt,
                read:          false,
                persisted:     false,
              });
            }
          })
        );

        if (isFirstLoad.current) {
          isFirstLoad.current = false;
          newNotifs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
          setNotifications((prev) => {
            // Keep already-loaded persisted ones, add in-memory new_report ones
            const persisted = prev.filter((n) => n.persisted);
            const combined  = [...newNotifs, ...persisted];
            combined.sort((a, b) =>
              (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
            );
            return combined;
          });
        } else if (newNotifs.length > 0) {
          setNotifications((prev) => {
            const combined = [...newNotifs, ...prev];
            combined.sort((a, b) =>
              (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
            );
            return combined;
          });
        }
      },
      (err) => console.error("Uploads listener error:", err)
    );

    return () => unsub();
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────

  // Permanently removes a notification — deletes from Firestore if persisted,
  // marks upload doc as read if it's an in-memory new_report
  const dismissNotif = useCallback(async (notif) => {
    try {
      if (notif.persisted && notif.firestoreRef) {
        // Delete the doc from the notifications collection entirely
        await deleteDoc(notif.firestoreRef);
      } else if (notif.type === "new_report" && notif.docRef) {
        // In-memory new_report — just mark the upload as read
        await updateDoc(notif.docRef, { read: true });
      }
    } catch (_) {}
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Delete all persisted notifications, mark in-memory ones as read
    const promises = notifications.map((n) => {
      if (n.persisted && n.firestoreRef)
        return deleteDoc(n.firestoreRef).catch(() => {});
      if (n.type === "new_report" && n.docRef)
        return updateDoc(n.docRef, { read: true }).catch(() => {});
      return Promise.resolve();
    });
    await Promise.all(promises);
    // Clear entire list from UI immediately
    setNotifications([]);
  }, [notifications]);

  const handleNotifClick = useCallback(async (notif) => {
    // Remove from UI immediately so panel feels snappy
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setIsNotifOpen(false);
    // Delete / dismiss in background
    await dismissNotif(notif);
    navigate(`/reports?highlight=${notif.docId}`);
  }, [dismissNotif, navigate]);

  const handleLogout = async () => {
    try { await auth.signOut(); navigate("/login"); }
    catch (e) { console.error(e); }
  };

  // ── Click outside ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setIsProfileOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target))   setIsNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = notifications.filter((n) => {
    if (filter === "unread")       return !n.read;
    if (filter === "changes")      return n.type === "status_change";
    if (filter === "new")          return n.type === "new_report";
    return true;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <header className="h-16 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-between px-6 shadow-lg border-b border-gray-700">
      <div className="flex-1 max-w-xl" />

      <div className="flex items-center space-x-4">

        {/* ── Notifications ── */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((v) => !v)}
            className="relative p-2 rounded-lg hover:bg-gray-700/50 transition-all group"
          >
            <FaBell className="text-xl text-gray-300 group-hover:text-white transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-gray-900 animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-[440px] bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden">

              {/* Panel header */}
              <div className="p-4 text-white" style={{ background: "linear-gradient(to right, #111827, #1f2937)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base">Notifications</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {unreadCount} unread · {notifications.length} total
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1.5">
                  {[
                    { key: "all",     label: "All" },
                    { key: "unread",  label: "Unread" },
                    { key: "changes", label: "Status Changes" },
                    { key: "new",     label: "New Reports" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setFilter(key)}
                      className={`text-xs px-3 py-1 rounded-full transition-colors font-medium ${
                        filter === key
                          ? "bg-white text-gray-900"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <ul className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
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
                  <li className="px-4 py-10 text-center text-gray-400">
                    <FaInbox className="mx-auto text-3xl text-gray-200 mb-2" />
                    <p className="text-sm">No notifications here</p>
                  </li>
                )}
              </ul>

              {/* Footer */}
              <div className="p-3 text-center border-t bg-gray-50">
                <Link
                  to="/reports"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 hover:underline transition"
                >
                  View all reports →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-8 w-px bg-gray-700" />

        {/* ── Profile ── */}
        <div className="flex items-center space-x-3 relative" ref={profileRef}>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{getDisplayName()}</p>
            <p className="text-xs text-gray-400">{formatRoleName(userData?.role)}</p>
          </div>
          <button
            onClick={() => setIsProfileOpen((v) => !v)}
            className="relative focus:outline-none group"
          >
            <FaUserCircle className="w-10 h-10 text-gray-300 group-hover:text-white transition-colors" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
          </button>

          {isProfileOpen && (
            <div className="absolute top-14 right-0 w-56 bg-white rounded-xl shadow-2xl text-gray-800 border border-gray-200 overflow-hidden z-50">
              <div className="p-4 text-white" style={{ background: "linear-gradient(to right, #111827, #1f2937)" }}>
                <p className="font-semibold">{getDisplayName()}</p>
                <p className="text-xs text-gray-300 mt-0.5">{userData?.email}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRoleName(userData?.role)}</p>
              </div>
              <ul className="py-2">
                <li>
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2.5 hover:bg-gray-50 transition text-sm"
                  >
                    <FaUserCircle className="mr-3 text-gray-400" /> My Profile
                  </Link>
                </li>
                <li className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2.5 hover:bg-red-50 transition text-red-600 text-sm font-medium"
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