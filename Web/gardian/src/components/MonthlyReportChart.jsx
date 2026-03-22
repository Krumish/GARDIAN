import { useState, useEffect, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Colors aligned with the Department theme from the Dashboard
const ISSUE_TYPES = [
  // MENRO (Teal palette)
  { label: "Waste Management", color: "#0d9488" }, // teal-600
  
  // Mayor / Dispatch (Indigo/Violet palette)
  { label: "Drainage",         color: "#4f46e5" }, // indigo-600
  { label: "Road Blockage",    color: "#7c3aed" }, // violet-600
  
  // Engineering (Orange/Amber/Slate palette)
  { label: "Pothole",          color: "#ea580c" }, // orange-600
  { label: "Road Markings",    color: "#d97706" }, // amber-600
  { label: "Manhole",          color: "#475569" }, // slate-600
];

// Helper to merge San Andres and Poblacion
const normalizeBarangay = (rawName) => {
  if (!rawName) return "Unknown";
  const name = rawName.trim();
  // If the string contains either name (case-insensitive), group them
  if (/san andres/i.test(name) || /poblacion/i.test(name)) {
    return "San Andres (Poblacion)";
  }
  return name;
};

export default function MonthlyReportChart({ reports = [] }) {
  const [selectedMonth, setSelectedMonth]         = useState(new Date().getMonth());
  const [selectedTypes, setSelectedTypes]         = useState(ISSUE_TYPES.map(t => t.label));
  const [selectedBarangays, setSelectedBarangays] = useState([]);

  // ── Derive normalized barangays from live data ──────────────────────────
  const barangays = useMemo(() => {
    const set = new Set(
      reports
        .map(r => normalizeBarangay(r.userDetails?.barangay || r.barangay))
        .filter(b => b !== "Unknown")
    );
    return Array.from(set).sort();
  }, [reports]);

  // Auto-select all barangays on first load
  useEffect(() => {
    if (barangays.length > 0 && selectedBarangays.length === 0) {
      setSelectedBarangays(barangays);
    }
  }, [barangays]);

  // ── Build chart data ────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!selectedBarangays.length || !selectedTypes.length) {
      return { labels: [], datasets: [] };
    }

    const monthReports = reports.filter(r => {
      const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : r.uploadedAt ? new Date(r.uploadedAt) : null;
      return d && !isNaN(d) && d.getMonth() === selectedMonth;
    });

    const datasets = ISSUE_TYPES
      .filter(t => selectedTypes.includes(t.label))
      .map(({ label, color }) => ({
        label,
        data: selectedBarangays.map(barangay =>
          monthReports.filter(r =>
            r.issueType === label &&
            normalizeBarangay(r.userDetails?.barangay || r.barangay) === barangay
          ).length
        ),
        backgroundColor: color + "E6", // 90% opacity for a richer, solid look
        borderColor: color,
        borderWidth: 1.5,
        borderRadius: 4,
        hoverBackgroundColor: color,
      }));

    return { labels: selectedBarangays, datasets };
  }, [reports, selectedMonth, selectedBarangays, selectedTypes]);

  // ── Month total for subtitle ────────────────────────────────────────────
  const monthTotal = useMemo(() => {
    return reports.filter(r => {
      const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : r.uploadedAt ? new Date(r.uploadedAt) : null;
      return d && !isNaN(d) && d.getMonth() === selectedMonth;
    }).length;
  }, [reports, selectedMonth]);

  // ── Toggles ─────────────────────────────────────────────────────────────
  const toggleBarangay = (b) =>
    setSelectedBarangays(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);

  const toggleType = (t) =>
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const hasData = chartData.datasets.some(d => d.data.some(v => v > 0));

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { padding: 16, font: { size: 12, family: "'Inter', sans-serif", weight: "500" }, usePointStyle: true, pointStyle: "rectRounded" },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)", // Slate-900
        titleFont: { size: 13, family: "'Inter', sans-serif" },
        bodyFont:  { size: 12, family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          footer: (items) => {
            const sum = items.reduce((s, i) => s + i.raw, 0);
            return sum > 0 ? `\nTotal Issues: ${sum}` : "";
          },
        },
      },
    },
    scales: {
      x: { 
        grid: { display: false }, 
        ticks: { font: { size: 11, family: "'Inter', sans-serif" }, color: "#64748b" } 
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f1f5f9", drawBorder: false }, // Slate-100
        ticks: { font: { size: 11, family: "'Inter', sans-serif" }, color: "#64748b", precision: 0, stepSize: 1 },
      },
    },
  };

  return (
    <div className="space-y-5">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Incident Volume by Location</h2>
          <p className="text-xs font-medium text-gray-500 mt-0.5">
            {MONTHS[selectedMonth]} Overview — <span className="text-blue-600 font-bold">{monthTotal}</span> total logs
          </p>
        </div>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
          className="text-sm font-semibold border border-gray-200 rounded-lg px-4 py-2 bg-white text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
        >
          {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>

      {/* ── Issue Type Filter Chips ── */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedTypes(ISSUE_TYPES.map(t => t.label))}
          className="text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition shadow-sm"
        >
          Select All
        </button>
        {ISSUE_TYPES.map(({ label, color }) => {
          const active = selectedTypes.includes(label);
          return (
            <button
              key={label}
              onClick={() => toggleType(label)}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border transition font-bold shadow-sm"
              style={active
                ? { backgroundColor: color + "15", borderColor: color + "40", color: color }
                : { backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#94a3b8" } // Slate-400
              }
            >
              <span className="w-2.5 h-2.5 rounded-sm shrink-0 transition-colors" style={{ background: active ? color : "#cbd5e1" }}/>
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Barangay Filter ── */}
      {barangays.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Barangay Filter</p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedBarangays(barangays)}
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
              >Select All</button>
              <button
                onClick={() => setSelectedBarangays([])}
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition"
              >Clear</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {barangays.map(b => (
              <button
                key={b}
                onClick={() => toggleBarangay(b)}
                className={`text-xs px-3 py-1.5 rounded-md transition font-semibold border ${
                  selectedBarangays.includes(b)
                    ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Chart Area ── */}
      <div className="h-[300px] mt-2">
        {selectedBarangays.length > 0 && selectedTypes.length > 0 && hasData ? (
          <Bar data={chartData} options={chartOptions} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
            {selectedBarangays.length === 0 || selectedTypes.length === 0 ? (
              <p className="text-sm font-semibold text-gray-500">Select at least one territory and issue type</p>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-500">No incident logs found for {MONTHS[selectedMonth]}</p>
                <p className="text-xs mt-1 text-gray-400">Try adjusting your filters or selecting a different month.</p>
              </>
            )}
          </div>
        )}
      </div>
      
    </div>
  );
}