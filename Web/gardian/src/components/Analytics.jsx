import React, { useState, useEffect, useMemo, useRef } from "react";
import { collectionGroup, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { FaClock, FaExpand, FaCompress, FaRobot, FaClipboardCheck, FaExclamationTriangle } from "react-icons/fa";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, Title, Tooltip as ChartTooltip, Legend as ChartLegend,
  CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler
} from "chart.js";
import { MapContainer, TileLayer, useMap, Circle, Popup, GeoJSON } from "react-leaflet";
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
    case "Manhole": {
      const isDamaged = boxes.some(b => b.class === "broken_manhole");
      return isDamaged ? 0.85 : 0.1;
    }
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

// ── Heatmap Layer ────────────────────────────────────────────────────────────
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

function ReportMarkers({ points, reports }) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(14);
  useEffect(() => {
    if (!map) return;
    const handleZoom = () => setCurrentZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    setCurrentZoom(map.getZoom());
    return () => map.off('zoomend', handleZoom);
  }, [map]);
  if (currentZoom < 15) return null;
  return (
    <>
      {points.map((point, idx) => {
        const report = reports[idx];
        const color = point.severity >= 0.8 ? '#ef4444' : point.severity >= 0.5 ? '#f59e0b' : '#0ea5e9';
        return (
          <Circle key={idx} center={point.coords} radius={18}
            pathOptions={{ fillColor: color, fillOpacity: 0.7, color: '#ffffff', weight: 2 }}>
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <div style={{ fontWeight: '800', fontSize: '12px', color: '#1e293b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {report?.issueType || 'Unknown Issue'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5' }}>
                  <div>Status: <span style={{ fontWeight: '700', color: report?.status === 'Resolved' ? '#10b981' : '#f59e0b' }}>{report?.status}</span></div>
                  <div>Location: <span style={{ fontWeight: '500' }}>{report?.address || 'N/A'}</span></div>
                  {report?.blockagePercent > 0 && (
                    <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #e2e8f0' }}>
                      AI Blockage: <span style={{ fontWeight: '800', color: '#ef4444' }}>{report.blockagePercent}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Analytics() {
  const [reports, setReports]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const mapContainerRef                   = useRef(null);
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [geoData, setGeoData]             = useState(null);

  // Native fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      mapContainerRef.current?.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  };

  // Sync state with browser fullscreen events (ESC key support)
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  // Fetch reports
  useEffect(() => {
    const unsubscribe = onSnapshot(collectionGroup(db, "uploads"), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setReports(all);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch GeoJSON
  useEffect(() => {
    fetch('/cainta_barangays.geojson')
      .then(r => r.json())
      .then(data => setGeoData(data))
      .catch(err => console.warn("GeoJSON not found:", err));
  }, []);

  // Derived stats
  const totalCount     = reports.length;
  const resolvedCount  = reports.filter(r => r.status === "Resolved").length;
  const criticalCount  = useMemo(() => reports.filter(r => calculateSeverity(r) >= 0.8).length, [reports]);
  const complianceRate = totalCount ? Math.round((resolvedCount / totalCount) * 100) : 0;

  const resolutionHours = useMemo(() => {
    const resolved = reports.filter(r => r.status === "Resolved" && r.uploadedAt && r.resolvedAt);
    if (!resolved.length) return 0;
    const avg = resolved.reduce((sum, r) => {
      const up  = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : new Date(r.uploadedAt);
      const res = r.resolvedAt?.toDate  ? r.resolvedAt.toDate() : new Date(r.resolvedAt);
      return sum + (res - up);
    }, 0) / resolved.length;
    return (avg / (1000 * 60 * 60)).toFixed(1);
  }, [reports]);

  const { heatmapPoints, reportsWithLocation } = useMemo(() => {
    const withLoc = reports.filter(r => r.latitude && r.longitude);
    return {
      heatmapPoints: withLoc.map(r => ({ coords: [r.latitude, r.longitude], severity: calculateSeverity(r) })),
      reportsWithLocation: withLoc,
    };
  }, [reports]);

  // ── Point-in-Polygon: compute which barangay has the most GPS-confirmed reports ──
  // Uses Turf.js ray-casting — not a count of the `barangay` field, but actual
  // geospatial intersection of each GPS coordinate against the GeoJSON polygons.
  const topHotspot = useMemo(() => {
    if (!geoData || !heatmapPoints.length) return { name: "Analyzing…", count: 0 };

    const tally = {};

    heatmapPoints.forEach(point => {
      // Turf expects [longitude, latitude] — our coords are [lat, lng] so swap
      const pt = turf.point([point.coords[1], point.coords[0]]);

      geoData.features.forEach(feature => {
        if (turf.booleanPointInPolygon(pt, feature)) {
          const name = feature.properties.ADM4_EN;
          tally[name] = (tally[name] || 0) + 1;
        }
      });
    });

    if (!Object.keys(tally).length) return { name: "No GPS data", count: 0 };

    const [topName, topCount] = Object.entries(tally)
      .reduce((best, curr) => curr[1] > best[1] ? curr : best);

    return { name: topName, count: topCount };
  }, [geoData, heatmapPoints]);

  const issueTrendData = useMemo(() => ({
    labels: MONTHS,
    datasets: Object.keys(DEPT_COLORS).map(type => {
      const counts = new Array(12).fill(0);
      reports.filter(r => r.issueType === type).forEach(r => {
        const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : new Date(r.uploadedAt);
        if (d && !isNaN(d)) counts[d.getMonth()]++;
      });
      return {
        label: type,
        data: counts,
        borderColor: DEPT_COLORS[type],
        backgroundColor: DEPT_COLORS[type] + "15",
        pointBackgroundColor: DEPT_COLORS[type],
        fill: true, tension: 0.4, borderWidth: 2.5, pointRadius: 3,
      };
    }).filter(ds => ds.data.some(v => v > 0)),
  }), [reports]);

  const statusData = useMemo(() => {
    const filtered = reports.filter(r => {
      const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : new Date(r.uploadedAt);
      return d && !isNaN(d) && d.getMonth() === selectedMonth;
    });
    return {
      labels: ["Pending", "Assigned", "Resolved"],
      datasets: [{
        data: [
          filtered.filter(r => r.status === "Pending").length,
          filtered.filter(r => r.status === "Assigned").length,
          filtered.filter(r => r.status === "Resolved").length,
        ],
        backgroundColor: ["#f59e0b", "#3b82f6", "#10b981"],
        borderWidth: 0, hoverOffset: 4,
      }],
    };
  }, [reports, selectedMonth]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-indigo-600"/>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">

      {/* Header */}
      <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analytics</h1>

      {/* KPI Cards — layout identical to document version */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="AI-Flagged Critical"
          value={`${criticalCount}`}
          subtitle="Severity ≥ 80% • Action Needed"
          subtitleColor="text-rose-600"
          bgColor="bg-rose-100 text-rose-600"
          icon={<FaRobot className="w-6 h-6"/>}
        />
        <StatCard
          title="Resolution SLA"
          value={`${resolutionHours} hrs`}
          subtitle="Average time-to-clear"
          subtitleColor="text-indigo-600"
          bgColor="bg-indigo-100 text-indigo-600"
          icon={<FaClock className="w-6 h-6"/>}
        />
        <StatCard
          title="DILG Compliance Rate"
          value={`${complianceRate}%`}
          subtitle={`${resolvedCount} verified & resolved`}
          subtitleColor="text-emerald-600"
          bgColor="bg-emerald-100 text-emerald-600"
          icon={<FaClipboardCheck className="w-6 h-6"/>}
        />
        {/* 4th card — upgraded from raw count to Point-in-Polygon result */}
        <StatCard
          title="Critical Hotspot"
          value={topHotspot.count > 0 ? `Brgy. ${topHotspot.name}` : "—"}
          subtitle={topHotspot.count > 0 ? `${topHotspot.count} issues clustered` : "Awaiting GPS reports"}
          subtitleColor="text-amber-600"
          bgColor="bg-amber-100 text-amber-600"
          icon={<FaExclamationTriangle className="w-6 h-6"/>}
        />
      </div>

      {/* ── Geospatial Heatmap ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Card header — always outside / above the map */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Barangay Risk Heatmap</h2>
            {geoData && (
              <p className="text-[11px] font-bold text-slate-400 tracking-wide mt-0.5">
                Overlaid with Barangay Boundaries
              </p>
            )}
          </div>
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition font-bold text-xs"
          >
            {isFullscreen ? <><FaCompress /> Exit Fullscreen</> : <><FaExpand /> Full Screen</>}
          </button>
        </div>

        {/* Map wrapper — fullscreen target */}
        <div ref={mapContainerRef} style={{ height: "460px" }}>
          <MapContainer
            center={[14.585, 121.115]}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
            zoomControl
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution="&copy; CARTO"
            />
            {geoData && (
              <GeoJSON
                data={geoData}
                style={{ color: "#475569", weight: 1.5, fillColor: "#e2e8f0", fillOpacity: 0.12, dashArray: "4" }}
                onEachFeature={(f, l) =>
                  l.bindTooltip(
                    `<div style="font-weight:bold;font-size:12px">Brgy. ${f.properties.ADM4_EN}</div>`,
                    { direction: "center", className: "bg-white border-0 shadow text-xs" }
                  )
                }
              />
            )}
            <HeatmapLayer points={heatmapPoints} />
            <ReportMarkers points={heatmapPoints} reports={reportsWithLocation} />
          </MapContainer>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Trend line — 2/3 width */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col min-h-[400px]">
          <h2 className="text-base font-bold text-slate-900 mb-4">Cross-Departmental Incident Trends</h2>
          <div className="flex-1 w-full relative min-h-[300px]">
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

        {/* Doughnut — 1/3 width */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col min-h-[400px]">
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
                    responsive: true, maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } },
                  }}
                />
                {/* Centre label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: '30px' }}>
                  <span className="text-4xl font-black text-slate-800">
                    {statusData.datasets[0].data.reduce((a, b) => a + b, 0)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                </div>
              </>
            ) : (
              <p className="text-xs font-bold text-slate-400">No data for {MONTHS[selectedMonth]}</p>
            )}
          </div>
        </div>

      </div>

      {/* CSS: Leaflet fills the wrapper when in native fullscreen */}
      <style>{`
        div:fullscreen { background: #fff; }
        div:fullscreen .leaflet-container { height: 100% !important; width: 100% !important; }
        div:-webkit-full-screen .leaflet-container { height: 100% !important; width: 100% !important; }
        div:-moz-full-screen .leaflet-container { height: 100% !important; width: 100% !important; }
      `}</style>
    </div>
  );
}

// ── StatCard — layout retained exactly from document version ─────────────────
const StatCard = ({ title, value, bgColor, icon, subtitle, subtitleColor }) => (
  <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200 flex flex-col justify-between transition-transform hover:-translate-y-1">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-3 rounded-xl ${bgColor}`}>{icon}</div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right max-w-[100px] leading-tight">{title}</p>
    </div>
    <div>
      <p className="text-2xl font-black text-slate-800 truncate" title={value}>{value}</p>
      {subtitle && <p className={`text-[11px] font-bold mt-1 ${subtitleColor}`}>{subtitle}</p>}
    </div>
  </div>
);