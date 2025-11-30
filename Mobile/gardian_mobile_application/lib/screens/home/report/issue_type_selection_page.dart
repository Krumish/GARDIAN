import 'package:flutter/material.dart';
import 'photo_selection_page.dart';

class IssueTypeSelectionPage extends StatelessWidget {
  const IssueTypeSelectionPage({super.key});

  // PNG image paths for each issue type
  static const List<Map<String, dynamic>> issueTypes = [
    {"label": "Drainage", "image": "assets/icons/drainage.png"},
    {"label": "Road Surface", "image": "assets/icons/road_surface.png"},
    {"label": "Waste Management", "image": "assets/icons/waste_management.png"},
    {"label": "Road Blockage", "image": "assets/icons/road_blockage.png"},
    {"label": "Road Markings", "image": "assets/icons/road_markings.png"},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Select Issue Type")),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: GridView.builder(
          itemCount: issueTypes.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2, // two columns
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 1, // square cards
          ),
          itemBuilder: (context, index) {
            final type = issueTypes[index]["label"];
            final imagePath = issueTypes[index]["image"];

            return GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PhotoSelectionPage(issueType: type),
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
                        child: Image.asset(imagePath, fit: BoxFit.contain),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        type,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
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
