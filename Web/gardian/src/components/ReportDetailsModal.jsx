import React, { useState } from 'react';
import { FaUser, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaExclamationTriangle, FaTimes, FaExternalLinkAlt, FaStickyNote } from 'react-icons/fa';

// Helper component for info rows
const InfoRow = ({ label, value, badge }) => (
  <div>
    <div className="text-xs text-gray-400 font-semibold uppercase mb-1">{label}</div>
    {badge ? (
      <span className="inline-block bg-cyan-700/20 text-cyan-400 px-3 py-1 rounded-full text-sm font-semibold">
        {value}
      </span>
    ) : (
      <div className="text-sm font-medium text-gray-200">{value || '-'}</div>
    )}
  </div>
);

const ReportDetailsModal = ({ selectedReport, onClose, formatDate, formatTime }) => {
  const [activeImageTab, setActiveImageTab] = useState('original'); // Sub-tab for AI images

  if (!selectedReport) return null;

  const hasDrainageDetection = () => selectedReport.issueType === "Drainage" && selectedReport.yolo;

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Under Review': 'bg-blue-100 text-blue-800 border-blue-300',
      'In Progress': 'bg-purple-100 text-purple-800 border-purple-300',
      'Resolved': 'bg-green-100 text-green-800 border-green-300',
      'Rejected': 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getIssueTypeIcon = (issueType) => {
    const icons = {
      'Drainage': '🚰',
      'Road Surface': '🛣️',
      'Road Markings': '🚧',
      'Waste Management': '♻️'
    };
    return icons[issueType] || '📋';
  };

  const getIssueTypeColor = (issueType) => {
    const colors = {
      'Drainage': 'bg-blue-50 border-blue-300 text-blue-800',
      'Road Surface': 'bg-gray-50 border-gray-300 text-gray-800',
      'Road Markings': 'bg-orange-50 border-orange-300 text-orange-800',
      'Waste Management': 'bg-green-50 border-green-300 text-green-800'
    };
    return colors[issueType] || 'bg-gray-50 border-gray-300 text-gray-800';
  };

  const getDrainageCount = () => selectedReport.yolo?.drainage?.length || 0;
  const getObstructionCount = () => selectedReport.yolo?.obstructions?.length || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Report Details</h3>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-red-500 p-2 rounded-full transition-all"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Report Details */}
          <div className="space-y-4">
            {/* Status Badge */}
            <div className={`${getStatusColor(selectedReport.status)} border-2 rounded-xl p-4 text-center`}>
              <div className="text-xs font-semibold uppercase tracking-wide mb-1">Current Status</div>
              <div className="text-xl font-bold">{selectedReport.status}</div>
            </div>

            {/* Reporter Info */}
            {selectedReport.userDetails && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-lg mb-4 flex items-center">
                  <FaUser className="mr-2 text-cyan-400" /> Reporter Information
                </h4>
                <InfoRow
                  label="Name"
                  value={`${selectedReport.userDetails.firstName} ${selectedReport.userDetails.lastName}`}
                />
                <InfoRow label="Phone" value={selectedReport.userDetails.phone} />
                <InfoRow label="Email" value={selectedReport.userDetails.email} />
                <InfoRow label="Barangay" value={selectedReport.userDetails.barangay} badge />
              </div>
            )}

            {/* Location */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
              <h4 className="font-bold text-lg mb-4 flex items-center">
                <FaMapMarkerAlt className="mr-2 text-cyan-400" /> Location
              </h4>
              <InfoRow label="Address" value={selectedReport.address} />
              <div className="grid grid-cols-2 gap-3 mt-2">
                <InfoRow label="Latitude" value={selectedReport.latitude?.toFixed(6)} />
                <InfoRow label="Longitude" value={selectedReport.longitude?.toFixed(6)} />
              </div>
              {selectedReport.latitude && selectedReport.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-black font-semibold text-sm hover:bg-cyan-500 transition"
                >
                  <FaExternalLinkAlt className="text-xs" />
                  View on Google Maps
                </a>
              )}
            </div>

            {/* Date & Time */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <InfoRow
                  label={<div className="flex items-center gap-1"> <FaCalendarAlt className="text-cyan-400" /> Date </div>}
                  value={formatDate(selectedReport.uploadedAt)}
                />
                <InfoRow
                  label={<div className="flex items-center gap-1"><FaClock className="text-cyan-400" /> Time </div>}
                  value={formatTime(selectedReport.uploadedAt)}
                />
              </div>
            </div>

            {/* Note */}
            {selectedReport.note && (
              <div className="bg-gray-800 border border-cyan-700 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-lg mb-3 flex items-center">
                  <FaStickyNote className="mr-2 text-cyan-400" /> Reporter's Note
                </h4>
                <p className="text-sm text-gray-200 italic">"{selectedReport.note}"</p>
              </div>
            )}
          </div>

          {/* Middle Column: Photos */}
          <div className="space-y-4 lg:col-span-2">
            {selectedReport.url && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-lg mb-4">Photos</h4>

                {/* Image Sub-Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveImageTab('original')}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                      activeImageTab === 'original'
                        ? 'bg-cyan-500 text-black'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Original
                  </button>
                  {selectedReport.annotatedUrl && (
                    <button
                      onClick={() => setActiveImageTab('annotated')}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                        activeImageTab === 'annotated'
                          ? 'bg-cyan-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      AI Image
                    </button>
                  )}
                  {selectedReport.resolvedImage && (
                    <button
                      onClick={() => setActiveImageTab('resolved')}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                        activeImageTab === 'resolved'
                          ? 'bg-cyan-500 text-black'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      Resolved
                    </button>
                  )}
                </div>

                {/* Display selected image */}
                <div className="rounded-xl border border-gray-700 overflow-hidden">
                  {activeImageTab === 'original' && selectedReport.url && (
                    <img src={selectedReport.url} alt="Original" className="w-full" />
                  )}
                  {activeImageTab === 'annotated' && selectedReport.annotatedUrl && (
                    <img src={selectedReport.annotatedUrl} alt="AI Annotated" className="w-full" />
                  )}
                  {activeImageTab === 'resolved' && selectedReport.resolvedImage && (
                    <img src={selectedReport.resolvedImage} alt="Resolved" className="w-full" />
                  )}
                </div>
              </div>
            )}

           {/* Issue Classification & Obstructions */}
<div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-sm">
  <h4 className="text-lg font-bold flex items-center mb-4">
    <FaExclamationTriangle className="mr-2 text-cyan-400" /> Issue Classification
  </h4>

  {/* Category */}
  <div className="mb-4">
    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">Category</div>
    <div className={`${getIssueTypeColor(selectedReport.issueType)} border rounded-xl p-4 text-center`}>
      <div className="text-3xl mb-1">{getIssueTypeIcon(selectedReport.issueType)}</div>
      <span className="font-bold uppercase">{selectedReport.issueType}</span>
    </div>
  </div>

  {/* Obstruction info card */}
{selectedReport.yolo && (
  <div className="bg-gray-900/80 p-6 rounded-2xl border border-gray-700 shadow-md mt-6">
    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
      <FaExclamationTriangle className="text-cyan-400" /> AI Detection Summary
    </h4>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Drainage Status Card */}
      <div className={`p-6 rounded-2xl border-2 text-center ${
        selectedReport.yolo.status === 'Clogged'
          ? 'bg-red-50 border-red-100 text-red-600'
          : selectedReport.yolo.status === 'Partially Blocked'
            ? 'bg-yellow-50 border-yellow-100 text-yellow-600'
            : 'bg-green-50 border-green-100 text-green-600'
      }`}>
        <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70">
          Drainage Status
        </div>
        <div className="text-2xl font-black uppercase">{selectedReport.yolo.status}</div>
      </div>

      {/* Obstructions Card */}
                      <div className="p-6 rounded-2xl border-2 bg-gray-50 border-gray-200 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1 opacity-70 text-gray-600">
                          Obstructions
                        </div>
                        <div className="text-2xl font-black uppercase text-gray-800">{selectedReport.yolo.obstructions.length}</div>
                      </div>
                    </div>
                  </div>
                )}
  {/* Fallback if no YOLO detection */}
  {!selectedReport.yolo?.obstructions && (
    <div className="bg-gray-700 border border-gray-600 rounded-xl p-10 text-center text-gray-400">
      No AI detection available
    </div>
  )}
</div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsModal;
