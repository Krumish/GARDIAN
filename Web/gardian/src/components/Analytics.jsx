import { useState, useEffect, useMemo } from "react";
import { collectionGroup, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { FaClock, FaExclamationTriangle, FaUsers } from "react-icons/fa";
import { FiCheckCircle } from "react-icons/fi";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, Title, Tooltip as ChartTooltip, Legend as ChartLegend,
  CategoryScale, LinearScale, PointElement, LineElement,
} from "chart.js";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

ChartJS.register(Title, ChartTooltip, ChartLegend, CategoryScale, LinearScale, PointElement, LineElement);

// Heatmap Layer
function HeatmapLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || points.length === 0) return;
    const heat = L.heatLayer(
      points.map((p) => [p.coords[0], p.coords[1], p.severity]),
      { radius: 50, blur: 15, maxZoom: 15, gradient: { 0.2: "green", 0.5: "orange", 1.0: "red" } }
    ).addTo(map);

    const legend = L.control({ position: "bottomright" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div");
      div.innerHTML = `
        <div style="background:white;padding:10px;border-radius:8px;font-size:12px;box-shadow:0 2px 8px rgba(0,0,0,0.15)">
          <div style="font-weight:700;margin-bottom:6px">Severity</div>
          ${[["green","Low"],["yellow","Moderate"],["orange","High"],["red","Very High"]]
            .map(([c,l]) => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="width:12px;height:12px;background:${c};display:inline-block;border-radius:2px"></span>${l}
            </div>`).join("")}
        </div>`;
      return div;
    };
    legend.addTo(map);
    return () => { map.removeLayer(heat); legend.remove(); };
  }, [map, points]);
  return null;
}

function getSeverity(r) {
  if (r.issueType === "Drainage") {
    const bp = r.blockagePercent || 0;
    if (bp >= 75) return 1.0;
    if (bp >= 50) return 0.7;
    if (bp >= 25) return 0.4;
    return 0.2;
  }
  if (r.issueType === "Manhole") return 0.8;
  if (r.issueType === "Pothole") return 0.6;
  if (r.issueType === "Waste Management") return 0.5;
  return 0.3;
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
    reports.filter((r) =>
      (r.issueType === "Drainage" && (r.blockagePercent || 0) >= 75) ||
      r.issueType === "Manhole"
    ).length, [reports]);

  const uniqueUsers = useMemo(() =>
    new Set(reports.map((r) => r.userId).filter(Boolean)).size,
    [reports]);

  const resolutionDays = useMemo(() => avgResolutionDays(reports), [reports]);

  // Heatmap points
  const heatmapPoints = useMemo(() =>
    reports
      .filter((r) => r.latitude && r.longitude)
      .map((r) => ({ coords: [r.latitude, r.longitude], severity: getSeverity(r) })),
    [reports]);

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
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          Live · {totalCount} total reports
        </div>
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
        <h2 className="text-lg font-semibold mb-4">Heatmap of Problem Areas</h2>
        {heatmapPoints.length > 0 ? (
          <MapContainer
            center={[14.5885, 121.115]}
            zoom={13}
            style={{ height: "400px", width: "100%", borderRadius: "12px" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <HeatmapLayer points={heatmapPoints} />
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