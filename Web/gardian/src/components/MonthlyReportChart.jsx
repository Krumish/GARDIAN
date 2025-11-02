import { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

export default function MonthlyReportChart() {
  const barangayLabels = ["San Roque", "San Juan", "San Isidro", "Sto. Domingo", "San Andres"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Example dataset for 12 months (each month has reports for 5 barangays)
  const reportData = {
    January: {
      drainage: [120, 180, 90, 200, 150],
      pothole: [140, 160, 130, 220, 210],
      surface: [100, 140, 120, 180, 190],
    },
    February: {
      drainage: [100, 160, 80, 190, 140],
      pothole: [120, 150, 110, 200, 180],
      surface: [90, 120, 100, 170, 160],
    },
    March: {
      drainage: [130, 170, 100, 210, 160],
      pothole: [150, 165, 120, 230, 200],
      surface: [110, 130, 110, 190, 180],
    },

  };

  const [selectedMonth, setSelectedMonth] = useState("January");

  const drainageReports = reportData[selectedMonth].drainage;
  const potholeReports = reportData[selectedMonth].pothole;
  const surfaceReports = reportData[selectedMonth].surface;

  const totalReports = drainageReports.map(
    (val, i) => val + potholeReports[i] + surfaceReports[i]
  );

  const data = {
    labels: barangayLabels,
    datasets: [
      {
        label: "Drainage",
        data: drainageReports,
        backgroundColor: "rgba(54, 162, 235, 0.8)",
      },
      {
        label: "Pothole",
        data: potholeReports,
        backgroundColor: "rgba(255, 99, 132, 0.8)",
      },
      {
        label: "Surface",
        data: surfaceReports,
        backgroundColor: "rgba(255, 206, 86, 0.8)",
      },
      {
        label: "Total Reports",
        data: totalReports,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: `Barangay Reports - ${selectedMonth}` },
    },
    scales: {
      x: { stacked: false },
      y: { stacked: false, beginAtZero: true },
    },
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Monthly Report Chart</h2>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-gray-300 rounded-md p-2 text-sm"
        >
          {months.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>

      <div className="h-96">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
