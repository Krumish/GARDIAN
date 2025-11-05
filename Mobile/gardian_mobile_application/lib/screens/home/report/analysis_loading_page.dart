import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../services/yolo_services.dart';
import 'confirmation_page.dart';

class AnalysisLoadingPage extends StatefulWidget {
  final File imageFile;
  final LatLng selectedCoordinate;

  const AnalysisLoadingPage({
    super.key,
    required this.imageFile,
    required this.selectedCoordinate,
  });

  @override
  State<AnalysisLoadingPage> createState() => _AnalysisLoadingPageState();
}

class _AnalysisLoadingPageState extends State<AnalysisLoadingPage> {
  bool _isError = false;
  String? _errorMessage;
  bool _isRetrying = false;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 500), _runAnalysis);
  }

  Future<void> _runAnalysis() async {
    setState(() {
      _isError = false;
      _errorMessage = null;
      _isRetrying = true;
    });

    try {
      // ✅ Check if file exists before sending
      if (!widget.imageFile.existsSync()) {
        throw Exception("Image file not found. Please try again.");
      }

      final results = await YoloService.detect(widget.imageFile);

      if (!mounted) return;

      // ✅ Validate YOLO results
      if (results == null ||
          !results.containsKey("status") ||
          results["drainage_count"] == null ||
          results["obstruction_count"] == null) {
        throw Exception(
          "We couldn't analyze that image. Please make sure it's clear and shows a drainage area.",
        );
      }

      // ✅ Optional: reject images with no detection
      if (results["drainage_count"] == 0 && results["obstruction_count"] == 0) {
        throw Exception(
          "No drainage detected. Please try another image that clearly shows the drainage area.",
        );
      }

      // ✅ Prepare summary
      final yoloSummary = {
        "status": results["status"],
        "drainage_count": results["drainage_count"],
        "obstruction_count": results["obstruction_count"],
        "annotated_image": results["annotated_image"],
      };

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => ConfirmationPage(
            imageFile: widget.imageFile,
            selectedCoordinate: widget.selectedCoordinate,
            yoloResults: yoloSummary,
          ),
        ),
      );
    } catch (e, stack) {
      debugPrint("🔥 YOLO analysis failed: $e");
      debugPrint(stack.toString());

      if (!mounted) return;
      setState(() {
        _isError = true;
        _errorMessage =
            e.toString().contains("502") ||
                e.toString().contains("Failed to connect")
            ? "Our analysis server is currently unavailable. Please check your internet connection or try again later."
            : "We couldn't analyze that image. Please make sure it's clear and shows a drainage area.";
      });
    } finally {
      setState(() => _isRetrying = false);
    }
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
                const Text(
                  "YOLO Analysis Failed",
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  _errorMessage ?? "Something went wrong.",
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, color: Colors.black54),
                ),
                const SizedBox(height: 30),
                if (_isRetrying)
                  const CircularProgressIndicator()
                else
                  Column(
                    children: [
                      ElevatedButton.icon(
                        onPressed: _runAnalysis,
                        icon: const Icon(Icons.refresh, color: Colors.white),
                        label: const Text(
                          "Try Again",
                          style: TextStyle(color: Colors.white),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          padding: const EdgeInsets.symmetric(
                            vertical: 14,
                            horizontal: 24,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.arrow_back),
                        label: const Text("Go Back"),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      );
    }

    // 🌀 Loading Screen
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text(
              "Analyzing image, please wait...",
              style: TextStyle(fontSize: 16),
            ),
          ],
        ),
      ),
    );
  }
}
