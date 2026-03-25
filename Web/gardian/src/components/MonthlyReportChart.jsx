import { useState, useEffect, useMemo } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
} from "chart.js";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const ISSUE_TYPES = [
  // MENRO (Environment/Cleanliness) - Deep Forest/Teal
  { label: "Waste Management", color: "#0f766e" }, // Deep Teal
  
  // Mayor / Dispatch (Hazards & Water) - Authoritative Blues & Reds
  { label: "Drainage",         color: "#1d4ed8" }, // Deep Navy Blue (Water)
  { label: "Road Blockage",    color: "#be123c" }, // Muted Crimson (Urgent/Stop)
  
  // Engineering (Asphalt, Paint, & Metal) - Industrial tones
  { label: "Pothole",          color: "#b45309" }, // Dark Amber/Rust (Caution/Earth)
  { label: "Road Markings",    color: "#ca8a04" }, // Traffic Gold (Paint)
  { label: "Manhole",          color: "#334155" }, // Heavy Slate (Iron/Asphalt)
];

// Helper to merge San Andres and Poblacion (if needed)
const normalizeBarangay = (rawName) => {
  if (!rawName) return "Unknown";
  const name = rawName.trim();
  if (/san andres/i.test(name) || /poblacion/i.test(name)) {
    return "San Andres (Poblacion)";
  }
  return name;
};

// Updated: Now accepts the loaded GeoJSON data as a parameter
const getBarangayFromCoords = (lat, lng, geoJsonData) => {
  if (!lat || !lng || !geoJsonData || !geoJsonData.features) return "Unknown";
  
  try {
    const targetPoint = point([lng, lat]); 
    for (const feature of geoJsonData.features) {
      if (booleanPointInPolygon(targetPoint, feature)) {
        // Check standard keys used in PH GeoJSONs. 
        // Adjust these properties if your GeoJSON uses a specific key like 'BRGY_NAME'
        return feature.properties.name || feature.properties.NAME_4 || feature.properties.ADM4_EN || "Unknown"; 
      }
    }
    return "Outside Jurisdiction"; 
  } catch (err) {
    console.error("Turf PIP Error:", err);
    return "Unknown";
  }
};

export default function MonthlyReportChart({ reports = [] }) {
  const [selectedMonth, setSelectedMonth]         = useState(new Date().getMonth());
  const [selectedTypes, setSelectedTypes]         = useState(ISSUE_TYPES.map(t => t.label));
  const [selectedBarangays, setSelectedBarangays] = useState([]);
  
  // NEW: State to hold your GeoJSON data
  const [geoJsonData, setGeoJsonData]             = useState(null);

  // NEW: Fetch the GeoJSON from the public folder when the component mounts
  useEffect(() => {
    // Files in the public folder are accessible at the root path '/'
    fetch('/cainta_barangays.geojson')
      .then(res => res.json())
      .then(data => setGeoJsonData(data))
      .catch(err => console.error("Error loading Cainta GeoJSON:", err));
  }, []);

  // Update: Only run computation if geoJsonData is loaded
  const reportsWithAccurateLocation = useMemo(() => {
    // If the map hasn't loaded yet, just return the raw reports temporarily
    if (!geoJsonData) return reports.map(r => ({ ...r, _computedBarangay: "Loading..." }));

    return reports.map(r => {
      // Ensure these match your Firestore document structure!
      const lat = r.location?.latitude || r.lat || r.latitude;
      const lng = r.location?.longitude || r.lng || r.longitude;

      const rawBarangay = getBarangayFromCoords(lat, lng, geoJsonData);

      return {
        ...r,
        _computedBarangay: normalizeBarangay(rawBarangay)
      };
    });
  }, [reports, geoJsonData]);

  // Derive unique barangays
  const barangays = useMemo(() => {
    const set = new Set(
      reportsWithAccurateLocation
        .map(r => r._computedBarangay)
        .filter(b => b !== "Unknown" && b !== "Outside Jurisdiction" && b !== "Loading...")
    );
    return Array.from(set).sort();
  }, [reportsWithAccurateLocation]);

  useEffect(() => {
    if (barangays.length > 0 && selectedBarangays.length === 0) {
      setSelectedBarangays(barangays);
    }
  }, [barangays]);

  // Build Chart Data
  const chartData = useMemo(() => {
    if (!selectedBarangays.length || !selectedTypes.length) {
      return { labels: [], datasets: [] };
    }

    const monthReports = reportsWithAccurateLocation.filter(r => {
      const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : r.uploadedAt ? new Date(r.uploadedAt) : null;
      return d && !isNaN(d) && d.getMonth() === selectedMonth;
    });

    const datasets = ISSUE_TYPES
      .filter(t => selectedTypes.includes(t.label))
      .map(({ label, color }) => ({
        label,
        data: selectedBarangays.map(barangay =>
          monthReports.filter(r =>
            r.issueType === label && r._computedBarangay === barangay
          ).length
        ),
        backgroundColor: color + "E6",
        borderColor: color,
        borderWidth: 1.5,
        borderRadius: 4,
        hoverBackgroundColor: color,
      }));

    return { labels: selectedBarangays, datasets };
  }, [reportsWithAccurateLocation, selectedMonth, selectedBarangays, selectedTypes]);

  // Month Total
  const monthTotal = useMemo(() => {
    return reports.filter(r => {
      const d = r.uploadedAt?.toDate ? r.uploadedAt.toDate() : r.uploadedAt ? new Date(r.uploadedAt) : null;
      return d && !isNaN(d) && d.getMonth() === selectedMonth;
    }).length;
  }, [reports, selectedMonth]);

  // Toggles
  const toggleBarangay = (b) => setSelectedBarangays(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  const toggleType = (t) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const hasData = chartData.datasets.some(d => d.data.some(v => v > 0));

const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        align: "end", 
        labels: { 
          padding: 20, 
          font: { size: 12, family: "'Inter', sans-serif", weight: "600" }, 
          color: "#475569", 
          usePointStyle: true, 
          pointStyle: "circle",
          boxWidth: 8
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)", 
        titleColor: "#f8fafc",
        bodyColor: "#cbd5e1",
        titleFont: { size: 13, family: "'Inter', sans-serif", weight: "bold" },
        bodyFont:  { size: 12, family: "'Inter', sans-serif" },
        padding: 12,
        cornerRadius: 6,
        borderColor: "rgba(255, 255, 255, 0.1)", 
        borderWidth: 1,
        callbacks: {
          footer: (items) => {
            const sum = items.reduce((s, i) => s + i.raw, 0);
            return sum > 0 ? `\nTotal in Area: ${sum}` : "";
          },
        },
      },
    },
    scales: {
      x: { 
        border: { display: false }, 
        grid: { 
          display: false, 
          drawBorder: false, 
        }, 
        ticks: { 
          font: { size: 11, family: "'Inter', sans-serif", weight: "500" }, 
          color: "#64748b",
          padding: 8
        } 
      },
      y: {
        beginAtZero: true,
        border: { display: false }, 
        grid: { 
          color: "#e2e8f0", 
          drawBorder: false,
          tickLength: 0, 
          borderDash: [5, 5] 
        },
        ticks: { 
          font: { size: 11, family: "'Inter', sans-serif", weight: "500" }, 
          color: "#94a3b8", 
          precision: 0, 
          stepSize: 1,
          padding: 12
        },
      },
    },
  };

  return (
    <div className="space-y-5">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Incident Volume by Barangay</h2>
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