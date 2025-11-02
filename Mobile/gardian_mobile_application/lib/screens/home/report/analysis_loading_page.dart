import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../services/yolo_services.dart';
import 'confirmation_page.dart';

class AnalysisLoadingPage extends StatefulWidget {
  final File imageFile;
  final LatLng selectedLocation;

  const AnalysisLoadingPage({
    super.key,
    required this.imageFile,
    required this.selectedLocation,
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
    _runAnalysis();
  }

  Future<void> _runAnalysis() async {
    try {
      final results = await YoloService.detect(widget.imageFile);

      if (!mounted) return;

      // Extract only the needed fields
      final yoloSummary = {
        "status": results["status"],
        "drainage_count": results["drainage_count"],
        "obstruction_count": results["obstruction_count"],
      };

      // Then pass only this smaller map
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => ConfirmationPage(
            imageFile: widget.imageFile,
            selectedLocation: widget.selectedLocation,
            yoloResults: yoloSummary, // smaller payload
          ),
        ),
      );
    } catch (e, stack) {
      debugPrint("🔥 YOLO analysis failed: $e");
      debugPrint(stack.toString());

      if (!mounted) return;
      setState(() {
        _isError = true;
        _errorMessage = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isError) {
      return Scaffold(
        appBar: AppBar(title: const Text("Analysis Failed")),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline, color: Colors.red, size: 48),
              const SizedBox(height: 16),
              Text(
                "YOLO Analysis Failed",
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(_errorMessage ?? "Unknown error"),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.arrow_back),
                label: const Text("Go Back"),
              ),
            ],
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
            Text("Analyzing image, please wait..."),
          ],
        ),
      ),
    );
  }
}
