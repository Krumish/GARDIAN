import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:gardian_mobile_application/widgets/report_detail_page.dart';
import '../services/auth_services.dart';
import '../services/storage_service.dart';

class ReportHistory extends StatelessWidget {
  // 🔹 1. Changed from String to Set<String> to support multiple selections
  final Set<String> selectedFilters;

  const ReportHistory({super.key, required this.selectedFilters});

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
                return _buildEmptyState("No reports yet", Icons.folder_open);
              }

              // 🔹 2. Updated multi-filter logic
              final allUploads = snapshot.data!.docs;
              final uploads = allUploads.where((doc) {
                // If nothing is selected, or "All" is selected, show everything
                if (selectedFilters.isEmpty ||
                    selectedFilters.contains("All")) {
                  return true;
                }

                final data = doc.data() as Map<String, dynamic>;
                final status = data['status'] ?? "Pending";
                final issueType = data['issueType'] ?? "Unknown";

                // Show the document if its status OR its issueType is in the selected filters
                return selectedFilters.contains(status) ||
                    selectedFilters.contains(issueType);
              }).toList();

              // 🔹 3. Show empty state if the filter results in 0 items
              if (uploads.isEmpty) {
                return _buildEmptyState(
                  "No reports match the selected filters",
                  Icons.search_off,
                );
              }

              return ListView.builder(
                itemCount: uploads.length,
                padding: const EdgeInsets.all(12),
                itemBuilder: (context, index) {
                  final data = uploads[index].data() as Map<String, dynamic>;
                  final url = data['url'] ?? data['url'] as String?;
                  final reportId = uploads[index].id;
                  final status = data['status'] ?? "Pending";
                  final issueType = data['issueType'] ?? "Unknown";
                  final address = data['address'] ?? "";

                  final yolo = data['yolo'] as Map<String, dynamic>? ?? {};
                  final obstructions =
                      (yolo['obstructions'] as List?)?.length ?? 0;

                  // 🔹 4. Added Explicit "Withdrawn" Color
                  Color statusColor;
                  switch (status) {
                    case "Pending":
                      statusColor = Colors.redAccent;
                      break;
                    case "Resolved":
                      statusColor = Colors.green;
                      break;
                    case "Withdrawn":
                      statusColor =
                          Colors.blueGrey; // Added distinct color for Withdrawn
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
                                // STATUS LABEL
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

                                Text(
                                  issueType,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                  ),
                                ),

                                const SizedBox(height: 6),

                                // DRAINAGE YOLO ONLY
                                if (issueType == "Drainage")
                                  Text(
                                    "Detected: $obstructions Obstruction(s)",
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),

                                if (issueType != "Drainage")
                                  const Text(
                                    " ",
                                    style: TextStyle(color: Colors.grey),
                                  ),

                                if (address.isNotEmpty)
                                  Text(
                                    address,
                                    style: const TextStyle(
                                      color: Colors.grey,
                                      fontSize: 12,
                                    ),
                                  ),

                                const SizedBox(height: 6),

                                Text(
                                  "#$reportId",
                                  style: const TextStyle(
                                    color: Colors.grey,
                                    fontSize: 12,
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

  // Helper widget for a cleaner empty state
  Widget _buildEmptyState(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 60, color: Colors.grey.shade400),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }
}
