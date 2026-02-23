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
  File? _annotatedFile;

  final TextEditingController _locationController = TextEditingController();
  final TextEditingController _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _yoloResults = widget.yoloResults;

    // 🔹 OPTIMIZED: Use the pre-saved file from YoloService/AnalysisLoadingPage
    if (_yoloResults?["annotatedFile"] != null) {
      _annotatedFile = _yoloResults!["annotatedFile"] as File;
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

      // Pass both the original file and the results to storage service
      await storageService.uploadUserImage(
        widget.imageFile,
        annotatedImageFile: _annotatedFile, // Sending the File instead of bytes
        lat: widget.selectedCoordinate.latitude,
        lng: widget.selectedCoordinate.longitude,
        address: _locationController.text.trim(),
        note: _noteController.text.trim(),
        yoloResults: _yoloResults,
        issueType: widget.issueType,
      );

      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text("✅ Upload successful!")));
        Navigator.popUntil(context, (route) => route.isFirst);
      }
    } catch (e) {
      setState(() => _uploading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("❌ Upload failed: $e")));
    }
  }

  // ===================== UI COMPONENTS =====================

  Widget _buildDetectionSummary(List boxes) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: const Icon(Icons.analytics_outlined, color: Colors.blue),
        title: Text("${widget.issueType} Report Status"),
        subtitle: Text(
          boxes.isNotEmpty
              ? "${_yoloResults?['status'] ?? 'Detected'} (${boxes.length} objects)"
              : "No anomalies detected",
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // General detection list for any model (Potholes, Road Markings, etc.)
    final allBoxes = (_yoloResults?["boxes"] as List?) ?? [];

    // Drainage-specific data
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
              child: _annotatedFile != null
                  ? Image.file(
                      _annotatedFile!,
                      height: 250,
                      fit: BoxFit.cover,
                    ) // Use Image.file
                  : Image.file(
                      widget.imageFile,
                      height: 250,
                      fit: BoxFit.cover,
                    ),
            ),

            const SizedBox(height: 16),

            // ================= DETECTION SUMMARY (Visible for all types) =================
            _buildDetectionSummary(allBoxes),

            const SizedBox(height: 16),

            // ================= BLOCKAGE ASSESSMENT (Drainage Only) =================
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
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 16),

            // ================= LOCATION/ADDRESS =================
            TextField(
              controller: _locationController,
              decoration: InputDecoration(
                labelText: "Location / Address",
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                prefixIcon: const Icon(Icons.location_on_outlined),
                suffixIcon: _isFetchingAddress
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : IconButton(
                        icon: const Icon(Icons.refresh),
                        onPressed: _fetchAddressFromCoordinates,
                      ),
              ),
            ),

            const SizedBox(height: 16),

            // ================= NOTES =================
            TextField(
              controller: _noteController,
              maxLines: 2,
              decoration: InputDecoration(
                labelText: "Additional Notes (optional)",
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
