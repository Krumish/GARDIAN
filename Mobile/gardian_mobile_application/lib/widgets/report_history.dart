import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:gardian_mobile_application/widgets/report_detail_page.dart';
import '../services/auth_services.dart';
import '../services/storage_service.dart';

const Color _navyColor = Color(0xFF162447);

class ReportHistory extends StatelessWidget {
  final Set<String> selectedFilters;

  const ReportHistory({super.key, required this.selectedFilters});

  @override
  Widget build(BuildContext context) {
    final uid = authService.value.currentUser?.uid;

    return StreamBuilder<QuerySnapshot>(
      stream: storageService.getUserUploadsStream(uid!),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(
            child: CircularProgressIndicator(color: _navyColor),
          );
        }

        if (!snapshot.hasData || snapshot.data!.docs.isEmpty) {
          return _buildEmptyState(
            "No reports found",
            Icons.folder_open_rounded,
          );
        }

        final uploads = snapshot.data!.docs.where((doc) {
          if (selectedFilters.isEmpty || selectedFilters.contains("All"))
            return true;

          final data = doc.data() as Map<String, dynamic>;
          final status = data['status'] ?? "Pending";
          final issueType = data['issueType'] ?? "Unknown";

          final activeTypes = selectedFilters.intersection({
            "Drainage",
            "Pothole",
            "Manhole",
            "Road Markings",
            "Waste Management",
            "Road Blockage",
          });
          final activeStatuses = selectedFilters.intersection({
            "Pending",
            "Resolved",
            "Withdrawn",
          });

          final matchType =
              activeTypes.isEmpty || activeTypes.contains(issueType);
          final matchStatus =
              activeStatuses.isEmpty || activeStatuses.contains(status);

          return matchType && matchStatus;
        }).toList();

        if (uploads.isEmpty) {
          return _buildEmptyState(
            "No reports match your filters",
            Icons.search_off_rounded,
          );
        }

        return ListView.builder(
          itemCount: uploads.length,
          padding: const EdgeInsets.only(
            left: 20,
            right: 20,
            top: 10,
            bottom: 120,
          ),
          itemBuilder: (context, index) {
            final data = uploads[index].data() as Map<String, dynamic>;
            return _ReportCard(reportId: uploads[index].id, data: data);
          },
        );
      },
    );
  }

  Widget _buildEmptyState(String message, IconData icon) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 48, color: Colors.grey.shade400),
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade500,
            ),
          ),
        ],
      ),
    );
  }
}

class _ReportCard extends StatefulWidget {
  final String reportId;
  final Map<String, dynamic> data;

  const _ReportCard({required this.reportId, required this.data});

  @override
  State<_ReportCard> createState() => _ReportCardState();
}

class _ReportCardState extends State<_ReportCard>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final url = widget.data['url'] as String?;
    final status = widget.data['status'] ?? "Pending";
    final issueType = widget.data['issueType'] ?? "Unknown";
    final address = widget.data['address'] ?? "No address provided";
    final yolo = widget.data['yolo'] as Map<String, dynamic>? ?? {};
    final obstructions = (yolo['obstructions'] as List?)?.length ?? 0;

    Color statusColor;
    IconData statusIcon;

    switch (status) {
      case "Pending":
        statusColor = Colors.orange.shade600;
        statusIcon = Icons.access_time_filled_rounded;
        break;
      case "Resolved":
        statusColor = Colors.green.shade600;
        statusIcon = Icons.check_circle_rounded;
        break;
      case "Withdrawn":
        statusColor = Colors.grey.shade600;
        statusIcon = Icons.cancel_rounded;
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.info_rounded;
    }

    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) =>
                ReportDetailPage(reportId: widget.reportId, data: widget.data),
          ),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 15,
              offset: const Offset(0, 5),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (url != null)
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
                    child: Image.network(
                      url,
                      height: 160,
                      width: double.infinity,
                      fit: BoxFit.cover,
                      // 🔹 Optional but recommended: reduces RAM usage for large network images
                      cacheHeight: 400,
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return Container(
                          height: 160,
                          width: double.infinity,
                          color: Colors.grey.shade100,
                          child: const Center(
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        );
                      },
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: statusColor,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(statusIcon, color: Colors.white, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            status,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        issueType,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                          color: _navyColor,
                        ),
                      ),
                      Text(
                        "#${widget.reportId.substring(0, 6).toUpperCase()}",
                        style: TextStyle(
                          color: Colors.grey.shade500,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.location_on_rounded,
                        color: Colors.grey.shade400,
                        size: 16,
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          address,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
