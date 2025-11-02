import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../services/storage_service.dart';

class ConfirmationPage extends StatefulWidget {
  final File imageFile;
  final LatLng selectedLocation;
  final Map<String, dynamic>? yoloResults;

  const ConfirmationPage({
    super.key,
    required this.imageFile,
    required this.selectedLocation,
    this.yoloResults,
  });

  @override
  State<ConfirmationPage> createState() => _ConfirmationPageState();
}

class _ConfirmationPageState extends State<ConfirmationPage> {
  Map<String, dynamic>? _yoloResults;
  bool _processing = false;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    _yoloResults = widget.yoloResults;
  }

  Future<void> _uploadToFirebase(BuildContext context) async {
    try {
      setState(() => _uploading = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("☁️ Uploading to Firebase...")),
      );

      await storageService.uploadUserImage(
        widget.imageFile,
        lat: widget.selectedLocation.latitude,
        lng: widget.selectedLocation.longitude,
        yoloResults: _yoloResults,
      );

      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("✅ Upload successful!")));

      if (mounted) {
        Navigator.popUntil(context, (route) => route.isFirst);
      }
    } catch (e) {
      setState(() => _uploading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("❌ Upload failed: $e")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Confirm Upload")),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: ListView(
          children: [
            // 📷 Image preview
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.file(
                widget.imageFile,
                height: 250,
                fit: BoxFit.cover,
              ),
            ),
            const SizedBox(height: 16),

            // 📍 Location info
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: ListTile(
                leading: const Icon(Icons.location_on, color: Colors.red),
                title: const Text("Selected Location"),
                subtitle: Text(
                  "Lat: ${widget.selectedLocation.latitude.toStringAsFixed(6)}, "
                  "Lng: ${widget.selectedLocation.longitude.toStringAsFixed(6)}",
                ),
              ),
            ),
            const SizedBox(height: 16),

            // 🔎 YOLO detection results (if available)
            if (_yoloResults != null && _yoloResults!.isNotEmpty)
              Card(
                elevation: 2,
                margin: const EdgeInsets.only(top: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "YOLO Detection Results",
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      const Divider(),
                      ..._yoloResults!.entries.map(
                        (e) => Text("${e.key}: ${e.value}"),
                      ),
                    ],
                  ),
                ),
              )
            else
              const Padding(
                padding: EdgeInsets.all(8.0),
                child: Text("No detection results available."),
              ),

            const SizedBox(height: 24),

            // ✅ Confirm & Upload button
            ElevatedButton.icon(
              onPressed: _uploading ? null : () => _uploadToFirebase(context),
              icon: const Icon(Icons.cloud_upload_outlined),
              label: Text(
                _processing
                    ? "Analyzing..."
                    : _uploading
                    ? "Uploading..."
                    : "Analyze & Upload",
              ),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(fontSize: 16),
              ),
            ),

            const SizedBox(height: 12),

            // ❌ Cancel button
            TextButton(
              onPressed: _processing || _uploading
                  ? null
                  : () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
          ],
        ),
      ),
    );
  }
}
