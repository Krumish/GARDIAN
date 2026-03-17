import React, { useState } from 'react';
import {
  FaUser, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaExclamationTriangle,
  FaTimes, FaExternalLinkAlt, FaWater, FaRoad, FaPaintRoller, FaTrash,
  FaExclamationCircle, FaStickyNote, FaCar, FaHardHat
} from 'react-icons/fa';

// ── Helper ────────────────────────────────────────────────────────────────────
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

// ── Stat tile used inside AI detection summaries ───────────────────────────────
const StatTile = ({ label, value, colorClass = "bg-white border-gray-300 text-gray-800" }) => (
  <div className={`p-4 rounded-lg border-2 text-center shadow-sm ${colorClass}`}>
    <div className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">{label}</div>
    <div className="text-2xl font-black">{value}</div>
  </div>
);

// ── Confidence bar ─────────────────────────────────────────────────────────────
const ConfidenceBar = ({ confidence }) => {
  const pct = Math.round(confidence * 100);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-600 w-10 text-right">{pct}%</span>
    </div>
  );
};

// ── Per-type AI summary components ─────────────────────────────────────────────

function DrainageAISummary({ yolo, blockagePercent, blockageRatio }) {
  const obstructions = yolo?.obstructions || [];
  const classCounts = obstructions.reduce((acc, o) => {
    acc[o.class] = (acc[o.class] || 0) + 1;
    return acc;
  }, {});

  // ── Mirror the mobile app logic exactly ──
  // elif max_blockage_ratio >= 0.50 → "Clogged"
  // elif max_blockage_ratio >= 0.10 → "Partially Blocked"
  // else                            → "Clear"
  const ratio = blockageRatio ?? (yolo?.max_blockage_ratio ?? 0);
  const derivedStatus =
    ratio >= 0.50 ? "Clogged" :
    ratio >= 0.10 ? "Partially Blocked" :
    "Clear";

  const statusColor =
    derivedStatus === "Clogged"           ? "bg-red-50 border-red-300 text-red-700" :
    derivedStatus === "Partially Blocked" ? "bg-amber-50 border-amber-300 text-amber-700" :
                                            "bg-emerald-50 border-emerald-300 text-emerald-700";

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
        <FaWater className="text-blue-600" /> AI Detection — Drainage
      </h3>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatTile
          label="Status"
          value={derivedStatus}
          colorClass={statusColor}
        />
        <StatTile
          label="Blockage"
          value={`${blockagePercent ?? 0}%`}
          colorClass="bg-white border-gray-300 text-gray-800"
        />
        <StatTile
          label="Obstructions"
          value={obstructions.length}
          colorClass="bg-white border-gray-300 text-gray-800"
        />
      </div>

      {/* Blockage severity bar */}
      <div className="bg-white border border-blue-200 rounded-lg p-3 mb-3">
        <p className="text-xs font-bold text-gray-600 uppercase mb-2">Blockage Severity</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${
                derivedStatus === "Clogged" ? "bg-red-500" :
                derivedStatus === "Partially Blocked" ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs font-bold text-gray-700 w-12 text-right">
            {(ratio * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-0.5">
          <span>Clear</span>
          <span>Partially Blocked (≥10%)</span>
          <span>Clogged (≥50%)</span>
        </div>
      </div>

      {Object.keys(classCounts).length > 0 && (
        <div className="bg-white border border-blue-200 rounded-lg p-3 mb-3">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Detected Objects</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(classCounts).map(([cls, count]) => (
              <span key={cls} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
                {cls}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {obstructions.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Confidence Scores</p>
          <div className="space-y-2">
            {obstructions.slice(0, 5).map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 capitalize w-16 shrink-0">{o.class}</span>
                <ConfidenceBar confidence={o.confidence} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-3">Powered by YOLOv8 AI detection</p>
    </div>
  );
}

function PotholeAISummary({ yolo }) {
  const boxes = yolo?.boxes?.filter(b => b.class === "pothole") || [];
  const avgConf = boxes.length
    ? boxes.reduce((s, b) => s + b.confidence, 0) / boxes.length
    : 0;

  // severity based on count
  const severity = boxes.length >= 5 ? "High" : boxes.length >= 2 ? "Moderate" : boxes.length === 1 ? "Low" : "None";
  const severityColor =
    severity === "High"     ? "bg-red-50 border-red-300 text-red-700" :
    severity === "Moderate" ? "bg-amber-50 border-amber-300 text-amber-700" :
    severity === "Low"      ? "bg-yellow-50 border-yellow-300 text-yellow-700" :
                              "bg-emerald-50 border-emerald-300 text-emerald-700";

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
        <FaRoad className="text-amber-600" /> AI Detection — Pothole
      </h3>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatTile
          label="Status"
          value={yolo?.status || "—"}
          colorClass={yolo?.status === "Detected"
            ? "bg-amber-50 border-amber-300 text-amber-700"
            : "bg-gray-50 border-gray-300 text-gray-700"}
        />
        <StatTile label="Potholes Found" value={boxes.length} colorClass="bg-white border-gray-300 text-gray-800" />
        <StatTile label="Severity" value={severity} colorClass={severityColor} />
        <StatTile label="Avg Confidence" value={`${Math.round(avgConf * 100)}%`} colorClass="bg-white border-gray-300 text-gray-800" />
      </div>

      {boxes.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">
            Confidence per Pothole ({boxes.length} detected)
          </p>
          <div className="space-y-2">
            {boxes.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16 shrink-0">Pothole {i + 1}</span>
                <ConfidenceBar confidence={b.confidence} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-3">Powered by YOLOv8 AI detection</p>
    </div>
  );
}

function ManholeAISummary({ yolo }) {
  const boxes = yolo?.boxes || [];
  const intact  = boxes.filter(b => b.class === "intact_manhole");
  const broken  = boxes.filter(b => b.class === "broken_manhole");
  // fallback: if model just uses "manhole" class
  const generic = boxes.filter(b => b.class === "manhole");

  const totalManholes = intact.length + broken.length + generic.length;
  const avgConf = boxes.length
    ? boxes.reduce((s, b) => s + b.confidence, 0) / boxes.length
    : 0;

  const condition =
    broken.length > 0  ? "Damaged" :
    intact.length > 0  ? "Intact" :
    generic.length > 0 ? "Detected" : "—";

  const conditionColor =
    condition === "Damaged"  ? "bg-red-50 border-red-300 text-red-700" :
    condition === "Intact"   ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
                               "bg-slate-50 border-slate-300 text-slate-700";

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-100 border-2 border-gray-300 rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
        <FaHardHat className="text-gray-600" /> AI Detection — Manhole
      </h3>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatTile
          label="Status"
          value={yolo?.status || "—"}
          colorClass="bg-slate-100 border-slate-400 text-slate-700"
        />
        <StatTile label="Total Found" value={totalManholes} colorClass="bg-white border-gray-300 text-gray-800" />
        <StatTile label="Condition" value={condition} colorClass={conditionColor} />
        <StatTile label="Avg Confidence" value={`${Math.round(avgConf * 100)}%`} colorClass="bg-white border-gray-300 text-gray-800" />
      </div>

      {/* Intact vs Broken breakdown */}
      {(intact.length > 0 || broken.length > 0) && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <p className="text-xs font-bold text-emerald-700 uppercase mb-1">✅ Intact Manhole</p>
            <p className="text-2xl font-black text-emerald-800">{intact.length}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-xs font-bold text-red-700 uppercase mb-1">⚠️ Broken Manhole</p>
            <p className="text-2xl font-black text-red-800">{broken.length}</p>
          </div>
        </div>
      )}

      {boxes.length > 0 && (
        <div className="bg-white border border-gray-300 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Detection Confidence</p>
          <div className="space-y-2">
            {boxes.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-xs font-medium w-28 shrink-0 capitalize ${
                  b.class === "broken_manhole" ? "text-red-500" :
                  b.class === "intact_manhole" ? "text-emerald-600" : "text-gray-500"
                }`}>
                  {b.class.replace(/_/g, " ")}
                </span>
                <ConfidenceBar confidence={b.confidence} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-3">Powered by YOLOv8 AI detection</p>
    </div>
  );
}

function RoadMarkingsAISummary({ yolo }) {
  const boxes = yolo?.boxes || [];
  const intact = boxes.filter(b => b.class === "intact_crosswalk");
  const faded  = boxes.filter(b => b.class === "faded_crosswalk");
  const total  = intact.length + faded.length;
  const avgConf = boxes.length
    ? boxes.reduce((s, b) => s + b.confidence, 0) / boxes.length
    : 0;

  const condition =
    faded.length > 0 && intact.length === 0 ? "Faded" :
    faded.length > 0 && intact.length > 0   ? "Mixed" :
    intact.length > 0                        ? "Intact" : "—";

  const conditionColor =
    condition === "Faded"  ? "bg-red-50 border-red-300 text-red-700" :
    condition === "Mixed"  ? "bg-amber-50 border-amber-300 text-amber-700" :
    condition === "Intact" ? "bg-emerald-50 border-emerald-300 text-emerald-700" :
                             "bg-gray-50 border-gray-300 text-gray-700";

  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
        <FaPaintRoller className="text-orange-600" /> AI Detection — Road Markings
      </h3>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatTile
          label="Status"
          value={yolo?.status || "—"}
          colorClass="bg-orange-50 border-orange-300 text-orange-700"
        />
        <StatTile label="Crosswalks Found" value={total} colorClass="bg-white border-gray-300 text-gray-800" />
        <StatTile label="Condition" value={condition} colorClass={conditionColor} />
        <StatTile label="Avg Confidence" value={`${Math.round(avgConf * 100)}%`} colorClass="bg-white border-gray-300 text-gray-800" />
      </div>

      {boxes.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Detection Confidence</p>
          <div className="space-y-2">
            {boxes.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`text-xs font-medium w-32 shrink-0 capitalize ${
                  b.class === "faded_crosswalk"  ? "text-red-500" :
                  b.class === "intact_crosswalk" ? "text-emerald-600" : "text-gray-500"
                }`}>
                  {b.class.replace(/_/g, " ")}
                </span>
                <ConfidenceBar confidence={b.confidence} />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-3">Powered by YOLOv8 AI detection</p>
    </div>
  );
}

function RoadBlockageAISummary({ yolo }) {
  const boxes = yolo?.boxes || [];
  const vehicles = boxes.filter(b => b.class === "vehicle");
  const avgConf = vehicles.length
    ? vehicles.reduce((s, b) => s + b.confidence, 0) / vehicles.length
    : 0;

  // severity based on vehicle count
  const severity = vehicles.length >= 6 ? "High" : vehicles.length >= 3 ? "Moderate" : "Low";
  const severityColor = severity === "High"
    ? "bg-red-50 border-red-300 text-red-700"
    : severity === "Moderate"
    ? "bg-amber-50 border-amber-300 text-amber-700"
    : "bg-emerald-50 border-emerald-300 text-emerald-700";

  // group by class
  const classCounts = boxes.reduce((acc, b) => {
    acc[b.class] = (acc[b.class] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
        <FaCar className="text-rose-600" /> AI Detection — Road Blockage
      </h3>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <StatTile
          label="Status"
          value={yolo?.status || "—"}
          colorClass={yolo?.status === "Detected"
            ? "bg-rose-50 border-rose-300 text-rose-700"
            : "bg-gray-50 border-gray-300 text-gray-700"}
        />
        <StatTile label="Vehicles" value={vehicles.length} colorClass="bg-white border-gray-300 text-gray-800" />
        <StatTile label="Severity" value={severity} colorClass={severityColor} />
        <StatTile label="Avg Confidence" value={`${Math.round(avgConf * 100)}%`} colorClass="bg-white border-gray-300 text-gray-800" />
      </div>

      {Object.keys(classCounts).length > 0 && (
        <div className="bg-white border border-rose-200 rounded-lg p-3 mb-3">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Detected Objects</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(classCounts).map(([cls, count]) => (
              <span key={cls} className="bg-rose-100 text-rose-800 text-xs font-semibold px-2.5 py-1 rounded-full capitalize">
                {cls}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {vehicles.length > 0 && (
        <div className="bg-white border border-rose-200 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Vehicle Detection Confidence</p>
          <div className="space-y-2">
            {vehicles.slice(0, 6).map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-16 shrink-0">Vehicle {i + 1}</span>
                <ConfidenceBar confidence={v.confidence} />
              </div>
            ))}
            {vehicles.length > 6 && (
              <p className="text-xs text-gray-400 text-center pt-1">+{vehicles.length - 6} more vehicles detected</p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center mt-3">Powered by YOLOv8 AI detection</p>
    </div>
  );
}

function GenericAISummary({ yolo, issueType }) {
  const boxes = yolo?.boxes || [];
  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
        <FaExclamationTriangle className="text-purple-600" /> AI Detection — {issueType}
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatTile
          label="Status"
          value={yolo?.status || "—"}
          colorClass={yolo?.status === "Detected"
            ? "bg-purple-50 border-purple-300 text-purple-700"
            : "bg-gray-50 border-gray-300 text-gray-700"}
        />
        <StatTile label="Objects Found" value={boxes.length} colorClass="bg-white border-gray-300 text-gray-800" />
      </div>
      {boxes.length > 0 && (
        <div className="bg-white border border-purple-200 rounded-lg p-3">
          <p className="text-xs font-bold text-gray-600 uppercase mb-2">Detection Confidence</p>
          <div className="space-y-2">
            {boxes.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 capitalize w-20 shrink-0">{b.class}</span>
                <ConfidenceBar confidence={b.confidence} />
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500 text-center mt-3">Powered by YOLOv8 AI detection</p>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
const ReportDetailsModal = ({ selectedReport, onClose, formatDate, formatTime }) => {
  const [activeImageTab, setActiveImageTab] = useState('original');

  if (!selectedReport) return null;

  const { issueType, yolo } = selectedReport;
  const hasYolo = !!yolo && (yolo.status || (yolo.boxes && yolo.boxes.length > 0));

  const getStatusColor = (status) => ({
    'Pending':     'bg-amber-50 text-amber-800 border-amber-200',
    'Under Review':'bg-blue-50 text-blue-800 border-blue-200',
    'In Progress': 'bg-purple-50 text-purple-800 border-purple-200',
    'Resolved':    'bg-emerald-50 text-emerald-800 border-emerald-200',
    'Rejected':    'bg-red-50 text-red-800 border-red-200',
  }[status] || 'bg-gray-50 text-gray-800 border-gray-200');

  const getIssueTypeIcon = (type) => ({
    'Drainage':       <FaWater className="text-2xl text-blue-600" />,
    'Road Surface':   <FaRoad className="text-2xl text-gray-700" />,
    'Road Markings':  <FaPaintRoller className="text-2xl text-orange-600" />,
    'Waste Management': <FaTrash className="text-2xl text-emerald-600" />,
    'Pothole':        <FaRoad className="text-2xl text-amber-600" />,
    'Manhole':        <FaHardHat className="text-2xl text-slate-600" />,
    'Road Blockage':  <FaCar className="text-2xl text-rose-600" />,
  }[type] || <FaExclamationCircle className="text-2xl text-gray-500" />);

  const getIssueTypeColor = (type) => ({
    'Drainage':       'bg-blue-50 border-blue-200 text-blue-900',
    'Road Surface':   'bg-gray-50 border-gray-200 text-gray-900',
    'Road Markings':  'bg-orange-50 border-orange-200 text-orange-900',
    'Waste Management': 'bg-emerald-50 border-emerald-200 text-emerald-900',
    'Pothole':        'bg-amber-50 border-amber-200 text-amber-900',
    'Manhole':        'bg-slate-50 border-slate-200 text-slate-900',
    'Road Blockage':  'bg-rose-50 border-rose-200 text-rose-900',
  }[type] || 'bg-gray-50 border-gray-200 text-gray-900');

  // ── Render the correct AI summary based on issue type ──
  const renderAISummary = () => {
    if (!hasYolo) return null;
    switch (issueType) {
      case 'Drainage':
        return (
          <DrainageAISummary
            yolo={yolo}
            blockagePercent={selectedReport.blockagePercent}
            blockageRatio={selectedReport.blockageRatio}
          />
        );
      case 'Pothole':
        return <PotholeAISummary yolo={yolo} />;
      case 'Manhole':
        return <ManholeAISummary yolo={yolo} />;
      case 'Road Markings':
        return <RoadMarkingsAISummary yolo={yolo} />;
      case 'Road Blockage':
        return <RoadBlockageAISummary yolo={yolo} />;
      default:
        return <GenericAISummary yolo={yolo} issueType={issueType} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between border-b border-blue-800">
          <h2 className="text-2xl font-bold text-white">Report Details</h2>
          <button onClick={onClose} className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors">
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left Column ── */}
            <div className="space-y-5">

              {/* Status */}
              <div className={`${getStatusColor(selectedReport.status)} border-2 rounded-lg p-4 text-center shadow-sm`}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1 opacity-75">Status</div>
                <div className="text-xl font-bold">{selectedReport.status}</div>
              </div>

              {/* Issue Category */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FaExclamationTriangle className="text-blue-600" /> Issue Category
                </h3>
                <div className={`${getIssueTypeColor(issueType)} border-2 rounded-lg p-4 flex items-center gap-3`}>
                  {getIssueTypeIcon(issueType)}
                  <span className="font-bold text-base">{issueType}</span>
                </div>
              </div>

              {/* Reporter Information */}
              {selectedReport.userDetails && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <FaUser className="text-blue-600" /> Reporter Information
                  </h3>
                  <InfoRow label="Full Name" value={`${selectedReport.userDetails.firstName} ${selectedReport.userDetails.lastName}`} />
                  <InfoRow label="Contact Number" value={selectedReport.userDetails.phone} />
                  <InfoRow label="Email Address" value={selectedReport.userDetails.email} />
                  <InfoRow label="Barangay" value={selectedReport.userDetails.barangay} badge />
                </div>
              )}

              {/* Location */}
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <FaMapMarkerAlt className="text-blue-600" /> Location Details
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
                      <FaCalendarAlt className="text-blue-600" /> Date
                    </div>
                    <div className="text-sm font-medium text-gray-900">{formatDate(selectedReport.uploadedAt)}</div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1.5">
                      <FaClock className="text-blue-600" /> Time
                    </div>
                    <div className="text-sm font-medium text-gray-900">{formatTime(selectedReport.uploadedAt)}</div>
                  </div>
                </div>
              </div>

              {/* Reporter's Note */}
              {selectedReport.note && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <FaStickyNote className="text-amber-600" /> Reporter's Note
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed italic">"{selectedReport.note}"</p>
                </div>
              )}
            </div>

            {/* ── Right Column ── */}
            <div className="space-y-5 lg:col-span-2">

              {/* Photo Evidence */}
              {selectedReport.url && (
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Photo Evidence</h3>

                  <div className="flex gap-2 mb-4 border-b border-gray-200 pb-1">
                    <button
                      onClick={() => setActiveImageTab('original')}
                      className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
                        activeImageTab === 'original' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Original Photo
                    </button>
                    {selectedReport.annotatedUrl && (
                      <button
                        onClick={() => setActiveImageTab('annotated')}
                        className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
                          activeImageTab === 'annotated' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        AI Analysis
                      </button>
                    )}
                    {selectedReport.resolvedImage && (
                      <button
                        onClick={() => setActiveImageTab('resolved')}
                        className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all ${
                          activeImageTab === 'resolved' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Resolved Photo
                      </button>
                    )}
                  </div>

                  <div className="rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50">
                    {activeImageTab === 'original' && <img src={selectedReport.url} alt="Original Report" className="w-full h-auto" />}
                    {activeImageTab === 'annotated' && selectedReport.annotatedUrl && <img src={selectedReport.annotatedUrl} alt="AI Analysis" className="w-full h-auto" />}
                    {activeImageTab === 'resolved' && selectedReport.resolvedImage && <img src={selectedReport.resolvedImage} alt="Resolved" className="w-full h-auto" />}
                  </div>
                </div>
              )}

              {/* AI Detection Summary — dynamic per issue type */}
              {renderAISummary()}

            </div>
          </div>
        </div>

        {/* Footer */}
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

export default ReportDetailsModal;