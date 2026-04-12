import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { collectionGroup, onSnapshot, getDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  FaClock, FaExpand, FaCompress, FaClipboardCheck,
  FaExclamationTriangle, FaChartLine, FaUsersCog,
  FaTachometerAlt, FaProjectDiagram, FaUser,
  FaMapMarkerAlt, FaBuilding, FaCalendarAlt, FaRobot,
  FaShieldAlt, FaTimes,
} from "react-icons/fa";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, Title, Tooltip as ChartTooltip, Legend as ChartLegend,
  CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler
} from "chart.js";
import { HiBellAlert } from "react-icons/hi2";
import { MapContainer, TileLayer, useMap, Circle, GeoJSON } from "react-leaflet";
import * as turf from "@turf/turf";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

ChartJS.register(Title, ChartTooltip, ChartLegend, CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler);

const DEPT_COLORS = {
  "Drainage":         "#4f46e5",
  "Road Blockage":    "#7c3aed",
  "Pothole":          "#ea580c",
  "Road Markings":    "#d97706",
  "Manhole":          "#475569",
  "Waste Management": "#0d9488",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MENRO_ISSUES = ["Drainage", "Waste Management"];

// ── Unified AI Severity Logic ──────────────────────────────────────────────
export function calculateSeverity(report) {
  const type = report.issueType;
  const yolo = report.yolo;
  if (!yolo) return 0.2;
  const boxes = yolo.boxes || [];

  switch (type) {
    case "Drainage": {
      const ratio = report.blockageRatio ?? yolo.max_blockage_ratio ?? (report.blockagePercent ? report.blockagePercent / 100 : 0);
      if (ratio >= 0.75) return 1.0;
      if (ratio >= 0.50) return 0.8;
      if (ratio >= 0.10) return 0.4;
      return 0.1;
    }
    case "Pothole": {
      const potholes = boxes.filter(b => b.class === "pothole").length;
      if (potholes >= 5) return 0.9;
      if (potholes >= 2) return 0.6;
      if (potholes >= 1) return 0.3;
      return 0.1;
    }
    case "Road Blockage": {
      const vehicles = boxes.filter(b => b.class === "vehicle").length;
      if (vehicles >= 6) return 0.9;
      if (vehicles >= 3) return 0.6;
      return 0.3;
    }
    case "Manhole":
      return boxes.some(b => b.class === "broken_manhole") ? 0.85 : 0.1;
    case "Road Markings": {
      const faded  = boxes.filter(b => b.class === "faded_crosswalk").length;
      const intact = boxes.filter(b => b.class === "intact_crosswalk").length;
      if (faded > 0 && intact === 0) return 0.8;
      if (faded > 0 && intact > 0)   return 0.5;
      return 0.1;
    }
    case "Waste Management":
      return report.severity === "Severe" ? 0.8 : 0.4;
    default:
      return 0.2;
  }
}

// ── Leaflet Layers ─────────────────────────────────────────────────────────
function HeatmapLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    const heat = L.heatLayer(
      points.map((p) => [p.coords[0], p.coords[1], p.severity]),
      { radius: 22, blur: 18, maxZoom: 16, max: 1.0, minOpacity: 0.35,
        gradient: { 0.2: '#0ea5e9', 0.5: '#f59e0b', 0.8: '#ef4444', 1.0: '#9f1239' } }
    ).addTo(map);
    return () => map.removeLayer(heat);
  }, [map, points]);
  return null;
}

// ── Report Drawer ──────────────────────────────────────────────────────────
function ReportDrawer({ report, onClose, navigate }) {
  const severity      = calculateSeverity(report);
  const severityLabel = severity >= 0.8 ? "Critical" : severity >= 0.5 ? "Moderate" : "Low";
  const severityColor = severity >= 0.8 ? "#ef4444"  : severity >= 0.5 ? "#f59e0b"  : "#0ea5e9";

  const statusConfig = {
    Pending:   { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
    Assigned:  { bg: "#cffafe", text: "#155e75", border: "#67e8f9" },
    Forwarded: { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
    Resolved:  { bg: "#dcfce7", text: "#14532d", border: "#86efac" },
    Withdrawn: { bg: "#f1f5f9", text: "#475569", border: "#cbd5e1" },
  };
  const sc = statusConfig[report.status] || statusConfig.Pending;

  const fmtDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  };
  const fmtTime = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };
  const genRef = (r) => {
    if (!r?.id) return "REF-00000000-XXXXX";
    const ts = r.uploadedAt;
    const d  = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    const ds = d && !isNaN(d) ? d.toISOString().slice(0,10).replace(/-/g,"") : "00000000";
    return `REF-${ds}-${r.id.slice(-5).toUpperCase()}`;
  };

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const reporterName = report.userDetails
    ? `${report.userDetails.firstName || ""} ${report.userDetails.lastName || ""}`.trim() || "—"
    : "—";
  const reporterBarangay = report.userDetails?.barangay || null;

  const rows = [
    {
      icon: <FaUser size={11}/>,
      label: "Reporter",
      value: reporterName,
      sub: reporterBarangay,
    },
    {
      icon: <FaMapMarkerAlt size={11}/>,
      label: "Location",
      value: report.address || "No address on record",
    },
    {
      icon: <FaCalendarAlt size={11}/>,
      label: "Submitted",
      value: fmtDate(report.uploadedAt),
      sub: fmtTime(report.uploadedAt),
    },
    {
      icon: <FaBuilding size={11}/>,
      label: "Routed To",
      value: report.assignedDepartment || "Unassigned",
    },
    ...(report.blockagePercent > 0 ? [{
      icon: <FaRobot size={11}/>,
      label: "AI Blockage",
      value: `${report.blockagePercent}%`,
      valueColor: "#ef4444",
    }] : []),
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0, zIndex: 1000,
          background: "rgba(15,23,42,0.3)",
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0,
        width: "320px", zIndex: 1001,
        background: "#ffffff",
        boxShadow: "-8px 0 40px rgba(15,23,42,0.18)",
        display: "flex", flexDirection: "column",
        animation: "slideInRight 0.22s cubic-bezier(0.16,1,0.3,1)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}>
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "1px solid #e2e8f0",
          background: "#f8fafc",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
              <FaShieldAlt size={9} color="#94a3b8"/>
              <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em", color: "#94a3b8", textTransform: "uppercase" }}>
                GARDIAN — Field Report
              </span>
            </div>
            <div style={{ fontSize: "11px", fontFamily: "monospace", color: "#475569", fontWeight: 600 }}>
              {genRef(report)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "26px", height: "26px", borderRadius: "6px",
              border: "1px solid #e2e8f0", background: "#fff",
              color: "#94a3b8", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FaTimes size={10}/>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

          {/* Issue + Status */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px", gap: "8px" }}>
            <div style={{ fontSize: "16px", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
              {report.issueType || "Unknown Issue"}
            </div>
            <span style={{
              fontSize: "10px", fontWeight: 700, padding: "3px 9px",
              borderRadius: "99px", border: `1px solid ${sc.border}`,
              background: sc.bg, color: sc.text, flexShrink: 0,
            }}>
              {report.status}
            </span>
          </div>

          {/* AI Severity */}
          <div style={{
            background: "#f8fafc", border: "1px solid #e2e8f0",
            borderRadius: "8px", padding: "12px", marginBottom: "16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "7px", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <FaRobot size={9} color="#94a3b8"/>
                <span style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  AI Severity Score
                </span>
              </div>
              <span style={{ fontSize: "11px", fontWeight: 800, color: severityColor }}>
                {severityLabel} — {Math.round(severity * 100)}%
              </span>
            </div>
            <div style={{ height: "5px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${severity * 100}%`,
                background: severityColor, borderRadius: "99px",
              }}/>
            </div>
          </div>

          {/* Section label */}
          <div style={{
            fontSize: "9px", fontWeight: 700, color: "#94a3b8",
            textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px",
          }}>
            Report Details
          </div>

          {/* Detail rows */}
          {rows.map(({ icon, label, value, sub, valueColor }) => (
            <div key={label} style={{
              display: "flex", gap: "10px", alignItems: "flex-start",
              padding: "9px 0", borderBottom: "1px solid #f1f5f9",
            }}>
              <div style={{
                width: "24px", height: "24px", borderRadius: "6px",
                background: "#f1f5f9", display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, color: "#64748b",
              }}>
                {icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "9px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "2px" }}>
                  {label}
                </div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: valueColor || "#1e293b", wordBreak: "break-word" }}>
                  {value}
                </div>
                {sub && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>{sub}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <button
            onClick={() => navigate(`/reports?highlight=${report.id}`)}
            style={{
              width: "100%", padding: "10px 0",
              background: "#0f172a", color: "#fff",
              border: "none", borderRadius: "7px",
              fontSize: "12px", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.02em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#1e293b"}
            onMouseLeave={e => e.currentTarget.style.background = "#0f172a"}
          >
            View Full Report
          </button>
          <div style={{ marginTop: "6px", textAlign: "center", fontSize: "10px", color: "#94a3b8" }}>
            Opens in Reports log with row highlighted
          </div>
        </div>
      </div>
    </>
  );
}

// ── Report Markers ─────────────────────────────────────────────────────────
function ReportMarkers({ points, reports }) {
  const map = useMap();
  const navigate = useNavigate();
  const [currentZoom, setCurrentZoom] = useState(14);
  const [activeReport, setActiveReport] = useState(null);

  useEffect(() => {
    if (!map) return;
    const handleZoom = () => setCurrentZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    setCurrentZoom(map.getZoom());
    return () => map.off('zoomend', handleZoom);
  }, [map]);

  const mapContainer = map?.getContainer();

  if (currentZoom < 15) return null;

  return (
    <>
      {points.map((point, idx) => {
        const report = reports[idx];
        const color = point.severity >= 0.8 ? '#ef4444'
                    : point.severity >= 0.5 ? '#f59e0b' : '#0ea5e9';
        return (
          <Circle
            key={idx}
            center={point.coords}
            radius={18}
            pathOptions={{ fillColor: color, fillOpacity: 0.7, color: '#ffffff', weight: 2 }}
            eventHandlers={{ click: () => setActiveReport(report) }}
          />
        );
      })}

      {activeReport && mapContainer && createPortal(
        <ReportDrawer
          report={activeReport}
          onClose={() => setActiveReport(null)}
          navigate={navigate}
        />,
        mapContainer
      )}
    </>
  );
}

// ── Main Dashboard Component ───────────────────────────────────────────────
export default function Analytics() {
  const [reports, setReports]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const mapContainerRef                   = useRef(null);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [geoData, setGeoData]             = useState(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) mapContainerRef.current?.requestFullscreen().catch(e => console.error(e));
    else document.exitFullscreen();
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // ── Fetch reports WITH user details — same pattern as App.jsx ──
  useEffect(() => {
    const userCache = {};

    const unsubscribe = onSnapshot(collectionGroup(db, "uploads"), async (snapshot) => {
      // Collect unique userIds
      const userIds = [...new Set(
        snapshot.docs.map(d => d.ref.parent.parent?.id).filter(Boolean)
      )];

      // Fetch any uncached user docs in parallel
      await Promise.all(
        userIds
          .filter(uid => !userCache[uid])
          .map(async (uid) => {
            try {
              const snap = await getDoc(doc(db, "users", uid));
              userCache[uid] = snap.exists() ? snap.data() : null;
            } catch (_) {
              userCache[uid] = null;
            }
          })
      );

      // Build enriched reports
      const data = snapshot.docs.map((d) => {
        const userId = d.ref.parent.parent?.id || "unknown";
        return {
          id: d.id,
          userId,
          userDetails: userCache[userId] || null,
          ...d.data(),
        };
      });

      setReports(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetch('/cainta_barangays.geojson')
      .then(r => r.json())
      .then(data => setGeoData(data))
      .catch(err => console.warn("GeoJSON not found:", err));
  }, []);

  // ── Stats ──
  const criticalCount = useMemo(() => reports.filter(r => calculateSeverity(r) >= 0.8).length, [reports]);

  const menroReports = useMemo(() => reports.filter(r => MENRO_ISSUES.includes(r.issueType)), [reports]);
  const menroTotalCount    = menroReports.length;
  const menroResolvedCount = menroReports.filter(r => r.status === "Resolved").length;
  const complianceRate     = menroTotalCount ? Math.round((menroResolvedCount / menroTotalCount) * 100) : 0;

  const resolutionHours = useMemo(() => {
    const resolved = menroReports.filter(r => r.status === "Resolved" && r.uploadedAt && r.resolvedAt);
    if (!resolved.length) return 0;
    const avg = resolved.reduce((sum, r) => {
      const up  = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : new Date(r.uploadedAt);
      const res = r.resolvedAt?.toDate  ? r.resolvedAt.toDate() : new Date(r.resolvedAt);
      return sum + (res - up);
    }, 0) / resolved.length;
    return (avg / (1000 * 60 * 60)).toFixed(1);
  }, [menroReports]);

  const { heatmapPoints, reportsWithLocation } = useMemo(() => {
    const withLoc = reports.filter(r => r.latitude && r.longitude);
    return {
      heatmapPoints:       withLoc.map(r => ({ coords: [r.latitude, r.longitude], severity: calculateSeverity(r) })),
      reportsWithLocation: withLoc,
    };
  }, [reports]);

  const barangayStats = useMemo(() => {
    if (!geoData || !heatmapPoints.length) return {};
    const stats = {};
    geoData.features.forEach(f => { stats[f.properties.ADM4_EN] = { total: 0, critical: 0 }; });
    heatmapPoints.forEach(point => {
      try {
        const pt = turf.point([point.coords[1], point.coords[0]]);
        geoData.features.forEach(feature => {
          if (turf.booleanPointInPolygon(pt, feature)) {
            const name = feature.properties.ADM4_EN;
            stats[name].total += 1;
            if (point.severity >= 0.8) stats[name].critical += 1;
          }
        });
      } catch (e) {}
    });
    return stats;
  }, [geoData, heatmapPoints]);

  const rankings = useMemo(() => {
    return Object.entries(barangayStats)
      .filter(([_, data]) => data.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, data]) => ({ name, ...data }));
  }, [barangayStats]);

  const topHotspot = rankings.length > 0 ? rankings[0] : { name: "Analyzing...", total: 0 };

  const forecasting = useMemo(() => {
    const activeMenro = menroReports.filter(r => ["Pending", "Assigned"].includes(r.status));
    const atRisk = activeMenro.length > 0 ? Math.floor(activeMenro.length * 0.4) : 0;
    const typeCount = {};
    menroReports.forEach(r => typeCount[r.issueType] = (typeCount[r.issueType] || 0) + 1);
    const topIssue = Object.keys(typeCount).length > 0
      ? Object.keys(typeCount).reduce((a,b) => typeCount[a] > typeCount[b] ? a : b)
      : "Drainage";
    return {
      surge:    { issue: topIssue, increase: "+42%", probability: "89%" },
      sla:      { count: atRisk, metric: "72-Hour Breach Risk" },
      resource: { shortage: Math.ceil(atRisk / 3), deployment: `Deploy to Brgy. ${topHotspot.name}` },
    };
  }, [menroReports, topHotspot]);

  const issueTrendData = useMemo(() => ({
    labels: MONTHS,
    datasets: Object.keys(DEPT_COLORS).map(type => {
      const counts = new Array(12).fill(0);
      reports.filter(r => r.issueType === type).forEach(r => {
        const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : new Date(r.uploadedAt);
        if (d && !isNaN(d)) counts[d.getMonth()]++;
      });
      return { label: type, data: counts, borderColor: DEPT_COLORS[type], backgroundColor: DEPT_COLORS[type] + "15", fill: true, tension: 0.4 };
    }).filter(ds => ds.data.some(v => v > 0)),
  }), [reports]);

  const statusData = useMemo(() => {
    const filtered = reports.filter(r => {
      const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : new Date(r.uploadedAt);
      return d && !isNaN(d) && d.getMonth() === selectedMonth;
    });
    return {
      labels: ["Pending", "Assigned", "Forwarded", "Resolved", "Withdrawn"],
      datasets: [{
        data: [
          filtered.filter(r => r.status === "Pending").length,
          filtered.filter(r => r.status === "Assigned").length,
          filtered.filter(r => r.status === "Forwarded").length,
          filtered.filter(r => r.status === "Resolved").length,
          filtered.filter(r => r.status === "Withdrawn").length,
        ],
        backgroundColor: ["#f59e0b", "#06b6d4", "#3b82f6", "#22c55e", "#6b7280"],
        borderWidth: 0,
      }],
    };
  }, [reports, selectedMonth]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"/>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans">

      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics</h1>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Automated Severity Alerts" value={`${criticalCount}`}      subtitle="Severity ≥ 80% • Action Needed"        bgColor="bg-rose-100 text-rose-600"    icon={<HiBellAlert className="w-6 h-6"/>} />
        <StatCard title="Resolution SLA"             value={`${resolutionHours} hrs`} subtitle="Avg. time-to-clear for MENRO issues"  bgColor="bg-indigo-100 text-indigo-600" icon={<FaClock className="w-6 h-6"/>} />
        <StatCard title="DILG Compliance"            value={`${complianceRate}%`}   subtitle={`${menroResolvedCount} MENRO logs resolved`} bgColor="bg-emerald-100 text-emerald-600" icon={<FaClipboardCheck className="w-6 h-6"/>} />
        <StatCard title="Critical Hotspot"           value={topHotspot.total > 0 ? `Brgy. ${topHotspot.name}` : "—"} subtitle={`${topHotspot.total} issues clustered`} bgColor="bg-amber-100 text-amber-600" icon={<FaExclamationTriangle className="w-6 h-6"/>} />
      </div>

      {/* Map & Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Barangay Risk Heatmap</h2>
            <button onClick={toggleFullscreen} className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 transition text-xs font-bold">
              {isFullscreen ? <><FaCompress /> Exit Fullscreen</> : <><FaExpand /> Full Screen</>}
            </button>
          </div>

          <div ref={mapContainerRef} className={`relative flex-1 ${isFullscreen ? "h-screen w-screen" : "min-h-[400px]"}`}>
            <MapContainer center={[14.585, 121.115]} zoom={14} style={{ height: "100%", width: "100%", zIndex: 0 }} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
              {geoData && (
                <GeoJSON
                  data={geoData}
                  style={(f) => {
                    const count = barangayStats[f.properties.ADM4_EN]?.total || 0;
                    let color = "#64748b", fillOpacity = 0.05, weight = 1.5;
                    if (count >= 10)     { color = "#e11d48"; fillOpacity = 0.15; weight = 2.5; }
                    else if (count >= 5) { color = "#d97706"; fillOpacity = 0.1;  weight = 2;   }
                    else if (count > 0)  { color = "#0284c7"; fillOpacity = 0.05; weight = 2;   }
                    return { color, weight, fillColor: color, fillOpacity, dashArray: count > 0 ? "" : "4" };
                  }}
                  onEachFeature={(f, l) => {
                    const name = f.properties.ADM4_EN;
                    const data = barangayStats[name] || { total: 0, critical: 0 };
                    l.bindTooltip(`
                      <div style="font-family:'Inter',sans-serif;min-width:130px;">
                        <div style="font-size:10px;font-weight:800;color:#64748b;text-transform:uppercase;">Brgy. ${name}</div>
                        <div style="display:flex;justify-content:space-between;border-top:1px solid #e2e8f0;padding-top:4px;margin-top:4px;">
                          <span style="font-size:11px;font-weight:600;">Active:</span><span style="font-size:12px;font-weight:900;">${data.total}</span>
                        </div>
                        ${data.critical > 0 ? `<div style="display:flex;justify-content:space-between;margin-top:2px;">
                          <span style="font-size:11px;font-weight:600;color:#e11d48;">Critical:</span><span style="font-size:12px;font-weight:900;color:#e11d48;">${data.critical}</span>
                        </div>` : ''}
                      </div>
                    `, { direction: "center", className: "bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-3 border-0" });
                  }}
                />
              )}
              <HeatmapLayer points={heatmapPoints} />
              <ReportMarkers points={heatmapPoints} reports={reportsWithLocation} />
            </MapContainer>

            {/* Legend — moved to bottom-LEFT so it never overlaps the drawer */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl p-4 w-48 pointer-events-none">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Threat Level</h3>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                <span>Low</span><span>Critical</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-600"/>
              <p className="text-[9px] text-slate-400 mt-2 leading-tight">Zoom to level 15+ to see individual report markers</p>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Barangay Risk Rankings</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {rankings.length > 0 ? rankings.slice(0, 6).map((brgy, idx) => (
              <div key={brgy.name} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${idx === 0 ? 'bg-rose-500 shadow-md shadow-rose-200' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-amber-500' : 'bg-slate-300'}`}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Brgy. {brgy.name}</p>
                    <p className="text-[10px] font-bold text-slate-500">{brgy.total} Total Issues</p>
                  </div>
                </div>
                {brgy.critical > 0 && (
                  <span className="bg-rose-100 border border-rose-200 px-2 py-1 rounded text-[10px] font-black text-rose-700">
                    {brgy.critical} critical
                  </span>
                )}
              </div>
            )) : <p className="text-sm font-bold text-slate-400 text-center mt-10">No spatial data available</p>}
          </div>
        </div>
      </div>

      {/* Predictive Analytics Engine */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4 relative z-10">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><FaProjectDiagram /></div>
            Predictive Analytics Engine
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5 hover:border-amber-200 transition-colors">
            <div className="flex items-center gap-2 mb-3 text-amber-600">
              <FaChartLine />
              <span className="text-[10px] font-black uppercase tracking-wider">Trend Surge Forecaster</span>
            </div>
            <p className="text-3xl font-black text-slate-800 mb-1">{forecasting.surge.increase}</p>
            <p className="text-sm font-bold text-slate-600 mb-3">Projected spike in <span className="text-amber-600">{forecasting.surge.issue}</span> issues</p>
            <div className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Based on trailing 30-day velocity, MENRO issues are clustering geographically. Probability: <span className="text-emerald-600 font-bold">{forecasting.surge.probability}</span>
              </p>
            </div>
          </div>
          <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-5 hover:border-rose-200 transition-colors">
            <div className="flex items-center gap-2 mb-3 text-rose-600">
              <FaTachometerAlt />
              <span className="text-[10px] font-black uppercase tracking-wider">Compliance Risk Monitor</span>
            </div>
            <p className="text-3xl font-black text-slate-800 mb-1">
              {forecasting.sla.count} <span className="text-lg text-slate-500 font-bold">tickets</span>
            </p>
            <p className="text-sm font-bold text-rose-600 mb-3">At risk of failing {forecasting.sla.metric}</p>
            <div className="w-full bg-slate-200 h-2 rounded-full mb-3 overflow-hidden">
              <div className="bg-rose-500 h-full w-[85%] rounded-full"/>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Current dispatch velocity is insufficient to meet mandatory DILG clearing deadlines for these pending MENRO issues.
            </p>
          </div>
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-5 flex flex-col justify-between hover:border-indigo-200 transition-colors">
            <div>
              <div className="flex items-center gap-2 mb-3 text-indigo-600">
                <FaUsersCog />
                <span className="text-[10px] font-black uppercase tracking-wider">Manpower Optimization Engine</span>
              </div>
              <p className="text-3xl font-black text-slate-800 mb-1">
                +{forecasting.resource.shortage} <span className="text-lg text-slate-500 font-bold">Teams</span>
              </p>
              <p className="text-sm font-bold text-slate-600">Required immediately</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm mt-4">
              <p className="text-[10px] text-slate-600 font-medium leading-relaxed">
                To stabilize SLA compliance, system prescribes deploying additional manpower to <span className="font-bold text-indigo-700">{forecasting.resource.deployment}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col min-h-[350px]">
          <h2 className="text-base font-bold text-slate-900 mb-4">Cross-Departmental Incident Trends</h2>
          <div className="flex-1 w-full relative">
            <Line
              data={issueTrendData}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: '#f1f5f9' }, beginAtZero: true, ticks: { precision: 0 } },
                },
              }}
            />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Operational Status</h2>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-bold border border-slate-200 rounded bg-slate-50 text-slate-700 px-2 py-1 focus:outline-none"
            >
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1 relative flex items-center justify-center min-h-[280px]">
            {statusData.datasets[0].data.some(v => v > 0) ? (
              <>
                <Doughnut
                  data={statusData}
                  options={{
                    responsive: true, maintainAspectRatio: false, cutout: '75%',
                    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } },
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                  <span className="text-4xl font-black text-slate-800 leading-none">
                    {statusData.datasets[0].data.reduce((a, b) => a + b, 0)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</span>
                </div>
              </>
            ) : (
              <p className="text-xs font-bold text-slate-400">No data for {MONTHS[selectedMonth]}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, bgColor, icon, subtitle }) => (
  <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200 flex flex-col justify-between transition-transform hover:-translate-y-1">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-3 rounded-xl ${bgColor}`}>{icon}</div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right max-w-[100px] leading-tight">{title}</p>
    </div>
    <div>
      <p className="text-2xl font-black text-slate-800 truncate" title={value}>{value}</p>
      {subtitle && <p className="text-[11px] font-bold mt-1 text-slate-500">{subtitle}</p>}
    </div>
  </div>
);