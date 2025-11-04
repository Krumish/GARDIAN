import 'dart:convert';
import 'dart:typed_data';
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
  bool _uploading = false;
  Uint8List? _annotatedImageBytes; // 🔹 Store decoded image bytes

  @override
  void initState() {
    super.initState();
    _yoloResults = widget.yoloResults;

    // 🔹 Decode the base64 annotated image if available
    if (_yoloResults?["annotated_image"] != null) {
      try {
        _annotatedImageBytes = base64Decode(
          _yoloResults!["annotated_image"] as String,
        );
      } catch (e) {
        debugPrint("⚠️ Failed to decode annotated image: $e");
      }
    }
  }

  Future<void> _uploadToFirebase(BuildContext context) async {
    try {
      setState(() => _uploading = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("☁️ Uploading to Firebase...")),
      );

      // 🔹 Save the annotated image temporarily before upload
      File uploadFile = widget.imageFile;
      if (_annotatedImageBytes != null) {
        final tempPath = "${Directory.systemTemp.path}/annotated_upload.jpg";
        final tempFile = File(tempPath);
        await tempFile.writeAsBytes(_annotatedImageBytes!);
        uploadFile = tempFile;
      }

      await storageService.uploadUserImage(
        uploadFile,
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
            // 📷 Image Preview (Annotated if available)
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: _annotatedImageBytes != null
                  ? Image.memory(
                      _annotatedImageBytes!,
                      height: 250,
                      fit: BoxFit.cover,
                    )
                  : Image.file(
                      widget.imageFile,
                      height: 250,
                      fit: BoxFit.cover,
                    ),
            ),
            const SizedBox(height: 16),

            // 📍 Location Info
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

            // 🔎 YOLO Detection Results
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
                      Text("Status: ${_yoloResults!["status"]}"),
                      Text(
                        "Drainages Detected: ${_yoloResults!["drainage_count"]}",
                      ),
                      Text(
                        "Obstructions Detected: ${_yoloResults!["obstruction_count"]}",
                      ),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 24),

            // ✅ Confirm & Upload Button
            ElevatedButton.icon(
              onPressed: _uploading ? null : () => _uploadToFirebase(context),
              icon: const Icon(Icons.cloud_upload_outlined),
              label: Text(_uploading ? "Uploading..." : "Confirm & Upload"),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                textStyle: const TextStyle(fontSize: 16),
              ),
            ),

            const SizedBox(height: 12),

            // ❌ Cancel Button
            TextButton(
              onPressed: _uploading ? null : () => Navigator.pop(context),
              child: const Text("Cancel"),
            ),
          ],
        ),
      ),
    );
  }
}
