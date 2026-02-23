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
      // 1️⃣ CALL BACKEND: Pass the issueType so FastAPI selects the right model
      final results = await YoloService.detect(
        widget.imageFile,
        widget.issueType,
      );

      if (!mounted) return;

      if (results.containsKey("error")) {
        return _triggerError("Server Error: ${results["error"]}");
      }

      // 2️⃣ GENERAL DETECTION CHECK
      // In our updated Python code, every model returns a 'boxes' list
      final allBoxes = results["boxes"] as List? ?? [];

      if (allBoxes.isEmpty) {
        return _triggerError(
          "No ${widget.issueType} anomalies detected.\nPlease upload a clearer image.",
        );
      }

      // 3️⃣ PREPARE SUMMARY (Works for both Drainage and Pothole)
      final yoloSummary = {
        "status": results["status"],
        "boxes": allBoxes, // Save all raw detections
        // Drainage-specific metrics (will be null for Potholes)
        "blockage_percent": results["blockage_percent"],
        "max_blockage_ratio": results["max_blockage_ratio"],
        "drainage": results["drainage"],
        "obstructions": results["obstructions"],

        "annotated_image": results["annotated_image"],
        "annotatedFile":
            results["annotatedFile"], // The file we created in YoloService
      };

      _goToConfirmation(yoloSummary);
    } catch (e) {
      if (!mounted) return;
      _triggerError("Failed to reach the analysis server.");
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
    if (_isError) {
      return Scaffold(
        appBar: AppBar(title: const Text("Analysis Failed")),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 60),
                const SizedBox(height: 16),
                Text(
                  _errorMessage ?? "Something went wrong.",
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 24),

                // Retry button
                ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _isError = false;
                    });
                    _runAnalysis();
                  },
                  child: const Text("Retry"),
                ),

                const SizedBox(height: 8),

                // Go Back button
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text("Go Back"),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text("Analyzing drainage image..."),
          ],
        ),
      ),
    );
  }
}
