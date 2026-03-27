import 'package:flutter/material.dart';
import '../onboarding_page.dart';
import 'admin_settings_page.dart';

class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  @override
  Widget build(BuildContext context) {
    const navyColor = Color(0xFF122D5A);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: const Text(
          "About GARDIAN",
          style: TextStyle(color: navyColor, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: navyColor),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.05),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        ),
                      ],
                    ),
                    child: Image.asset(
                      "assets/icons/GARDIAN_LOGO.png",
                      height: 120,
                    ),
                  ),

                  const SizedBox(height: 20),
                  const Text(
                    "GARDIAN",
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.w900,
                      color: navyColor,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    "Version 1.0.0",
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade500,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 32),
            Divider(color: Colors.grey.shade200, thickness: 1.5),
            const SizedBox(height: 24),

            const Text(
              "Our Mission",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: navyColor,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              "GARDIAN is a mobile-based reporting system designed to help assess "
              "urban drainage and conditions using machine learning image analysis.\n\n"
              "This application is part of an academic research project dedicated to "
              "creating safer and more sustainable communities.",
              style: TextStyle(
                fontSize: 15,
                color: Colors.grey.shade700,
                height: 1.6,
              ),
            ),

            const SizedBox(height: 24),
            Divider(color: Colors.grey.shade200, thickness: 1.5),
            const SizedBox(height: 24),

            const Text(
              "Meet the Developers",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: navyColor,
              ),
            ),
            const SizedBox(height: 16),

            _buildPersonCard(
              name: "Julius Ydur Cadiz",
              role: "Researcher & Developer",
            ),
            _buildPersonCard(
              name: "Jan Maverick Cayabyab",
              role: "Researcher & Developer",
            ),
            GestureDetector(
              onLongPress: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const AdminSettingsPage(),
                  ),
                );
              },
              child: _buildPersonCard(
                name: "Miguel Joshua Galope",
                role: "Researcher & Developer",
              ),
            ),
            _buildPersonCard(
              name: "Allen Audrey Kish Leyble",
              role: "Researcher & Developer",
            ),

            const SizedBox(height: 24),

            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: navyColor.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: navyColor.withOpacity(0.1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Special Thanks",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: navyColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "This project was made possible through the continuous guidance and support of our research advisor.",
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade700,
                      height: 1.5,
                    ),
                  ),
                  const SizedBox(height: 16),
                  _buildPersonCard(
                    name: "Ms. Nila D. Santiago",
                    role: "Academic Project Advisor",
                    isAdvisor: true,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 40),

            SizedBox(
              width: double.infinity,
              height: 55,
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => const OnboardingPage(),
                    ),
                  );
                },
                icon: const Icon(Icons.menu_book_rounded),
                label: const Text(
                  "View App Tutorial",
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: navyColor,
                  side: const BorderSide(color: navyColor, width: 1.5),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 30),
          ],
        ),
      ),
    );
  }

  Widget _buildPersonCard({
    required String name,
    required String role,
    bool isAdvisor = false,
  }) {
    const navyColor = Color(0xFF122D5A);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: isAdvisor ? Colors.amber.shade700 : navyColor,
            foregroundColor: Colors.white,
            radius: 24,
            child: isAdvisor
                ? const Icon(Icons.school_rounded, size: 24)
                : Text(
                    name[0],
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
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
                    color: navyColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  role,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade600,
                    fontWeight: FontWeight.w500,
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
