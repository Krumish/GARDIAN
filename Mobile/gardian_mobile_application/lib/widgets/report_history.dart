import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../services/auth_services.dart';
import '../services/storage_service.dart';
import 'report_detail_page.dart';

class ReportHistory extends StatelessWidget {
  const ReportHistory({super.key});

  @override
  Widget build(BuildContext context) {
    final uid = authService.value.currentUser?.uid;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            "Report History",
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
          ),
        ),
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: storageService.getUserUploadsStream(uid!),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
                return const Center(child: Text("No reports yet"));
              }

              final uploads = snapshot.data!.docs;

              return ListView.builder(
                itemCount: uploads.length,
                padding: const EdgeInsets.all(12),
                itemBuilder: (context, index) {
                  final doc = uploads[index];
                  final data = doc.data() as Map<String, dynamic>;
                  final url = data['url'] as String?;
                  final reportId = doc.id;

                  // 🔹 Workflow status
                  final status = data['status'] ?? "Pending";

                  // 🔹 YOLO detection results
                  final yolo = data['yolo'] as Map<String, dynamic>? ?? {};
                  final drainages = yolo['drainage_count'] ?? 0;
                  final obstructions = yolo['obstruction_count'] ?? 0;
                  final detectionStatus = yolo['status'] ?? "Unknown";

                  // 🔹 Location / Address
                  final address = data['address'] ?? "No address";
                  final lat = data['latitude'];
                  final lng = data['longitude'];

                  // 🔹 Optional note
                  final note = data['note'] ?? "";

                  // Status color
                  Color statusColor;
                  switch (status) {
                    case "In Progress":
                      statusColor = Colors.redAccent;
                      break;
                    case "Assigned":
                      statusColor = Colors.orangeAccent;
                      break;
                    case "Resolved":
                      statusColor = Colors.green;
                      break;
                    default:
                      statusColor = Colors.grey;
                  }

                  return GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              ReportDetailPage(reportId: reportId, data: data),
                        ),
                      );
                    },
                    child: Card(
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      margin: const EdgeInsets.only(bottom: 20),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (url != null)
                            ClipRRect(
                              borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(12),
                              ),
                              child: Image.network(
                                url,
                                height: 150,
                                width: double.infinity,
                                fit: BoxFit.cover,
                              ),
                            ),
                          Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // 🔹 Workflow status badge
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 4,
                                  ),
                                  decoration: BoxDecoration(
                                    color: statusColor,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Text(
                                    status,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 12,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),

                                // 🔹 YOLO detection info
                                Text(
                                  "Detected: $drainages drainage(s), $obstructions obstruction(s)",
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  "Drainage Status: $detectionStatus",
                                  style: const TextStyle(color: Colors.black54),
                                ),

                                const SizedBox(height: 6),

                                // 🔹 Address
                                Text(
                                  "Address: $address",
                                  style: const TextStyle(
                                    color: Colors.grey,
                                    fontSize: 13,
                                  ),
                                ),

                                const SizedBox(height: 4),

                                // 🔹 Report ID
                                Text(
                                  "#$reportId",
                                  style: const TextStyle(
                                    color: Colors.grey,
                                    fontSize: 11,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
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
}
