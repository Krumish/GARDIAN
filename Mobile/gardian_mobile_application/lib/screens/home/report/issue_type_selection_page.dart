import 'package:flutter/material.dart';
import 'photo_selection_page.dart';

class IssueTypeSelectionPage extends StatelessWidget {
  const IssueTypeSelectionPage({super.key});

  /// ⚠️ IMPORTANT: The 'value' here must match the keys in your
  /// FastAPI models dictionary (e.g., models["Drainage"] or models["Pothole"])
  static const List<Map<String, dynamic>> issueTypes = [
    {
      "label": "Drainage",
      "value": "Drainage",
      "image": "assets/icons/drainage.png",
    },
    {
      "label": "Potholes", // UI Label
      "value": "Pothole", // 🔹 Match this with models["Pothole"] in main.py
      "image": "assets/icons/road_surface.png",
    },
    {
      "label": "Waste Management",
      "value": "Waste Management",
      "image": "assets/icons/waste_management.png",
    },
    {
      "label": "Road Blockage",
      "value": "Road Blockage",
      "image": "assets/icons/road_blockage.png",
    },
    {
      "label": "Road Markings",
      "value": "Road Markings",
      "image": "assets/icons/road_markings.png",
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Select Issue Type"), centerTitle: true),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: GridView.builder(
          itemCount: issueTypes.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 0.9, // Adjusted for slightly taller cards
          ),
          itemBuilder: (context, index) {
            final label = issueTypes[index]["label"];
            final backendValue = issueTypes[index]["value"];
            final imagePath = issueTypes[index]["image"];

            return GestureDetector(
              onTap: () {
                // Pass the backendValue to ensure the YOLO server
                // picks the correct .pt file later.
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PhotoSelectionPage(issueType: backendValue),
                  ),
                );
              },
              child: Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 3,
                child: Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Expanded(
                        child: Image.asset(
                          imagePath,
                          fit: BoxFit.contain,
                          // Error handling if asset is missing
                          errorBuilder: (context, error, stackTrace) =>
                              const Icon(Icons.image_not_supported, size: 50),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        label,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
