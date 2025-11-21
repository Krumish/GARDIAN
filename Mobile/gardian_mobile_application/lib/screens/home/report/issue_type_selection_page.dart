import 'package:flutter/material.dart';
import 'photo_selection_page.dart';

class IssueTypeSelectionPage extends StatelessWidget {
  const IssueTypeSelectionPage({super.key});

  static const List<String> issueTypes = [
    "Drainage",
    "Road Surface",
    "Waste Management",
    "Road Blockage",
    "Road Markings",
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Select Issue Type")),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: ListView.separated(
          itemCount: issueTypes.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final type = issueTypes[index];
            return ElevatedButton(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => PhotoSelectionPage(issueType: type),
                  ),
                );
              },
              child: Text(type, style: const TextStyle(fontSize: 16)),
            );
          },
        ),
      ),
    );
  }
}
