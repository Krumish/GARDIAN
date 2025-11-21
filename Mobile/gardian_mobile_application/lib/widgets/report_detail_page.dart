import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class ReportDetailPage extends StatelessWidget {
  final String reportId;
  final Map<String, dynamic> data;

  const ReportDetailPage({
    super.key,
    required this.reportId,
    required this.data,
  });

  @override
  Widget build(BuildContext context) {
    final url = data['annotatedUrl'] ?? data['url'];
    final issueType = data['issueType'] ?? "Unknown";
    final address = data['address'] ?? "";
    final note = data['note'] ?? "";

    final yolo = data['yolo'] as Map<String, dynamic>? ?? {};
    final lat = data['latitude'];
    final lng = data['longitude'];

    return Scaffold(
      appBar: AppBar(title: const Text("Report Details")),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          if (url != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                url,
                height: 220,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),

          const SizedBox(height: 12),

          Card(
            child: ListTile(
              title: Text(
                issueType,
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Text(
                address.isNotEmpty ? address : "No address provided",
              ),
              trailing: Text(
                "#$reportId",
                style: const TextStyle(color: Colors.grey),
              ),
            ),
          ),

          const SizedBox(height: 8),

          if (issueType == "Drainage")
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "YOLO Summary",
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text("Status: ${yolo['status'] ?? 'Unknown'}"),
                    Text("Drainages: ${yolo['drainage_count'] ?? 0}"),
                    Text("Obstructions: ${yolo['obstruction_count'] ?? 0}"),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 12),

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
                        markerId: MarkerId(reportId),
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
