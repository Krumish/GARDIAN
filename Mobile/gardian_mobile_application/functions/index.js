/* eslint-disable object-curly-spacing */
/* eslint-disable indent */

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

exports.onReportStatusChange = onDocumentUpdated(
  "users/{uid}/uploads/{reportId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();

    // Safety checks
    if (!before || !after) return;

    // Only trigger if status actually changed
    if (before.status === after.status) return;

    const { uid, reportId } = event.params;

    const newStatus = after.status;
    const issueType = after.issueType || "Unknown";

    const notification = {
      title: "Report Status Updated",
      message: `Your ${issueType} report is now ${newStatus}.`,
      reportId,
      status: newStatus,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    };

    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .collection("notifications")
      .add(notification);
  },
);
