import 'package:flutter/material.dart';
import 'photo_selection_page.dart';

class IssueTypeSelectionPage extends StatelessWidget {
  const IssueTypeSelectionPage({super.key});

  static const List<Map<String, dynamic>> issueTypes = [
    {
      "label": "Drainage",
      "value": "Drainage",
      "image": "assets/icons/drainage.png",
    },
    {
      "label": "Potholes",
      "value": "Pothole",
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
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          "Select Issue Type",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        backgroundColor: const Color(0xFF122D5A),
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 24, 20, 8),
            child: Text(
              "What would you like to report?",
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: Color(0xFF122D5A),
              ),
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              "Select the category that best describes the issue.",
              style: TextStyle(color: Colors.grey, fontSize: 14),
            ),
          ),
          const SizedBox(height: 20),
          Expanded(
            child: GridView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              itemCount: issueTypes.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 0.85, // Adjust this to control card height
              ),
              itemBuilder: (context, index) {
                final label = issueTypes[index]["label"];
                final backendValue = issueTypes[index]["value"];
                final imagePath = issueTypes[index]["image"];

                return Card(
                  elevation: 0, // Flat design looks cleaner with borders
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: BorderSide(color: Colors.grey.shade200, width: 1.5),
                  ),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) =>
                              PhotoSelectionPage(issueType: backendValue),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        children: [
                          // 🔹 LARGE IMAGE CONTAINER
                          Expanded(
                            child: Container(
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: const Color(
                                  0xFF122D5A,
                                ).withOpacity(0.03),
                                borderRadius: BorderRadius.circular(15),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(
                                  10.0,
                                ), // Padding for the icon itself
                                child: Image.asset(
                                  imagePath,
                                  fit: BoxFit
                                      .contain, // Keeps icons from stretching
                                  errorBuilder: (context, error, stackTrace) =>
                                      const Icon(
                                        Icons.image_not_supported,
                                        size: 40,
                                        color: Colors.grey,
                                      ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          // 🔹 LABEL
                          Text(
                            label,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 15,
                              color: Color(0xFF122D5A),
                            ),
                          ),
                          const SizedBox(height: 4),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
