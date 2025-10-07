import 'dart:convert';
import 'package:flutter/material.dart';

class DetectionReviewDialog extends StatelessWidget {
  final Map<String, dynamic>? yoloResults;
  final VoidCallback onConfirm;

  const DetectionReviewDialog({
    super.key,
    required this.yoloResults,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Review Detection"),
      content: SingleChildScrollView(
        child: Column(
          children: [
            if (yoloResults?['annotated_image'] != null)
              Image.memory(
                base64Decode(yoloResults!['annotated_image']),
                height: 200,
                fit: BoxFit.cover,
              ),
            const SizedBox(height: 12),
            Text("Status: ${yoloResults?['status'] ?? 'Unknown'}"),
            Text("Persons: ${yoloResults?['person_count'] ?? 0}"),
            Text("Benches: ${yoloResults?['bench_count'] ?? 0}"),
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
            Navigator.pop(context); // close modal
            onConfirm(); // callback from parent
          },
          child: const Text("Confirm & Upload"),
        ),
      ],
    );
  }
}
