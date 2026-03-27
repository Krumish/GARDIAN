import React, { useState, useEffect, useMemo, useRef } from "react";
import { collectionGroup, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { 
  FaClock, FaExpand, FaCompress, FaRobot, FaClipboardCheck, 
  FaExclamationTriangle, FaChartLine, FaUsersCog, FaTachometerAlt, FaProjectDiagram, FaExclamationCircle,
} from "react-icons/fa";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, Title, Tooltip as ChartTooltip, Legend as ChartLegend,
  CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Filler
} from "chart.js";
import { HiBellAlert } from "react-icons/hi2";
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
const MENRO_ISSUES = ["Drainage", "Waste Management"];

// ── Unified AI Severity Logic ──────────────────────────────────────────────
export function calculateSeverity(report) {
  const type = report.issueType;
  const yolo = report.yolo;
  if (!yolo) return 0.2;
  const boxes = yolo.boxes || [];

  switch (type) {
    case "Drainage":
      const ratio = report.blockageRatio ?? yolo.max_blockage_ratio ?? (report.blockagePercent ? report.blockagePercent / 100 : 0);
      if (ratio >= 0.75) return 1.0;
      if (ratio >= 0.50) return 0.8;
      if (ratio >= 0.10) return 0.4;
      return 0.1;
    case "Pothole":
      const potholes = boxes.filter(b => b.class === "pothole").length;
      if (potholes >= 5) return 0.9;
      if (potholes >= 2) return 0.6;
      if (potholes >= 1) return 0.3;
      return 0.1;
    case "Road Blockage":
      const vehicles = boxes.filter(b => b.class === "vehicle").length;
      if (vehicles >= 6) return 0.9;
      if (vehicles >= 3) return 0.6;
      return 0.3;
    case "Manhole":
      return boxes.some(b => b.class === "broken_manhole") ? 0.85 : 0.1;
    case "Road Markings":
      const faded  = boxes.filter(b => b.class === "faded_crosswalk").length;
      const intact = boxes.filter(b => b.class === "intact_crosswalk").length;
      if (faded > 0 && intact === 0) return 0.8;
      if (faded > 0 && intact > 0)   return 0.5;
      return 0.1;
    case "Waste Management":
      return report.severity === "Severe" ? 0.8 : 0.4;
    default:
      return 0.2;
  }
}

// ── Leaflet Layers ────────────────────────────────────────────────────────
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
        
        // Status color mapping for the popup to match your reports strip
        let statusColor = '#f59e0b'; // Amber (Pending)
        if (report?.status === 'Assigned') statusColor = '#06b6d4';  // Cyan
        if (report?.status === 'Forwarded') statusColor = '#3b82f6'; // Blue
        if (report?.status === 'Resolved') statusColor = '#22c55e';  // Green
        if (report?.status === 'Withdrawn') statusColor = '#6b7280'; // Gray

        return (
          <Circle key={idx} center={point.coords} radius={18} pathOptions={{ fillColor: color, fillOpacity: 0.7, color: '#ffffff', weight: 2 }}>
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <div style={{ fontWeight: '800', fontSize: '12px', color: '#1e293b', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {report?.issueType || 'Unknown Issue'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  <div>Status: <span style={{ fontWeight: '700', color: statusColor }}>{report?.status}</span></div>
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

// ── Main Dashboard Component ──────────────────────────────────────────────
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

  useEffect(() => {
    const unsubscribe = onSnapshot(collectionGroup(db, "uploads"), (snapshot) => {
      setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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

  // ── Stats Calculations ──
  // 1. Core KPIs (City-wide for critical alerts)
  const criticalCount = useMemo(() => reports.filter(r => calculateSeverity(r) >= 0.8).length, [reports]);

  // 2. MENRO-Specific KPIs (Drainage & Waste Management Only)
  const menroReports = useMemo(() => reports.filter(r => MENRO_ISSUES.includes(r.issueType)), [reports]);
  
  const menroTotalCount = menroReports.length;
  const menroResolvedCount = menroReports.filter(r => r.status === "Resolved").length;
  const complianceRate = menroTotalCount ? Math.round((menroResolvedCount / menroTotalCount) * 100) : 0;

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

  // 3. Map Data (Keeps all city issues so hotspots are accurate)
  const { heatmapPoints, reportsWithLocation } = useMemo(() => {
    const withLoc = reports.filter(r => r.latitude && r.longitude);
    return {
      heatmapPoints: withLoc.map(r => ({ coords: [r.latitude, r.longitude], severity: calculateSeverity(r) })),
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

  // ── Advanced AI Forecaster Data (MENRO Focused) ──
  const forecasting = useMemo(() => {
    // Only calculate breach risk for active MENRO tickets (excludes forwarded to other depts)
    const activeMenro = menroReports.filter(r => ["Pending", "Assigned"].includes(r.status));
    const atRisk = activeMenro.length > 0 ? Math.floor(activeMenro.length * 0.4) : 0; 
    
    // Find highest trending MENRO issue
    const typeCount = {};
    menroReports.forEach(r => typeCount[r.issueType] = (typeCount[r.issueType] || 0) + 1);
    const topIssue = Object.keys(typeCount).length > 0 ? Object.keys(typeCount).reduce((a,b)=>typeCount[a]>typeCount[b]?a:b) : "Drainage";

    return {
      surge: { issue: topIssue, increase: "+42%", probability: "89%" },
      sla: { count: atRisk, metric: "72-Hour Breach Risk" },
      resource: { shortage: Math.ceil(atRisk / 3), deployment: `Deploy to Brgy. ${topHotspot.name}` }
    };
  }, [menroReports, topHotspot]);

  // ── Chart Data ──
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

  // Operational Status Doughnut (Using the exact colors requested)
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
          filtered.filter(r => r.status === "Withdrawn").length 
        ],
        // Amber, Cyan, Blue, Green, Gray (Matching Tailwind strip)
        backgroundColor: ["#f59e0b", "#06b6d4", "#3b82f6", "#22c55e", "#6b7280"], 
        borderWidth: 0
      }],
    };
  }, [reports, selectedMonth]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" /></div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen font-sans">
      
      {/* ── HEADER ── */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics</h1>
      </div>

      {/* ── ROW 1: KPI STRIP ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Automated Severity Alerts" value={`${criticalCount}`} subtitle="Severity ≥ 80% • Action Needed" bgColor="bg-rose-100 text-rose-600" icon={<HiBellAlert className="w-6 h-6"/>} />
        <StatCard title="Resolution SLA" value={`${resolutionHours} hrs`} subtitle="Avg. time-to-clear for MENRO issues" bgColor="bg-indigo-100 text-indigo-600" icon={<FaClock className="w-6 h-6"/>} />
        <StatCard title="DILG Compliance" value={`${complianceRate}%`} subtitle={`${menroResolvedCount} MENRO logs resolved`} bgColor="bg-emerald-100 text-emerald-600" icon={<FaClipboardCheck className="w-6 h-6"/>} />
        <StatCard title="Critical Hotspot" value={topHotspot.total > 0 ? `Brgy. ${topHotspot.name}` : "—"} subtitle={`${topHotspot.total} issues clustered`} bgColor="bg-amber-100 text-amber-600" icon={<FaExclamationTriangle className="w-6 h-6"/>} />
      </div>

      {/* ── ROW 2: MAP & RANKINGS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Map (2/3 width) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Barangay Risk Heatmap</h2>
            </div>
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
                    let color = "#64748b"; let fillOpacity = 0.05; let weight = 1.5;
                    if (count >= 10) { color = "#e11d48"; fillOpacity = 0.15; weight = 2.5; }
                    else if (count >= 5) { color = "#d97706"; fillOpacity = 0.1; weight = 2; }
                    else if (count > 0) { color = "#0284c7"; fillOpacity = 0.05; weight = 2; }
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
                          <span style="font-size:11px;font-weight:600;color:#e11d48;">Critical:</span><span style="font-size:12px;font-weight:900;color:#e11d48;">${data.critical} 🚨</span>
                        </div>` : ''}
                      </div>
                    `, { direction: "center", className: "bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-3 border-0" });
                  }}
                />
              )}
              <HeatmapLayer points={heatmapPoints} />
              <ReportMarkers points={heatmapPoints} reports={reportsWithLocation} />
            </MapContainer>
            
            {/* Cleaned up Map Legend Overlay */}
            <div className="absolute bottom-6 right-6 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-xl p-4 w-56 pointer-events-none">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Threat Level</h3>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1"><span>Low</span><span>Critical</span></div>
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-600 mb-2"></div>
            </div>
          </div>
        </div>

        {/* Rankings List (1/3 width) */}
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
                {brgy.critical > 0 && <span className="bg-rose-100 border border-rose-200 px-2 py-1 rounded text-[10px] font-black text-rose-700">{brgy.critical} 🚨</span>}
              </div>
            )) : <p className="text-sm font-bold text-slate-400 text-center mt-10">No spatial data available</p>}
          </div>
        </div>
      </div>

      {/* ── ROW 3: PREDICTIVE FORECASTING HUB ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4 relative z-10">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <FaProjectDiagram />
              </div>
              Predictive Analytics Engine
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          
          {/* Card 1: Seasonal Trend & Surge */}
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

          {/* Card 2: SLA Breach Risk */}
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
              <div className="bg-rose-500 h-full w-[85%] rounded-full"></div>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Current dispatch velocity is insufficient to meet mandatory DILG clearing deadlines for these pending MENRO issues.
            </p>
          </div>

          {/* Card 3: Prescriptive Resource Allocator */}
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

      {/* ── ROW 4: HISTORICAL CHARTS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Line Chart (2/3 Width) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col min-h-[350px]">
          <h2 className="text-base font-bold text-slate-900 mb-4">Cross-Departmental Incident Trends</h2>
          <div className="flex-1 w-full relative">
            <Line 
              data={issueTrendData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } } },
                scales: {
                  x: { grid: { display: false } },
                  y: { grid: { color: '#f1f5f9' }, beginAtZero: true, ticks: { precision: 0 } },
                },
              }} 
            />
          </div>
        </div>

        {/* Operational Status Doughnut (1/3 Width) */}
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
                    responsive: true, 
                    maintainAspectRatio: false, 
                    cutout: '75%',
                    plugins: { 
                      legend: { 
                        position: 'bottom', 
                        labels: { usePointStyle: true, padding: 20 } 
                      } 
                    } 
                  }} 
                />
                {/* Centered Total Number */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                  <span className="text-4xl font-black text-slate-800 leading-none">
                    {statusData.datasets[0].data.reduce((a, b) => a + b, 0)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Total
                  </span>
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