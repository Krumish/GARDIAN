import 'dart:io';
import 'package:flutter/material.dart';

class DetectionReviewDialog extends StatelessWidget {
  final File originalFile; // local file preview
  final String? annotatedUrl; // optional annotated image from YOLO
  final Map<String, dynamic> yolo;
  final VoidCallback onConfirm;

  const DetectionReviewDialog({
    super.key,
    required this.originalFile,
    this.annotatedUrl,
    required this.yolo,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Drainage Detection Review"),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 🔹 Original image preview
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.file(originalFile, height: 180, fit: BoxFit.cover),
            ),
            const SizedBox(height: 10),

            // 🔹 Annotated image if available
            if (annotatedUrl != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  annotatedUrl!,
                  height: 180,
                  fit: BoxFit.cover,
                ),
              ),

            const SizedBox(height: 15),

            // 🔹 YOLO drainage summary
            Text(
              "Drainage Status: ${yolo['status'] ?? 'Unknown'}",
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            if (yolo['confidence'] != null)
              Text(
                "Confidence: ${(yolo['confidence'] * 100).toStringAsFixed(1)}%",
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context), // cancel
          child: const Text("Cancel"),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.pop(context); // close dialog
            onConfirm(); // run callback (upload to Firebase)
          },
          child: const Text("Confirm Upload"),
        ),
      ],
    );
  }
}
