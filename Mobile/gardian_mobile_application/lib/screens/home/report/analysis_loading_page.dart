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
      // 🚫 Skip YOLO for non-drainage issues
      if (widget.issueType != "Drainage") {
        _goToConfirmation(null);
        return;
      }

      final results = await YoloService.detect(widget.imageFile);

      if (!mounted) return;

      // Validate YOLO Status
      if (results["status"] != "success") {
        return _triggerError("Unable to analyze the image.");
      }

      final drainageCount = results["drainage_count"] ?? 0;
      final obstructionCount = results["obstruction_count"] ?? 0;

      // ❗ No detections = block submission
      if (drainageCount == 0 && obstructionCount == 0) {
        return _triggerError(
          "No drainage or obstruction detected.\nPlease upload a clearer image.",
        );
      }

      // If valid → pass results
      final yoloSummary = {
        "status": results["status"],
        "drainage_count": drainageCount,
        "obstruction_count": obstructionCount,
        "annotated_image": results["annotated_image"],
      };

      _goToConfirmation(yoloSummary);
    } catch (e) {
      if (!mounted) return;
      _triggerError("Invalid or unreadable image.");
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
