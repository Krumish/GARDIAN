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
    return GestureDetector(
      onTap: () => _showAIDetailsModal(context, boxes, brandColor),
      child: Container(
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
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 5,
                  ),
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
                        ? "${_yoloResults?['status'] ?? 'Detected'}"
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

            Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }

  // Modal for AI Analysis Details with specific issue interpretations
  void _showAIDetailsModal(BuildContext context, List boxes, Color brandColor) {
    final status = _yoloResults?['status'] ?? 'Detected';
    final double? blockagePercent = (_yoloResults?["blockage_percent"] as num?)
        ?.toDouble();

    // Group the detected classes to count them (e.g., {"broken_manhole": 1, "intact_manhole": 1})
    Map<String, int> classCounts = {};
    for (var box in boxes) {
      // Convert to lowercase to ensure consistency with YOLO labels
      String className = (box['class'] ?? 'unknown').toString().toLowerCase();
      classCounts[className] = (classCounts[className] ?? 0) + 1;
    }

    // ================= DYNAMIC INTERPRETATION LOGIC =================
    String interpretation =
        "The GARDIAN AI analyzed this image for ${widget.issueType.toLowerCase()}-related infrastructure issues. ";

    if (boxes.isEmpty) {
      interpretation +=
          "No relevant anomalies or objects were detected in the frame. The area appears clear.";
    } else {
      interpretation += "The system identified the problem as '$status'. ";

      // 1. Drainage Logic
      if (widget.issueType == "Drainage" && blockagePercent != null) {
        interpretation +=
            "Based on the spatial overlap of obstructions against the drainage area, the AI calculated a blockage severity of ${blockagePercent.toStringAsFixed(1)}%. ";
      }
      // 2. Pothole Logic
      else if (widget.issueType == "Pothole") {
        // Fallback to total boxes if the label is slightly different
        int potholeCount =
            classCounts["pothole"] ?? classCounts["potholes"] ?? boxes.length;
        interpretation +=
            "The AI detected $potholeCount pothole(s) in the captured area, indicating road surface degradation that requires patching to prevent vehicle damage. ";
      }
      // 3. Manhole Logic
      else if (widget.issueType == "Manhole") {
        int broken = classCounts["broken_manhole"] ?? 0;
        int intact = classCounts["intact_manhole"] ?? 0;

        if (broken > 0) {
          interpretation +=
              "Critically, the AI identified $broken broken or damaged manhole cover(s). This poses an immediate safety hazard to vehicles and pedestrians and requires urgent attention. ";
        } else if (intact > 0) {
          interpretation +=
              "The detected manhole cover(s) appear to be structurally intact, though the location has been flagged for documentation. ";
        }
      }
      // 4. Roadmarkings Logic
      else if (widget.issueType == "Roadmarkings") {
        int faded = classCounts["faded_crosswalk"] ?? 0;
        int intact = classCounts["intact_crosswalk"] ?? 0;

        if (faded > 0) {
          interpretation +=
              "The AI detected $faded faded crosswalk(s) or marking(s), suggesting reduced visibility that compromises pedestrian safety and requires repainting. ";
        } else if (intact > 0) {
          interpretation +=
              "The road markings in this area appear intact and highly visible. ";
        }
      }

      interpretation +=
          "These findings have been digitally mapped onto the image and will be forwarded to maintenance teams for further review.";
    }

    // ================= UI BUILDER =================
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            top: 24,
            left: 24,
            right: 24,
            bottom: MediaQuery.of(context).padding.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Icon(Icons.insights_rounded, color: brandColor, size: 28),
                  const SizedBox(width: 12),
                  const Text(
                    "AI Analysis Details",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const Divider(height: 32),

              // Interpretation Paragraph
              const Text(
                "Report Interpretation",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                interpretation,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade700,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),

              // List of Detected Objects
              const Text(
                "Detected Objects",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              if (boxes.isEmpty)
                Text(
                  "No items detected.",
                  style: TextStyle(
                    color: Colors.grey.shade500,
                    fontStyle: FontStyle.italic,
                  ),
                )
              else
                ...classCounts.entries.map((entry) {
                  // Format the label (e.g., "broken_manhole" -> "Broken Manhole")
                  String formattedLabel = entry.key
                      .split('_')
                      .map(
                        (word) => word.isNotEmpty
                            ? '${word[0].toUpperCase()}${word.substring(1)}'
                            : '',
                      )
                      .join(' ');

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: Row(
                      children: [
                        Icon(Icons.adjust_rounded, color: brandColor, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          formattedLabel,
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Spacer(),
                      ],
                    ),
                  );
                }),

              const SizedBox(height: 32),

              // Close Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: brandColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                  child: const Text(
                    "Close",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

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
            "Report: ${widget.issueType}",
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
    const navyColor = Color(0xFF162447);
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
                    widget.imageFile,
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
