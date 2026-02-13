import React from 'react';
import { FaTimes, FaCheckCircle, FaUserShield, FaClock, FaClipboardCheck, FaStickyNote, FaCalendarAlt, FaImage } from 'react-icons/fa';
import { MdAssignment } from 'react-icons/md';

// Helper component for info rows (matching ReportDetailsModal style)
const InfoRow = ({ label, value, badge }) => (
  <div className="mb-3">
    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">{label}</div>
    {badge ? (
      <span className="inline-block bg-emerald-600 text-white px-3 py-1.5 rounded-md text-sm font-medium">
        {value}
      </span>
    ) : (
      <div className="text-sm font-medium text-gray-900">{value || '—'}</div>
    )}
  </div>
);

const ResolutionDetailsModal = ({ selectedReport, onClose }) => {
  if (!selectedReport) return null;

  // Format resolved date and time
  const formatResolvedDateTime = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      if (timestamp.toDate) {
        const date = timestamp.toDate();
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return "N/A";
    }
  };

  const resolutionDetails = selectedReport.resolutionDetails || {};
  const resolvedBy = selectedReport.resolvedBy || {};

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* Header - Matching ReportDetailsModal style */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 flex items-center justify-between border-b border-emerald-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Resolution Details</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-emerald-700 p-2 rounded-lg transition-colors"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="space-y-5">
            
            {/* Resolution Status Badge */}
            <div className="bg-emerald-50 text-emerald-800 border-emerald-200 border-2 rounded-lg p-4 text-center shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-75">Resolution Status</div>
              <div className="text-xl font-bold flex items-center justify-center gap-2">
                <FaCheckCircle />
                Issue Resolved
              </div>
            </div>

            {/* Resolved By Information */}
            {resolvedBy.name && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FaUserShield className="text-emerald-600" />
                  Resolved By
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoRow 
                    label="Administrator Name" 
                    value={resolvedBy.name} 
                  />
                  <InfoRow 
                    label="Email Address" 
                    value={resolvedBy.email} 
                  />
                  <InfoRow 
                    label="Role" 
                    value={resolvedBy.role?.replace('_', ' ').toUpperCase()} 
                    badge 
                  />
                  <InfoRow 
                    label="Resolved On" 
                    value={formatResolvedDateTime(selectedReport.resolvedAt)} 
                  />
                </div>
              </div>
            )}

            {/* Assigned Team */}
            {resolutionDetails.assignedTeam && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <MdAssignment className="text-emerald-600" />
                  Assigned Team
                </h3>
                <div className="bg-emerald-50 border-emerald-200 border-2 rounded-lg p-4 flex items-center gap-3">
                  <MdAssignment className="text-2xl text-emerald-600" />
                  <span className="font-bold text-base text-emerald-900">{resolutionDetails.assignedTeam}</span>
                </div>
              </div>
            )}

            {/* Actions Taken */}
            {resolutionDetails.actionsTaken && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FaClipboardCheck className="text-emerald-600" />
                  Actions Taken
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {resolutionDetails.actionsTaken}
                  </p>
                </div>
              </div>
            )}

            {/* Additional Notes & Observations */}
            {resolutionDetails.additionalNotes && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FaStickyNote className="text-emerald-600" />
                  Additional Notes & Observations
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {resolutionDetails.additionalNotes}
                  </p>
                </div>
              </div>
            )}

            {/* Resolved Photo */}
            {selectedReport.resolvedImage && (
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FaImage className="text-emerald-600" />
                  Resolved Photo (After Resolution)
                </h3>
                <div className="rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                  <img 
                    src={selectedReport.resolvedImage} 
                    alt="Resolved" 
                    className="w-full h-auto"
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResolutionDetailsModal;