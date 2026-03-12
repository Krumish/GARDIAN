import { useState, useEffect, useMemo } from "react";
import { doc, updateDoc, getDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage, auth } from "../../firebase";
import { FaCheckCircle, FaUpload, FaFileAlt, FaUser, FaClock } from "react-icons/fa";

export default function ResolveReportModal({ report, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [resolvedImage, setResolvedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [customAction, setCustomAction] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [assignedTeam, setAssignedTeam] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminDetails, setAdminDetails] = useState(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // Suggestive words component 
  const ACTION_SUGGESTIONS = useMemo(() => ({
    Drainage: [
      "Cleared clogged gutter",
      "Removed debris from manhole",
      "Unclogged drainage",
      "Repaired broken drainage system",
      "Cleaned catch basin",
      "Installed new drainage cover",
    ],
    "Road Surface": [
      "Patched pothole",
      "Scheduled resurfacing",
      "Filled surface cracks",
      "Repaired road damage",
      "Applied sealcoat treatment",
      "Completed asphalt overlay",
    ],
    "Road Markings": [
      "Repainted road markings",
      "Restored pedestrian crossing",
      "Added new lane markings",
      "Refreshed traffic symbols",
      "Installed reflective markers",
      "Completed full road restriping",
    ],
    "Waste Management": [
      "Cleared overflowing trash",
      "Removed illegal dumping",
      "Collected accumulated waste",
      "Cleaned dumping site",
      "Scheduled waste pickup",
      "Installed additional bins",
    ],
    Pothole: [
      "Patched pothole with asphalt",
      "Filled pothole with gravel",
      "Repaired road surface",
      "Applied cold mix patching",
      "Completed temporary patch",
      "Scheduled permanent repair",
    ],
    Manhole: [
      "Replaced manhole cover",
      "Secured loose manhole cover",
      "Repaired damaged manhole",
      "Installed new manhole cover",
      "Cleaned manhole chamber",
      "Added safety barriers",
    ],
  }), []);

  const NOTES_SUGGESTIONS = useMemo(() => [
    "Weather conditions were",
    "Used materials:",
    "Temporary fix applied",
    "Permanent solution implemented",
    "Recommend regular inspection",
    "Follow-up required in",
    "No access issues encountered",
    "Equipment used:",
    "Delays due to",
    "Coordination with",
    "Safety measures implemented",
    "Preventive measures:",
    "Future recommendations:",
    "Work completed within",
    "Additional support needed from",
  ], []);

  // Generate reference code 
  const generateRefCode = useMemo(() => {
    if (!report?.id) return "REF-00000000-XXXXX";
    const ts = report.uploadedAt;
    const dateObj = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
    const dateStr =
      dateObj && !isNaN(dateObj)
        ? dateObj.toISOString().slice(0, 10).replace(/-/g, "")
        : "00000000";
    const shortHash = report.id.slice(-5).toUpperCase();
    return `REF-${dateStr}-${shortHash}`;
  }, [report]);

  // Current date/time (computed once on mount)
  const { currentDate, currentTime } = useMemo(() => {
    const now = new Date();
    return {
      currentDate: now.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      currentTime: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    };
  }, []);

  // Suggestions for the current issue type
  const suggestions = useMemo(() => {
    const issueType = report?.issueType || report?.type || "";
    return ACTION_SUGGESTIONS[issueType] ?? [];
  }, [report, ACTION_SUGGESTIONS]);

  // Fetch admin details
  useEffect(() => {
    const fetchAdminDetails = async () => {
      try {
        if (!auth.currentUser) {
          setLoadingAdmin(false);
          return;
        }
        const adminUid = auth.currentUser.uid;
        const adminSnap = await getDoc(doc(db, "users", adminUid));
        if (adminSnap.exists()) {
          const d = adminSnap.data();
          setAdminDetails({
            uid: adminUid,
            name: `${d.firstName || ""} ${d.lastName || ""}`.trim(),
            email: d.email || auth.currentUser.email,
            role: d.role || "admin",
          });
        } else {
          setAdminDetails({
            uid: adminUid,
            name: auth.currentUser.displayName || "Admin User",
            email: auth.currentUser.email,
            role: "admin",
          });
        }
      } catch (err) {
        console.error("Error fetching admin details:", err);
        setAdminDetails({
          uid: auth.currentUser?.uid || "unknown",
          name: "Admin User",
          email: auth.currentUser?.email || "",
          role: "admin",
        });
      } finally {
        setLoadingAdmin(false);
      }
    };
    fetchAdminDetails();
  }, []);

  // Image handlers
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image size should be less than 5MB");
      return;
    }
    setResolvedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setResolvedImage(null);
    setImagePreview(null);
  };

  // Step validation
  const validateStep = () => {
    if (step === 1 && !customAction.trim()) {
      alert("Please describe the action taken");
      return false;
    }
    if (step === 2 && !resolvedImage) {
      alert("Please upload a photo of the resolved issue");
      return false;
    }
    if (step === 3 && !additionalNotes.trim()) {
      alert("Please add additional notes or observations");
      return false;
    }
    return true;
  };

  const handleNext = () => { if (validateStep()) setStep((s) => s + 1); };
  const handleBack = () => setStep((s) => s - 1);

  // ─Submit resolution
  const handleSubmitResolution = async () => {
    if (!validateStep() || !adminDetails) return;
    setIsSubmitting(true);
    try {
      const storageRef = ref(storage, `resolved_images/${report.id}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, resolvedImage);
      const resolvedImageUrl = await getDownloadURL(storageRef);

      const reportDoc = report.docRef?.id
        ? report.docRef
        : doc(db, "users", report.userId, "uploads", report.id);

      await updateDoc(reportDoc, {
        status: "Resolved",
        resolvedImage: resolvedImageUrl,
        resolvedAt: Timestamp.now(),
        resolvedBy: {
          uid: adminDetails.uid,
          name: adminDetails.name,
          email: adminDetails.email,
          role: adminDetails.role,
        },
        resolutionDetails: {
          actionsTaken: customAction.trim(),
          additionalNotes: additionalNotes.trim(),
          assignedTeam: assignedTeam || "MENRO Team",
          resolvedDate: new Date().toISOString(),
          resolvedTime: new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }),
        },
      });

      alert("✅ Report successfully marked as resolved!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error("Error resolving report:", err);
      alert("Failed to resolve report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step label helpers
  const STEP_LABELS = useMemo(() => [
    "Actions Taken",
    "Upload Photo",
    "Add Notes",
    "Review & Submit",
  ], []);

  // Render
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <FaCheckCircle className="mr-3" />
                Resolve Report
              </h2>
              <p className="text-green-100 text-sm mt-1">Reference: {generateRefCode}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-green-600 rounded-full p-2 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                  step >= num ? "bg-green-500 text-white" : "bg-gray-300 text-gray-600"
                }`}>
                  {num}
                </div>
                {num < 4 && (
                  <div className={`w-16 h-1 mx-2 transition ${step > num ? "bg-green-500" : "bg-gray-300"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            {STEP_LABELS.map((label, i) => (
              <span key={label} className={step >= i + 1 ? "font-semibold text-green-600" : ""}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">

          {/* ── Step 1: Actions Taken ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                What actions were taken to resolve this issue?
              </h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assigned Team/Department
                </label>
                <select
                  value={assignedTeam}
                  onChange={(e) => setAssignedTeam(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select team</option>
                  <option value="MENRO Team">MENRO Team</option>
                  <option value="Engineering Department">Engineering Department</option>
                  <option value="Public Works">Public Works</option>
                  <option value="Waste Management">Waste Management</option>
                  <option value="Maintenance Team">Maintenance Team</option>
                </select>
              </div>

              {suggestions.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                    <FaFileAlt className="mr-2" />
                    Suggested Actions for {report.issueType || report.type} (Click to Add)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          const current = customAction.trim();
                          setCustomAction(current ? `${current}. ${suggestion}` : suggestion);
                        }}
                        className="bg-white hover:bg-blue-100 border border-blue-300 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:border-blue-400"
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Taken <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  placeholder="Click suggestions above or describe the specific actions taken..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">{customAction.length} characters</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Upload Photo ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Upload a photo showing the resolved issue
              </h3>
              <p className="text-sm text-gray-600">Please provide clear photo evidence</p>

              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition">
                  <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-green-600 font-semibold hover:text-green-700">Click to upload</span>
                    <span className="text-gray-600"> or drag and drop</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                </div>
              ) : (
                <div className="relative">
                  <img src={imagePreview} alt="Resolved" className="w-full h-64 object-cover rounded-lg border-2 border-green-500" />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Additional Notes ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Additional Notes & Observations
              </h3>
              <p className="text-sm text-gray-600">
                Click suggestions below to quickly add common phrases
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <FaFileAlt className="mr-2" />
                  Quick Phrases (Click to Add)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {NOTES_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        const current = additionalNotes.trim();
                        setAdditionalNotes(current ? `${current} ${suggestion} ` : `${suggestion} `);
                      }}
                      className="bg-white hover:bg-blue-100 border border-blue-300 text-blue-800 px-3 py-1 rounded-full text-xs font-medium transition-colors hover:border-blue-400"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Click suggestions above or type your notes here..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={6}
                />
                <p className="text-xs text-gray-500 mt-1">{additionalNotes.length} characters</p>
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Submit ── */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">Review Resolution Details</h3>

              {/* Admin Attribution */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                  <FaUser className="mr-2" />
                  🧾 Resolution Attribution (Auto-Generated)
                </h4>
                {loadingAdmin ? (
                  <p className="text-sm text-gray-600">Loading admin details...</p>
                ) : adminDetails ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Resolved By:</p>
                      <p className="text-sm text-gray-900 font-semibold">{adminDetails.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Email:</p>
                      <p className="text-sm text-gray-900">{adminDetails.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium">Role:</p>
                      <p className="text-sm text-gray-900 capitalize">{adminDetails.role.replace("_", " ")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 font-medium flex items-center">
                        <FaClock className="mr-1" /> Resolved On:
                      </p>
                      <p className="text-sm text-gray-900 font-semibold">
                        {currentDate} – {currentTime}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-red-600">Unable to load admin details</p>
                )}
                <p className="text-xs text-blue-700 mt-3 italic">
                  This information is automatically recorded and cannot be edited.
                </p>
              </div>

              {/* Report Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Report Information</h4>
                  <p className="text-sm text-gray-600"><strong>Reference:</strong> {generateRefCode}</p>
                  <p className="text-sm text-gray-600"><strong>Type:</strong> {report.issueType || report.type || "Unknown"}</p>
                  <p className="text-sm text-gray-600"><strong>Location:</strong> {report.address || "N/A"}</p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">Resolution Details</h4>
                  <p className="text-sm text-gray-600"><strong>Team:</strong> {assignedTeam || "MENRO Team"}</p>

                  <p className="text-sm text-gray-600 mt-3"><strong>Actions Taken:</strong></p>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded mt-1 whitespace-pre-wrap">{customAction}</p>

                  <p className="text-sm text-gray-600 mt-3"><strong>Additional Notes & Observations:</strong></p>
                  <p className="text-sm text-gray-700 bg-white p-3 rounded mt-1 whitespace-pre-wrap">{additionalNotes}</p>
                </div>

                {imagePreview && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Resolved Photo</h4>
                    <img src={imagePreview} alt="Resolution" className="w-full h-48 object-cover rounded-lg" />
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <FaCheckCircle className="inline mr-2" />
                  By submitting, you confirm this issue has been fully resolved and all information is accurate.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition font-medium"
            disabled={isSubmitting}
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmitResolution}
              disabled={isSubmitting || !adminDetails}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <FaCheckCircle className="mr-2" />
                  Confirm & Resolve
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}