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
  const barangays = [
    "San Andres",
    "Santo Domingo",
    "San Isidro",
    "San Juan",
    "Santo Niño",
    "San Roque",
    "Santa Rosa"
  ];

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Comprehensive data for all 7 barangays across 12 months
  const reportData = {
    January: {
      drainage: [120, 180, 90, 200, 150, 170, 140],
      pothole: [140, 160, 130, 220, 210, 190, 165],
      surface: [100, 140, 120, 180, 190, 160, 145],
    },
    February: {
      drainage: [100, 160, 80, 190, 140, 155, 125],
      pothole: [120, 150, 110, 200, 180, 170, 145],
      surface: [90, 120, 100, 170, 160, 140, 130],
    },
    March: {
      drainage: [130, 170, 100, 210, 160, 180, 155],
      pothole: [150, 165, 120, 230, 200, 185, 170],
      surface: [110, 130, 110, 190, 180, 150, 140],
    },
    April: {
      drainage: [115, 175, 95, 205, 145, 165, 135],
      pothole: [135, 155, 125, 215, 195, 175, 160],
      surface: [95, 125, 105, 175, 170, 145, 135],
    },
    May: {
      drainage: [125, 185, 105, 215, 155, 175, 145],
      pothole: [145, 170, 135, 225, 205, 195, 175],
      surface: [105, 135, 115, 185, 180, 155, 150],
    },
    June: {
      drainage: [110, 165, 85, 195, 135, 160, 130],
      pothole: [130, 145, 115, 205, 185, 165, 150],
      surface: [85, 115, 95, 165, 155, 135, 125],
    },
    July: {
      drainage: [135, 190, 110, 220, 165, 185, 160],
      pothole: [155, 175, 140, 235, 215, 200, 180],
      surface: [115, 145, 125, 195, 190, 165, 155],
    },
    August: {
      drainage: [140, 195, 115, 225, 170, 190, 165],
      pothole: [160, 180, 145, 240, 220, 205, 185],
      surface: [120, 150, 130, 200, 195, 170, 160],
    },
    September: {
      drainage: [105, 155, 75, 185, 125, 150, 120],
      pothole: [125, 140, 105, 195, 175, 160, 145],
      surface: [80, 110, 90, 160, 150, 130, 120],
    },
    October: {
      drainage: [145, 200, 120, 230, 175, 195, 170],
      pothole: [165, 185, 150, 245, 225, 210, 190],
      surface: [125, 155, 135, 205, 200, 175, 165],
    },
    November: {
      drainage: [150, 205, 125, 235, 180, 200, 175],
      pothole: [170, 190, 155, 250, 230, 215, 195],
      surface: [130, 160, 140, 210, 205, 180, 170],
    },
    December: {
      drainage: [155, 210, 130, 240, 185, 205, 180],
      pothole: [175, 195, 160, 255, 235, 220, 200],
      surface: [135, 165, 145, 215, 210, 185, 175],
    },
  };

  const [selectedMonth, setSelectedMonth] = useState("January");
  const [selectedBarangays, setSelectedBarangays] = useState(barangays);

  const toggleBarangay = (barangay) => {
    setSelectedBarangays(prev =>
      prev.includes(barangay)
        ? prev.filter(b => b !== barangay)
        : [...prev, barangay]
    );
  };

  const selectAll = () => setSelectedBarangays(barangays);
  const clearAll = () => setSelectedBarangays([]);

  // Filter data based on selected barangays
  const getFilteredData = (dataArray) => {
    return selectedBarangays.map(barangay => {
      const index = barangays.indexOf(barangay);
      return dataArray[index];
    });
  };

  const drainageReports = getFilteredData(reportData[selectedMonth].drainage);
  const potholeReports = getFilteredData(reportData[selectedMonth].pothole);
  const surfaceReports = getFilteredData(reportData[selectedMonth].surface);

  const totalReports = drainageReports.map(
    (val, i) => val + potholeReports[i] + surfaceReports[i]
  );

  const data = {
    labels: selectedBarangays,
    datasets: [
      {
        label: "Drainage",
        data: drainageReports,
        backgroundColor: "rgba(28, 133, 168, 0.8)",
        borderColor: "rgba(28, 133, 168, 1)",
        borderWidth: 1,
      },
      {
        label: "Pothole",
        data: potholeReports,
        backgroundColor: "rgba(84, 110, 122, 0.8)",
        borderColor: "rgba(84, 110, 122, 1)",
        borderWidth: 1,
      },
      {
        label: "Surface",
        data: surfaceReports,
        backgroundColor: "rgba(158, 157, 36, 0.8)",
        borderColor: "rgba(158, 157, 36, 1)",
        borderWidth: 1,
      },
      {
        label: "Total Reports",
        data: totalReports,
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: "top",
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: { 
        display: true, 
        text: `Barangay Reports - ${selectedMonth}`,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        }
      }
    },
    scales: {
      x: { 
        stacked: false,
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
      y: { 
        stacked: false, 
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            size: 11
          }
        }
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-gray-800">Monthly Report Chart</h2>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          >
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Barangay Filter */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Filter by Barangay</h3>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              className="text-xs px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {barangays.map((barangay) => (
            <button
              key={barangay}
              onClick={() => toggleBarangay(barangay)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                selectedBarangays.includes(barangay)
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-300 hover:border-blue-300'
              }`}
            >
              {barangay}
            </button>
          ))}
        </div>
        
        {selectedBarangays.length === 0 && (
          <p className="text-sm text-red-500 mt-3">Please select at least one barangay to display data.</p>
        )}
      </div>

      {/* Chart */}
      <div className="h-96">
        {selectedBarangays.length > 0 ? (
          <Bar data={data} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No barangays selected</p>
          </div>
        )}
      </div>
    </div>
  );
}