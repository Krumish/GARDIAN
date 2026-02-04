import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/notification_service.dart';
import '../services/auth_services.dart';
import 'report_detail_page.dart'; // NEW

void showNotificationModal(BuildContext context) {
  showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
    ),
    builder: (_) {
      return SizedBox(
        height: MediaQuery.of(context).size.height * 0.6,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    "Notifications",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),

                  TextButton(
                    onPressed: () async {
                      await notificationService.clearAllNotifications();
                    },
                    child: const Text(
                      "Clear",
                      style: TextStyle(color: Colors.red),
                    ),
                  ),
                ],
              ),
            ),

            const Divider(),

            Expanded(
              child: StreamBuilder<QuerySnapshot>(
                stream: notificationService.getNotificationsStream(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }

                  if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                    return const Center(child: Text("No notifications yet"));
                  }

                  final notifications = snapshot.data!.docs;

                  return ListView.builder(
                    itemCount: notifications.length,
                    itemBuilder: (context, index) {
                      final doc = notifications[index];
                      final data = doc.data() as Map<String, dynamic>;

                      final message = data['message'] ?? '';
                      final read = data['read'] ?? false;
                      final reportId = data['reportId']; // NEW

                      return ListTile(
                        leading: Icon(
                          read ? Icons.notifications_none : Icons.notifications,
                          color: read ? Colors.grey : Colors.blue,
                        ),
                        title: Text(message),
                        subtitle: Text(
                          "Report #$reportId",
                          style: const TextStyle(fontSize: 12),
                        ),

                        onTap: () async {
                          // 1️⃣ Mark notification as read
                          await notificationService.markAsRead(doc.id);

                          final uid = authService.value.currentUser?.uid;
                          if (uid == null) return;

                          // 2️⃣ Fetch report data
                          final reportSnap = await FirebaseFirestore.instance
                              .collection("users")
                              .doc(uid)
                              .collection("uploads")
                              .doc(reportId)
                              .get();

                          if (!reportSnap.exists) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text("Report not found")),
                            );
                            return;
                          }

                          // 3️⃣ Close modal
                          Navigator.of(context).pop();

                          // 4️⃣ Navigate to Report Detail
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ReportDetailPage(
                                reportId: reportId,
                                data: reportSnap.data()!,
                              ),
                            ),
                          );
                        },
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      );
    },
  );
}
