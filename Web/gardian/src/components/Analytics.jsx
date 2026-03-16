import { useState, useEffect, useMemo } from "react";
import { collectionGroup, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { FaClock, FaExclamationTriangle, FaUsers, FaExpand, FaTimes } from "react-icons/fa";
import { FiCheckCircle } from "react-icons/fi";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, Title, Tooltip as ChartTooltip, Legend as ChartLegend,
  CategoryScale, LinearScale, PointElement, LineElement,
} from "chart.js";
import { MapContainer, TileLayer, useMap, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

ChartJS.register(Title, ChartTooltip, ChartLegend, CategoryScale, LinearScale, PointElement, LineElement);

// Heatmap Layer - Optimized for Cainta, Rizal with zoom-based blending
function HeatmapLayer({ points }) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(14);

  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', handleZoom);
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  useEffect(() => {
    if (!map || points.length === 0) return;
    
    // Adjust radius and blur based on zoom level
    const radius = currentZoom < 14 ? 35 : currentZoom < 16 ? 25 : 20;
    const blur = currentZoom < 14 ? 25 : currentZoom < 16 ? 20 : 15;
    
    // Enhanced heatmap with better colors and settings for Cainta
    const heat = L.heatLayer(
      points.map((p) => [p.coords[0], p.coords[1], p.severity]),
      { 
        radius: radius,
        blur: blur,
        maxZoom: 17,
        max: 1.0,
        minOpacity: 0.4,
        gradient: {
          0.0: '#00ff00',  // Green - Low
          0.3: '#ffff00',  // Yellow - Moderate
          0.5: '#ffa500',  // Orange - High
          0.7: '#ff4500',  // Orange-red - Very High
          1.0: '#ff0000'   // Red - Very High
        }
      }
    ).addTo(map);

    // Enhanced legend
    const legend = L.control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.innerHTML = `
        <div style="background:white;padding:12px;border-radius:10px;font-size:11px;box-shadow:0 4px 12px rgba(0,0,0,0.2);border:1px solid #e5e7eb;z-index:1000;position:relative">
          <div style="font-weight:700;margin-bottom:8px;font-size:12px;color:#1f2937">Risk Level</div>
          ${[
            ["#00ff00", "Low"],
            ["#ffff00", "Moderate"],
            ["#ffa500", "High"],
            ["#ff0000", "Very High"]
          ].map(([color, label]) => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
              <span style="width:16px;height:16px;background:${color};display:inline-block;border-radius:3px;border:1px solid rgba(0,0,0,0.1)"></span>
              <span style="color:#4b5563;font-size:11px">${label}</span>
            </div>
          `).join("")}
        </div>`;
      return div;
    };
    legend.addTo(map);

    return () => { 
      map.removeLayer(heat); 
      legend.remove(); 
    };
  }, [map, points, currentZoom]);
  
  return null;
}

// Report markers with circles - only show when zoomed in
function ReportMarkers({ points, reports }) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(14);

  useEffect(() => {
    if (!map) return;

    const handleZoom = () => {
      setCurrentZoom(map.getZoom());
    };

    map.on('zoomend', handleZoom);
    setCurrentZoom(map.getZoom());
    
    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map]);

  // Only show markers when zoomed in enough (zoom level 15 or higher)
  if (currentZoom < 15) return null;

  return (
    <>
      {points.map((point, idx) => {
        const report = reports[idx];
        const color = point.severity >= 0.8 ? '#ef4444' : 
                      point.severity >= 0.6 ? '#f97316' : 
                      point.severity >= 0.4 ? '#fbbf24' : '#10b981';
        
        return (
          <Circle
            key={idx}
            center={point.coords}
            radius={15}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.6,
              color: color,
              weight: 2
            }}
          >
            <Popup>
              <div style={{ minWidth: '180px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>
                  {report?.issueType || 'Unknown'}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>
                  <div>Status: <span style={{ fontWeight: '600' }}>{report?.status}</span></div>
                  <div>Location: {report?.address || 'N/A'}</div>
                  {report?.blockagePercent && (
                    <div>Blockage: {report.blockagePercent}%</div>
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

// HighRisk
function isHighRisk(report) {
  switch (report.issueType) {
    case "Drainage":
      return (report.blockagePercent || 0) >= 75;
    case "Manhole":
      return true;
    case "Pothole":
      return (report.severity === "Severe" || report.depth >= 10);
    case "Road Blockage":
      return true;
    case "Waste Management":
      return report.severity === "Severe";
    default:
      return false;
  }
}

function getSeverity(r) {
  if (r.issueType === "Drainage") {
    const bp = r.blockagePercent || 0;
    if (bp >= 75) return 1.0;  // Very High
    if (bp >= 50) return 0.7;  // High
    if (bp >= 25) return 0.4;  // Moderate
    return 0.2;  // Low
  }
  if (r.issueType === "Manhole") return 0.9;  // Very High
  if (r.issueType === "Road Blockage") return 0.85;  // Very High
  if (r.issueType === "Pothole") return 0.6;  // High
  if (r.issueType === "Waste Management") return 0.5;  // Moderate
  return 0.3;  // Low
}

function avgResolutionDays(reports) {
  const resolved = reports.filter((r) => r.status === "Resolved" && r.uploadedAt && r.resolvedAt);
  if (!resolved.length) return null;
  const avg = resolved.reduce((sum, r) => {
    const up = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : new Date(r.uploadedAt);
    const res = r.resolvedAt?.toDate ? r.resolvedAt.toDate() : new Date(r.resolvedAt);
    return sum + (res - up);
  }, 0) / resolved.length;
  return (avg / (1000 * 60 * 60 * 24)).toFixed(1);
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PIE_COLORS = ["#F59E0B", "#6B7280", "#10B981"];

// Main Component
export default function Analytics() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubscribe = onSnapshot(
      collectionGroup(db, "uploads"),
      async (snapshot) => {
        const all = await Promise.all(
          snapshot.docs.map(async (d) => {
            const userId = d.ref.parent.parent?.id || "unknown";
            let userDetails = null;
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) userDetails = userDoc.data();
            } catch (_) {}
            return { id: d.id, userId, userDetails, docRef: d.ref, ...d.data() };
          })
        );
        setReports(all);
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsubscribe();
  }, []);

  // Derived stats
  const pendingCount   = useMemo(() => reports.filter((r) => r.status === "Pending").length,   [reports]);
  const resolvedCount  = useMemo(() => reports.filter((r) => r.status === "Resolved").length,  [reports]);
  const withdrawnCount = useMemo(() => reports.filter((r) => r.status === "Withdrawn").length, [reports]);
  const totalCount     = reports.length;

  const highRiskCount = useMemo(() =>
    reports.filter((r) => isHighRisk(r)).length,
  [reports]);

  const uniqueUsers = useMemo(() =>
    new Set(reports.map((r) => r.userId).filter(Boolean)).size,
    [reports]);

  const resolutionDays = useMemo(() => avgResolutionDays(reports), [reports]);

  // Heatmap points with report data
  const { heatmapPoints, reportsWithLocation } = useMemo(() => {
    const withLocation = reports.filter((r) => r.latitude && r.longitude);
    const points = withLocation.map((r) => ({ 
      coords: [r.latitude, r.longitude], 
      severity: getSeverity(r) 
    }));
    return { heatmapPoints: points, reportsWithLocation: withLocation };
  }, [reports]);

  // Issue trend line chart
  const issueTrendData = useMemo(() => {
    const types = [
      { label: "Drainage",         color: "#3B82F6" },
      { label: "Pothole",          color: "#F59E0B" },
      { label: "Manhole",          color: "#8B5CF6" },
      { label: "Waste Management", color: "#10B981" },
    ];
    return {
      labels: MONTHS,
      datasets: types.map(({ label, color }) => {
        const counts = new Array(12).fill(0);
        reports
          .filter((r) => r.issueType === label)
          .forEach((r) => {
            const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : new Date(r.uploadedAt);
            if (d && !isNaN(d)) counts[d.getMonth()]++;
          });
        return {
          label,
          data: counts,
          borderColor: color,
          backgroundColor: color + "26",
          pointBackgroundColor: color,
          fill: false,
          tension: 0.3,
        };
      }),
    };
  }, [reports]);

  // Status distribution — filtered by selected month
  const statusByMonth = useMemo(() => {
    const filtered = reports.filter((r) => {
      const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : new Date(r.uploadedAt);
      return d && !isNaN(d) && d.getMonth() === selectedMonth;
    });
    return [
      { name: "Pending",   value: filtered.filter((r) => r.status === "Pending").length },
      { name: "Withdrawn", value: filtered.filter((r) => r.status === "Withdrawn").length },
      { name: "Resolved",  value: filtered.filter((r) => r.status === "Resolved").length },
    ];
  }, [reports, selectedMonth]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
  };

  // Loading 
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading real-time data...</p>
        </div>
      </div>
    );
  }

  // Render 
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Avg. Resolution Speed"
          value={resolutionDays ? `${resolutionDays} Days` : "N/A"}
          subtitle={`${resolvedCount} resolved`}
          subtitleColor="text-green-500"
          bgColor="bg-blue-50"
          icon={<FaClock className="text-blue-500 w-10 h-10" />}
        />
        <StatCard
          title="Active Citizens"
          value={`${uniqueUsers} Users`}
          subtitle={`${totalCount} submissions`}
          subtitleColor="text-green-500"
          bgColor="bg-emerald-50"
          icon={<FaUsers className="text-emerald-500 w-10 h-10" />}
        />
        <StatCard
          title="High-Risk Reports"
          value={`${highRiskCount} Reports`}
          subtitle="Action Required"
          subtitleColor="text-red-500"
          bgColor="bg-red-50"
          icon={<FaExclamationTriangle className="text-red-500 w-10 h-10" />}
        />
        <StatCard
          title="Resolved Reports"
          value={`${resolvedCount} Reports`}
          subtitle={totalCount ? `${Math.round((resolvedCount / totalCount) * 100)}% of Total` : "0%"}
          subtitleColor="text-indigo-500"
          bgColor="bg-purple-50"
          icon={<FiCheckCircle className="text-purple-500 w-10 h-10" />}
        />
      </div>

      {/* Heatmap */}
      <div className="bg-white p-6 rounded-xl shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Heatmap of Problem Areas</h2>
            <p className="text-xs text-gray-500 mt-1">Cainta, Rizal · {heatmapPoints.length} locations mapped</p>
          </div>
          <button
            onClick={() => setIsMapExpanded(true)}
            className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
          >
            <FaExpand /> Expand Map
          </button>
        </div>
        
        {heatmapPoints.length > 0 ? (
          <MapContainer
            center={[14.585, 121.115]}
            zoom={14}
            style={{ height: "450px", width: "100%", borderRadius: "12px" }}
            scrollWheelZoom={true}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatmapLayer points={heatmapPoints} />
            <ReportMarkers points={heatmapPoints} reports={reportsWithLocation} />
          </MapContainer>
        ) : (
          <div className="h-96 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-medium text-sm">No location data available</p>
            <p className="text-xs mt-1 text-gray-300">Reports with GPS coordinates will appear here</p>
          </div>
        )}
      </div>

      {/* Expanded Map Modal */}
      {isMapExpanded && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-white relative" style={{ zIndex: 10000 }}>
              <div>
                <h3 className="text-xl font-bold">Cainta Problem Areas Heatmap</h3>
                <p className="text-sm text-gray-500">{heatmapPoints.length} locations · Real-time data</p>
              </div>
              <button
                onClick={() => setIsMapExpanded(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <FaTimes className="text-xl text-gray-600" />
              </button>
            </div>
            <div className="flex-1 relative" style={{ zIndex: 1 }}>
              <MapContainer
                center={[14.585, 121.115]}
                zoom={14}
                style={{ height: "100%", width: "100%", position: "relative", zIndex: 1 }}
                scrollWheelZoom={true}
                zoomControl={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <HeatmapLayer points={heatmapPoints} />
                <ReportMarkers points={heatmapPoints} reports={reportsWithLocation} />
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Issue Trends */}
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Issue Trends by Month</h2>
          {reports.length > 0 ? (
            <div className="h-80">
              <Line data={issueTrendData} options={chartOptions} />
            </div>
          ) : (
            <div className="h-80 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-sm font-medium">No report data yet</p>
              <p className="text-xs mt-1 text-gray-300">Trends will appear as reports come in</p>
            </div>
          )}
        </div>

        {/* Status Distribution with Month Picker */}
        <div className="bg-white p-6 rounded-xl shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Status Distribution</h2>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
          </div>

          {statusByMonth.some((d) => d.value > 0) ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusByMonth}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}
                    >
                      {statusByMonth.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} reports`, n]} />
                    <Legend verticalAlign="bottom" height={30} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Mini summary */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {statusByMonth.map((s, i) => (
                  <div key={s.name} className="rounded-lg py-2 px-1" style={{ background: PIE_COLORS[i] + "18" }}>
                    <div className="font-bold text-base" style={{ color: PIE_COLORS[i] }}>{s.value}</div>
                    <div className="text-gray-500">{s.name}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-sm font-medium">No reports in {MONTHS[selectedMonth]}</p>
              <p className="text-xs mt-1 text-gray-300">Try selecting a different month</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// StatCard
const StatCard = ({ title, value, bgColor, icon, subtitle, subtitleColor }) => (
  <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 min-h-[130px] flex items-center justify-between border border-gray-100">
    <div>
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-2">{value}</p>
      {subtitle && <p className={`text-xs font-medium mt-1 ${subtitleColor}`}>{subtitle}</p>}
    </div>
    <div className={`p-4 rounded-xl ${bgColor}`}>{icon}</div>
  </div>
);