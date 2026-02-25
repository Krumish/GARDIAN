import 'dart:io';
import 'package:flutter/material.dart';
import 'location_page.dart';

class PhotoCapturePage extends StatefulWidget {
  final File imageFile;
  final String issueType;
  final bool requiresAI; // 🔹 Added flag to receive from PhotoSelectionPage

  const PhotoCapturePage({
    super.key,
    required this.imageFile,
    required this.issueType,
    required this.requiresAI, // 🔹 Make it required
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
          requiresAI: widget.requiresAI,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    const navyColor = Color(0xFF162447);

    return Scaffold(
      backgroundColor: Colors.grey.shade50,
      appBar: AppBar(
        title: const Text(
          "Review Photo",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        backgroundColor: navyColor,
        iconTheme: const IconThemeData(color: Colors.white),
        elevation: 0,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 🔹 Issue Label Chip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: navyColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                widget.issueType.toUpperCase(),
                style: const TextStyle(
                  color: navyColor,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  letterSpacing: 1.1,
                ),
              ),
            ),
            const SizedBox(height: 12),
            const Text(
              "Does this look correct?",
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: navyColor,
              ),
            ),
            const SizedBox(height: 20),

            // 🔹 Image Preview with "Clean" Border
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 15,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(24),
                  child: Image.file(
                    widget.imageFile,
                    fit: BoxFit.cover,
                    width: double.infinity,
                  ),
                ),
              ),
            ),

            const SizedBox(height: 24),

            // 🔹 Action Buttons
            Row(
              children: [
                // Retake Button
                Expanded(
                  flex: 2,
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text("Retake"),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.grey[700],
                      side: BorderSide(color: Colors.grey.shade300, width: 1.5),
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Next Button
                Expanded(
                  flex: 3,
                  child: ElevatedButton.icon(
                    onPressed: _isProcessing ? null : _goToLocationPage,
                    icon: const Icon(Icons.location_on_rounded),
                    label: const Text(
                      "Next Step",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green, // 🔹 Consistent Green
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(15),
                      ),
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
