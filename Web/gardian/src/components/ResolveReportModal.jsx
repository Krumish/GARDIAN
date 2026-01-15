import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import { FaCheckCircle, FaUpload, FaFileAlt } from "react-icons/fa";

// Systematic Report Resolution Modal Component
export default function ResolveReportModal({ report, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [resolvedImage, setResolvedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [assignedTeam, setAssignedTeam] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle image selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Image size should be less than 5MB");
        return;
      }
      setResolvedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Remove selected image
  const handleRemoveImage = () => {
    setResolvedImage(null);
    setImagePreview(null);
  };

  // Validate current step
  const validateStep = () => {
    if (step === 1) {
      if (!actionTaken.trim()) {
        alert("Please describe the action taken");
        return false;
      }
    } else if (step === 2) {
      if (!resolvedImage) {
        alert("Please upload a photo of the resolved issue");
        return false;
      }
    } else if (step === 3) {
      if (!resolutionNotes.trim()) {
        alert("Please add resolution notes");
        return false;
      }
    }
    return true;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  // Handle previous step
  const handleBack = () => {
    setStep(step - 1);
  };

  // Submit resolution
  const handleSubmitResolution = async () => {
    if (!validateStep()) return;

    setIsSubmitting(true);

    try {
      // Upload resolved image to Firebase Storage
      const storageRef = ref(
        storage,
        `resolved_images/${report.id}_${Date.now()}.jpg`
      );
      await uploadBytes(storageRef, resolvedImage);
      const resolvedImageUrl = await getDownloadURL(storageRef);

      // Get document reference
      const reportDoc = report.docRef?.id
        ? report.docRef
        : doc(db, "users", report.userId, "uploads", report.id);

      // Prepare update data
      const updateData = {
        status: "Resolved",
        resolvedImage: resolvedImageUrl,
        resolvedAt: new Date(),
        resolutionDetails: {
          actionTaken: actionTaken,
          notes: resolutionNotes,
          assignedTeam: assignedTeam || "MENRO Team",
          resolvedBy: "Admin",
          resolvedDate: new Date().toISOString(),
        },
      };

      // Update Firestore
      await updateDoc(reportDoc, updateData);

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
              <p className="text-green-100 text-sm mt-1">
                Report ID: {report.id.substring(0, 12)}...
              </p>
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
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                    step >= num
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {num}
                </div>
                {num < 4 && (
                  <div
                    className={`w-16 h-1 mx-2 transition ${
                      step > num ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span className={step >= 1 ? "font-semibold text-green-600" : ""}>
              Action Taken
            </span>
            <span className={step >= 2 ? "font-semibold text-green-600" : ""}>
              Upload Photo
            </span>
            <span className={step >= 3 ? "font-semibold text-green-600" : ""}>
              Add Notes
            </span>
            <span className={step >= 4 ? "font-semibold text-green-600" : ""}>
              Review & Submit
            </span>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {/* Step 1: Action Taken */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                What action was taken to resolve this issue?
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Taken <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="Describe the specific actions taken to resolve this issue (e.g., Repaired drainage system, Cleaned blocked pipes, etc.)"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows="5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {actionTaken.length} characters
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Upload Photo */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Upload a photo showing the resolved issue
              </h3>
              <p className="text-sm text-gray-600">
                Please provide clear before/after photo evidence
              </p>

              {!imagePreview ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition">
                  <FaUpload className="mx-auto text-4xl text-gray-400 mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-green-600 font-semibold hover:text-green-700">
                      Click to upload
                    </span>
                    <span className="text-gray-600"> or drag and drop</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG up to 5MB
                  </p>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Resolved"
                    className="w-full h-64 object-cover rounded-lg border-2 border-green-500"
                  />
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

          {/* Step 3: Resolution Notes */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Add additional notes or observations
              </h3>
              <p className="text-sm text-gray-600">
                Include any important details about the resolution
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add any additional notes, challenges faced, materials used, or recommendations for preventing similar issues..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows="6"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {resolutionNotes.length} characters
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-800">
                Review Resolution Details
              </h3>

              {/* Summary Card */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">
                    Report Information
                  </h4>
                  <p className="text-sm text-gray-600">
                    <strong>ID:</strong> {report.id.substring(0, 20)}...
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Type:</strong> {report.issueType || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Location:</strong> {report.address || "N/A"}
                  </p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">
                    Resolution Details
                  </h4>
                  <p className="text-sm text-gray-600">
                    <strong>Team:</strong> {assignedTeam || "MENRO Team"}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Action Taken:</strong>
                  </p>
                  <p className="text-sm text-gray-700 bg-white p-2 rounded mt-1">
                    {actionTaken}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Notes:</strong>
                  </p>
                  <p className="text-sm text-gray-700 bg-white p-2 rounded mt-1">
                    {resolutionNotes}
                  </p>
                </div>

                {imagePreview && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Resolved Photo
                    </h4>
                    <img
                      src={imagePreview}
                      alt="Resolution"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <FaCheckCircle className="inline mr-2" />
                  By submitting, you confirm that this issue has been fully resolved.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
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
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <FaCheckCircle className="mr-2" />
                  Mark as Resolved
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}