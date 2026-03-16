import React from 'react';
import { FaTimes, FaCheckCircle, FaUserShield, FaClipboardCheck, FaStickyNote, FaImage } from 'react-icons/fa';
import { MdAssignment } from 'react-icons/md';

const ResolutionDetailsModal = ({ selectedReport, onClose }) => {
  if (!selectedReport) return null;

  const formatResolvedDateTime = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
    } catch { return "N/A"; }
  };

  const resolutionDetails = selectedReport.resolutionDetails || {};
  const resolvedBy = selectedReport.resolvedBy || {};

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <FaCheckCircle className="text-white text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Resolution Details</h2>
              <p className="text-emerald-100 text-xs mt-0.5">
                {selectedReport.address || "Report resolved"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4 bg-gray-50">

          {/* Row 1: Status + Resolved By (side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Status card */}
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2">Resolution Status</p>
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-emerald-500 text-xl" />
                <span className="text-lg font-bold text-emerald-800">Issue Resolved</span>
              </div>
              {selectedReport.resolvedAt && (
                <p className="text-xs text-emerald-600 mt-2">
                  {formatResolvedDateTime(selectedReport.resolvedAt)}
                </p>
              )}
            </div>

            {/* Assigned Team card */}
            {resolutionDetails.assignedTeam && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-center shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                  <MdAssignment className="text-emerald-600" /> Assigned Team
                </p>
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <MdAssignment className="text-emerald-600 text-xl shrink-0" />
                  <span className="font-bold text-emerald-900">{resolutionDetails.assignedTeam}</span>
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Resolved By (full width, 4 columns inside) */}
          {resolvedBy.name && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <FaUserShield className="text-emerald-600" /> Resolved By
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Administrator</p>
                  <p className="text-sm font-semibold text-gray-900">{resolvedBy.name}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-semibold text-gray-900 break-all">{resolvedBy.email || "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Role</p>
                  <span className="inline-block bg-emerald-600 text-white px-2 py-1 rounded-md text-xs font-medium">
                    {resolvedBy.role?.replace(/_/g, ' ').toUpperCase() || "—"}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Resolved On</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatResolvedDateTime(selectedReport.resolvedAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Row 3: Actions Taken + Additional Notes (side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {resolutionDetails.actionsTaken && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <FaClipboardCheck className="text-emerald-600" /> Actions Taken
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-1">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {resolutionDetails.actionsTaken}
                  </p>
                </div>
              </div>
            )}

            {resolutionDetails.additionalNotes && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                  <FaStickyNote className="text-emerald-600" /> Additional Notes
                </p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex-1">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {resolutionDetails.additionalNotes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Row 4: Resolved Photo — compact, not full bleed */}
          {selectedReport.resolvedImage && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <FaImage className="text-emerald-600" /> Resolved Photo
              </p>
              <div className="flex justify-center">
                <img
                  src={selectedReport.resolvedImage}
                  alt="Resolved"
                  className="rounded-lg border-2 border-gray-200 max-h-64 object-contain w-full"
                />
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ── */}
        <div className="bg-white border-t border-gray-200 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-gray-100 border border-gray-300 text-gray-700 font-medium hover:bg-gray-200 transition-colors text-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default ResolutionDetailsModal;