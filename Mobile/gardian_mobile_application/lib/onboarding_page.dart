import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import 'screens/home/home_page.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _controller = PageController();
  int current = 0;

  final pages = [
    _Page(
      title: "Detect & Report",
      text: "GARDIAN helps detect, assess, and report community issues easily.",
      image: "assets/icons/GARDIAN_LOGO.png",
    ),
    _Page(
      title: "Smart Analysis",
      text:
          "Upload a photo — drainage, roads, or waste are analyzed instantly.",
      image: "assets/icons/GARDIAN_LOGO.png",
    ),
    _Page(
      title: "Insights",
      text: "Get summaries, issue details, and mapped locations.",
      image: "assets/icons/GARDIAN_LOGO.png",
    ),
    _Page(
      title: "Help Communities",
      text:
          "Submit reports and help create safer and more sustainable communities.",
      image: "assets/icons/GARDIAN_LOGO.png",
    ),
  ];

  Future<void> _finishOnboarding() async {
    final user = FirebaseAuth.instance.currentUser;

    if (user == null) return;

    await FirebaseFirestore.instance.collection("users").doc(user.uid).set({
      "seen_onboarding": true,
    }, SetOptions(merge: true));

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const HomePage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: _finishOnboarding,
                child: const Text("Skip"),
              ),
            ),

            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: pages.length,
                onPageChanged: (i) => setState(() => current = i),
                itemBuilder: (_, i) => pages[i],
              ),
            ),

            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                pages.length,
                (i) => AnimatedContainer(
                  duration: const Duration(milliseconds: 300),
                  margin: const EdgeInsets.symmetric(horizontal: 6),
                  height: 10,
                  width: current == i ? 24 : 10,
                  decoration: BoxDecoration(
                    color: current == i ? Colors.green : Colors.grey[300],
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 18),

            ElevatedButton(
              onPressed: current == pages.length - 1
                  ? _finishOnboarding
                  : () => _controller.nextPage(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                    ),
              child: Text(current == pages.length - 1 ? "Get Started" : "Next"),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _Page extends StatelessWidget {
  final String title;
  final String text;
  final String image;

  const _Page({required this.title, required this.text, required this.image});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(26),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset(image, height: 220),
          const SizedBox(height: 30),
          Text(
            title,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black54),
          ),
        ],
      ),
    );
  }
}
