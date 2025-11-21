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
      // 🚨 Should never be called for non-drainage
      if (widget.issueType != "Drainage") {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ConfirmationPage(
              imageFile: widget.imageFile,
              selectedCoordinate: widget.selectedCoordinate,
              yoloResults: null,
              issueType: widget.issueType,
            ),
          ),
        );
        return;
      }

      final results = await YoloService.detect(widget.imageFile);

      if (!mounted) return;

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
            issueType: widget.issueType,
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isError = true;
        _errorMessage = "We couldn't analyze the drainage image.";
      });
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
                Text(
                  _errorMessage ?? "Something went wrong.",
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 20),
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
