import 'dart:convert';
import 'dart:typed_data';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geocoding/geocoding.dart';
import '../../../services/storage_service.dart';

class ConfirmationPage extends StatefulWidget {
  final File imageFile;
  final LatLng selectedCoordinate;
  final Map<String, dynamic>? yoloResults;
  final String issueType;

  const ConfirmationPage({
    super.key,
    required this.imageFile,
    required this.selectedCoordinate,
    this.yoloResults,
    required this.issueType,
  });

  @override
  State<ConfirmationPage> createState() => _ConfirmationPageState();
}

class _ConfirmationPageState extends State<ConfirmationPage> {
  Map<String, dynamic>? _yoloResults;
  bool _uploading = false;
  bool _isFetchingAddress = false;
  Uint8List? _annotatedImageBytes;

  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _yoloResults = widget.yoloResults;

    if (_yoloResults?["annotated_image"] != null) {
      try {
        _annotatedImageBytes = base64Decode(
          _yoloResults!["annotated_image"] as String,
        );
      } catch (e) {
        debugPrint("⚠️ Failed to decode annotated image: $e");
      }
    }

    _fetchAddressFromCoordinates();
  }

  Future<void> _fetchAddressFromCoordinates() async {
    setState(() => _isFetchingAddress = true);
    try {
      final placemarks = await placemarkFromCoordinates(
        widget.selectedCoordinate.latitude,
        widget.selectedCoordinate.longitude,
      );

      if (placemarks.isNotEmpty) {
        final p = placemarks.first;
        final formatted = [
          p.street,
          p.subLocality,
          p.locality,
          p.administrativeArea,
          p.country,
        ].where((e) => e != null && e!.isNotEmpty).join(", ");

        setState(() => _locationController.text = formatted);
      }
    } catch (e) {
      debugPrint("⚠️ Failed to get address: $e");
    } finally {
      setState(() => _isFetchingAddress = false);
    }
  }

  Future<void> _uploadToFirebase(BuildContext context) async {
    if (_locationController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("⚠️ Please confirm the location/address."),
        ),
      );
      return;
    }

    try {
      setState(() => _uploading = true);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("☁️ Uploading to Firebase...")),
      );

      File uploadFile = widget.imageFile;

      if (_annotatedImageBytes != null) {
        final tempPath = "${Directory.systemTemp.path}/annotated_upload.jpg";
        final tempFile = File(tempPath);
        await tempFile.writeAsBytes(_annotatedImageBytes!);
        uploadFile = tempFile;
      }

      await storageService.uploadUserImage(
        widget.imageFile, // 🔹 always the ORIGINAL image
        annotatedImageBytes:
            _annotatedImageBytes, // 🔹 pass annotated separately
        lat: widget.selectedCoordinate.latitude,
        lng: widget.selectedCoordinate.longitude,
        address: _locationController.text.trim(),
        note: _noteController.text.trim(),
        yoloResults: _yoloResults,
        issueType: widget.issueType,
      );


      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text("✅ Upload successful!")));

      if (mounted) Navigator.popUntil(context, (route) => route.isFirst);
    } catch (e) {
      setState(() => _uploading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("❌ Upload failed: $e")));
    }
  }

  @override
  Widget build(BuildContext context) {
    final drainage = (_yoloResults?["drainage"] as List?) ?? [];
    final obstructions = (_yoloResults?["obstructions"] as List?) ?? [];

    return Scaffold(
      appBar: AppBar(title: Text("Confirm ${widget.issueType} Report")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
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

            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: ListTile(
                leading: const Icon(Icons.location_on, color: Colors.red),
                title: const Text("Selected Coordinates"),
                subtitle: Text(
                  "Lat: ${widget.selectedCoordinate.latitude.toStringAsFixed(6)}, "
                  "Lng: ${widget.selectedCoordinate.longitude.toStringAsFixed(6)}",
                ),
              ),
            ),

            const SizedBox(height: 16),

            TextField(
              controller: _locationController,
              decoration: InputDecoration(
                labelText: "Location / Address",
                hintText: "Fetching address...",
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.location_on_outlined),
                suffixIcon: _isFetchingAddress
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : IconButton(
                        icon: const Icon(Icons.refresh),
                        onPressed: _fetchAddressFromCoordinates,
                      ),
              ),
            ),

            const SizedBox(height: 16),

            // 🔥 NEW: Object-based YOLO results
            if (widget.issueType == "Drainage" &&
                _yoloResults != null &&
                _yoloResults!.isNotEmpty)
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(12),
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

                      Text("Status: ${_yoloResults!["status"] ?? "Unknown"}"),

                      const SizedBox(height: 8),

                      Text("Obstructions (${obstructions.length})"),
                      ...obstructions.map((o) => Text("• ${o["class"]}")),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 16),

            TextField(
              controller: _noteController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: "Additional Notes (optional)",
                hintText:
                    "Add any other details about the location or obstruction...",
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.note_alt_outlined),
              ),
            ),

            const SizedBox(height: 24),

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
