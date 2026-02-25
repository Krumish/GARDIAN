import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/notification_service.dart';
import '../services/auth_services.dart';
import 'report_detail_page.dart';

// 🔹 Navy color to match your app's theme from the previous file
const Color _navyColor = Color(0xFF162447);

void showNotificationModal(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => SizedBox(
      height: MediaQuery.of(context).size.height * 0.65,
      child: const _NotificationSheet(),
    ),
  );
}

// 🔹 EXTRACTED WIDGET: Keeps context safe and code modular
class _NotificationSheet extends StatelessWidget {
  const _NotificationSheet();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Drag Handle
        const SizedBox(height: 12),
        Container(
          width: 40,
          height: 4,
          decoration: BoxDecoration(
            color: Colors.grey.shade300,
            borderRadius: BorderRadius.circular(10),
          ),
        ),

        // Header
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 8, 10),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                "Notifications",
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: _navyColor,
                ),
              ),
              TextButton(
                onPressed: () async {
                  await notificationService.clearAllNotifications();
                },
                child: const Text(
                  "Clear All",
                  style: TextStyle(
                    color: Colors.red,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),

        // Notification List
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: notificationService.getNotificationsStream(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(
                  child: CircularProgressIndicator(color: _navyColor),
                );
              }

              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.notifications_off_rounded,
                        size: 48,
                        color: Colors.grey.shade300,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        "No notifications yet",
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 16,
                        ),
                      ),
                    ],
                  ),
                );
              }

              final notifications = snapshot.data!.docs;

              return ListView.builder(
                itemCount: notifications.length,
                itemBuilder: (context, index) {
                  final doc = notifications[index];
                  final data = doc.data() as Map<String, dynamic>;

                  final message = data['message'] ?? 'New notification';
                  final read = data['read'] ?? false;
                  final reportId = data['reportId'];

                  return Container(
                    color: read
                        ? Colors.transparent
                        : Colors.blue.withOpacity(0.05),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 8,
                      ),
                      leading: CircleAvatar(
                        backgroundColor: read
                            ? Colors.grey.shade100
                            : Colors.blue.shade50,
                        child: Icon(
                          read
                              ? Icons.notifications_none_rounded
                              : Icons.notifications_active_rounded,
                          color: read
                              ? Colors.grey.shade500
                              : Colors.blue.shade600,
                        ),
                      ),
                      title: Text(
                        message,
                        style: TextStyle(
                          fontWeight: read
                              ? FontWeight.normal
                              : FontWeight.bold,
                          color: read ? Colors.grey.shade700 : Colors.black87,
                        ),
                      ),
                      subtitle: reportId != null
                          ? Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                "Report #${reportId.toString().substring(0, 6).toUpperCase()}",
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey.shade500,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            )
                          : null,
                      onTap: () =>
                          _handleNotificationTap(context, doc.id, reportId),
                    ),
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  // 🔹 Separated logic for cleaner UI code
  Future<void> _handleNotificationTap(
    BuildContext context,
    String docId,
    String? reportId,
  ) async {
    // 1️⃣ Fire-and-forget: Mark as read immediately (don't await, keeps UI snappy)
    notificationService.markAsRead(docId);

    if (reportId == null) return;

    final uid = authService.value.currentUser?.uid;
    if (uid == null) return;

    // Optional: Show a loading indicator dialog here if reports take long to fetch

    // 2️⃣ Fetch report data
    final reportSnap = await FirebaseFirestore.instance
        .collection("users")
        .doc(uid)
        .collection("uploads")
        .doc(reportId)
        .get();

    // 3️⃣ SAFE CONTEXT CHECK: Ensure widget is still alive after async gap
    if (!context.mounted) return;

    if (!reportSnap.exists) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("Report no longer exists.")));
      return;
    }

    // 4️⃣ Close modal & Navigate
    Navigator.of(context).pop(); // Close bottom sheet
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) =>
            ReportDetailPage(reportId: reportId, data: reportSnap.data()!),
      ),
    );
  }
}
