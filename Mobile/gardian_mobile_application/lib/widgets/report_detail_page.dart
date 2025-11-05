import 'package:flutter/material.dart';
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
    final url = data['url'] as String?;
    final address = data['address'] ?? "No address provided";
    final note = data['note'] ?? "";
    final status = data['status'] ?? "Pending";
    final lat = data['latitude']?.toDouble();
    final lng = data['longitude']?.toDouble();

    final yolo = data['yolo'] as Map<String, dynamic>? ?? {};
    final drainages = yolo['drainage_count'] ?? 0;
    final obstructions = yolo['obstruction_count'] ?? 0;
    final detectionStatus = yolo['status'] ?? "Unknown";

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

    return Scaffold(
      appBar: AppBar(title: const Text("Report Details")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (url != null)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                url,
                height: 200,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
            ),
          const SizedBox(height: 16),

          // Status
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: statusColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  status,
                  style: const TextStyle(color: Colors.white),
                ),
              ),
              const Spacer(),
              Text("#$reportId", style: const TextStyle(color: Colors.grey)),
            ],
          ),
          const SizedBox(height: 12),

          // YOLO results
          Card(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "YOLO Detection Results",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const Divider(),
                  Text("Drainages Detected: $drainages"),
                  Text("Obstructions Detected: $obstructions"),
                  Text("Status: $detectionStatus"),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (lat != null && lng != null)
            SizedBox(
              height: 250,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: GoogleMap(
                  initialCameraPosition: CameraPosition(
                    target: LatLng(lat, lng),
                    zoom: 18,
                  ),
                  markers: {
                    Marker(
                      markerId: const MarkerId("report_location"),
                      position: LatLng(lat, lng),
                      infoWindow: InfoWindow(title: "Report Location"),
                    ),
                  },
                  myLocationButtonEnabled: false,
                  liteModeEnabled: true, // ✅ Mini map style
                ),
              ),
            ),
          const SizedBox(height: 16),
          // Address
          Card(
            child: ListTile(
              leading: const Icon(Icons.location_on, color: Colors.red),
              title: const Text("Address"),
              subtitle: Text(address),
            ),
          ),

          // Note
          if (note.isNotEmpty)
            Card(
              child: ListTile(
                leading: const Icon(Icons.note_alt_outlined),
                title: const Text("User Note"),
                subtitle: Text(note),
              ),
            ),

          // Map
        ],
      ),
    );
  }
}
