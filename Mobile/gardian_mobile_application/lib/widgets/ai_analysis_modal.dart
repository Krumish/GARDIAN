import 'package:flutter/material.dart';

class AIAnalysisModal {
  static void show({
    required BuildContext context,
    required List boxes,
    required Color brandColor,
    required String issueType,
    Map<String, dynamic>? yoloResults,
  }) {
    final status = yoloResults?['status'] ?? 'Detected';
    final double? blockagePercent = (yoloResults?["blockage_percent"] as num?)
        ?.toDouble();

    // Group the detected classes to count them
    Map<String, int> classCounts = {};
    for (var box in boxes) {
      String className = (box['class'] ?? 'unknown').toString().toLowerCase();
      classCounts[className] = (classCounts[className] ?? 0) + 1;
    }

    final interpretation = _generateInterpretation(
      boxes: boxes,
      issueType: issueType,
      status: status,
      blockagePercent: blockagePercent,
      classCounts: classCounts,
    );

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            top: 24,
            left: 24,
            right: 24,
            bottom: MediaQuery.of(context).padding.bottom + 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  Icon(Icons.insights_rounded, color: brandColor, size: 28),
                  const SizedBox(width: 12),
                  const Text(
                    "Analysis Details",
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const Divider(height: 32),

              // Interpretation Paragraph
              const Text(
                "Report Interpretation",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                interpretation,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey.shade700,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),

              // List of Detected Objects
              const Text(
                "Detected Objects",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              if (boxes.isEmpty)
                Text(
                  "No items detected.",
                  style: TextStyle(
                    color: Colors.grey.shade500,
                    fontStyle: FontStyle.italic,
                  ),
                )
              else
                ...classCounts.entries.map((entry) {
                  String formattedLabel = entry.key
                      .split('_')
                      .map(
                        (word) => word.isNotEmpty
                            ? '${word[0].toUpperCase()}${word.substring(1)}'
                            : '',
                      )
                      .join(' ');

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12.0),
                    child: Row(
                      children: [
                        Icon(Icons.adjust_rounded, color: brandColor, size: 18),
                        const SizedBox(width: 8),
                        Text(
                          "${entry.value}x $formattedLabel",
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const Spacer(),
                      ],
                    ),
                  );
                }),

              const SizedBox(height: 32),

              // Close Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: brandColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(15),
                    ),
                  ),
                  child: const Text(
                    "Close",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // Pure function for logic separation
  static String _generateInterpretation({
    required List boxes,
    required String issueType,
    required String status,
    required double? blockagePercent,
    required Map<String, int> classCounts,
  }) {
    if (boxes.isEmpty) {
      return "GARDIAN analyzed this image for ${issueType.toLowerCase()} issues. No anomalies were detected; the area appears clear.";
    }

    String interpretation = "Status: $status. ";

    if (issueType == "Drainage" && blockagePercent != null) {
      interpretation +=
          "Calculated blockage severity is ${blockagePercent.toStringAsFixed(1)}%. ";
      if (blockagePercent >= 50.0) {
        interpretation +=
            "This severe obstruction highly restricts water flow and poses a significant flooding risk.";
      } else if (blockagePercent >= 10.0) {
        interpretation +=
            "Debris is partially restricting water flow, reducing overall drainage efficiency.";
      } else if (blockagePercent > 0) {
        interpretation +=
            "Minor debris detected, but water flow remains largely unaffected.";
      }
    } else if (issueType == "Pothole") {
      int potholeCount =
          classCounts["pothole"] ?? classCounts["potholes"] ?? boxes.length;
      interpretation +=
          "Detected $potholeCount pothole(s) requiring patching to prevent vehicle damage.";
    } else if (issueType == "Manhole") {
      int broken = classCounts["broken_manhole"] ?? 0;
      int intact = classCounts["intact_manhole"] ?? 0;
      if (broken > 0) {
        interpretation +=
            "Identified $broken broken manhole(s) posing an immediate safety hazard.";
      } else if (intact > 0) {
        interpretation +=
            "Manhole cover(s) appear structurally intact. Flagged for documentation.";
      }
    } else if (issueType == "Road Markings" || issueType == "Roadmarkings") {
      int faded = classCounts["faded_crosswalk"] ?? 0;
      int intact = classCounts["intact_crosswalk"] ?? 0;
      if (faded > 0) {
        interpretation +=
            "Detected $faded faded marking(s) requiring repainting to ensure visibility.";
      } else if (intact > 0) {
        interpretation += "Road markings appear intact and highly visible.";
      }
    } else if (issueType == "Road Blockage") {
      int vehicleCount = classCounts["vehicle"] ?? 0;
      if (vehicleCount > 0) {
        interpretation +=
            "Detected $vehicleCount vehicle(s) potentially causing an unauthorized road blockage or obstruction.";
      }
    } else if (issueType == "Waste Management") {
      int trashCount = classCounts["trash"] ?? 0;
      if (trashCount > 0) {
        interpretation +=
            "Identified $trashCount instance(s) of uncollected waste or illegal dumping requiring cleanup.";
      }
    }

    return "$interpretation Findings are mapped and ready for maintenance review.";
  }
}
