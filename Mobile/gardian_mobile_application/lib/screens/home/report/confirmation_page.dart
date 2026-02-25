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
        ].where((e) => e != null && e.isNotEmpty).join(", ");

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

      await storageService.uploadUserImage(
        widget.imageFile,
        annotatedImageFile: _annotatedFile,
        lat: widget.selectedCoordinate.latitude,
        lng: widget.selectedCoordinate.longitude,
        address: _locationController.text.trim(),
        note: _noteController.text.trim(),
        yoloResults: _yoloResults,
        issueType: widget.issueType,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white),
                SizedBox(width: 12),
                Text(
                  "Report submitted successfully!",
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            backgroundColor: Colors.green.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
          ),
        );
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

  Widget _buildDetectionSummary(List boxes, Color brandColor) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: brandColor.withOpacity(0.05),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: brandColor.withOpacity(0.1), width: 1.5),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 5),
              ],
            ),
            child: Icon(Icons.analytics_rounded, color: brandColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "AI Analysis Complete",
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  boxes.isNotEmpty
                      ? "${_yoloResults?['status'] ?? 'Detected'} (${boxes.length} objects)"
                      : "No anomalies detected",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: brandColor,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // 🔹 NEW: Manual Label for non-AI reports
  Widget _buildManualLabel(Color brandColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.05),
        borderRadius: BorderRadius.circular(15),
        border: Border.all(color: Colors.blue.withOpacity(0.1), width: 1.5),
      ),
      child: Row(
        children: [
          const Icon(Icons.assignment_turned_in_rounded, color: Colors.blue),
          const SizedBox(width: 12),
          Text(
            "Manual Report: ${widget.issueType}",
            style: const TextStyle(
              fontWeight: FontWeight.bold,
              color: Colors.blue,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const navyColor = Color(0xFF162447); // 🔹 Updated Navy Theme
    final allBoxes = (_yoloResults?["boxes"] as List?) ?? [];
    final double? blockagePercent = (_yoloResults?["blockage_percent"] as num?)
        ?.toDouble();

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          "Confirm Report",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        backgroundColor: navyColor,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ================= IMAGE PREVIEW =================
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.file(
                    _annotatedFile ?? widget.imageFile,
                    height: 220,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ================= DYNAMIC SUMMARY (AI VS MANUAL) =================
              if (widget.yoloResults != null)
                _buildDetectionSummary(allBoxes, navyColor)
              else
                _buildManualLabel(navyColor),

              const SizedBox(height: 16),

              // ================= BLOCKAGE ASSESSMENT (AI Drainage Only) =================
              if (widget.issueType == "Drainage" &&
                  blockagePercent != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(15),
                    border: Border.all(color: Colors.grey.shade200, width: 1.5),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        "Blockage Severity",
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: LinearProgressIndicator(
                                value: blockagePercent / 100,
                                minHeight: 12,
                                backgroundColor: Colors.grey.shade200,
                                color: _blockageColor(blockagePercent),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Text(
                            "${blockagePercent.toStringAsFixed(1)}%",
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
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
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              const Text(
                "Report Details",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: navyColor,
                ),
              ),
              const SizedBox(height: 12),

              // ================= LOCATION INPUT =================
              TextField(
                controller: _locationController,
                decoration: InputDecoration(
                  labelText: "Location Address",
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: const BorderSide(color: navyColor, width: 2),
                  ),
                  prefixIcon: const Icon(
                    Icons.location_on_rounded,
                    color: navyColor,
                  ),
                  suffixIcon: _isFetchingAddress
                      ? const Padding(
                          padding: EdgeInsets.all(14.0),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : IconButton(
                          icon: const Icon(
                            Icons.my_location_rounded,
                            color: Colors.blue,
                          ),
                          onPressed: _fetchAddressFromCoordinates,
                        ),
                ),
              ),
              const SizedBox(height: 16),

              // ================= NOTES INPUT =================
              TextField(
                controller: _noteController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: "Additional Notes (optional)",
                  alignLabelWithHint: true,
                  filled: true,
                  fillColor: Colors.grey.shade50,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: const BorderSide(color: navyColor, width: 2),
                  ),
                  prefixIcon: const Padding(
                    padding: EdgeInsets.only(bottom: 40),
                    child: Icon(Icons.notes_rounded, color: navyColor),
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // ================= ACTIONS =================
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _uploading
                      ? null
                      : () => _uploadToFirebase(context),
                  icon: _uploading
                      ? const SizedBox.shrink()
                      : const Icon(Icons.cloud_upload_rounded),
                  label: _uploading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          "Submit Report",
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    elevation: 4,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: _uploading ? null : () => Navigator.pop(context),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.grey.shade600,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: const Text(
                    "Cancel & Go Back",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
