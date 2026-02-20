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

    // Decode annotated image (if present)
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

  // ===================== HELPERS =====================

  String _blockageLabel(double percent) {
    if (percent >= 60) return "Clogged";
    if (percent >= 25) return "Partially Blocked";
    return "Clear";
  }

  Color _blockageColor(double percent) {
    if (percent >= 60) return Colors.red;
    if (percent >= 25) return Colors.orange;
    return Colors.green;
  }

  // ===================== LOCATION =====================

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

  // ===================== UPLOAD =====================

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

      await storageService.uploadUserImage(
        widget.imageFile, // original image always
        annotatedImageBytes: _annotatedImageBytes,
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

  // ===================== UI =====================

  @override
  Widget build(BuildContext context) {
    final drainage = (_yoloResults?["drainage"] as List?) ?? [];
    final obstructions = (_yoloResults?["obstructions"] as List?) ?? [];

    final double? blockagePercent = (_yoloResults?["blockage_percent"] as num?)
        ?.toDouble();

    return Scaffold(
      appBar: AppBar(title: Text("Confirm ${widget.issueType} Report")),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            // ================= IMAGE =================
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

            // ================= COORDINATES =================
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

            // ================= ADDRESS =================
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

            // ================= BLOCKAGE PERCENT =================
            if (widget.issueType == "Drainage" && blockagePercent != null)
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

            const SizedBox(height: 16),

            // ================= YOLO DETAILS =================
            // if (widget.issueType == "Drainage" &&
            //     _yoloResults != null &&
            //     _yoloResults!.isNotEmpty)
            //   Card(
            //     elevation: 2,
            //     shape: RoundedRectangleBorder(
            //       borderRadius: BorderRadius.circular(12),
            //     ),
            //     child: Padding(
            //       padding: const EdgeInsets.all(12),
            //       child: Column(
            //         crossAxisAlignment: CrossAxisAlignment.start,
            //         children: [
            //           const Text(
            //             "YOLO Detection Results",
            //             style: TextStyle(
            //               fontWeight: FontWeight.bold,
            //               fontSize: 16,
            //             ),
            //           ),
            //           const Divider(),
            //           Text("Drainage objects: ${drainage.length}"),
            //           const SizedBox(height: 8),
            //           Text("Detected obstructions (${obstructions.length})"),
            //           ...obstructions.map((o) => Text("• ${o["class"]}")),
            //         ],
            //       ),
            //     ),
            //   ),

            // const SizedBox(height: 16),

            // ================= NOTES =================
            TextField(
              controller: _noteController,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: "Additional Notes (optional)",
                hintText:
                    "Add any other details about the location or issue...",
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.note_alt_outlined),
              ),
            ),

            const SizedBox(height: 24),

            // ================= ACTIONS =================
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
