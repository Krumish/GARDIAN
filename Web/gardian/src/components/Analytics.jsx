import React, { useEffect } from "react";
import { FaClock, FaExclamationTriangle } from "react-icons/fa";
import { MdTrendingUp, MdLocationOn } from "react-icons/md";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

ChartJS.register(
  Title,
  ChartTooltip,
  ChartLegend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

/** HeatmapLayer */
function HeatmapLayer({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const heatData = points.map((p) => [p.coords[0], p.coords[1], p.severity / 5]);

    const heat = L.heatLayer(heatData, {
      radius: 50,
      blur: 15,
      maxZoom: 15,
      gradient: {
        0.2: "green",
        0.5: "orange",
        1.0: "red",
      },
    }).addTo(map);

    const legend = window.L.control({ position: "bottomright" });

    legend.onAdd = function () {
      const div = window.L.DomUtil.create("div", "info legend");
      const grades = ["Low", "Moderate", "High", "Very High"];
      const colors = ["green", "yellow", "orange", "red"];

      let labels = "<h4>Severity</h4>";
      grades.forEach((grade, i) => {
        labels += `
          <i style="background:${colors[i]}; width:18px; height:18px; display:inline-block; margin-right:6px;"></i>
          ${grade}<br>`;
      });

      div.innerHTML = labels;
      return div;
    };

    legend.addTo(map);

    return () => {
      map.removeLayer(heat);
      legend.remove();
    };
  }, [map, points]);

  return null;
}

export default function Analytics() {
  const areas = [
    { name: "San Andres", reports: 120, severity: 5, coords: [14.5789, 121.1247] },
    { name: "San Roque", reports: 95, severity: 4, coords: [14.5805, 121.1200] },
    { name: "San Isidro", reports: 47, severity: 3, coords: [14.5840, 121.1168] },
    { name: "Sto. Niño", reports: 20, severity: 2, coords: [14.5901, 121.1212] },
    { name: "Sto. Domingo", reports: 85, severity: 3, coords: [14.5930, 121.1270] },
    { name: "San Juan", reports: 60, severity: 2, coords: [14.5865, 121.1105] },
    { name: "Sta. Rosa", reports: 32, severity: 1, coords: [14.5825, 121.1325] },
    { name: "Karangalan", reports: 87, severity: 4, coords: [14.5890, 121.1350] },
    { name: "Balanti", reports: 24, severity: 1, coords: [14.5755, 121.1300] },
    { name: "Halang", reports: 95, severity: 5, coords: [14.5885, 121.1405] },
  ];

  const issueTrendData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"],
    datasets: [
      {
        label: "Pothole",
        data: [60, 65, 70, 68, 72, 75, 78],
        borderColor: "blue",
        backgroundColor: "rgba(0,0,255,0.2)",
        pointBackgroundColor: "blue",
        fill: false,
        tension: 0.3,
      },
      {
        label: "Drainage",
        data: [60, 55, 45, 40, 35, 30, 25],
        borderColor: "black",
        backgroundColor: "rgba(0,0,0,0.2)",
        pointBackgroundColor: "black",
        fill: false,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
  };

  // New Report Status Distribution
  const reportStatusData = [
    { name: "Pending", value: 72 },
    { name: "In Progress", value: 24 },
    { name: "Resolved", value: 128 },
  ];
  const COLORS = ["#EF4444", "#eab308", "#10B981"]; // Yellow, Blue, Green

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-lg shadow flex items-center">
          <FaClock className="text-blue-500 text-3xl mr-3" />
          <div>
            <p className="text-sm text-gray-500">Avg. Resolution Days</p>
            <p className="text-lg font-bold">3 Days</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex items-center">
          <FaExclamationTriangle className="text-red-500 text-3xl mr-3" />
          <div>
            <p className="text-sm text-gray-500">Pending Issues</p>
            <p className="text-lg font-bold">72</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex items-center">
          <MdTrendingUp className="text-green-500 text-3xl mr-3" />
          <div>
            <p className="text-sm text-gray-500">Resolved This Month</p>
            <p className="text-lg font-bold">128</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow flex items-center">
          <MdLocationOn className="text-purple-500 text-3xl mr-3" />
          <div>
            <p className="text-sm text-gray-500">Barangays Covered</p>
            <p className="text-lg font-bold">10</p>
          </div>
        </div>
      </div>

      {/* Heatmap of Problem Areas */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Heatmap of Problem Areas</h2>
        <MapContainer
          center={[14.5885, 121.125]}
          zoom={13}
          className="w-full h-96 rounded-lg shadow-md"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <HeatmapLayer points={areas} />
        </MapContainer>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Issue Trends</h2>
          <div className="h-80">
            <Line data={issueTrendData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-4">Report Status Distribution</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {reportStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
