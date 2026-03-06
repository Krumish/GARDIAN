import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import 'main_wrapper.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _controller = PageController();
  int current = 0;
  bool _isLoading = false; 

  final pages = [
    const _Page(
      title: "Detect & Report",
      text: "GARDIAN helps detect, assess, and report community issues easily.",
      image: "assets/icons/1.png",
    ),
    const _Page(
      title: "Smart Analysis",
      text:
          "Upload a photo — drainage, roads, or waste are analyzed instantly.",
      image: "assets/icons/2.png",
    ),
    const _Page(
      title: "Insights",
      text: "Get summaries, issue details, and mapped locations.",
      image: "assets/icons/3.png",
    ),
    const _Page(
      title: "Help Communities",
      text:
          "Submit reports and help create safer and more sustainable communities.",
      image: "assets/icons/4.png",
    ),
  ];

  Future<void> _finishOnboarding() async {
    setState(() => _isLoading = true);

    try {
      final user = FirebaseAuth.instance.currentUser;

      if (user != null) {
        await FirebaseFirestore.instance.collection("users").doc(user.uid).set({
          "seen_onboarding": true,
        }, SetOptions(merge: true));
      }

      if (!mounted) return;

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const MainWrapper()),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Something went wrong. Please try again."),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (current != pages.length - 1)
            TextButton(
              onPressed: () {
                _controller.animateToPage(
                  pages.length - 1,
                  duration: const Duration(milliseconds: 400),
                  curve: Curves.easeInOut,
                );
              },
              child: const Text(
                "Skip",
                style: TextStyle(
                  color: Colors.grey,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
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
                    color: current == i
                        ? const Color(0xFF162447)
                        : Colors.grey[300], 
                    borderRadius: BorderRadius.circular(20),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 24),

            
            SizedBox(
              width:
                  160, // Slightly wider to accommodate loading spinner safely
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _isLoading
                    ? null
                    : (current == pages.length - 1
                          ? _finishOnboarding
                          : () => _controller.nextPage(
                              duration: const Duration(milliseconds: 300),
                              curve: Curves.easeInOut,
                            )),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : Text(
                        current == pages.length - 1 ? "Get Started" : "Next",
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ),

            const SizedBox(
              height: 32,
            ), // Added a bit more padding at the bottom
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
          Image.asset(
            image,
            height: 260,
          ), // Scaled up slightly to fill space better
          const SizedBox(height: 40),
          Text(
            title,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Color(0xFF162447),
            ), // Themed text
          ),
          const SizedBox(height: 16),
          Text(
            text,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.black54, fontSize: 16),
          ),
          const SizedBox(
            height: 40,
          ), // Pushes content up slightly to balance the screen
        ],
      ),
    );
  }
}
