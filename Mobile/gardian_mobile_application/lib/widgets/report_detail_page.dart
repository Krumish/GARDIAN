import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class ReportDetailPage extends StatefulWidget {
  final String reportId;
  final Map<String, dynamic> data;

  const ReportDetailPage({
    super.key,
    required this.reportId,
    required this.data,
  });

  @override
  State<ReportDetailPage> createState() => _ReportDetailPageState();
}

class _ReportDetailPageState extends State<ReportDetailPage> {
  bool showAnnotated = false;

  // 🔹 Blockage helpers
  Color _blockageColor(double percent) {
    if (percent >= 60) return Colors.red;
    if (percent >= 25) return Colors.orange;
    return Colors.green;
  }

  String _blockageLabel(double percent) {
    if (percent >= 60) return "Severely Blocked Drainage";
    if (percent >= 25) return "Partially Blocked Drainage";
    return "Clear Drainage";
  }

  @override
  Widget build(BuildContext context) {
    final normalUrl = widget.data['url'];
    final annotatedUrl = widget.data['annotatedUrl'];
    final issueType = widget.data['issueType'] ?? "Unknown";
    final address = widget.data['address'] ?? "";
    final note = widget.data['note'] ?? "";
    final yolo = widget.data['yolo'] as Map<String, dynamic>? ?? {};
    final lat = widget.data['latitude'];
    final lng = widget.data['longitude'];

    // 🔹 Extract blockage percent safely
    final double? blockagePercent = yolo['blockage_percent']?.toDouble();

    return Scaffold(
      appBar: AppBar(title: const Text("Report Details")),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          // 🖼 Image
          if (normalUrl != null)
            Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    showAnnotated && annotatedUrl != null
                        ? annotatedUrl
                        : normalUrl,
                    height: 220,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                if (annotatedUrl != null)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      TextButton(
                        onPressed: () => setState(() => showAnnotated = false),
                        child: const Text("Normal"),
                      ),
                      TextButton(
                        onPressed: () => setState(() => showAnnotated = true),
                        child: const Text("Annotated"),
                      ),
                    ],
                  ),
              ],
            ),

          const SizedBox(height: 12),

          // Report header
          Card(
            child: ListTile(
              title: Text(
                issueType,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Text(
                address.isNotEmpty ? address : "No address provided",
              ),
            ),
          ),

          const SizedBox(height: 8),

          // YOLO summary
          // if (issueType == "Drainage")
          //   Card(
          //     child: Padding(
          //       padding: const EdgeInsets.all(12),
          //       child: Column(
          //         crossAxisAlignment: CrossAxisAlignment.start,
          //         children: [
          //           const Text(
          //             "YOLO Summary",
          //             style: TextStyle(fontWeight: FontWeight.bold),
          //           ),
          //           const SizedBox(height: 8),
          //           Text("Status: ${yolo['status'] ?? 'Unknown'}"),
          //           Text(
          //             "Obstructions: ${(yolo['obstructions'] as List?)?.length ?? 0}",
          //           ),
          //         ],
          //       ),
          //     ),
          //   ),

          // Blockage percentage card
          if (issueType == "Drainage" && blockagePercent != null)
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Drainage Blockage Assessment",
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Expanded(
                          child: LinearProgressIndicator(
                            value: blockagePercent / 100,
                            minHeight: 10,
                            backgroundColor: Colors.grey.shade300,
                            color: _blockageColor(blockagePercent),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          "${blockagePercent.toStringAsFixed(1)}%",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _blockageColor(blockagePercent),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 8),

                    Text(
                      _blockageLabel(blockagePercent),
                      style: TextStyle(
                        color: _blockageColor(blockagePercent),
                        fontWeight: FontWeight.w600,
                      ),
                    ),

                    const SizedBox(height: 8),

                    const Text(
                      "This percentage estimates how much of the visible drainage area is obstructed based on image analysis.",
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 12),

          // Notes
          if (note.toString().trim().isNotEmpty)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Notes",
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 6),
                    Text(note),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 12),

          // Map
          if (lat != null && lng != null)
            SizedBox(
              height: 200,
              child: Card(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: LatLng(lat as double, lng as double),
                      zoom: 16,
                    ),
                    markers: {
                      Marker(
                        markerId: MarkerId(widget.reportId),
                        position: LatLng(lat as double, lng as double),
                      ),
                    },
                    zoomControlsEnabled: false,
                    myLocationEnabled: false,
                    myLocationButtonEnabled: false,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
