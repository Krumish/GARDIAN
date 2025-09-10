import { FaClock, FaExclamationTriangle } from "react-icons/fa";
import { MdTrendingUp, MdLocationOn } from "react-icons/md";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
} from "chart.js";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

export default function Analytics() {
  // Heatmap sample data
  const areas = [
    { name: "San Andres", reports: 120, severity: 5 },
    { name: "San Roque", reports: 120, severity: 5 },
    { name: "San Isidro", reports: 47, severity: 2 },
    { name: "Sto. Niño", reports: 20, severity: 2 },
    { name: "Halang", reports: 95, severity: 4 },
    { name: "Sto. Domingo", reports: 85, severity: 3 },
    { name: "San Juan", reports: 60, severity: 2 },
    { name: "Sta. Rosa", reports: 32, severity: 1 },
    { name: "Karangalan", reports: 87, severity: 3 },
    { name: "Balanti", reports: 24, severity: 1 },
  ];

  const severityColors = {
    5: "bg-red-400",
    4: "bg-orange-400",
    3: "bg-yellow-400",
    2: "bg-green-400",
    1: "bg-green-300",
  };

  // Line chart (Issue trends)
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

  // Bar chart (Reports vs Barangay)
  const barangayData = {
    labels: ["San Roque", "San Juan", "San Isidro", "Sto. Domingo", "San Andres"],
    datasets: [
      {
        label: "Reports",
        data: [500, 1500, 1800, 2000, 3500],
        backgroundColor: "rgba(33, 47, 80, 0.9)",
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: true } },
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
          <span className="text-sm text-gray-500 mb-2">Avg. Resolution Time</span>
          <div className="flex items-center gap-2">
            <FaClock className="text-teal-500 text-xl" />
            <p className="text-2xl font-bold">3.5 Days</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
          <span className="text-sm text-gray-500 mb-2">Top Issue</span>
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-red-500 text-xl" />
            <p className="text-2xl font-bold">Potholes (35%)</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
          <span className="text-sm text-gray-500 mb-2">Report Trend</span>
          <div className="flex items-center gap-2">
            <MdTrendingUp className="text-green-500 text-xl" />
            <p className="text-2xl font-bold">+15%</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6 flex flex-col">
          <span className="text-sm text-gray-500 mb-2">High-Risk Areas</span>
          <div className="flex items-center gap-2">
            <MdLocationOn className="text-orange-500 text-xl" />
            <p className="text-lg font-bold">San Andres, Sto. Domingo</p>
          </div>
        </div>
      </div>

      {/* Heatmap of Problem Areas */}
      <div className="bg-white p-6 rounded-xl shadow">
        <h2 className="text-lg font-semibold mb-4">Heatmap of Problem Areas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {areas.map((area, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-lg shadow text-white ${severityColors[area.severity]}`}
            >
              <p className="font-bold">{area.name}</p>
              <p className="text-sm">Total: {area.reports}</p>
              <p className="text-xs mt-2">Severity: {area.severity}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow h-80">
          <h2 className="text-lg font-semibold mb-4">Issue Trends by Type</h2>
          <Line data={issueTrendData} options={chartOptions} />
        </div>

        <div className="bg-white p-6 rounded-xl shadow h-80">
          <h2 className="text-lg font-semibold mb-4">Total Reports vs. Barangay</h2>
          <Bar data={barangayData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}
