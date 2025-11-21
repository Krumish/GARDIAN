import 'dart:io';
import 'package:flutter/material.dart';
import 'location_page.dart';

class PhotoCapturePage extends StatefulWidget {
  final File imageFile;
  final String issueType;
  const PhotoCapturePage({
    super.key,
    required this.imageFile,
    required this.issueType,
  });

  @override
  State<PhotoCapturePage> createState() => _PhotoCapturePageState();
}

class _PhotoCapturePageState extends State<PhotoCapturePage> {
  final bool _isProcessing = false;

  Future<void> _goToLocationPage() async {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => LocationPage(
          imageFile: widget.imageFile,
          issueType: widget.issueType,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Preview Photo"), centerTitle: true),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Image.file(
                  widget.imageFile,
                  fit: BoxFit.cover,
                  width: double.infinity,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.refresh_outlined),
                    label: const Text("Retake Photo"),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isProcessing ? null : _goToLocationPage,
                    icon: const Icon(Icons.arrow_forward_outlined),
                    label: const Text("Next"),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
