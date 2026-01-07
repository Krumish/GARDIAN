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

    return Scaffold(
      appBar: AppBar(title: const Text("Report Details")),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
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
                        onPressed: () {
                          setState(() => showAnnotated = false);
                        },
                        child: const Text("Normal"),
                      ),
                      TextButton(
                        onPressed: () {
                          setState(() => showAnnotated = true);
                        },
                        child: const Text("Annotated"),
                      ),
                    ],
                  ),
              ],
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
                "#${widget.reportId}",
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
                    Text(
                      "Obstructions: ${(yolo['obstructions'] as List?)?.length ?? 0}",
                    ),
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
