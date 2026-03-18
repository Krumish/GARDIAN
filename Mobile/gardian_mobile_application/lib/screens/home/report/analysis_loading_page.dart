import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../services/yolo_services.dart';
import 'confirmation_page.dart';

class AnalysisLoadingPage extends StatefulWidget {
  final File imageFile;
  final LatLng selectedCoordinate;
  final String issueType;

  const AnalysisLoadingPage({
    super.key,
    required this.imageFile,
    required this.selectedCoordinate,
    required this.issueType,
  });

  @override
  State<AnalysisLoadingPage> createState() => _AnalysisLoadingPageState();
}

class _AnalysisLoadingPageState extends State<AnalysisLoadingPage> {
  bool _isError = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 500), _runAnalysis);
  }

  Future<void> _runAnalysis() async {
    try {
      final results = await YoloService.detect(
        widget.imageFile,
        widget.issueType,
      );

      if (!mounted) return;

      if (results.containsKey("error")) {
        return _triggerError("Server Error: ${results["error"]}");
      }

      final allBoxes = results["boxes"] as List? ?? [];
      final status = results["status"]?.toString() ?? "";

      if (widget.issueType == "Drainage" && status == "No Drainage Detected") {
        return _triggerError(
          "No drainage infrastructure detected.\nPlease upload a clearer image or try a different angle.",
        );
      }

      if (allBoxes.isEmpty) {
        return _triggerError(
          "No ${widget.issueType.toLowerCase()} anomalies detected.\nPlease upload a clearer image or try a different angle.",
        );
      }

      final yoloSummary = {
        "status": status,
        "boxes": allBoxes,
        "blockage_percent": results["blockage_percent"],
        "max_blockage_ratio": results["max_blockage_ratio"],
        "drainage": results["drainage"],
        "obstructions": results["obstructions"],
        "annotated_image": results["annotated_image"],
        "annotatedFile": results["annotatedFile"],
      };

      _goToConfirmation(yoloSummary);
    } catch (e) {
      if (!mounted) return;
      _triggerError(
        "Failed to reach the analysis server. Please check your connection.",
      );
    }
  }

  void _goToConfirmation(Map<String, dynamic>? yoloResults) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => ConfirmationPage(
          imageFile: widget.imageFile,
          selectedCoordinate: widget.selectedCoordinate,
          yoloResults: yoloResults,
          issueType: widget.issueType,
        ),
      ),
    );
  }

  void _triggerError(String message) {
    setState(() {
      _isError = true;
      _errorMessage = message;
    });
  }

  @override
  Widget build(BuildContext context) {
    const navyColor = Color(0xFF122D5A);

    if (_isError) {
      return Scaffold(
        backgroundColor: Colors.white,
        appBar: AppBar(
          title: const Text(
            "Analysis Failed",
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          centerTitle: true,
          backgroundColor: navyColor,
          iconTheme: const IconThemeData(color: Colors.white),
          elevation: 0,
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.warning_amber_rounded,
                    color: Colors.red,
                    size: 64,
                  ),
                ),
                const SizedBox(height: 24),
                const Text(
                  "Unable to Process",
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: navyColor,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  _errorMessage ?? "Something went wrong during analysis.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey.shade600,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 40),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      setState(() => _isError = false);
                      _runAnalysis();
                    },
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text(
                      "Try Again",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: navyColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.grey.shade700,
                      side: BorderSide(color: Colors.grey.shade300, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                    ),
                    child: const Text(
                      "Go Back",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 100,
                  height: 100,
                  child: CircularProgressIndicator(
                    color: navyColor,
                    strokeWidth: 6,
                    backgroundColor: navyColor.withOpacity(0.1),
                  ),
                ),
                Icon(
                  Icons.document_scanner_outlined,
                  color: navyColor,
                  size: 40,
                ),
              ],
            ),
            const SizedBox(height: 32),
            Text(
              "Analyzing ${widget.issueType}...",
              style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: navyColor,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              "Loading Please Wait...",
              style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }
}
