import React, { useState } from 'react';
import { FaUser, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaExclamationTriangle, FaTimes, FaExternalLinkAlt, FaWater, FaRoad, FaPaintRoller, FaTrash, FaExclamationCircle, FaStickyNote } from 'react-icons/fa';

// Helper component for info rows
const InfoRow = ({ label, value, badge }) => (
  <div className="mb-3">
    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">{label}</div>
    {badge ? (
      <span className="inline-block bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium">
        {value}
      </span>
    ) : (
      <div className="text-sm font-medium text-gray-900">{value || '—'}</div>
    )}
  </div>
);

const ReportDetailsModal = ({ selectedReport, onClose, formatDate, formatTime }) => {
  const [activeImageTab, setActiveImageTab] = useState('original');

  if (!selectedReport) return null;

  const hasDrainageDetection = selectedReport.issueType === "Drainage" && !!selectedReport.yolo;

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-amber-50 text-amber-800 border-amber-200',
      'Under Review': 'bg-blue-50 text-blue-800 border-blue-200',
      'In Progress': 'bg-purple-50 text-purple-800 border-purple-200',
      'Resolved': 'bg-emerald-50 text-emerald-800 border-emerald-200',
      'Rejected': 'bg-red-50 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-50 text-gray-800 border-gray-200';
  };

  const getIssueTypeIcon = (issueType) => {
    const icons = {
      'Drainage': <FaWater className="text-2xl text-blue-600" />,
      'Road Surface': <FaRoad className="text-2xl text-gray-700" />,
      'Road Markings': <FaPaintRoller className="text-2xl text-orange-600" />,
      'Waste Management': <FaTrash className="text-2xl text-emerald-600" />
    };
    return icons[issueType] || <FaExclamationCircle className="text-2xl text-gray-500" />;
  };

  const getIssueTypeColor = (issueType) => {
    const colors = {
      'Drainage': 'bg-blue-50 border-blue-200 text-blue-900',
      'Road Surface': 'bg-gray-50 border-gray-200 text-gray-900',
      'Road Markings': 'bg-orange-50 border-orange-200 text-orange-900',
      'Waste Management': 'bg-emerald-50 border-emerald-200 text-emerald-900'
    };
    return colors[issueType] || 'bg-gray-50 border-gray-200 text-gray-900';
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between border-b border-blue-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Report Details</h2>
            <p className="text-blue-100 text-sm mt-0.5">Case #{selectedReport.id || 'N/A'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left Column: Report Information */}
            <div className="space-y-5">
              
              {/* Status Badge */}
              <div className={`${getStatusColor(selectedReport.status)} border-2 rounded-lg p-4 text-center shadow-sm`}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-75">Status</div>
                <div className="text-xl font-bold">{selectedReport.status}</div>
              </div>

              {/* Issue Classification */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FaExclamationTriangle className="text-blue-600" />
                  Issue Category
                </h3>
                <div className={`${getIssueTypeColor(selectedReport.issueType)} border-2 rounded-lg p-4 flex items-center gap-3`}>
                  {getIssueTypeIcon(selectedReport.issueType)}
                  <span className="font-bold text-base">{selectedReport.issueType}</span>
                </div>
              </div>

              {/* Reporter Information */}
              {selectedReport.userDetails && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <FaUser className="text-blue-600" />
                    Reporter Information
                  </h3>
                  <InfoRow
                    label="Full Name"
                    value={`${selectedReport.userDetails.firstName} ${selectedReport.userDetails.lastName}`}
                  />
                  <InfoRow label="Contact Number" value={selectedReport.userDetails.phone} />
                  <InfoRow label="Email Address" value={selectedReport.userDetails.email} />
                  <InfoRow label="Barangay" value={selectedReport.userDetails.barangay} badge />
                </div>
              )}

              {/* Location Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-600" />
                  Location Details
                </h3>
                <InfoRow label="Address" value={selectedReport.address} />
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow label="Latitude" value={selectedReport.latitude?.toFixed(6)} />
                  <InfoRow label="Longitude" value={selectedReport.longitude?.toFixed(6)} />
                </div>
                {selectedReport.latitude && selectedReport.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 transition-colors shadow-sm w-full justify-center"
                  >
                    <FaExternalLinkAlt className="text-xs" />
                    View on Google Maps
                  </a>
                )}
              </div>

              {/* Date & Time */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Report Submitted</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">
                      <FaCalendarAlt className="text-blue-600" />
                      Date
                    </div>
                    <div className="text-sm font-medium text-gray-900">{formatDate(selectedReport.uploadedAt)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">
                      <FaClock className="text-blue-600" />
                      Time
                    </div>
                    <div className="text-sm font-medium text-gray-900">{formatTime(selectedReport.uploadedAt)}</div>
                  </div>
                </div>
              </div>

              {/* Reporter's Note */}
              {selectedReport.note && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FaStickyNote className="text-amber-600" />
                    Reporter's Note
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed italic">"{selectedReport.note}"</p>
                </div>
              )}
            </div>

            {/* Right Column: Photos & AI Detection */}
            <div className="space-y-5 lg:col-span-2">
              
              {/* Photo Evidence */}
              {selectedReport.url && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Photo Evidence</h3>

                  {/* Image Tabs */}
                  <div className="flex gap-2 mb-4 border-b border-gray-200 pb-1">
                    <button
                      onClick={() => setActiveImageTab('original')}
                      className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
                        activeImageTab === 'original'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Original Photo
                    </button>
                    {selectedReport.annotatedUrl && (
                      <button
                        onClick={() => setActiveImageTab('annotated')}
                        className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
                          activeImageTab === 'annotated'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        AI Analysis
                      </button>
                    )}
                    {selectedReport.resolvedImage && (
                      <button
                        onClick={() => setActiveImageTab('resolved')}
                        className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
                          activeImageTab === 'resolved'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Resolved Photo
                      </button>
                    )}
                  </div>

                  {/* Image Display */}
                  <div className="rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                    {activeImageTab === 'original' && selectedReport.url && (
                      <img src={selectedReport.url} alt="Original Report" className="w-full h-auto" />
                    )}
                    {activeImageTab === 'annotated' && selectedReport.annotatedUrl && (
                      <img src={selectedReport.annotatedUrl} alt="AI Analysis" className="w-full h-auto" />
                    )}
                    {activeImageTab === 'resolved' && selectedReport.resolvedImage && (
                      <img src={selectedReport.resolvedImage} alt="Resolved" className="w-full h-auto" />
                    )}
                  </div>
                </div>
              )}

              {/* AI Detection Summary - Drainage Only */}
              {hasDrainageDetection && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-5 flex items-center gap-2">
                    <FaExclamationTriangle className="text-blue-600" />
                    AI Detection Summary
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Drainage Status */}
                    <div
                      className={`p-6 rounded-lg border-2 text-center shadow-sm ${
                        selectedReport.yolo.status === "Clogged"
                          ? "bg-red-50 border-red-300"
                          : "bg-emerald-50 border-emerald-300"
                      }`}
                    >
                      <div className="text-xs font-bold uppercase tracking-widest mb-2 opacity-75">
                        Drainage Status
                      </div>
                      <div
                        className={`text-3xl font-black uppercase ${
                          selectedReport.yolo.status === "Clogged" ? "text-red-700" : "text-emerald-700"
                        }`}
                      >
                        {selectedReport.yolo.status}
                      </div>
                    </div>

                    {/* Obstructions Detected */}
                    <div className="p-6 rounded-lg border-2 bg-white border-gray-300 text-center shadow-sm">
                      <div className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-600">
                        Obstructions Detected
                      </div>
                      <div className="text-3xl font-black text-gray-800">
                        {selectedReport.yolo.obstructions?.length || 0}
                      </div>
                    </div>
                  </div>

                  {/* AI Confidence Indicator (Optional Enhancement) */}
                  <div className="mt-5 pt-5 border-t border-blue-200">
                    <p className="text-xs text-gray-600 text-center">
                      Analysis powered by YOLOV8 AI detection system
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions (Optional) */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Take Action
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailsModal;  