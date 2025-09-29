import { useState } from "react";
import { FaUserCircle, FaSearch } from "react-icons/fa";

export default function CitizenFeedback() {
  // Sample feedback data
  const [feedbacks] = useState([
    {
      id: 1,
      name: "Juan Del Herrera",
      location: "San Roque",
      issue: "Pothole",
      comment:
        "I reported this pothole last week, and it’s getting worse. Please prioritize this area.",
      date: "2025-09-05",
    },
    {
      id: 2,
      name: "Maria Mendieta",
      location: "San Juan",
      issue: "Drainage",
      comment:
        "The drainage in front of our house overflows every time it rains. It smells really bad.",
      date: "2025-09-06",
    },
    {
      id: 3,
      name: "Pedro Sy",
      location: "San Andres",
      issue: "Streetlight",
      comment: "The streetlight near our barangay hall has been broken for months.",
      date: "2025-09-07",
    },
  ]);

  const [search, setSearch] = useState("");

  // Filtered feedbacks
  const filteredFeedbacks = feedbacks.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.location.toLowerCase().includes(search.toLowerCase()) ||
      f.issue.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Citizen Feedback</h1>

      {/* Search Bar */}
      <div className="flex justify-end mb-4">
        <div className="relative w-full sm:w-1/3">
          <FaSearch className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search feedback..."
            className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-4">
        {filteredFeedbacks.map((f) => (
          <div
            key={f.id}
            className="bg-white border border-gray-200 rounded-xl shadow p-4 flex gap-4"
          >
            {/* Avatar */}
            <div className="flex-shrink-0">
              <FaUserCircle className="w-12 h-12 text-gray-400" />
            </div>

            {/* Feedback Content */}
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-gray-800">{f.name}</h3>
                <span className="text-sm text-gray-500">{f.date}</span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Issue:</span> {f.issue} |{" "}
                <span className="font-medium">Location:</span> {f.location}
              </p>
              <p className="text-gray-700">{f.comment}</p>
            </div>
          </div>
        ))}

        {filteredFeedbacks.length === 0 && (
          <p className="text-gray-500 italic text-center py-6">
            No feedback found.
          </p>
        )}
      </div>
    </div>
  );
}
