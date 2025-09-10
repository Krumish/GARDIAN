import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

export default function ReportChart() {
  const data = {
    labels: ["San Roque", "San Juan", "San Isidro", "Sto. Domingo", "San Andres"],
    datasets: [
      {
        label: "Number of Reports",
        data: [83, 157, 458, 255, 322], // 🔥 sample values, you can adjust
        backgroundColor: [
          "rgba(33, 47, 80, 0.9)", // San Roque
          "rgba(33, 47, 80, 0.9)", // San Juan
          "rgba(33, 47, 80, 0.9)",  // San Isidro
          "rgba(33, 47, 80, 0.9)",  // Sto. Domingo
          "rgba(33, 47, 80, 0.9)", // San Andres
        ],
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // hide legend since we already have barangay names
      },
      title: {
        display: true,
        text: "Barangay Report Rankings",
        color: "#212F50",
        font: {
          size: 18,
          weight: "bold",
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#555", font: { size: 12 } },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#555", font: { size: 12 } },
      },
    },
  };

  return (
    <div className="h-80">
      <Bar data={data} options={options} />
    </div>
  );
}
