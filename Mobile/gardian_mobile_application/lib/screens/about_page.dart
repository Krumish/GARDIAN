import 'package:flutter/material.dart';
import '../onboarding_page.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- APP INFO SECTION ---
            Center(
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),

                    child: Image.asset(
                      "assets/icons/GARDIAN_LOGO.png",
                      height: 150,
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "GARDIAN",
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF122D5A),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Version 1.0.0",
                    style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 30),

            const Text(
              "Our Mission",
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF122D5A),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              "GARDIAN is a mobile-based reporting system designed to help assess "
              "urban drainage and conditions using AI-assisted image analysis.\n\n"
              "This application is part of an academic research project dedicated to "
              "creating safer and more sustainable communities.",
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey.shade800,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 30),

            const Text(
              "Meet the Developers",
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Color(0xFF122D5A),
              ),
            ),
            const SizedBox(height: 16),

            _buildDeveloperCard("Julius Ydur Cadiz"),
            _buildDeveloperCard("Jan Maverick Cayabyab"),
            _buildDeveloperCard("Miguel Joshua Galope"),
            _buildDeveloperCard("Allen Audrey Kish Leyble"),

            const SizedBox(height: 40),

            SizedBox(
              width: double.infinity,
              height: 55,
              child: OutlinedButton.icon(
                onPressed: () {
                  // Navigate to the Onboarding Page
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const OnboardingPage(),
                    ),
                  );
                },
                icon: const Icon(Icons.menu_book),
                label: const Text(
                  "View App Tutorial",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF122D5A),
                  side: const BorderSide(color: Color(0xFF122D5A), width: 1.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildDeveloperCard(String name) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: const Color(0xFF122D5A),
            foregroundColor: Colors.white,
            child: Text(name[0]),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF122D5A),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
